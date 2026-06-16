import { defineChain } from 'viem';
import { abey } from 'viem/chains';

export const abeychainDevnet = defineChain({
    id: 178,
    name: 'Abeychain Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'ABEY',
        symbol: 'ABEY',
    },
    rpcUrls: {
        default: {
            http: ['https://testrpc.abeychain.com'],
        },
    },
    blockExplorers: {
        default: { name: 'Abeyscan Testnet', url: 'https://testnet.abeyscan.com' },
    },
});

// Determine active network (defaulting to mainnet if not explicitly 'testnet')
export const IS_MAINNET = import.meta.env.VITE_NETWORK !== 'testnet';
export const ACTIVE_CHAIN = IS_MAINNET ? abey : abeychainDevnet;

export const ABEY_CHAIN_ID = ACTIVE_CHAIN.id;
export const ABEY_RPC_URL = ACTIVE_CHAIN.rpcUrls.default.http[0];
export const ABEY_EXPLORER_URL = ACTIVE_CHAIN.blockExplorers?.default.url || 'https://scan.abeychain.com';
export const ABEY_FAUCET_URL = IS_MAINNET ? '' : 'https://testnet-faucet.abeychain.com';

export const OWNER = "0x8ed51aDf35BEAa024A868120EDbCd1843099F481";

export const ABEY_NODE = "0x718b38b24b371815afa395a9ed641766bf7cf11fb5843cb970d7ef780ac07fb8" as `0x${string}`;

