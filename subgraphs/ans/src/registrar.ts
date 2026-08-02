import {
  LabelPolicyUpdated,
  NameRegistered,
  NameReleased,
  NameRenewed,
} from "../generated/Registrar/ANSRegistrarV2";
import { LabelPolicy } from "../generated/schema";
import {
  applyLabel,
  firstStringArgument,
  loadDomain,
  recordActivity,
} from "./helpers";

export function handleNameRegistered(event: NameRegistered): void {
  let domain = loadDomain(event.params.node, event);
  let label = firstStringArgument(event.transaction.input);
  if (label != null) applyLabel(domain, label as string);
  domain.labelHash = event.params.name;
  domain.registrant = event.params.registrant;
  domain.owner = event.params.registrant;
  domain.expiry = event.params.expires;
  domain.released = false;
  domain.registeredAt = event.block.timestamp;
  domain.registeredBlock = event.block.number;
  domain.registeredTx = event.transaction.hash;
  domain.save();
  recordActivity(
    event,
    "registrar",
    "name_registered",
    null,
    event.params.node,
    event.params.registrant,
    null,
  );
}

export function handleNameRenewed(event: NameRenewed): void {
  let domain = loadDomain(event.params.node, event);
  let label = firstStringArgument(event.transaction.input);
  if (label != null) applyLabel(domain, label as string);
  domain.labelHash = event.params.name;
  domain.expiry = event.params.expires;
  domain.released = false;
  domain.save();
  recordActivity(
    event,
    "registrar",
    "name_renewed",
    null,
    event.params.node,
    null,
    null,
  );
}

export function handleNameReleased(event: NameReleased): void {
  let domain = loadDomain(event.params.node, event);
  let label = firstStringArgument(event.transaction.input);
  if (label != null) applyLabel(domain, label as string);
  domain.labelHash = event.params.name;
  domain.owner = null;
  domain.resolvedAddress = null;
  domain.primaryName = null;
  domain.released = true;
  domain.save();
  recordActivity(
    event,
    "registrar",
    "name_released",
    null,
    event.params.node,
    null,
    null,
  );
}

export function handleLabelPolicyUpdated(event: LabelPolicyUpdated): void {
  let id = event.params.labelHash.toHexString();
  let policy = LabelPolicy.load(id);
  if (policy == null) policy = new LabelPolicy(id);
  policy.labelHash = event.params.labelHash;
  policy.policy = event.params.policy;
  policy.updatedAt = event.block.timestamp;
  policy.updatedBlock = event.block.number;
  policy.updatedTx = event.transaction.hash;
  policy.save();
}
