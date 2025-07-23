import config from "../../hardhat.config";

process.env.DEBUG = config.debug ? "true" : "false";

export function log(...args: any) {
  if (process.env.DEBUG === "true") {
    console.log(...args);
  }
}

export function setDebug(debug: boolean) {
  process.env.DEBUG = debug ? "true" : "false";
}

export function next() {
  log("--------------------------------------");
}
