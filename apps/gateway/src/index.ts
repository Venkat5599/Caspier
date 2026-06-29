import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createLogger } from "./logger.ts";

const config = loadConfig();
const logger = createLogger(config.logLevel);
const app = createApp({ logger });

logger.info("gateway listening", { port: config.port });

export default {
  port: config.port,
  fetch: app.fetch,
};
