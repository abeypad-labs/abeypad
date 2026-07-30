import { pool } from './db.js';

/** Verifies the Supabase connection by running a couple of trivial queries. */
async function main() {
  const started = Date.now();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'select version() as version, current_database() as db, now() as server_time',
    );
    const info = rows[0] as { version: string; db: string; server_time: string };
    console.log('✅ Connected to Supabase Postgres in', Date.now() - started, 'ms');
    console.log('   database:   ', info.db);
    console.log('   server_time:', info.server_time);
    console.log('   version:    ', info.version.split(' ').slice(0, 2).join(' '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
