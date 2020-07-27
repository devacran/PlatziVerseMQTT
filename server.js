"use strict";

const redisPersistence = require("aedes-persistence-redis");
const debug = require("debug")("platziverse:mqtt");
const chalk = require("chalk");
const aedes = require("aedes")({
  presistence: redisPersistence({
    port: 15757, // Redis port
    host: "redis-15757.c15.us-east-1-2.ec2.cloud.redislabs.com", // Redis host
    family: 4, // 4 (IPv4) or 6 (IPv6)
    password: "juanchito667",
    db: 0,
    maxSessionDelivery: 100, // maximum offline messages deliverable on client CONNECT, default is 1000
    packetTTL: function(packet) {
      // offline message TTL, default is disabled
      return 10; //seconds
    }
  })
});
const server = require("net").createServer(aedes.handle);
const port = 1883;
const db = require("platziversedb");
const config = {
  database: process.env.DB_NAME || "platziverse",
  username: process.env.DB_USER || "platzi",
  password: process.env.DB_PASS || "platzi",
  host: process.env.DB_HOST || "localhost",
  dialect: "postgres", //para especificar a sequelize cual db usar, porque trabaja con varias
  logging: s => debug(s) //cada msj que llegue aqui lo manda por debug
};
const clients = new Map();
const { parsePayload } = require("./utils");
let Agent, Metric;
aedes.on("client", client => {
  debug(`Client Connected: ${client.id}`);
});
aedes.on("clientDisconnect", async client => {
  debug(`Client Disconnected: ${client.id}`);
  const agent = clients.get(client.id);
  //Si el agente estaba en la lista de agentes conectados del proceso
  if (agent) {
    // Mark Agent as Disconnected
    agent.connected = false;

    try {
      //En la db lo pone como disconnected
      await Agent.createOrUpdate(agent);
    } catch (e) {
      return handleError(e);
    }

    // Lo borra de la lista
    clients.delete(client.id);
    //Notifica a todos los clientes
    aedes.publish({
      topic: "agent/disconnected",
      payload: JSON.stringify({
        agent: {
          uuid: agent.uuid
        }
      })
    });
    debug(
      `Client (${client.id}) associated to Agent (${agent.uuid}) marked as disconnected`
    );
  }
});
//Cuando el agente de monitoreo publique mensajes
aedes.on("publish", async (packet, client) => {
  debug(`Received: ${packet.topic}`);

  switch (packet.topic) {
    case "agent/connected":
    case "agent/disconnected":
      debug(`Payload: ${packet.payload}`);
      break;
    //Cuando un agente envie un msj va a contener metricas, q se guardaran en db al igual q el agente si es que no existia ya
    case "agent/message":
      debug(`Payload: ${packet.payload}`);

      const payload = parsePayload(packet.payload);
      //Si no es un payload vacio
      if (payload) {
        payload.agent.connected = true;
        //Guarda o actualiza el agente
        let agent;
        try {
          agent = await Agent.createOrUpdate(payload.agent);
        } catch (e) {
          return handleError(e);
        }

        debug(`Agent ${agent.uuid} saved`);
        //Lo guarda en el map de agentes conectados acutalmente
        // Notify Agent is Connected
        if (!clients.get(client.id)) {
          clients.set(client.id, agent);
          aedes.publish({
            topic: "agent/connected",
            payload: JSON.stringify({
              agent: {
                uuid: agent.uuid,
                name: agent.name,
                hostname: agent.hostname,
                pid: agent.pid,
                connected: agent.connected
              }
            })
          });
        }
        // Store Metrics

        for (let metric of payload.metrics) {
          let m;
          try {
            //Guarda cada metrica en la db
            m = await Metric.create(agent.uuid, metric);
          } catch (e) {
            return handleError(e);
          }
          debug(`Metric ${m.id} saved on agent ${agent.uuid}`);
        }
      }
      break;
  }
});
aedes.on("connectionError", handleFatalError);
//Muy buena practica hacer esto
process.on("uncaughtException", handleFatalError); //Cuando hay un tipo de exepcion que no fue manejada
process.on("unhandledRejection", handleFatalError); //Cuando hay un error de promesa que no fue manejada
server.listen(port, async function() {
  const services = await db(config).catch(handleFatalError);
  Agent = services.Agent;
  Metric = services.Metric;
  debug("server started and listening on port ", port);
});

function handleFatalError(err) {
  console.error(`${chalk.red("[fatal error]")} ${err.message}`);
  console.error(err.stack);
  process.exit(1);
}

function handleError(err) {
  console.error(`${chalk.red("[error]")} ${err.message}`);
  console.error(err.stack);
}
