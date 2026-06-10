import { Bytes, store } from "@graphprotocol/graph-ts"
import {
  AddrChanged as AddrChangedEvent,
  AddrCleared as AddrClearedEvent,
  NameChanged as NameChangedEvent,
  ContenthashChanged as ContenthashChangedEvent,
  ANSResolver,
} from "../generated/ANSResolver/ANSResolver"
import { TextRecord } from "../generated/schema"
import { loadOrCreateDomain } from "./utils"

// ── Forward resolution ────────────────────────────────────────────────────

export function handleAddrChanged(event: AddrChangedEvent): void {
  let node = event.params.node
  let addr = event.params.addr

  let domain = loadOrCreateDomain(node)
  domain.resolvedAddress = addr
  domain.save()
}

export function handleAddrCleared(event: AddrClearedEvent): void {
  let node = event.params.node

  let domain = loadOrCreateDomain(node)
  domain.resolvedAddress = null
  domain.save()
}

// ── Reverse resolution ────────────────────────────────────────────────────

export function handleNameChanged(event: NameChangedEvent): void {
  let node = event.params.node

  let domain = loadOrCreateDomain(node)
  domain.reverseName = event.params.name
  domain.save()
}

// ── Content hash ──────────────────────────────────────────────────────────

export function handleContenthashChanged(event: ContenthashChangedEvent): void {
  let node = event.params.node

  let domain = loadOrCreateDomain(node)
  domain.contenthash = event.params.hash
  domain.save()
}

// ── Text records (call handler) ───────────────────────────────────────────
//
// The TextChanged *event* marks `key` as indexed, which means the EVM stores
// keccak256(key) in the log topics — the original string is unrecoverable from
// the event alone. Using a callHandler for setText() gives us the actual key
// string from the transaction input data.
//
// If Abeychain trace APIs are unavailable, remove `callHandlers` from
// subgraph.yaml and uncomment the TextChanged event handler below instead.
// That fallback resolves the key string via a pre-known hash lookup.

import { SetTextCall } from "../generated/ANSResolver/ANSResolver"

export function handleSetText(call: SetTextCall): void {
  let node = call.inputs.node
  let key = call.inputs.key
  let value = call.inputs.value

  let recordId = node.toHexString() + "-" + key

  if (value.length == 0) {
    // Empty value → clear the record
    store.remove("TextRecord", recordId)
    return
  }

  let domain = loadOrCreateDomain(node)
  domain.save()

  let record = TextRecord.load(recordId)
  if (record == null) {
    record = new TextRecord(recordId)
    record.domain = node
    record.key = key
  }
  record.value = value
  record.save()
}

// ── Fallback: TextChanged event handler ──────────────────────────────────
//
// Use this if callHandlers are not available. Uncomment, add the TextChanged
// entry to subgraph.yaml eventHandlers, and remove the callHandlers block.
//
// Known keys are resolved back from their keccak256 topic hash.
// Unknown keys fall back to the raw 32-byte hash hex.
//
// import { TextChanged as TextChangedEvent } from "../generated/ANSResolver/ANSResolver"
// import { crypto, ByteArray } from "@graphprotocol/graph-ts"
//
// function resolveKey(keyHash: Bytes): string {
//   let h = keyHash.toHexString()
//   if (h == crypto.keccak256(ByteArray.fromUTF8("avatar")).toHexString())       return "avatar"
//   if (h == crypto.keccak256(ByteArray.fromUTF8("url")).toHexString())          return "url"
//   if (h == crypto.keccak256(ByteArray.fromUTF8("description")).toHexString())  return "description"
//   if (h == crypto.keccak256(ByteArray.fromUTF8("email")).toHexString())        return "email"
//   if (h == crypto.keccak256(ByteArray.fromUTF8("com.twitter")).toHexString())  return "com.twitter"
//   if (h == crypto.keccak256(ByteArray.fromUTF8("com.github")).toHexString())   return "com.github"
//   if (h == crypto.keccak256(ByteArray.fromUTF8("org.telegram")).toHexString()) return "org.telegram"
//   return h
// }
//
// export function handleTextChanged(event: TextChangedEvent): void {
//   let node   = event.params.node
//   let key    = resolveKey(event.params.key)   // params.key is Bytes (hash) here
//   let value  = event.params.value
//
//   let recordId = node.toHexString() + "-" + key
//
//   if (value.length == 0) {
//     store.remove("TextRecord", recordId)
//     return
//   }
//
//   let domain = loadOrCreateDomain(node)
//   domain.save()
//
//   let record = TextRecord.load(recordId)
//   if (record == null) {
//     record = new TextRecord(recordId)
//     record.domain = node
//     record.key = key
//   }
//   record.value = value
//   record.save()
// }
