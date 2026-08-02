import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { closeDb, runMigrations } from "./db.js";
import { startAnsIndexer } from "./ans/indexer.js";
import { logger } from "./logger.js";
import { ChainMismatchError, registerRoutes } from "./routes.js";

let indexerStarted = false;

async function initializePersistence() {
  try {
    await runMigrations();
    if (!indexerStarted) {
      startAnsIndexer();
      indexerStarted = true;
    }
    logger.info("AbeyPad database ready", {
      network: config.deployment.network,
      chainId: config.deployment.chainId,
    });
    return true;
  } catch (error) {
    logger.warn("Database unavailable; API starting in degraded mode", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

const persistenceReady = await initializePersistence();

const app = Fastify({ logger: false, trustProxy: true });
await app.register(cors, {
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin not allowed"), false);
  },
});

await registerRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ChainMismatchError) {
    void reply.code(error.statusCode).send({
      error: error.code,
      detail: error.message,
    });
    return;
  }
  logger.error("Unhandled API error", {
    error: error instanceof Error ? error.message : String(error),
  });
  void reply.code(500).send({ error: "internal_error" });
});

const shutdown = async (signal: string) => {
  logger.info("Shutting down AbeyPad API", { signal });
  await app.close().catch(() => undefined);
  await closeDb().catch(() => undefined);
};

process.on("SIGINT", () => void shutdown("SIGINT").then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown("SIGTERM").then(() => process.exit(0)));

await app.listen({ host: "0.0.0.0", port: config.port });
logger.info("AbeyPad API listening", {
  port: config.port,
  network: config.deployment.network,
  chainId: config.deployment.chainId,
});

if (!persistenceReady) {
  const retryTimer = setInterval(() => {
    void initializePersistence();
  }, 30_000);
  retryTimer.unref();
}
