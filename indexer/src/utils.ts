import { BigInt, Bytes, ByteArray, crypto } from "@graphprotocol/graph-ts"
import { Domain, Account } from "../generated/schema"

// 7,776,000 seconds = 90 days (matches contract GRACE_PERIOD constant)
export const GRACE_PERIOD = BigInt.fromI32(7776000)

// Compute a Registry child node: keccak256(abi.encodePacked(parentNode, label))
export function makeChildNode(parentNode: Bytes, label: Bytes): Bytes {
  let input = new ByteArray(64)
  for (let i = 0; i < 32; i++) {
    input[i] = parentNode[i]
    input[32 + i] = label[i]
  }
  return Bytes.fromByteArray(crypto.keccak256(input))
}

// Load a Domain entity or create a new empty one (caller must call .save())
export function loadOrCreateDomain(node: Bytes): Domain {
  let domain = Domain.load(node)
  if (domain == null) {
    domain = new Domain(node)
  }
  return domain as Domain
}

// Load an Account entity or create and persist a new one immediately
export function loadOrCreateAccount(address: Bytes): Account {
  let account = Account.load(address)
  if (account == null) {
    account = new Account(address)
    account.save()
  }
  return account as Account
}
