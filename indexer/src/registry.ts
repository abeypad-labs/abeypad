import {
  NewOwner as NewOwnerEvent,
  NewResolver as NewResolverEvent,
  Transfer as TransferEvent,
  NewTTL as NewTTLEvent,
} from "../generated/ANSRegistry/ANSRegistry"
import { loadOrCreateDomain, loadOrCreateAccount, makeChildNode } from "./utils"

export function handleNewOwner(event: NewOwnerEvent): void {
  // NewOwner fires when setSubnodeOwner / setSubnodeRecord is called.
  // event.params.node  = parent node
  // event.params.label = keccak256(child label)
  // The child node we care about is keccak256(abi.encodePacked(parentNode, label))
  let childNode = makeChildNode(event.params.node, event.params.label)
  let owner = event.params.owner

  loadOrCreateAccount(owner)

  let domain = loadOrCreateDomain(childNode)
  domain.owner = owner
  domain.save()
}

export function handleTransfer(event: TransferEvent): void {
  let node = event.params.node
  let owner = event.params.owner

  loadOrCreateAccount(owner)

  let domain = loadOrCreateDomain(node)
  domain.owner = owner
  domain.save()
}

export function handleNewResolver(event: NewResolverEvent): void {
  let node = event.params.node
  let resolver = event.params.resolver

  let domain = loadOrCreateDomain(node)
  domain.resolver = resolver
  domain.save()
}

export function handleNewTTL(event: NewTTLEvent): void {
  let node = event.params.node

  let domain = loadOrCreateDomain(node)
  // TTL comes as uint64; store as BigInt for consistency
  domain.ttl = event.params.ttl
  domain.save()
}
