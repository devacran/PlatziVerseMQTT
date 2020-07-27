# platziverse-mqtt

## `agent/connected`

//Esta informacion se enviara cuando un agente se conecte

```js
{
  agent: {
    uuid, // auto generar
      username, // definir por configuración
      name, // definir por configuración
      hostname, // obtener del sistema operativo
      pid; // obtener del proceso
  }
}
```

## `agent/disconnected`

```js
{
  agent: {
    uuid;
  }
}
```

## `agent/message`

```js
{
  agent,
  metrics: [
    {
      type,
      value
    }
  ],
  timestamp // generar cuando creamos el mensaje
}
```

## `comando de prueba enviar datos de prueba al servidor mqqtt`

mqtt pub -t 'agent/message' -m '{"agent": {"uuid": "yyy", "name": "platzi", "username": "platzi", "pid": 10, "hostname": "platzibogota"}, "metrics": [{"type": "memory", "value": "1001"}, {"type": "temp", "value": "33"}]}'
