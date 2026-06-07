import { type Address } from 'viem';
import { QF_CHAIN_ID } from './chains';

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

type ContractAddressMap = {
    tokenLocker: Address;
    nftFactory: Address;
    presaleFactory: Address;
    tokenFactory: Address;
    airdropMultisender: Address;
};

export const CONTRACT_ADDRESSES_BY_CHAIN: Record<number, ContractAddressMap> = {
    [QF_CHAIN_ID]: {
        tokenLocker: "0x85e149DD4f4474a5A43F378d31607c305fADE5Cf" as Address,
        nftFactory: "0xc8Cb98D60df20FE504f305043071ba6D4F462106" as Address,
        presaleFactory: "0xDC823a4A42eA47b932B2630f1e05E1De4302Bf0E" as Address,
        tokenFactory: "0xB3210Cd97fEadFAfB4637a28161195e81C00E12e" as Address,
        airdropMultisender: "0x9e361c49Cd918771A5af06C462ab0cc47519287c" as Address,
    },
};

export const NFT_FACTORY_LENS_BY_CHAIN: Record<number, Address> = {
    [QF_CHAIN_ID]: "0xFcE5DdC08f208fB8214AB2685C46E5b9Af13563d" as Address,
};

export const STAKING_CONTRACT_ADDRESSES_BY_CHAIN: Record<number, Address> = {
    [QF_CHAIN_ID]: ZERO_ADDRESS,
};

export const getStakingContractAddress = (chainId?: number) => {
    if (chainId && STAKING_CONTRACT_ADDRESSES_BY_CHAIN[chainId]) {
        return STAKING_CONTRACT_ADDRESSES_BY_CHAIN[chainId];
    }
    return STAKING_CONTRACT_ADDRESSES_BY_CHAIN[QF_CHAIN_ID];
};

export const getContractAddresses = (chainId?: number) => {
    if (chainId && CONTRACT_ADDRESSES_BY_CHAIN[chainId]) {
        return CONTRACT_ADDRESSES_BY_CHAIN[chainId];
    }
    return CONTRACT_ADDRESSES_BY_CHAIN[QF_CHAIN_ID];
};
