import { type Address } from 'viem';

export const CONTRACT_ADDRESSES = {
    tokenLocker: (import.meta.env.VITE_CONTRACT_TOKEN_LOCKER || "0x7f0780273548c2727eCEB424dA93dd19a2eBd4F7") as Address,
    airdropMultisender: (import.meta.env.VITE_CONTRACT_AIRDROP_MULTISENDER || "0x3CC91910B19587Dc1e6E9bA7Af2D2ddCd7F3fB64") as Address,
    tokenFactory: (import.meta.env.VITE_CONTRACT_TOKEN_FACTORY || "0x4b840A32914f48b897970fB14f72E0E926bf87D") as Address,
    presaleFactory: (import.meta.env.VITE_CONTRACT_PRESALE_FACTORY || "0xD9989D2F8E7d0cA9b86a2A23eE3693C225B90C88") as Address,
    nftFactory: (import.meta.env.VITE_CONTRACT_NFT_FACTORY || "0x0274619238c6C9d136e37b095f50DF47F79a9Da0") as Address,
    registry: (import.meta.env.VITE_CONTRACT_REGISTRY || "0x47b0fFb72934c9b97A66d39668b29dA373a49117") as Address,
    resolver: (import.meta.env.VITE_CONTRACT_RESOLVER || "0xb86c03f93d0Ab5542fb57CD8D04068E60cd086c4") as Address,
    registrar: (import.meta.env.VITE_CONTRACT_REGISTRAR || "0x68060d7182240f37779D6f7E7E963988b79D8C14") as Address,
};