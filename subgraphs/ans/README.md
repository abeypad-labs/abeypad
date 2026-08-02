# AbeyPad ANS subgraph

This folder is the complete handoff for AbeyChain to deploy the `.abey` names
and marketplace index. Testnet and mainnet use identical mappings and schema,
but separate manifests because a Graph subgraph indexes one network at a time.

## Files

- `subgraph.testnet.yaml`: chain 178 addresses and exact creation blocks.
- `subgraph.mainnet.yaml`: chain 179 addresses and exact creation blocks.
- `schema.graphql`: domains, resolver records, listings, auctions, balances,
  bids, proceeds, refunds, and activity.
- `src/`: deterministic AssemblyScript event mappings.
- `abis/`: the exact deployed ANS contract ABIs copied from the frontend.
- `queries/examples.graphql`: frontend/backend query examples.
- `CHAIN_HANDOFF.md`: the concise deployment request for the AbeyChain team.

## Validate locally

```bash
cd subgraphs/ans
npm install
npm run build
```

The public endpoint at `https://graph.abeychain.com` is query-only. Deployment
must be performed by the AbeyChain team, who will also confirm the Graph Node
network aliases used in the two manifests.

## Consumer status rules

Auction timestamps are deterministic indexed data, while the meaning of
"active" changes as wall-clock time passes without a new event. Consumers must
derive the display status as follows:

1. `cancelled` when `cancelled` is true.
2. `settled` when `settled` is true.
3. `scheduled` when the current timestamp is below `startTime`.
4. `ended` when the current timestamp is at or above `endTime`.
5. `active` otherwise.

This mirrors the current AbeyPad API and prevents stale "active" values from
being stored permanently in the subgraph.
