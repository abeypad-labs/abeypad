export const QF_CHAIN_ID = 3426;
export const QF_RPC_URL = "https://archive.mainnet.qfnode.net/eth";
export const QF_WS_RPC_URL = "wss://mainnet.qfnode.net";
export const QF_EXPLORER_URL = "https://portal.qfnetwork.xyz/?rpc=wss%3A%2F%2Fmainnet.qfnode.net#/explorer";

export const SUPPORTED_CHAIN_IDS = [QF_CHAIN_ID] as number[];
export const CHAIN_LABELS: Record<number, string> = {
    [QF_CHAIN_ID]: "QF Network",
};

export const EXPLORER_URLS_BY_CHAIN: Record<number, string> = {
    [QF_CHAIN_ID]: QF_EXPLORER_URL,
};

export const getExplorerUrl = (chainId?: number) => {
    if (chainId && EXPLORER_URLS_BY_CHAIN[chainId]) {
        return EXPLORER_URLS_BY_CHAIN[chainId];
    }
    return EXPLORER_URLS_BY_CHAIN[QF_CHAIN_ID];
};

export const EXPLORER_URL = getExplorerUrl(QF_CHAIN_ID);

export const OWNER = "0x8ed51aDf35BEAa024A868120EDbCd1843099F481";
