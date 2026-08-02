import { closeDb, runMigrations } from "./db.js";
import { logger } from "./logger.js";

try {
  await runMigrations();
  logger.info("AbeyPad database migrations complete");
} catch (error) {
  logger.error("AbeyPad database migration failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
} finally {
  await closeDb();
}
