import "dotenv/config";
import { getAddress, type Address, type Hex } from "viem";
import { z } from "zod";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.coerce.boolean().default(true),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  PORT: z.coerce.number().int().positive().default(8788),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ABEY_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  ABEY_TESTNET_RPC_URL: z.string().url().default("https://testrpc.abeychain.com"),
  ABEY_MAINNET_RPC_URL: z.string().url().default("https://rpc.abeychain.com"),
  ANS_PRICE_SIGNER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  ANS_TESTNET_ADMIN_WALLET: addressSchema.optional(),
  ANS_PRICE_QUOTE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  ABEY_PRICE_SOURCE_URL: z
    .string()
    .url()
    .default("https://api.coingecko.com/api/v3/simple/price?ids=abey&vs_currencies=usd"),
  ABEY_PRICE_FALLBACK_USD: z.coerce.number().positive().default(0.01477813),
  ABEY_PRICE_SOURCE_REFRESH_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  ANS_SYNC_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  // Abey's public RPC currently rejects eth_getLogs ranges wider than 10 blocks.
  ANS_SYNC_CHUNK_SIZE: z.coerce.number().int().min(1).max(10).default(10),
  ANS_REALTIME_LOOKBACK_BLOCKS: z.coerce.number().int().min(10).max(5_000).default(250),
  ANS_HISTORICAL_CHUNKS_PER_RUN: z.coerce.number().int().positive().max(100).default(10),
  ANS_PUBLIC_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  ANS_REGISTRY_ADDRESS: addressSchema.optional(),
  ANS_RESOLVER_ADDRESS: addressSchema.optional(),
  ANS_REGISTRAR_ADDRESS: addressSchema.optional(),
  ANS_AUCTION_HOUSE_ADDRESS: addressSchema.optional(),
  ANS_MARKETPLACE_ADDRESS: addressSchema.optional(),
});

const env = envSchema.parse(process.env);

export type NetworkName = "testnet" | "mainnet";

export type Deployment = {
  network: NetworkName;
  chainId: 178 | 179;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  startBlock: bigint;
  contracts: {
    registry: Address;
    resolver: Address;
    registrar: Address;
    auctionHouse: Address;
    marketplace: Address;
    tokenFactory: Address;
    tokenLocker: Address;
    presaleFactory: Address;
    nftFactory: Address;
    nftFactoryLens: Address;
    airdropMultisender: Address;
  };
};

const deployments: Record<NetworkName, Deployment> = {
  testnet: {
    network: "testnet",
    chainId: 178,
    name: "Abey Testnet",
    rpcUrl: env.ABEY_TESTNET_RPC_URL,
    explorerUrl: "https://testnet.abeyscan.com",
    startBlock: 14_923_478n,
    contracts: {
      registry: getAddress("0x436d3eb15f3556796b02a3f13dd00599f92b00ba"),
      resolver: getAddress("0xfd5242067c3b84b74a09671669c0be2b2fd1a09b"),
      registrar: getAddress("0x181ecfaada05368754bf199bbc25111605e266f6"),
      auctionHouse: getAddress("0x4aa5f6907094474afd56d243dbdc27f7cf09b381"),
      marketplace: getAddress("0xfb3340c63e20ef0bc9865ebc927b60bfaf83b568"),
      tokenFactory: getAddress("0x89ec55d8c7a3c6a1e8bf9b9e570ccb3b27ec3e0f"),
      tokenLocker: getAddress("0xd807e6f0f00eb3334193017b735d2fca00573d57"),
      presaleFactory: getAddress("0xba289b92051eb4f649ebf6396b564474835e9015"),
      nftFactory: getAddress("0xe5dd5e7a79b4d0071d2d5313d15f4fb240d52378"),
      nftFactoryLens: getAddress("0x991698c777a45588f3dd628d7783cb4fd69f0326"),
      airdropMultisender: getAddress("0x623a156154a3d9726090700745cbb8223d2b5cd6"),
    },
  },
  mainnet: {
    network: "mainnet",
    chainId: 179,
    name: "Abey Mainnet",
    rpcUrl: env.ABEY_MAINNET_RPC_URL,
    explorerUrl: "https://abeyscan.com",
    startBlock: 33_122_564n,
    contracts: {
      registry: getAddress("0x96accaf440d4d4b2ae83a5b59d47fd90e46230b0"),
      resolver: getAddress("0xb4c31237e396dd2872a366030f07a323023e61e4"),
      registrar: getAddress("0x6f69f39d097f5132bf8bda7d9fe273cd2893c288"),
      auctionHouse: getAddress("0xe5d3c1d4b5b2e1906bdcb0bd292f2f1f411d60b6"),
      marketplace: getAddress("0x6d61766a4268f42ab438bca0ddf0284e47317c64"),
      tokenFactory: getAddress("0xa59563b7372da30d1399c171b8a85bf1bbb212cc"),
      tokenLocker: getAddress("0xb9f85b2a9a7781b092894da728673288cdede844"),
      presaleFactory: getAddress("0x9d0e13e1c6e765c8b03c4d315bb755d5a487af5e"),
      nftFactory: getAddress("0xc8d5b829cc51deb656237369d08e696974f5b2e8"),
      nftFactoryLens: getAddress("0xa3adb1692a1d04967d4627b3da50c9ff6bdafb8e"),
      airdropMultisender: getAddress("0xca535b30c1d334358159c1d6f408d4ab1cc6e0e0"),
    },
  },
};

const selected = deployments[env.ABEY_NETWORK];
const overrideContracts = {
  ...selected.contracts,
  ...(env.ANS_REGISTRY_ADDRESS ? { registry: getAddress(env.ANS_REGISTRY_ADDRESS) } : {}),
  ...(env.ANS_RESOLVER_ADDRESS ? { resolver: getAddress(env.ANS_RESOLVER_ADDRESS) } : {}),
  ...(env.ANS_REGISTRAR_ADDRESS ? { registrar: getAddress(env.ANS_REGISTRAR_ADDRESS) } : {}),
  ...(env.ANS_AUCTION_HOUSE_ADDRESS
    ? { auctionHouse: getAddress(env.ANS_AUCTION_HOUSE_ADDRESS) }
    : {}),
  ...(env.ANS_MARKETPLACE_ADDRESS ? { marketplace: getAddress(env.ANS_MARKETPLACE_ADDRESS) } : {}),
};

export const config = {
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  databaseSsl: env.DATABASE_SSL,
  dbPoolMax: env.DB_POOL_MAX,
  port: env.PORT,
  corsOrigins: env.CORS_ORIGIN.split(",").map((value) => value.trim()),
  deployment: { ...selected, contracts: overrideContracts },
  deployments,
  ansPriceSignerPrivateKey: env.ANS_PRICE_SIGNER_PRIVATE_KEY as Hex | undefined,
  ansTestnetAdminWallet: env.ANS_TESTNET_ADMIN_WALLET
    ? getAddress(env.ANS_TESTNET_ADMIN_WALLET)
    : undefined,
  ansPriceQuoteTtlSeconds: env.ANS_PRICE_QUOTE_TTL_SECONDS,
  abeyPriceSourceUrl: env.ABEY_PRICE_SOURCE_URL,
  abeyPriceFallbackUsd: env.ABEY_PRICE_FALLBACK_USD,
  abeyPriceSourceRefreshIntervalMs: env.ABEY_PRICE_SOURCE_REFRESH_INTERVAL_MS,
  ansSyncIntervalSeconds: env.ANS_SYNC_INTERVAL_SECONDS,
  ansSyncChunkSize: env.ANS_SYNC_CHUNK_SIZE,
  ansRealtimeLookbackBlocks: env.ANS_REALTIME_LOOKBACK_BLOCKS,
  ansHistoricalChunksPerRun: env.ANS_HISTORICAL_CHUNKS_PER_RUN,
  ansPublicRateLimitPerMinute: env.ANS_PUBLIC_RATE_LIMIT_PER_MINUTE,
} as const;
