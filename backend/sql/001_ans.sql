create schema if not exists abeypad_ans;

create table if not exists abeypad_ans.sync_state (
  chain_id integer not null,
  job_name text not null,
  contract_address text not null,
  last_processed_block bigint not null,
  last_processed_at timestamptz not null default now(),
  primary key (chain_id, job_name, contract_address)
);

create table if not exists abeypad_ans.names (
  chain_id integer not null,
  node text not null,
  label text,
  fqdn text,
  registrant text not null default '0x0000000000000000000000000000000000000000',
  owner text not null default '0x0000000000000000000000000000000000000000',
  expiry bigint not null default 0,
  resolver text,
  resolved_address text,
  registered_tx_hash text,
  registered_block bigint,
  registered_at timestamptz,
  released_at timestamptz,
  updated_block bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (chain_id, node)
);

create index if not exists idx_abeypad_ans_names_owner
  on abeypad_ans.names (chain_id, lower(owner));
create index if not exists idx_abeypad_ans_names_registrant
  on abeypad_ans.names (chain_id, lower(registrant));
create unique index if not exists idx_abeypad_ans_names_label
  on abeypad_ans.names (chain_id, lower(label)) where label is not null;

create table if not exists abeypad_ans.primary_auctions (
  chain_id integer not null,
  auction_id bigint not null,
  name text not null,
  fqdn text not null,
  duration bigint not null,
  reserve_price numeric(78, 0) not null,
  start_time bigint not null,
  end_time bigint not null,
  current_extension_window bigint not null default 0,
  bid_count integer not null default 0,
  highest_bidder text,
  highest_bid numeric(78, 0) not null default 0,
  settled boolean not null default false,
  cancelled boolean not null default false,
  created_tx_hash text,
  created_block bigint,
  updated_block bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (chain_id, auction_id)
);

create table if not exists abeypad_ans.marketplace_listings (
  chain_id integer not null,
  listing_id bigint not null,
  node text not null,
  name text not null,
  fqdn text not null,
  seller text not null,
  price numeric(78, 0) not null,
  active boolean not null default true,
  buyer text,
  purchased_price numeric(78, 0),
  created_tx_hash text,
  created_block bigint,
  updated_block bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (chain_id, listing_id)
);

create index if not exists idx_abeypad_ans_listings_active
  on abeypad_ans.marketplace_listings (chain_id, active, listing_id desc);
create index if not exists idx_abeypad_ans_listings_seller
  on abeypad_ans.marketplace_listings (chain_id, lower(seller));

create table if not exists abeypad_ans.marketplace_auctions (
  chain_id integer not null,
  auction_id bigint not null,
  node text not null,
  name text not null,
  fqdn text not null,
  seller text not null,
  reserve_price numeric(78, 0) not null,
  start_time bigint not null,
  end_time bigint not null,
  current_extension_window bigint not null default 0,
  bid_count integer not null default 0,
  highest_bidder text,
  highest_bid numeric(78, 0) not null default 0,
  settled boolean not null default false,
  cancelled boolean not null default false,
  created_tx_hash text,
  created_block bigint,
  updated_block bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (chain_id, auction_id)
);

create index if not exists idx_abeypad_ans_market_auctions_status
  on abeypad_ans.marketplace_auctions (chain_id, settled, cancelled, end_time);
create index if not exists idx_abeypad_ans_market_auctions_seller
  on abeypad_ans.marketplace_auctions (chain_id, lower(seller));

create table if not exists abeypad_ans.marketplace_events (
  id bigserial primary key,
  chain_id integer not null,
  source text not null,
  entity_type text not null,
  event_type text not null,
  entity_id bigint,
  name text,
  account text,
  counterparty text,
  amount numeric(78, 0),
  tx_hash text not null,
  block_number bigint not null,
  log_index integer not null,
  block_time timestamptz,
  created_at timestamptz not null default now(),
  unique (chain_id, source, tx_hash, log_index)
);

create index if not exists idx_abeypad_ans_events_recent
  on abeypad_ans.marketplace_events (chain_id, block_number desc, log_index desc);

create table if not exists abeypad_ans.reserved_names (
  id bigserial primary key,
  chain_id integer not null,
  label text not null,
  fqdn text not null,
  category text not null,
  enabled boolean not null default false,
  sale_mode text not null default 'auction' check (sale_mode in ('auction', 'buy_now')),
  reserve_price_wei numeric(78, 0),
  fixed_price_wei numeric(78, 0),
  auction_duration_seconds bigint not null default 259200,
  notes text,
  display_order integer not null default 0,
  primary_auction_id bigint,
  activation_tx_hash text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chain_id, label)
);

with networks(chain_id) as (values (178), (179)),
seed(label, category, display_order) as (
  values
    ('ai', 'short_names', 10), ('gm', 'short_names', 11),
    ('gn', 'short_names', 12), ('id', 'short_names', 13),
    ('abey', 'abey_ecosystem', 100), ('abeychain', 'abey_ecosystem', 101),
    ('abeypad', 'abey_ecosystem', 102), ('launchpad', 'abey_ecosystem', 103),
    ('foundation', 'abey_ecosystem', 104), ('validator', 'abey_ecosystem', 105),
    ('admin', 'protected', 150), ('support', 'protected', 151),
    ('team', 'protected', 152), ('official', 'protected', 153),
    ('nft', 'premium', 200), ('defi', 'premium', 201), ('dex', 'premium', 202),
    ('wallet', 'premium', 203), ('trade', 'premium', 204), ('swap', 'premium', 205),
    ('stake', 'premium', 206), ('bridge', 'premium', 207), ('mint', 'premium', 208),
    ('claim', 'premium', 209), ('launch', 'premium', 210), ('meme', 'premium', 211),
    ('agent', 'technology', 300), ('agents', 'technology', 301),
    ('compute', 'technology', 302), ('oracle', 'technology', 303),
    ('router', 'technology', 304), ('node', 'technology', 305),
    ('money', 'finance', 400), ('bank', 'finance', 401), ('usd', 'finance', 402),
    ('usdc', 'finance', 403), ('yield', 'finance', 404), ('vault', 'finance', 405),
    ('btc', 'tickers', 500), ('eth', 'tickers', 501), ('abeycoin', 'tickers', 502),
    ('111', 'numeric', 600), ('222', 'numeric', 601), ('333', 'numeric', 602),
    ('777', 'numeric', 603), ('888', 'numeric', 604), ('999', 'numeric', 605)
)
insert into abeypad_ans.reserved_names (
  chain_id, label, fqdn, category, enabled, sale_mode, display_order
)
select networks.chain_id, seed.label, seed.label || '.abey', seed.category, false, 'auction', seed.display_order
from networks cross join seed
on conflict (chain_id, label) do nothing;

