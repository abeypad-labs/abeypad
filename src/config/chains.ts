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