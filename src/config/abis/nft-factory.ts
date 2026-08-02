import nftFactoryAbi from "./generated/AbeyNFTFactory.json";
import type { Abi } from "viem";

export const NFTFactory = {
  abi: nftFactoryAbi as Abi,
} as const;

export const LaunchpadNFTContract = {
  abi: [
    {
      type: "function",
      name: "name",
      inputs: [],
      outputs: [{ name: "", type: "string", internalType: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "symbol",
      inputs: [],
      outputs: [{ name: "", type: "string", internalType: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "maxSupply",
      inputs: [],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "totalMinted",
      inputs: [],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "mintPrice",
      inputs: [],
      outputs: [{ name: "", type: "uint128", internalType: "uint128" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "mint",
      inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
      outputs: [],
      stateMutability: "payable",
    },
  ],
};
