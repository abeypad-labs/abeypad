import { defineChain } from 'viem';

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


// export const OWNER = "0x8ed51aDf35BEAa024A868120EDbCd1843099F481";

// export const ABEY_NODE = "0x718b38b24b371815afa395a9ed641766bf7cf11fb5843cb970d7ef780ac07fb8" as `0x${string}`;

