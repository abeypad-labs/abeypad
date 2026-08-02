# AbeyChain deployment handoff

Please deploy two versions of this subgraph, one for each ABEY network. A
single Graph subgraph cannot index more than one network.

## Requested deployments

| Suggested name | Chain | Chain ID | Manifest |
| --- | --- | ---: | --- |
| `abeypad/ans-testnet` | Abey Testnet | 178 | `subgraph.testnet.yaml` |
| `abeypad/ans-mainnet` | Abey Mainnet | 179 | `subgraph.mainnet.yaml` |

The manifests currently use the Graph Node network aliases `abey-testnet` and
`abey-mainnet`. Please replace only the `network` values if your Graph Node is
configured with different aliases.

## What it indexes

- `.abey` registration, renewal, release, ownership, expiry, resolver, address,
  primary-name, text-record hash, contenthash, and approval changes.
- Protected, auction-only, and fixed-premium label-policy changes.
- Primary premium auctions, bids, refunds, settlement, and cancellation.
- Fixed-price resale listings and secondary auctions.
- Marketplace bids, refunds, proceeds, withdrawals, purchases, settlement,
  cancellation, and a normalized activity stream.
- Per-wallet pending refund and sale-proceeds balances derived from events.

The registrar emits the label as an indexed dynamic string, so its original
text is not present in the log data. The registrar mapping safely recovers the
first string argument from the successful transaction calldata. This avoids
call handlers and trace-API requirements.

## Requested response from AbeyChain

After deployment, please send us:

1. The exact Graph Node network alias used for each chain.
2. The subgraph name and deployment ID for each deployment.
3. Both public query URLs, expected to follow one of these forms:
   - `https://graph.abeychain.com/subgraphs/name/<NAME>`
   - `https://graph.abeychain.com/subgraphs/id/<DEPLOYMENT_ID>`
4. Confirmation that both deployments are synced through their current chain
   heads without deterministic errors.
5. The Graph Node version if either manifest needs a different supported
   `specVersion` or mapping `apiVersion`.

No IPFS file data sources are used. The subgraph only consumes deterministic
onchain events and transaction calldata from the five ANS contracts.
