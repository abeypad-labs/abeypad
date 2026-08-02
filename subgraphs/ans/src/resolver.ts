import {
  AddrChanged,
  AddrCleared,
  ContenthashChanged,
  NameChanged,
  TextChanged,
} from "../generated/Resolver/ANSResolverV2";
import { TextRecord } from "../generated/schema";
import { domainId, loadDomain, recordActivity } from "./helpers";

export function handleAddrChanged(event: AddrChanged): void {
  let domain = loadDomain(event.params.node, event);
  domain.resolvedAddress = event.params.addr;
  domain.save();
  recordActivity(
    event,
    "resolver",
    "address_changed",
    null,
    event.params.node,
    event.params.addr,
    null,
  );
}

export function handleAddrCleared(event: AddrCleared): void {
  let domain = loadDomain(event.params.node, event);
  domain.resolvedAddress = null;
  domain.save();
  recordActivity(
    event,
    "resolver",
    "address_cleared",
    null,
    event.params.node,
    null,
    null,
  );
}

export function handleNameChanged(event: NameChanged): void {
  let domain = loadDomain(event.params.node, event);
  domain.primaryName = event.params.name.length > 0 ? event.params.name : null;
  domain.save();
  recordActivity(
    event,
    "resolver",
    event.params.name.length > 0 ? "primary_name_set" : "primary_name_removed",
    null,
    event.params.node,
    null,
    null,
  );
}

export function handleTextChanged(event: TextChanged): void {
  let domain = loadDomain(event.params.node, event);
  domain.save();
  let id = domainId(event.params.node) + "-" + event.params.key.toHexString();
  let record = TextRecord.load(id);
  if (record == null) record = new TextRecord(id);
  record.domain = domain.id;
  record.node = event.params.node;
  record.keyHash = event.params.key;
  record.value = event.params.value;
  record.updatedAt = event.block.timestamp;
  record.updatedBlock = event.block.number;
  record.updatedTx = event.transaction.hash;
  record.save();
}

export function handleContenthashChanged(event: ContenthashChanged): void {
  let domain = loadDomain(event.params.node, event);
  domain.contenthash = event.params.hash;
  domain.save();
}
