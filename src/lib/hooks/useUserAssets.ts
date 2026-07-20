import { useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from '@/lib/hooks';
import {
  TokenFactory,
  NFTFactory,
  CONTRACT_ADDRESSES
} from '@/config';
import { erc20Abi } from 'viem';
import { LaunchpadNFTContract } from '@/config/abis/nft-factory';
import type { Address } from 'viem';
import { useUserAssetsStore } from '@/lib/store/user-assets-store';


const CACHE_REFRESH_INTERVAL = 30000; // 30 seconds

export function useUserTokens() {
  const { address } = useAccount();
  const { tokenFactory } = CONTRACT_ADDRESSES;

  const {
    getUserTokens,
    setUserTokens,
    setUserTokensLoading,
    isUserTokensStale,
  } = useUserAssetsStore();

  // Get cached data
  const cachedTokens = address ? getUserTokens(address) : null;
  const isStale = address ? isUserTokensStale(address) : true;
  const shouldFetch = !cachedTokens || isStale;

  // Get token addresses created by user
  const { data: tokenAddresses, isLoading: isLoadingAddresses } = useReadContract({
    abi: TokenFactory.abi,
    address: tokenFactory,
    functionName: 'tokensCreatedBy',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && shouldFetch,
      refetchInterval: CACHE_REFRESH_INTERVAL,
    },
  });

  // Ensure we're working with an array
  const safeTokenAddresses = Array.isArray(tokenAddresses) ? tokenAddresses : [];

  // Get token details for all tokens
  const tokenDetailsQueries = useMemo(() => {
    if (safeTokenAddresses.length === 0) return [];

    const queries: Array<{ abi: any; address: Address; functionName: string }> = [];
    safeTokenAddresses.forEach((tokenAddress) => {
      queries.push(
        {
          abi: erc20Abi,
          address: tokenAddress,
          functionName: 'name',
        },
        {
          abi: erc20Abi,
          address: tokenAddress,
          functionName: 'symbol',
        },
        {
          abi: erc20Abi,
          address: tokenAddress,
          functionName: 'decimals',
        },
        {
          abi: erc20Abi,
          address: tokenAddress,
          functionName: 'totalSupply',
        }
      );
    });
    return queries;
  }, [safeTokenAddresses]);

  const { data: tokenDetails, isLoading: isLoadingDetails } = useReadContracts({
    contracts: tokenDetailsQueries,
    query: {
      enabled: tokenDetailsQueries.length > 0 && !!address && shouldFetch,
    },
  });

  const isLoading = isLoadingAddresses || isLoadingDetails;

  // Process token details into structured format
  const processedTokens = useMemo(() => {
    if (safeTokenAddresses.length === 0 || !tokenDetails || tokenDetails.length === 0) return [];

    const tokens = [];
    const tokensPerAddress = 4; // name, symbol, decimals, totalSupply

    for (let i = 0; i < safeTokenAddresses.length; i++) {
      const baseIndex = i * tokensPerAddress;
      const nameResult = tokenDetails[baseIndex];
      const symbolResult = tokenDetails[baseIndex + 1];
      const decimalsResult = tokenDetails[baseIndex + 2];
      const totalSupplyResult = tokenDetails[baseIndex + 3];

      if (
        nameResult?.status === 'success' &&
        symbolResult?.status === 'success' &&
        decimalsResult?.status === 'success' &&
        totalSupplyResult?.status === 'success'
      ) {
        tokens.push({
          address: safeTokenAddresses[i],
          name: nameResult.result as string,
          symbol: symbolResult.result as string,
          decimals: decimalsResult.result as number,
          totalSupply: totalSupplyResult.result as bigint,
          createdAt: Date.now(),
        });
      }
    }

    return tokens;
  }, [safeTokenAddresses, tokenDetails]);

  // Update loading state
  useEffect(() => {
    if (address && isLoading) {
      setUserTokensLoading(address, true);
    }
  }, [address, isLoading, setUserTokensLoading]);

  // Update store with fetched data
  useEffect(() => {
    if (address && processedTokens.length > 0 && !isLoading) {
      setUserTokens(address, processedTokens);
    }
  }, [address, processedTokens, isLoading, setUserTokens]);

  return {
    tokens: cachedTokens || processedTokens,
    isLoading: !!address && isLoading,
    refetch: () => {
      // Force refresh by clearing cache
      if (address) {
        useUserAssetsStore.getState().clearUserAssetsCache(address);
      }
    },
  };
}

export function useUserNFTCollections() {
  const { address } = useAccount();
  const { nftFactory } = CONTRACT_ADDRESSES;

  const {
    getUserNFTCollections,
    setUserNFTCollections,
    setUserNFTsLoading,
    isUserNFTsStale,
  } = useUserAssetsStore();

  // Get cached data
  const cachedCollections = address ? getUserNFTCollections(address) : null;
  const isStale = address ? isUserNFTsStale(address) : true;
  const shouldFetch = !cachedCollections || isStale;

  // Get NFT collection addresses created by user
  const { data: collectionAddresses, isLoading: isLoadingAddresses } = useReadContract({
    abi: NFTFactory.abi,
    address: nftFactory,
    functionName: 'tokensCreatedBy',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && shouldFetch,
      refetchInterval: CACHE_REFRESH_INTERVAL,
    },
  });

  // Ensure we're working with an array
  const safeCollectionAddresses = Array.isArray(collectionAddresses) ? collectionAddresses : [];

  // Get collection details for all collections
  const collectionDetailsQueries = useMemo(() => {
    if (safeCollectionAddresses.length === 0) return [];

    const queries: Array<{ abi: any; address: Address; functionName: string }> = [];
    safeCollectionAddresses.forEach((collectionAddress) => {
      queries.push(
        {
          abi: LaunchpadNFTContract.abi,
          address: collectionAddress,
          functionName: 'name',
        },
        {
          abi: LaunchpadNFTContract.abi,
          address: collectionAddress,
          functionName: 'symbol',
        },
        {
          abi: LaunchpadNFTContract.abi,
          address: collectionAddress,
          functionName: 'totalSupply',
        }
      );
    });
    return queries;
  }, [safeCollectionAddresses]);

  const { data: collectionDetails, isLoading: isLoadingDetails } = useReadContracts({
    contracts: collectionDetailsQueries,
    query: {
      enabled: collectionDetailsQueries.length > 0 && !!address && shouldFetch,
    },
  });

  const isLoading = isLoadingAddresses || isLoadingDetails;

  // Process collection details into structured format
  const processedCollections = useMemo(() => {
    if (safeCollectionAddresses.length === 0 || !collectionDetails || collectionDetails.length === 0) return [];

    const collections = [];
    const detailsPerCollection = 3; // name, symbol, totalSupply

    for (let i = 0; i < safeCollectionAddresses.length; i++) {
      const baseIndex = i * detailsPerCollection;
      const nameResult = collectionDetails[baseIndex];
      const symbolResult = collectionDetails[baseIndex + 1];
      const totalSupplyResult = collectionDetails[baseIndex + 2];

      if (
        nameResult?.status === 'success' &&
        symbolResult?.status === 'success' &&
        totalSupplyResult?.status === 'success' &&
        address
      ) {
        collections.push({
          address: safeCollectionAddresses[i],
          name: nameResult.result as string,
          symbol: symbolResult.result as string,
          totalSupply: totalSupplyResult.result as bigint,
          owner: address,
          createdAt: Date.now(),
        });
      }
    }

    return collections;
  }, [safeCollectionAddresses, collectionDetails, address]);

  // Update loading state
  useEffect(() => {
    if (address && isLoading) {
      setUserNFTsLoading(address, true);
    }
  }, [address, isLoading, setUserNFTsLoading]);

  // Update store with fetched data
  useEffect(() => {
    if (address && processedCollections.length > 0 && !isLoading) {
      setUserNFTCollections(address, processedCollections);
    }
  }, [address, processedCollections, isLoading, setUserNFTCollections]);

  return {
    collections: cachedCollections || processedCollections,
    isLoading: !!address && isLoading,
    refetch: () => {
      // Force refresh by clearing cache
      if (address) {
        useUserAssetsStore.getState().clearUserAssetsCache(address);
      }
    },
  };
}

export function useUserTokenBalances() {
  const { address: userAddress } = useAccount();
  const { getUserTokens, getUserTokenBalance, setUserTokenBalance, isUserTokenBalancesStale } = useUserAssetsStore();

  // Get user's created tokens
  const userTokens = userAddress ? getUserTokens(userAddress) : null;
  const isStale = userAddress ? isUserTokenBalancesStale(userAddress) : true;
  const shouldFetch = !userTokens || isStale;

  // Get balances for all user tokens
  const balanceQueries = useMemo(() => {
    if (!userTokens || userTokens.length === 0 || !userAddress) return [];

    return userTokens.map((token) => ({
      abi: erc20Abi,
      address: token.address,
      functionName: 'balanceOf',
      args: [userAddress],
    }));
  }, [userTokens, userAddress]);

  const { data: balances, isLoading } = useReadContracts({
    contracts: balanceQueries,
    query: {
      enabled: balanceQueries.length > 0 && !!userAddress && shouldFetch,
      refetchInterval: CACHE_REFRESH_INTERVAL,
    },
  });

  // Update balances in store
  useEffect(() => {
    if (userAddress && userTokens && balances && !isLoading) {
      balances.forEach((balanceResult, index) => {
        if (balanceResult?.status === 'success' && userTokens[index]) {
          setUserTokenBalance(
            userAddress,
            userTokens[index].address,
            balanceResult.result as bigint
          );
        }
      });
    }
  }, [userAddress, userTokens, balances, isLoading, setUserTokenBalance]);

  // Get current balances from store
  const tokenBalances = useMemo(() => {
    if (!userAddress || !userTokens) return {};

    const balances: Record<string, bigint> = {};
    userTokens.forEach(token => {
      const balance = getUserTokenBalance(userAddress, token.address);
      if (balance !== null) {
        balances[token.address] = balance;
      }
    });

    return balances;
  }, [userAddress, userTokens, getUserTokenBalance]);

  return {
    balances: tokenBalances,
    isLoading: !!userAddress && isLoading,
    refetch: () => {
      // Force refresh by clearing cache
      if (userAddress) {
        useUserAssetsStore.getState().clearUserAssetsCache(userAddress);
      }
    },
  };
}

// Enhanced hook that combines all user asset data
export function useUserAssets() {
  const { tokens, isLoading: tokensLoading, refetch: refetchTokens } = useUserTokens();
  const { collections, isLoading: nftsLoading, refetch: refetchNFTs } = useUserNFTCollections();
  const { balances, isLoading: balancesLoading, refetch: refetchBalances } = useUserTokenBalances();

  return {
    tokens,
    collections,
    balances,
    isLoading: tokensLoading || nftsLoading || balancesLoading,
    refetch: () => {
      refetchTokens();
      refetchNFTs();
      refetchBalances();
    },
  };
}