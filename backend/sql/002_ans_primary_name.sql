alter table abeypad_ans.names
  add column if not exists resolver_name text;

alter table abeypad_ans.names
  add column if not exists resolver_name_updated_block bigint not null default 0;

create index if not exists idx_abeypad_ans_names_primary
  on abeypad_ans.names (chain_id, resolver_name_updated_block desc)
  where resolver_name is not null and resolver_name <> '';
