# AbeyPad API

Fastify + PostgreSQL backend for `.abey` names, the ANS marketplace index, and the shared ABEY/USD price feed.

## Network model

Run one process per ABEY network. Both processes can use the same database because every indexed row is keyed by `chain_id`, while the separate processes prevent RPC state and signed quotes from ever crossing chains.

| Network | Chain ID | Local API | Script |
| --- | ---: | --- | --- |
| ABEY Testnet | 178 | `http://localhost:8788` | `npm run dev:testnet` |
| ABEY Mainnet | 179 | `http://localhost:8789` | `npm run dev:mainnet` |

Open two terminals when developing against the frontend and run one script in each.

## Setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev:testnet
```

The checked-out workspace already has a local, gitignored `backend/.env`. Keep database credentials, the upstream price source, and any quote signer exclusively in this backend environment.

For Supabase, use its session pooler on IPv4-only local networks. An IPv6-capable production host can use the direct database connection.

## Price feed

`GET /api/public/price/abey?chainId=178` returns the cached ABEY/USD price. The Stage0 pricing pattern is implemented server-side: the backend fetches and validates the upstream response, caches it for `ABEY_PRICE_SOURCE_REFRESH_INTERVAL_MS`, and exposes only the normalized price to the browser.

The upstream URL is configured with `ABEY_PRICE_SOURCE_URL`; it is deliberately absent from the frontend environment.

## ANS quote signer

Registration and renewal quotes require `ANS_PRICE_SIGNER_PRIVATE_KEY`. This must be a dedicated hot key whose address is authorized as `priceSigner` on that network's registrar. Never use the contract owner/deployer private key in the API.

The deployed registrars currently point at the deployment owner, so the quote endpoint intentionally returns `503 quote_signer_unavailable` until a dedicated signer is authorized on each registrar.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run db:migrate` | Apply idempotent SQL migrations |
| `npm run dev:testnet` | Watch-mode API for chain 178 on port 8788 |
| `npm run dev:mainnet` | Watch-mode API for chain 179 on port 8789 |
| `npm run typecheck` | Type-check without emitting files |
| `npm run build` | Compile to `dist/` |
| `npm run start:testnet` | Run compiled chain-178 API |
| `npm run start:mainnet` | Run compiled chain-179 API |

## Public routes

- `GET /health`
- `GET /api/config`
- `GET /api/public/price/abey`
- `GET /api/ans/pricing`
- `POST /api/ans/quote`
- `GET /api/public/ans/search`
- `GET /api/public/ans/name/:fqdn`
- `GET /api/public/ans/names/:address`
- `GET /api/public/ans/auctions`
- `GET /api/public/ans/marketplace/listings`
- `GET /api/public/ans/marketplace/auctions`
- `GET /api/public/ans/marketplace/reserved`
