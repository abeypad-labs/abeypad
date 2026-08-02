import {
  ApprovalForAll,
  NewOwner,
  NewResolver,
  NewTTL,
  Transfer,
} from "../generated/Registry/ANSRegistryV2";
import { RegistryApproval } from "../generated/schema";
import {
  isAbeyNode,
  loadDomain,
  recordActivity,
  subnode,
} from "./helpers";

export function handleNewOwner(event: NewOwner): void {
  if (!isAbeyNode(event.params.node)) return;
  let node = subnode(event.params.node, event.params.label);
  let domain = loadDomain(node, event);
  domain.labelHash = event.params.label;
  domain.owner = event.params.owner;
  domain.released = event.params.owner.toHexString() ==
    "0x0000000000000000000000000000000000000000";
  domain.save();
  recordActivity(
    event,
    "registry",
    "new_owner",
    null,
    node,
    event.params.owner,
    null,
  );
}

export function handleTransfer(event: Transfer): void {
  let domain = loadDomain(event.params.node, event);
  domain.owner = event.params.owner;
  domain.released = event.params.owner.toHexString() ==
    "0x0000000000000000000000000000000000000000";
  domain.save();
  recordActivity(
    event,
    "registry",
    "transfer",
    null,
    event.params.node,
    event.params.owner,
    null,
  );
}

export function handleNewResolver(event: NewResolver): void {
  let domain = loadDomain(event.params.node, event);
  domain.resolver = event.params.resolver;
  domain.save();
  recordActivity(
    event,
    "registry",
    "new_resolver",
    null,
    event.params.node,
    event.params.resolver,
    null,
  );
}

export function handleNewTTL(event: NewTTL): void {
  let domain = loadDomain(event.params.node, event);
  domain.ttl = event.params.ttl;
  domain.save();
}

export function handleApprovalForAll(event: ApprovalForAll): void {
  let id =
    event.params.owner.toHexString() + "-" + event.params.operator.toHexString();
  let approval = RegistryApproval.load(id);
  if (approval == null) approval = new RegistryApproval(id);
  approval.owner = event.params.owner;
  approval.operator = event.params.operator;
  approval.approved = event.params.approved;
  approval.updatedAt = event.block.timestamp;
  approval.updatedBlock = event.block.number;
  approval.updatedTx = event.transaction.hash;
  approval.save();
}
