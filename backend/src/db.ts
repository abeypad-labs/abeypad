import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

let databaseReady = false;

pool.on("error", (error) => {
  databaseReady = false;
  console.error("Unexpected PostgreSQL pool error", error);
});

export function isDatabaseReady() {
  return databaseReady;
}

export async function checkDatabaseReady() {
  try {
    await pool.query("select 1");
    databaseReady = true;
    return true;
  } catch (error) {
    databaseReady = false;
    return false;
  }
}

export async function closeDb() {
  await pool.end();
}

export async function runMigrations() {
  try {
    const sqlDir = resolve(process.cwd(), "sql");
    const files = (await readdir(sqlDir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      await pool.query(await readFile(resolve(sqlDir, file), "utf8"));
    }
    databaseReady = true;
  } catch (error) {
    databaseReady = false;
    throw error;
  }
}
