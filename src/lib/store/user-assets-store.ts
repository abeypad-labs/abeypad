import { type Address } from 'viem';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserToken {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  createdAt: number; // timestamp
}

export interface UserNFTCollection {
  address: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  owner: Address;
  createdAt: number; // timestamp
}

export interface UserTokenBalance {
  tokenAddress: Address;
  balance: bigint;
  timestamp: number;
}

interface CacheMetadata {
  timestamp: number;
  isLoading: boolean;
}

interface UserAssetsStore {
  // User Created Tokens
  userTokens: Record<string, {
    tokens: Record<string, UserToken>;
    metadata: CacheMetadata;
  }>;

  // User Created NFT Collections
  userNFTs: Record<string, {
    collections: Record<string, UserNFTCollection>;
    metadata: CacheMetadata;
  }>;

  // User Token Balances
  userTokenBalances: Record<string, {
    balances: Record<string, UserTokenBalance>;
    metadata: CacheMetadata;
  }>;

  // Actions for User Tokens
  setUserToken: (userAddress: string, token: UserToken) => void;
  setUserTokens: (userAddress: string, tokens: UserToken[]) => void;
  setUserTokensLoading: (userAddress: string, isLoading: boolean) => void;
  getUserTokens: (userAddress: string) => UserToken[] | null;
  getUserToken: (userAddress: string, tokenAddress: Address) => UserToken | null;
  isUserTokensStale: (userAddress: string, maxAge?: number) => boolean;
  removeUserToken: (userAddress: string, tokenAddress: Address) => void;

  // Actions for User NFT Collections
  setUserNFTCollection: (userAddress: string, collection: UserNFTCollection) => void;
  setUserNFTCollections: (userAddress: string, collections: UserNFTCollection[]) => void;
  setUserNFTsLoading: (userAddress: string, isLoading: boolean) => void;
  getUserNFTCollections: (userAddress: string) => UserNFTCollection[] | null;
  getUserNFTCollection: (userAddress: string, collectionAddress: Address) => UserNFTCollection | null;
  isUserNFTsStale: (userAddress: string, maxAge?: number) => boolean;
  removeUserNFTCollection: (userAddress: string, collectionAddress: Address) => void;

  // Actions for User Token Balances
  setUserTokenBalance: (userAddress: string, tokenAddress: Address, balance: bigint) => void;
  getUserTokenBalance: (userAddress: string, tokenAddress: Address) => bigint | null;
  isUserTokenBalancesStale: (userAddress: string, maxAge?: number) => boolean;

  // Cache Management
  clearUserAssetsCache: (userAddress: string) => void;
  clearAllAssetsCache: () => void;
}

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export const useUserAssetsStore = create<UserAssetsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      userTokens: {},
      userNFTs: {},
      userTokenBalances: {},

      // User Tokens Actions
      setUserToken: (userAddress, token) =>
        set((state) => ({
          userTokens: {
            ...state.userTokens,
            [userAddress.toLowerCase()]: {
              tokens: {
                ...state.userTokens[userAddress.toLowerCase()]?.tokens,
                [token.address.toLowerCase()]: token,
              },
              metadata: {
                timestamp: Date.now(),
                isLoading: false,
              },
            },
          },
        })),

      setUserTokens: (userAddress, tokens) =>
        set((state) => ({
          userTokens: {
            ...state.userTokens,
            [userAddress.toLowerCase()]: {
              tokens: tokens.reduce((acc, token) => ({
                ...acc,
                [token.address.toLowerCase()]: token,
              }), {}),
              metadata: {
                timestamp: Date.now(),
                isLoading: false,
              },
            },
          },
        })),

      setUserTokensLoading: (userAddress, isLoading) =>
        set((state) => {
          const currentUserTokens = state.userTokens[userAddress.toLowerCase()];
          return {
            userTokens: {
              ...state.userTokens,
              [userAddress.toLowerCase()]: {
                tokens: currentUserTokens?.tokens || {},
                metadata: {
                  timestamp: currentUserTokens?.metadata.timestamp || 0,
                  isLoading,
                },
              },
            },
          };
        }),

      getUserTokens: (userAddress) => {
        const cached = get().userTokens[userAddress.toLowerCase()];
        if (!cached) return null;
        return Object.values(cached.tokens);
      },

      getUserToken: (userAddress, tokenAddress) => {
        const cached = get().userTokens[userAddress.toLowerCase()];
        if (!cached) return null;
        return cached.tokens[tokenAddress.toLowerCase()] || null;
      },

      isUserTokensStale: (userAddress, maxAge = DEFAULT_CACHE_TIME) => {
        const cached = get().userTokens[userAddress.toLowerCase()];
        if (!cached) return true;
        return Date.now() - cached.metadata.timestamp > maxAge;
      },

      removeUserToken: (userAddress, tokenAddress) =>
        set((state) => {
          const userTokens = state.userTokens[userAddress.toLowerCase()];
          if (!userTokens) return state;

          const { [tokenAddress.toLowerCase()]: _, ...remainingTokens } = userTokens.tokens;

          return {
            userTokens: {
              ...state.userTokens,
              [userAddress.toLowerCase()]: {
                ...userTokens,
                tokens: remainingTokens,
              },
            },
          };
        }),

      // User NFT Collections Actions
      setUserNFTCollection: (userAddress, collection) =>
        set((state) => ({
          userNFTs: {
            ...state.userNFTs,
            [userAddress.toLowerCase()]: {
              collections: {
                ...state.userNFTs[userAddress.toLowerCase()]?.collections,
                [collection.address.toLowerCase()]: collection,
              },
              metadata: {
                timestamp: Date.now(),
                isLoading: false,
              },
            },
          },
        })),

      setUserNFTCollections: (userAddress, collections) =>
        set((state) => ({
          userNFTs: {
            ...state.userNFTs,
            [userAddress.toLowerCase()]: {
              collections: collections.reduce((acc, collection) => ({
                ...acc,
                [collection.address.toLowerCase()]: collection,
              }), {}),
              metadata: {
                timestamp: Date.now(),
                isLoading: false,
              },
            },
          },
        })),

      setUserNFTsLoading: (userAddress, isLoading) =>
        set((state) => {
          const currentUserNFTs = state.userNFTs[userAddress.toLowerCase()];
          return {
            userNFTs: {
              ...state.userNFTs,
              [userAddress.toLowerCase()]: {
                collections: currentUserNFTs?.collections || {},
                metadata: {
                  timestamp: currentUserNFTs?.metadata.timestamp || 0,
                  isLoading,
                },
              },
            },
          };
        }),

      getUserNFTCollections: (userAddress) => {
        const cached = get().userNFTs[userAddress.toLowerCase()];
        if (!cached) return null;
        return Object.values(cached.collections);
      },

      getUserNFTCollection: (userAddress, collectionAddress) => {
        const cached = get().userNFTs[userAddress.toLowerCase()];
        if (!cached) return null;
        return cached.collections[collectionAddress.toLowerCase()] || null;
      },

      isUserNFTsStale: (userAddress, maxAge = DEFAULT_CACHE_TIME) => {
        const cached = get().userNFTs[userAddress.toLowerCase()];
        if (!cached) return true;
        return Date.now() - cached.metadata.timestamp > maxAge;
      },

      removeUserNFTCollection: (userAddress, collectionAddress) =>
        set((state) => {
          const userNFTs = state.userNFTs[userAddress.toLowerCase()];
          if (!userNFTs) return state;

          const { [collectionAddress.toLowerCase()]: _, ...remainingCollections } = userNFTs.collections;

          return {
            userNFTs: {
              ...state.userNFTs,
              [userAddress.toLowerCase()]: {
                ...userNFTs,
                collections: remainingCollections,
              },
            },
          };
        }),

      // User Token Balances Actions
      setUserTokenBalance: (userAddress, tokenAddress, balance) =>
        set((state) => ({
          userTokenBalances: {
            ...state.userTokenBalances,
            [userAddress.toLowerCase()]: {
              balances: {
                ...state.userTokenBalances[userAddress.toLowerCase()]?.balances,
                [tokenAddress.toLowerCase()]: {
                  tokenAddress,
                  balance,
                  timestamp: Date.now(),
                },
              },
              metadata: {
                timestamp: Date.now(),
                isLoading: false,
              },
            },
          },
        })),

      getUserTokenBalance: (userAddress, tokenAddress) => {
        const cached = get().userTokenBalances[userAddress.toLowerCase()];
        if (!cached) return null;
        const balanceEntry = cached.balances[tokenAddress.toLowerCase()];
        return balanceEntry ? balanceEntry.balance : null;
      },

      isUserTokenBalancesStale: (userAddress, maxAge = DEFAULT_CACHE_TIME) => {
        const cached = get().userTokenBalances[userAddress.toLowerCase()];
        if (!cached) return true;
        return Date.now() - cached.metadata.timestamp > maxAge;
      },

      // Cache Management
      clearUserAssetsCache: (userAddress) =>
        set((state) => {
          const lowerUserAddress = userAddress.toLowerCase();
          const { [lowerUserAddress]: _, ...restTokens } = state.userTokens;
          const { [lowerUserAddress]: __, ...restNFTs } = state.userNFTs;
          const { [lowerUserAddress]: ___, ...restBalances } = state.userTokenBalances;
          return {
            userTokens: restTokens,
            userNFTs: restNFTs,
            userTokenBalances: restBalances,
          };
        }),

      clearAllAssetsCache: () =>
        set({
          userTokens: {},
          userNFTs: {},
          userTokenBalances: {},
        }),
    }),
    {
      name: 'user-assets-storage',
      // Custom storage to handle BigInt serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str, (_, value) => {
            if (typeof value === 'string' && value.startsWith('__bigint__:')) {
              return BigInt(value.slice(11));
            }
            return value;
          });
        },
        setItem: (name, value) => {
          localStorage.setItem(
            name,
            JSON.stringify(value, (_, val) => {
              if (typeof val === 'bigint') {
                return `__bigint__:${val.toString()}`;
              }
              return val;
            })
          );
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Only persist the data, not loading states
      partialize: (state) => {
        // Remove loading states from persisted data
        const cleanUserTokens = Object.fromEntries(
          Object.entries(state.userTokens).map(([key, value]) => [
            key,
            { ...value, metadata: { ...value.metadata, isLoading: false } },
          ])
        );
        
        const cleanUserNFTs = Object.fromEntries(
          Object.entries(state.userNFTs).map(([key, value]) => [
            key,
            { ...value, metadata: { ...value.metadata, isLoading: false } },
          ])
        );
        
        const cleanUserTokenBalances = Object.fromEntries(
          Object.entries(state.userTokenBalances).map(([key, value]) => [
            key,
            { ...value, metadata: { ...value.metadata, isLoading: false } },
          ])
        );

        return {
          userTokens: cleanUserTokens,
          userNFTs: cleanUserNFTs,
          userTokenBalances: cleanUserTokenBalances,
        } as UserAssetsStore;
      },
    }
  )
);