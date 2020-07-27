"use strict";

function parsePayload(payload) {
  //si el paylod es un buffer, lo convierte a string
  if (payload instanceof Buffer) {
    payload = payload.toString("utf8");
  }
  //intenta parsear el string
  try {
    payload = JSON.parse(payload);
  } catch (e) {
    payload = null;
  }

  return payload;
}

module.exports = {
  parsePayload
};
