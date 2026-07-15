import { type Address } from 'viem';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TokenLock {
  id: bigint;
  token: Address;
  owner: Address;
  amount: bigint;
  lockDate: bigint;
  unlockDate: bigint;
  withdrawn: boolean;
  name: string;
  description: string;
}

// Enhanced user assets tracking is now handled by useUserAssetsStore
// This store maintains backward compatibility for existing functionality

interface CacheMetadata {
  timestamp: number;
  isLoading: boolean;
}

interface BlockchainStore {
  // User Tokens Cache
  userTokens: Record<string, {
    tokens: Address[];
    metadata: CacheMetadata;
  }>;

  // User NFTs Cache
  userNFTs: Record<string, {
    tokens: Address[];
    metadata: CacheMetadata;
  }>;

  // User Locks Cache
  userLocks: Record<string, {
    lockIds: bigint[];
    locks: Record<string, TokenLock>;
    metadata: CacheMetadata;
  }>;

  // Presales Cache
  presales: {
    addresses: Address[];
    metadata: CacheMetadata;
  };

  // Actions for User Tokens
  setUserTokens: (address: string, tokens: Address[]) => void;
  setUserTokensLoading: (address: string, isLoading: boolean) => void;
  getUserTokens: (address: string) => Address[] | null;
  isUserTokensStale: (address: string, maxAge?: number) => boolean;

  // Actions for User NFTs
  setUserNFTs: (address: string, tokens: Address[]) => void;
  setUserNFTsLoading: (address: string, isLoading: boolean) => void;
  getUserNFTs: (address: string) => Address[] | null;

  // Actions for User Locks
  setUserLocks: (address: string, lockIds: bigint[]) => void;
  setUserLock: (address: string, lockId: bigint, lock: TokenLock) => void;
  setUserLocksLoading: (address: string, isLoading: boolean) => void;
  getUserLocks: (address: string) => bigint[] | null;
  getUserLock: (address: string, lockId: bigint) => TokenLock | null;
  isUserLocksStale: (address: string, maxAge?: number) => boolean;
  invalidateUserLock: (address: string, lockId: bigint) => void;

  // Actions for Presales
  setPresales: (addresses: Address[]) => void;
  setPresalesLoading: (isLoading: boolean) => void;
  getPresales: () => Address[] | null;
  isPresalesStale: (maxAge?: number) => boolean;

  // Clear cache
  clearCache: () => void;
  clearUserCache: (address: string) => void;
}

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export const useBlockchainStore = create<BlockchainStore>()(
  persist(
    (set, get) => ({
      // Initial state
      userTokens: {},
      userNFTs: {},
      userLocks: {},
      presales: {
        addresses: [],
        metadata: { timestamp: 0, isLoading: false },
      },

      // User Tokens Actions
      setUserTokens: (address, tokens) =>
        set((state) => ({
          userTokens: {
            ...state.userTokens,
            [address.toLowerCase()]: {
              tokens,
              metadata: { timestamp: Date.now(), isLoading: false },
            },
          },
        })),

      setUserTokensLoading: (address, isLoading) =>
        set((state) => ({
          userTokens: {
            ...state.userTokens,
            [address.toLowerCase()]: {
              tokens: state.userTokens[address.toLowerCase()]?.tokens || [],
              metadata: {
                timestamp: state.userTokens[address.toLowerCase()]?.metadata.timestamp || 0,
                isLoading,
              },
            },
          },
        })),

      getUserTokens: (address) => {
        const cached = get().userTokens[address.toLowerCase()];
        return cached ? cached.tokens : null;
      },

      isUserTokensStale: (address, maxAge = DEFAULT_CACHE_TIME) => {
        const cached = get().userTokens[address.toLowerCase()];
        if (!cached) return true;
        return Date.now() - cached.metadata.timestamp > maxAge;
      },

      // User NFTs Actions
      setUserNFTs: (address, tokens) =>
        set((state) => ({
          userNFTs: {
            ...state.userNFTs,
            [address.toLowerCase()]: {
              tokens,
              metadata: { timestamp: Date.now(), isLoading: false },
            },
          },
        })),

      setUserNFTsLoading: (address, isLoading) =>
        set((state) => ({
          userNFTs: {
            ...state.userNFTs,
            [address.toLowerCase()]: {
              tokens: state.userNFTs[address.toLowerCase()]?.tokens || [],
              metadata: {
                timestamp: state.userNFTs[address.toLowerCase()]?.metadata.timestamp || 0,
                isLoading,
              },
            },
          },
        })),

      getUserNFTs: (address) => {
        const cached = get().userNFTs[address.toLowerCase()];
        return cached ? cached.tokens : null;
      },

      // User Locks Actions
      setUserLocks: (address, lockIds) =>
        set((state) => ({
          userLocks: {
            ...state.userLocks,
            [address.toLowerCase()]: {
              lockIds,
              locks: state.userLocks[address.toLowerCase()]?.locks || {},
              metadata: { timestamp: Date.now(), isLoading: false },
            },
          },
        })),

      setUserLock: (address, lockId, lock) =>
        set((state) => ({
          userLocks: {
            ...state.userLocks,
            [address.toLowerCase()]: {
              lockIds: state.userLocks[address.toLowerCase()]?.lockIds || [],
              locks: {
                ...state.userLocks[address.toLowerCase()]?.locks,
                [lockId.toString()]: lock,
              },
              metadata: state.userLocks[address.toLowerCase()]?.metadata || {
                timestamp: Date.now(),
                isLoading: false,
              },
            },
          },
        })),

      setUserLocksLoading: (address, isLoading) =>
        set((state) => ({
          userLocks: {
            ...state.userLocks,
            [address.toLowerCase()]: {
              lockIds: state.userLocks[address.toLowerCase()]?.lockIds || [],
              locks: state.userLocks[address.toLowerCase()]?.locks || {},
              metadata: {
                timestamp: state.userLocks[address.toLowerCase()]?.metadata.timestamp || 0,
                isLoading,
              },
            },
          },
        })),

      getUserLocks: (address) => {
        const cached = get().userLocks[address.toLowerCase()];
        return cached ? cached.lockIds : null;
      },

      getUserLock: (address, lockId) => {
        const cached = get().userLocks[address.toLowerCase()];
        return cached?.locks[lockId.toString()] || null;
      },

      isUserLocksStale: (address, maxAge = DEFAULT_CACHE_TIME) => {
        const cached = get().userLocks[address.toLowerCase()];
        if (!cached) return true;
        return Date.now() - cached.metadata.timestamp > maxAge;
      },

      invalidateUserLock: (address, lockId) =>
        set((state) => {
          const userLocks = state.userLocks[address.toLowerCase()];
          if (!userLocks) return state;

          const { [lockId.toString()]: _, ...remainingLocks } = userLocks.locks;

          return {
            userLocks: {
              ...state.userLocks,
              [address.toLowerCase()]: {
                ...userLocks,
                locks: remainingLocks,
              },
            },
          };
        }),

      // Presales Actions
      setPresales: (addresses) =>
        set({
          presales: {
            addresses,
            metadata: { timestamp: Date.now(), isLoading: false },
          },
        }),

      setPresalesLoading: (isLoading) =>
        set((state) => ({
          presales: {
            ...state.presales,
            metadata: { ...state.presales.metadata, isLoading },
          },
        })),

      getPresales: () => {
        const { presales } = get();
        return presales.addresses.length > 0 ? presales.addresses : null;
      },

      isPresalesStale: (maxAge = DEFAULT_CACHE_TIME) => {
        const { presales } = get();
        if (!presales.metadata.timestamp) return true;
        return Date.now() - presales.metadata.timestamp > maxAge;
      },

      // Cache Management
      clearCache: () =>
        set({
          userTokens: {},
          userNFTs: {},
          userLocks: {},
          presales: {
            addresses: [],
            metadata: { timestamp: 0, isLoading: false },
          },
        }),

      clearUserCache: (address) =>
        set((state) => {
          const { [address.toLowerCase()]: _, ...restTokens } = state.userTokens;
          const { [address.toLowerCase()]: _nft, ...restNFTs } = state.userNFTs;
          const { [address.toLowerCase()]: __, ...restLocks } = state.userLocks;
          return {
            userTokens: restTokens,
            userNFTs: restNFTs,
            userLocks: restLocks,
          };
        }),
    }),
    {
      name: 'blockchain-storage',
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
      partialize: (state) => ({
        userTokens: Object.fromEntries(
          Object.entries(state.userTokens).map(([key, value]) => [
            key,
            { ...value, metadata: { ...value.metadata, isLoading: false } },
          ])
        ),
        userNFTs: Object.fromEntries(
          Object.entries(state.userNFTs).map(([key, value]) => [
            key,
            { ...value, metadata: { ...value.metadata, isLoading: false } },
          ])
        ),
        userLocks: Object.fromEntries(
          Object.entries(state.userLocks).map(([key, value]) => [
            key,
            { ...value, metadata: { ...value.metadata, isLoading: false } },
          ])
        ),
        presales: {
          ...state.presales,
          metadata: { ...state.presales.metadata, isLoading: false },
        },
      }) as BlockchainStore,
    }
  )
);
