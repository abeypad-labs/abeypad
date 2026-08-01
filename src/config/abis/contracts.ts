import mainnetDeployment from "../deployments/abey-mainnet.json";
import testnetDeployment from "../deployments/abey-testnet.json";
import { getAddress, zeroAddress, type Address } from "viem";

export type ContractAddressMap = {
  tokenLocker: Address;
  airdropMultisender: Address;
  tokenFactory: Address;
  presaleFactory: Address;
  nftFactory: Address;
  nftFactoryLens: Address;
  registry: Address;
  resolver: Address;
  registrar: Address;
  auctionHouse: Address;
  marketplace: Address;
  stakeToken: Address;
  rewardToken: Address;
  staking: Address;
  nativeUSDC: Address;
};

export type AnsContractAddressMap = Pick<
  ContractAddressMap,
  "registry" | "resolver" | "registrar" | "auctionHouse" | "marketplace"
>;

function address(value: string): Address {
  return getAddress(value);
}

const testnetContracts: ContractAddressMap = {
  tokenLocker: address(testnetDeployment.contracts.TokenLocker.address),
  airdropMultisender: address(
    testnetDeployment.contracts.AirdropMultisender.address,
  ),
  tokenFactory: address(testnetDeployment.contracts.TokenFactory.address),
  presaleFactory: address(testnetDeployment.contracts.PresaleFactory.address),
  nftFactory: address(testnetDeployment.contracts.AbeyNFTFactory.address),
  nftFactoryLens: address(testnetDeployment.contracts.NFTFactoryLens.address),
  registry: address(testnetDeployment.contracts.ANSRegistryV2.address),
  resolver: address(testnetDeployment.contracts.ANSResolverV2.address),
  registrar: address(testnetDeployment.contracts.ANSRegistrarV2.address),
  auctionHouse: address(testnetDeployment.contracts.ANSAuctionHouse.address),
  marketplace: address(
    testnetDeployment.contracts.ANSMarketplaceEscrow.address,
  ),
  // Staking was not part of the redeployment and remains testnet-only.
  stakeToken: address("0xAf220dAFAa4B56e47Ab687269685916Ea81BFA8e"),
  rewardToken: address("0xAf220dAFAa4B56e47Ab687269685916Ea81BFA8e"),
  staking: address("0x11C3d68b9B9Cc09531BEcFb7dFc65d64b9a96bD9"),
  nativeUSDC: zeroAddress,
};

const mainnetContracts: ContractAddressMap = {
  tokenLocker: address(mainnetDeployment.contracts.TokenLocker.address),
  airdropMultisender: address(
    mainnetDeployment.contracts.AirdropMultisender.address,
  ),
  tokenFactory: address(mainnetDeployment.contracts.TokenFactory.address),
  presaleFactory: address(mainnetDeployment.contracts.PresaleFactory.address),
  nftFactory: address(mainnetDeployment.contracts.AbeyNFTFactory.address),
  nftFactoryLens: address(mainnetDeployment.contracts.NFTFactoryLens.address),
  registry: address(mainnetDeployment.contracts.ANSRegistryV2.address),
  resolver: address(mainnetDeployment.contracts.ANSResolverV2.address),
  registrar: address(mainnetDeployment.contracts.ANSRegistrarV2.address),
  auctionHouse: address(mainnetDeployment.contracts.ANSAuctionHouse.address),
  marketplace: address(
    mainnetDeployment.contracts.ANSMarketplaceEscrow.address,
  ),
  stakeToken: zeroAddress,
  rewardToken: zeroAddress,
  staking: zeroAddress,
  nativeUSDC: zeroAddress,
};

export const CONTRACT_ADDRESSES_BY_CHAIN = {
  178: testnetContracts,
  179: mainnetContracts,
} as const satisfies Record<number, ContractAddressMap>;

export function getContractAddresses(chainId: number): ContractAddressMap {
  const contracts =
    CONTRACT_ADDRESSES_BY_CHAIN[
      chainId as keyof typeof CONTRACT_ADDRESSES_BY_CHAIN
    ];
  if (!contracts) throw new Error(`No AbeyPad deployment for chain ${chainId}`);
  return contracts;
}

export function getAnsContractAddresses(chainId: number): AnsContractAddressMap {
  const { registry, resolver, registrar, auctionHouse, marketplace } =
    getContractAddresses(chainId);
  return { registry, resolver, registrar, auctionHouse, marketplace };
}
