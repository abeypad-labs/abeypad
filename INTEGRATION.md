# ABEY mainnet and testnet integration

The frontend ships both ABEY networks in one build. `VITE_NETWORK` chooses only the disconnected default; after a wallet connects, the network switcher controls the active chain at runtime.

## Frontend environment

The actual local file is `.env` and is gitignored. It contains only values that the browser genuinely needs:

```dotenv
VITE_NETWORK=testnet
VITE_ABEY_TESTNET_RPC_URL=https://testrpc.abeychain.com
VITE_ABEY_MAINNET_RPC_URL=https://rpc.abeychain.com
VITE_ABEY_TESTNET_API_URL=http://localhost:8788
VITE_ABEY_MAINNET_API_URL=http://localhost:8789
VITE_WALLETCONNECT_PROJECT_ID=...
```

Do not add database URLs, upstream price-feed settings, API secrets, private keys, or ANS signer keys to frontend variables. Vite embeds every `VITE_*` value in the public browser bundle.

## Runtime routing

| Wallet chain | Contracts | Backend |
| --- | --- | --- |
| 178 · ABEY Testnet | `src/config/deployments/abey-testnet.json` | `VITE_ABEY_TESTNET_API_URL` |
| 179 · ABEY Mainnet | `src/config/deployments/abey-mainnet.json` | `VITE_ABEY_MAINNET_API_URL` |

All token factory, token locker, presale, airdrop, ANS registry, resolver, registrar, auction house, and marketplace calls derive their address from the connected chain. ANS queries and the ABEY/USD price feed use the backend URL for that same chain. Persisted contract caches are cleared on a network change.

Staking remains chain-178-only because it was not part of the redeployment. The mainnet route displays an explicit testnet-only state instead of using a testnet address. NFT pages remain marked **Coming soon** on both networks.

## Local development

Run the three processes in separate terminals:

```bash
cd backend && npm run dev:testnet
cd backend && npm run dev:mainnet
npm run dev
```

Then use the Testnet/Mainnet control in the homepage header or dashboard sidebar. A connected wallet is required to approve the actual wallet network switch.

## Contract artifacts

Generated ABI files live under `src/config/abis/generated/`. Network manifests live under `src/config/deployments/`. `src/config/abis/contracts.ts` is the single address-mapping boundary for all frontend contract calls.

## Registration readiness

Read-only name resolution, pricing, indexed ownership, marketplace state, and price-feed endpoints work on both chains. Registration and renewal writes remain intentionally disabled at the quote layer until a dedicated signer address is set as `priceSigner` on each deployed registrar and its private key is supplied only to the matching backend instance.
