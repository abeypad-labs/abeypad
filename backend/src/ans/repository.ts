import type { PoolClient } from "pg";
import type { Address, Hex } from "viem";
import { pool } from "../db.js";
import type {
  AnsName,
  MarketplaceAuction,
  MarketplaceListing,
  PrimaryAuction,
  ReservedName,
} from "./types.js";

type Queryable = Pick<typeof pool, "query"> | Pick<PoolClient, "query">;

const asBigInt = (value: unknown) => BigInt(String(value ?? 0));
const asNullableBigInt = (value: unknown) =>
  value === null || value === undefined ? null : BigInt(String(value));

function mapName(row: Record<string, unknown>): AnsName {
  return {
    chainId: Number(row.chain_id),
    node: row.node as Hex,
    label: (row.label as string | null) ?? null,
    fqdn: (row.fqdn as string | null) ?? null,
    registrant: row.registrant as Address,
    owner: row.owner as Address,
    expiry: asBigInt(row.expiry),
    resolver: (row.resolver as Address | null) ?? null,
    resolvedAddress: (row.resolved_address as Address | null) ?? null,
    resolverName: (row.resolver_name as string | null) ?? null,
    resolverNameUpdatedBlock: asBigInt(row.resolver_name_updated_block),
    registeredTxHash: (row.registered_tx_hash as Hex | null) ?? null,
    registeredBlock: asNullableBigInt(row.registered_block),
    registeredAt: row.registered_at ? new Date(row.registered_at as string).toISOString() : null,
    releasedAt: row.released_at ? new Date(row.released_at as string).toISOString() : null,
    updatedBlock: asBigInt(row.updated_block),
    custody: (row.custody as AnsName["custody"] | null) ?? "wallet",
    seller: (row.seller as Address | null) ?? null,
  };
}

export async function getSyncBlock(input: {
  chainId: number;
  jobName: string;
  contractAddress: Address;
}) {
  const result = await pool.query<{ last_processed_block: string }>(
    `select last_processed_block from abeypad_ans.sync_state
     where chain_id = $1 and job_name = $2 and lower(contract_address) = lower($3)`,
    [input.chainId, input.jobName, input.contractAddress],
  );
  return result.rows[0] ? BigInt(result.rows[0].last_processed_block) : null;
}

export async function setSyncBlock(
  db: Queryable,
  input: { chainId: number; jobName: string; contractAddress: Address; block: bigint },
) {
  await db.query(
    `insert into abeypad_ans.sync_state
       (chain_id, job_name, contract_address, last_processed_block, last_processed_at)
     values ($1, $2, lower($3), $4, now())
     on conflict (chain_id, job_name, contract_address) do update set
       last_processed_block = excluded.last_processed_block,
       last_processed_at = now()`,
    [input.chainId, input.jobName, input.contractAddress, input.block.toString()],
  );
}

export async function upsertRegistration(
  db: Queryable,
  input: {
    chainId: number;
    node: Hex;
    label: string | null;
    registrant: Address;
    expiry: bigint;
    txHash: Hex;
    block: bigint;
    blockTime: Date;
  },
) {
  await db.query(
    `insert into abeypad_ans.names
       (chain_id, node, label, fqdn, registrant, owner, expiry,
        registered_tx_hash, registered_block, registered_at, released_at,
        updated_block, updated_at)
     values ($1, lower($2), $3, $4, lower($5), lower($5), $6, lower($7), $8, $9, null, $8, now())
     on conflict (chain_id, node) do update set
       label = coalesce(excluded.label, abeypad_ans.names.label),
       fqdn = coalesce(excluded.fqdn, abeypad_ans.names.fqdn),
       registrant = case when abeypad_ans.names.registrant = '0x0000000000000000000000000000000000000000' or excluded.updated_block >= abeypad_ans.names.updated_block then excluded.registrant else abeypad_ans.names.registrant end,
       owner = case when excluded.updated_block >= abeypad_ans.names.updated_block then excluded.owner else abeypad_ans.names.owner end,
       expiry = case when excluded.updated_block >= abeypad_ans.names.updated_block then excluded.expiry else abeypad_ans.names.expiry end,
       registered_tx_hash = case when abeypad_ans.names.registered_tx_hash is null or excluded.updated_block >= abeypad_ans.names.updated_block then excluded.registered_tx_hash else abeypad_ans.names.registered_tx_hash end,
       registered_block = case when abeypad_ans.names.registered_block is null or excluded.updated_block >= abeypad_ans.names.updated_block then excluded.registered_block else abeypad_ans.names.registered_block end,
       registered_at = case when abeypad_ans.names.registered_at is null or excluded.updated_block >= abeypad_ans.names.updated_block then excluded.registered_at else abeypad_ans.names.registered_at end,
       released_at = case when excluded.updated_block >= abeypad_ans.names.updated_block then null else abeypad_ans.names.released_at end,
       updated_block = greatest(abeypad_ans.names.updated_block, excluded.updated_block),
       updated_at = now()`,
    [
      input.chainId,
      input.node,
      input.label,
      input.label ? `${input.label}.abey` : null,
      input.registrant,
      input.expiry.toString(),
      input.txHash,
      input.block.toString(),
      input.blockTime,
    ],
  );
}

export async function applyRenewal(
  db: Queryable,
  input: { chainId: number; node: Hex; label: string | null; expiry: bigint; block: bigint },
) {
  await db.query(
    `insert into abeypad_ans.names (chain_id, node, label, fqdn, expiry, updated_block)
     values ($1, lower($2), $3, $4, $5, $6)
     on conflict (chain_id, node) do update set
       label = coalesce(excluded.label, abeypad_ans.names.label),
       fqdn = coalesce(excluded.fqdn, abeypad_ans.names.fqdn),
       expiry = case when excluded.updated_block >= abeypad_ans.names.updated_block then excluded.expiry else abeypad_ans.names.expiry end,
       released_at = case when excluded.updated_block >= abeypad_ans.names.updated_block then null else abeypad_ans.names.released_at end,
       updated_block = greatest(abeypad_ans.names.updated_block, excluded.updated_block), updated_at = now()`,
    [input.chainId, input.node, input.label, input.label ? `${input.label}.abey` : null, input.expiry.toString(), input.block.toString()],
  );
}

export async function applyRelease(
  db: Queryable,
  input: { chainId: number; node: Hex; label: string | null; block: bigint; blockTime: Date },
) {
  await db.query(
    `insert into abeypad_ans.names (chain_id, node, label, fqdn, expiry, released_at, updated_block)
     values ($1, lower($2), $3, $4, 0, $5, $6)
     on conflict (chain_id, node) do update set
       label = coalesce(excluded.label, abeypad_ans.names.label),
       fqdn = coalesce(excluded.fqdn, abeypad_ans.names.fqdn),
       expiry = case when excluded.updated_block >= abeypad_ans.names.updated_block then 0 else abeypad_ans.names.expiry end,
       released_at = case when excluded.updated_block >= abeypad_ans.names.updated_block then excluded.released_at else abeypad_ans.names.released_at end,
       updated_block = greatest(abeypad_ans.names.updated_block, excluded.updated_block), updated_at = now()`,
    [input.chainId, input.node, input.label, input.label ? `${input.label}.abey` : null, input.blockTime, input.block.toString()],
  );
}

export async function applyOwner(
  db: Queryable,
  input: { chainId: number; node: Hex; owner: Address; block: bigint },
) {
  await db.query(
    `insert into abeypad_ans.names (chain_id, node, owner, updated_block)
     values ($1, lower($2), lower($3), $4)
     on conflict (chain_id, node) do update set
       owner = case when excluded.updated_block >= abeypad_ans.names.updated_block then excluded.owner else abeypad_ans.names.owner end,
       updated_block = greatest(abeypad_ans.names.updated_block, excluded.updated_block), updated_at = now()`,
    [input.chainId, input.node, input.owner, input.block.toString()],
  );
}

export async function applyResolver(
  db: Queryable,
  input: { chainId: number; node: Hex; resolver: Address; block: bigint },
) {
  await db.query(
    `insert into abeypad_ans.names (chain_id, node, resolver, updated_block)
     values ($1, lower($2), lower($3), $4)
     on conflict (chain_id, node) do update set
       resolver = case when excluded.updated_block >= abeypad_ans.names.updated_block then excluded.resolver else abeypad_ans.names.resolver end,
       updated_block = greatest(abeypad_ans.names.updated_block, excluded.updated_block), updated_at = now()`,
    [input.chainId, input.node, input.resolver, input.block.toString()],
  );
}

export async function applyResolvedAddress(
  db: Queryable,
  input: { chainId: number; node: Hex; address: Address; block: bigint },
) {
  await db.query(
    `insert into abeypad_ans.names (chain_id, node, resolved_address, updated_block)
     values ($1, lower($2), lower($3), $4)
     on conflict (chain_id, node) do update set
       resolved_address = case when excluded.updated_block >= abeypad_ans.names.updated_block then excluded.resolved_address else abeypad_ans.names.resolved_address end,
       updated_block = greatest(abeypad_ans.names.updated_block, excluded.updated_block), updated_at = now()`,
    [input.chainId, input.node, input.address, input.block.toString()],
  );
}

export async function applyResolverName(
  db: Queryable,
  input: { chainId: number; node: Hex; name: string; block: bigint },
) {
  await db.query(
    `insert into abeypad_ans.names
       (chain_id, node, resolver_name, resolver_name_updated_block, updated_block)
     values ($1, lower($2), $3, $4, $4)
     on conflict (chain_id, node) do update set
       resolver_name = case
         when excluded.resolver_name_updated_block >= abeypad_ans.names.resolver_name_updated_block
           then excluded.resolver_name
         else abeypad_ans.names.resolver_name
       end,
       resolver_name_updated_block = greatest(
         abeypad_ans.names.resolver_name_updated_block,
         excluded.resolver_name_updated_block
       ),
       updated_block = greatest(abeypad_ans.names.updated_block, excluded.updated_block),
       updated_at = now()`,
    [input.chainId, input.node, input.name, input.block.toString()],
  );
}

export async function upsertLiveName(input: {
  chainId: number;
  node: Hex;
  label: string;
  owner: Address;
  expiry: bigint;
  resolver: Address | null;
  resolvedAddress: Address | null;
  resolverName: string | null;
  block: bigint;
}) {
  await pool.query(
    `insert into abeypad_ans.names
       (chain_id, node, label, fqdn, owner, expiry, resolver, resolved_address,
        resolver_name, resolver_name_updated_block, updated_block, updated_at)
     values ($1, lower($2), $3, $4, lower($5), $6, lower($7), lower($8), $9, $10, $10, now())
     on conflict (chain_id, node) do update set
       label = excluded.label,
       fqdn = excluded.fqdn,
       owner = excluded.owner,
       expiry = excluded.expiry,
       resolver = excluded.resolver,
       resolved_address = excluded.resolved_address,
       resolver_name_updated_block = case
         when abeypad_ans.names.resolver_name is distinct from excluded.resolver_name
           then excluded.resolver_name_updated_block
         else abeypad_ans.names.resolver_name_updated_block
       end,
       resolver_name = excluded.resolver_name,
       released_at = null,
       updated_block = greatest(abeypad_ans.names.updated_block, excluded.updated_block),
       updated_at = now()`,
    [
      input.chainId,
      input.node,
      input.label,
      `${input.label}.abey`,
      input.owner,
      input.expiry.toString(),
      input.resolver,
      input.resolvedAddress,
      input.resolverName,
      input.block.toString(),
    ],
  );
}

const nameSelect = `
  select n.*,
    case when l.listing_id is not null then 'marketplace_listing'
         when a.auction_id is not null then 'marketplace_auction'
         else 'wallet' end as custody,
    coalesce(l.seller, a.seller) as seller
  from abeypad_ans.names n
  left join lateral (
    select listing_id, seller from abeypad_ans.marketplace_listings
    where chain_id = n.chain_id and node = n.node and active = true
    order by listing_id desc limit 1
  ) l on true
  left join lateral (
    select auction_id, seller from abeypad_ans.marketplace_auctions
    where chain_id = n.chain_id and node = n.node and settled = false and cancelled = false
    order by auction_id desc limit 1
  ) a on true`;

export async function getNameByLabel(chainId: number, label: string) {
  const result = await pool.query(
    `${nameSelect} where n.chain_id = $1 and lower(n.label) = lower($2) limit 1`,
    [chainId, label],
  );
  return result.rows[0] ? mapName(result.rows[0]) : null;
}

export async function listNamesForOwner(chainId: number, owner: Address) {
  const result = await pool.query(
    `${nameSelect}
     where n.chain_id = $1 and n.label is not null and (
       lower(n.owner) = lower($2) or lower(l.seller) = lower($2) or lower(a.seller) = lower($2)
     ) order by n.registered_block desc nulls last`,
    [chainId, owner],
  );
  return result.rows.map(mapName);
}

export async function getPrimaryName(chainId: number, address: Address) {
  const names = await listNamesForOwner(chainId, address);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const latestPrimaryUpdate = names
    .filter((name) =>
      name.expiry > now &&
      name.fqdn !== null &&
      name.resolvedAddress?.toLowerCase() === address.toLowerCase()
    )
    .sort((a, b) => Number(b.resolverNameUpdatedBlock - a.resolverNameUpdatedBlock))[0];

  if (
    !latestPrimaryUpdate?.resolverName ||
    latestPrimaryUpdate.resolverName.toLowerCase() !==
      latestPrimaryUpdate.fqdn?.toLowerCase()
  ) {
    return null;
  }

  return latestPrimaryUpdate;
}

function mapPrimaryAuction(row: Record<string, unknown>): PrimaryAuction {
  return {
    chainId: Number(row.chain_id), auctionId: asBigInt(row.auction_id),
    name: String(row.name), fqdn: String(row.fqdn), duration: asBigInt(row.duration),
    reservePrice: asBigInt(row.reserve_price), startTime: asBigInt(row.start_time),
    endTime: asBigInt(row.end_time), currentExtensionWindow: asBigInt(row.current_extension_window),
    bidCount: Number(row.bid_count), highestBidder: (row.highest_bidder as Address | null) ?? null,
    highestBid: asBigInt(row.highest_bid), settled: Boolean(row.settled), cancelled: Boolean(row.cancelled),
    createdTxHash: (row.created_tx_hash as Hex | null) ?? null,
    createdBlock: asNullableBigInt(row.created_block), updatedBlock: asBigInt(row.updated_block),
  };
}

function mapListing(row: Record<string, unknown>): MarketplaceListing {
  return {
    chainId: Number(row.chain_id), listingId: asBigInt(row.listing_id), node: row.node as Hex,
    name: String(row.name), fqdn: String(row.fqdn), seller: row.seller as Address,
    price: asBigInt(row.price), active: Boolean(row.active), buyer: (row.buyer as Address | null) ?? null,
    purchasedPrice: asNullableBigInt(row.purchased_price), createdTxHash: (row.created_tx_hash as Hex | null) ?? null,
    createdBlock: asNullableBigInt(row.created_block), updatedBlock: asBigInt(row.updated_block),
  };
}

function mapMarketAuction(row: Record<string, unknown>): MarketplaceAuction {
  return {
    chainId: Number(row.chain_id), auctionId: asBigInt(row.auction_id), node: row.node as Hex,
    name: String(row.name), fqdn: String(row.fqdn), seller: row.seller as Address,
    reservePrice: asBigInt(row.reserve_price), startTime: asBigInt(row.start_time), endTime: asBigInt(row.end_time),
    currentExtensionWindow: asBigInt(row.current_extension_window), bidCount: Number(row.bid_count),
    highestBidder: (row.highest_bidder as Address | null) ?? null, highestBid: asBigInt(row.highest_bid),
    settled: Boolean(row.settled), cancelled: Boolean(row.cancelled),
    createdTxHash: (row.created_tx_hash as Hex | null) ?? null,
    createdBlock: asNullableBigInt(row.created_block), updatedBlock: asBigInt(row.updated_block),
  };
}

export async function listPrimaryAuctions(chainId: number, limit = 100) {
  const result = await pool.query(
    `select * from abeypad_ans.primary_auctions where chain_id = $1 order by auction_id desc limit $2`,
    [chainId, limit],
  );
  return result.rows.map(mapPrimaryAuction);
}

export async function listMarketplaceListings(chainId: number, limit = 100) {
  const result = await pool.query(
    `select * from abeypad_ans.marketplace_listings where chain_id = $1 order by listing_id desc limit $2`,
    [chainId, limit],
  );
  return result.rows.map(mapListing);
}

export async function listMarketplaceAuctions(chainId: number, limit = 100) {
  const result = await pool.query(
    `select * from abeypad_ans.marketplace_auctions where chain_id = $1 order by auction_id desc limit $2`,
    [chainId, limit],
  );
  return result.rows.map(mapMarketAuction);
}

export async function listMarketplaceActivity(chainId: number, limit = 50) {
  const result = await pool.query(
    `select * from abeypad_ans.marketplace_events where chain_id = $1
     order by block_number desc, log_index desc limit $2`,
    [chainId, limit],
  );
  return result.rows.map((row) => ({
    id: String(row.id), chainId: Number(row.chain_id), source: row.source,
    entityType: row.entity_type, eventType: row.event_type,
    entityId: row.entity_id == null ? null : String(row.entity_id), name: row.name,
    account: row.account, counterparty: row.counterparty,
    amount: row.amount == null ? null : String(row.amount), txHash: row.tx_hash,
    blockNumber: String(row.block_number), logIndex: Number(row.log_index),
    blockTime: row.block_time ? new Date(row.block_time).toISOString() : null,
  }));
}

export async function listReservedNames(chainId: number, enabledOnly = true) {
  const result = await pool.query(
    `select * from abeypad_ans.reserved_names where chain_id = $1
     and ($2::boolean = false or enabled = true) order by display_order, label`,
    [chainId, enabledOnly],
  );
  return result.rows.map((row): ReservedName => ({
    id: Number(row.id), chainId: Number(row.chain_id), label: row.label, fqdn: row.fqdn,
    category: row.category, enabled: Boolean(row.enabled), saleMode: row.sale_mode,
    reservePriceWei: asNullableBigInt(row.reserve_price_wei), fixedPriceWei: asNullableBigInt(row.fixed_price_wei),
    auctionDurationSeconds: asBigInt(row.auction_duration_seconds),
    primaryAuctionId: asNullableBigInt(row.primary_auction_id),
    activationTxHash: (row.activation_tx_hash as Hex | null) ?? null,
    activatedAt: row.activated_at ? new Date(row.activated_at).toISOString() : null,
  }));
}

export async function getReservedName(chainId: number, label: string) {
  const result = await pool.query(
    `select * from abeypad_ans.reserved_names where chain_id = $1 and lower(label) = lower($2) limit 1`,
    [chainId, label],
  );
  const row = result.rows[0];
  if (!row) return null;
  return (await listReservedNames(chainId, false)).find((item) => item.id === Number(row.id)) ?? null;
}

export async function upsertPrimaryAuction(db: Queryable, input: PrimaryAuction) {
  await db.query(
    `insert into abeypad_ans.primary_auctions
       (chain_id, auction_id, name, fqdn, duration, reserve_price, start_time, end_time,
        current_extension_window, bid_count, highest_bidder, highest_bid, settled, cancelled,
        created_tx_hash, created_block, updated_block)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,lower($11),$12,$13,$14,lower($15),$16,$17)
     on conflict (chain_id, auction_id) do update set
       name=excluded.name, fqdn=excluded.fqdn, duration=excluded.duration,
       reserve_price=excluded.reserve_price, start_time=excluded.start_time, end_time=excluded.end_time,
       current_extension_window=excluded.current_extension_window, bid_count=excluded.bid_count,
       highest_bidder=excluded.highest_bidder, highest_bid=excluded.highest_bid,
       settled=excluded.settled, cancelled=excluded.cancelled,
       created_tx_hash=coalesce(abeypad_ans.primary_auctions.created_tx_hash, excluded.created_tx_hash),
       created_block=coalesce(abeypad_ans.primary_auctions.created_block, excluded.created_block),
       updated_block=excluded.updated_block, updated_at=now()`,
    [input.chainId,input.auctionId.toString(),input.name,input.fqdn,input.duration.toString(),input.reservePrice.toString(),
      input.startTime.toString(),input.endTime.toString(),input.currentExtensionWindow.toString(),input.bidCount,
      input.highestBidder,input.highestBid.toString(),input.settled,input.cancelled,input.createdTxHash,
      input.createdBlock?.toString() ?? null,input.updatedBlock.toString()],
  );
}

export async function upsertMarketplaceListing(db: Queryable, input: MarketplaceListing) {
  await db.query(
    `insert into abeypad_ans.marketplace_listings
       (chain_id,listing_id,node,name,fqdn,seller,price,active,buyer,purchased_price,created_tx_hash,created_block,updated_block)
     values ($1,$2,lower($3),$4,$5,lower($6),$7,$8,lower($9),$10,lower($11),$12,$13)
     on conflict (chain_id, listing_id) do update set
       node=excluded.node,name=excluded.name,fqdn=excluded.fqdn,seller=excluded.seller,price=excluded.price,
       active=excluded.active,buyer=coalesce(excluded.buyer,abeypad_ans.marketplace_listings.buyer),
       purchased_price=coalesce(excluded.purchased_price,abeypad_ans.marketplace_listings.purchased_price),
       created_tx_hash=coalesce(abeypad_ans.marketplace_listings.created_tx_hash,excluded.created_tx_hash),
       created_block=coalesce(abeypad_ans.marketplace_listings.created_block,excluded.created_block),
       updated_block=excluded.updated_block,updated_at=now()`,
    [input.chainId,input.listingId.toString(),input.node,input.name,input.fqdn,input.seller,input.price.toString(),input.active,
      input.buyer,input.purchasedPrice?.toString() ?? null,input.createdTxHash,input.createdBlock?.toString() ?? null,input.updatedBlock.toString()],
  );
}

export async function upsertMarketplaceAuction(db: Queryable, input: MarketplaceAuction) {
  await db.query(
    `insert into abeypad_ans.marketplace_auctions
       (chain_id,auction_id,node,name,fqdn,seller,reserve_price,start_time,end_time,current_extension_window,
        bid_count,highest_bidder,highest_bid,settled,cancelled,created_tx_hash,created_block,updated_block)
     values ($1,$2,lower($3),$4,$5,lower($6),$7,$8,$9,$10,$11,lower($12),$13,$14,$15,lower($16),$17,$18)
     on conflict (chain_id, auction_id) do update set
       node=excluded.node,name=excluded.name,fqdn=excluded.fqdn,seller=excluded.seller,reserve_price=excluded.reserve_price,
       start_time=excluded.start_time,end_time=excluded.end_time,current_extension_window=excluded.current_extension_window,
       bid_count=excluded.bid_count,highest_bidder=excluded.highest_bidder,highest_bid=excluded.highest_bid,
       settled=excluded.settled,cancelled=excluded.cancelled,
       created_tx_hash=coalesce(abeypad_ans.marketplace_auctions.created_tx_hash,excluded.created_tx_hash),
       created_block=coalesce(abeypad_ans.marketplace_auctions.created_block,excluded.created_block),
       updated_block=excluded.updated_block,updated_at=now()`,
    [input.chainId,input.auctionId.toString(),input.node,input.name,input.fqdn,input.seller,input.reservePrice.toString(),
      input.startTime.toString(),input.endTime.toString(),input.currentExtensionWindow.toString(),input.bidCount,
      input.highestBidder,input.highestBid.toString(),input.settled,input.cancelled,input.createdTxHash,
      input.createdBlock?.toString() ?? null,input.updatedBlock.toString()],
  );
}

export async function recordMarketplaceEvent(db: Queryable, input: {
  chainId: number; source: string; entityType: string; eventType: string;
  entityId?: bigint | null; name?: string | null; account?: Address | null;
  counterparty?: Address | null; amount?: bigint | null; txHash: Hex;
  blockNumber: bigint; logIndex: number; blockTime: Date;
}) {
  await db.query(
    `insert into abeypad_ans.marketplace_events
       (chain_id,source,entity_type,event_type,entity_id,name,account,counterparty,amount,tx_hash,block_number,log_index,block_time)
     values ($1,$2,$3,$4,$5,$6,lower($7),lower($8),$9,lower($10),$11,$12,$13)
     on conflict (chain_id, source, tx_hash, log_index) do nothing`,
    [input.chainId,input.source,input.entityType,input.eventType,input.entityId?.toString() ?? null,input.name ?? null,
      input.account ?? null,input.counterparty ?? null,input.amount?.toString() ?? null,input.txHash,
      input.blockNumber.toString(),input.logIndex,input.blockTime],
  );
}
