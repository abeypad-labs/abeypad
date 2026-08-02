import {
  Address,
  BigInt,
  Bytes,
  crypto,
  ethereum,
} from "@graphprotocol/graph-ts";
import { AccountBalance, Activity, Domain } from "../generated/schema";

const ABEY_NODE =
  "0x718b38b24b371815afa395a9ed641766bf7cf11fb5843cb970d7ef780ac07fb8";

export function eventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
}

export function domainId(node: Bytes): string {
  return node.toHexString();
}

export function isAbeyNode(node: Bytes): boolean {
  return node.toHexString() == ABEY_NODE;
}

export function subnode(parent: Bytes, labelHash: Bytes): Bytes {
  return changetype<Bytes>(crypto.keccak256(parent.concat(labelHash)));
}

export function nodeFromLabel(label: string): Bytes {
  let parent = Bytes.fromHexString(ABEY_NODE);
  let labelHash = changetype<Bytes>(crypto.keccak256(Bytes.fromUTF8(label)));
  return subnode(parent, labelHash);
}

export function loadDomain(node: Bytes, event: ethereum.Event): Domain {
  let id = domainId(node);
  let domain = Domain.load(id);
  if (domain == null) {
    domain = new Domain(id);
    domain.node = node;
    domain.released = false;
  }
  domain.updatedAt = event.block.timestamp;
  domain.updatedBlock = event.block.number;
  domain.updatedTx = event.transaction.hash;
  return domain as Domain;
}

export function applyLabel(domain: Domain, label: string): void {
  if (label.length == 0) return;
  domain.label = label;
  domain.name = label + ".abey";
}

function readSmallAbiWord(data: Bytes, offset: i32): i32 {
  if (offset < 0 || offset + 32 > data.length) return -1;
  let value = 0;
  for (let index = offset + 28; index < offset + 32; index++) {
    value = value * 256 + data[index];
  }
  return value;
}

// Every registrar function that emits a name lifecycle event has the label as
// its first calldata argument. Dynamic indexed strings are hashed in EVM logs,
// so recover that first string from the already-successful transaction input.
export function firstStringArgument(input: Bytes): string | null {
  const argumentsOffset = 4;
  if (input.length < argumentsOffset + 32) return null;

  let relativeStringOffset = readSmallAbiWord(input, argumentsOffset);
  if (relativeStringOffset < 0) return null;

  let lengthOffset = argumentsOffset + relativeStringOffset;
  let stringLength = readSmallAbiWord(input, lengthOffset);
  if (stringLength < 1 || stringLength > 32) return null;

  let valueOffset = lengthOffset + 32;
  if (valueOffset + stringLength > input.length) return null;
  return changetype<Bytes>(
    input.subarray(valueOffset, valueOffset + stringLength),
  ).toString();
}

export function loadAccount(
  account: Address,
  event: ethereum.Event,
): AccountBalance {
  let id = account.toHexString();
  let balance = AccountBalance.load(id);
  if (balance == null) {
    balance = new AccountBalance(id);
    balance.account = account;
    balance.primaryRefunds = BigInt.fromI32(0);
    balance.marketplaceRefunds = BigInt.fromI32(0);
    balance.marketplaceProceeds = BigInt.fromI32(0);
  }
  balance.updatedAt = event.block.timestamp;
  balance.updatedBlock = event.block.number;
  balance.updatedTx = event.transaction.hash;
  return balance as AccountBalance;
}

export function subtractFloorZero(current: BigInt, amount: BigInt): BigInt {
  return current.gt(amount) ? current.minus(amount) : BigInt.fromI32(0);
}

export function recordActivity(
  event: ethereum.Event,
  source: string,
  eventType: string,
  entityIdValue: string | null,
  node: Bytes | null,
  account: Bytes | null,
  amount: BigInt | null,
): void {
  let activity = new Activity(eventId(event));
  activity.source = source;
  activity.eventType = eventType;
  activity.entityId = entityIdValue;
  activity.node = node;
  activity.account = account;
  activity.amount = amount;
  activity.timestamp = event.block.timestamp;
  activity.blockNumber = event.block.number;
  activity.transactionHash = event.transaction.hash;
  activity.logIndex = event.logIndex;
  activity.save();
}
