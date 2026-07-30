import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

/**
 * Shared Postgres connection pool.
 *
 * Supabase enforces TLS. `rejectUnauthorized: false` negotiates SSL without
 * verifying the certificate chain — fine for getting started. For production
 * on the VPS, download Supabase's CA cert and pass `ssl: { ca }` instead so
 * the chain is verified (protects against MITM).
 */
export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});
