import { BigInt, Bytes, ByteArray, crypto } from "@graphprotocol/graph-ts"
import {
  NameRegistered as NameRegisteredEvent,
  NameRenewed as NameRenewedEvent,
  NameReleased as NameReleasedEvent,
} from "../generated/ANSRegistrar/ANSRegistrar"
import { Domain, Registration, Renewal, Release } from "../generated/schema"
import { GRACE_PERIOD, loadOrCreateDomain, loadOrCreateAccount } from "./utils"

export function handleNameRegistered(event: NameRegisteredEvent): void {
  let node = event.params.node
  let registrant = event.params.registrant
  let expires = event.params.expires
  let label = event.params.name

  // Ensure Account exists for the registrant
  loadOrCreateAccount(registrant)

  // Detect first-time registration before loadOrCreate overwrites the entity
  let isNew = Domain.load(node) == null

  let domain = loadOrCreateDomain(node)
  domain.name = label
  domain.fullName = label + ".abey"
  domain.labelHash = Bytes.fromByteArray(
    crypto.keccak256(ByteArray.fromUTF8(label))
  )
  domain.registrant = registrant
  domain.owner = registrant
  domain.expiry = expires
  domain.gracePeriodEnd = expires.plus(GRACE_PERIOD)

  if (isNew) {
    domain.createdAt = event.block.timestamp
    domain.createdAtBlock = event.block.number
  }

  domain.save()

  // Create immutable registration record
  let reg = new Registration(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  reg.domain = node
  reg.registrant = registrant
  reg.expiryDate = expires
  reg.blockNumber = event.block.number
  reg.timestamp = event.block.timestamp
  reg.transactionID = event.transaction.hash
  reg.save()
}

export function handleNameRenewed(event: NameRenewedEvent): void {
  let node = event.params.node
  let newExpiry = event.params.newExpiry

  let domain = loadOrCreateDomain(node)
  domain.expiry = newExpiry
  domain.gracePeriodEnd = newExpiry.plus(GRACE_PERIOD)
  domain.save()

  let renewal = new Renewal(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  renewal.domain = node
  renewal.newExpiry = newExpiry
  renewal.blockNumber = event.block.number
  renewal.timestamp = event.block.timestamp
  renewal.transactionID = event.transaction.hash
  renewal.save()
}

export function handleNameReleased(event: NameReleasedEvent): void {
  let node = event.params.node

  let domain = loadOrCreateDomain(node)
  // Clear all active-registration fields on release
  domain.owner = null
  domain.resolver = null
  domain.resolvedAddress = null
  domain.expiry = BigInt.fromI32(0)
  domain.gracePeriodEnd = BigInt.fromI32(0)
  domain.save()

  let release = new Release(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  release.domain = node
  release.blockNumber = event.block.number
  release.timestamp = event.block.timestamp
  release.transactionID = event.transaction.hash
  release.save()
}
