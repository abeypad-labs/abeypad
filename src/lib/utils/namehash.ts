import { concat, keccak256, toBytes } from "viem";

export function namehash(name: string): `0x${string}` {
  let node: `0x${string}` = `0x${"00".repeat(32)}`;
  if (!name) return node;
  const labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(toBytes(labels[i]));
    node = keccak256(concat([node, labelHash]));
  }
  return node;
}
