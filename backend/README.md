# AbeyPad Backend

Backend for the AbeyPad domains marketplace. Node + TypeScript, connecting to
Supabase Postgres.

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL
npm run db:test        # verify the DB connection
```

## Database connection

Supabase exposes two connection paths; pick by the **host's** network:

| Environment | Method | Why |
| --- | --- | --- |
| Local dev (IPv4, e.g. this Mac) | **Session pooler** | IPv4-proxied; works without IPv6 |
| Production (Hetzner VPS, IPv6) | **Direct connection** | Full Postgres over the VPS's native IPv6 |

Both strings live in `.env` (gitignored). On the VPS, swap the active
`DATABASE_URL` to the direct-connection line. See `.env.example` for the shapes.

## Scripts

| Script | Does |
| --- | --- |
| `npm run db:test` | Connects and prints server version/time |
| `npm run dev` | Runs `src/index.ts` with reload (added once the server lands) |
| `npm run build` | Type-checks and compiles to `dist/` |
| `npm start` | Runs the compiled server |

> Note: `src/index.ts` (the HTTP server) doesn't exist yet — the framework
> (Express/Fastify) and ORM-vs-raw-SQL choice are the next decision.
