import { defineChain } from 'viem';

export const abeychain = defineChain({
    id: 179,
    name: 'Abeychain',
    nativeCurrency: {
        decimals: 18,
        name: 'ABEY',
        symbol: 'ABEY',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.abeychain.com'],
        },
    },
    blockExplorers: {
        default: { name: 'Abeyscan', url: 'https://abeyscan.com' },
    },
});

export const ABEY_CHAIN_ID = 179;
export const ABEY_RPC_URL = "https://rpc.abeychain.com";
export const ABEY_EXPLORER_URL = "https://abeyscan.com";

export const OWNER = "0x8ed51aDf35BEAa024A868120EDbCd1843099F481";
