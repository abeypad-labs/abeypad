import { ansApi } from "./api";
import { isAnsName, resolveAddressOrAns } from "./address";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Abi, Address } from "viem";
import { isAddress } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

export function useAnsPricing(
  name: string,
  years: number,
  chainId: number,
  beneficiary?: Address,
) {
  return useQuery({
    queryKey: ["ans", chainId, "pricing", name, years, beneficiary],
    queryFn: () => ansApi.pricing(name || undefined, years, chainId, beneficiary),
    staleTime: 60_000,
  });
}

export function useAnsOwnedNames(owner: Address | undefined, chainId: number) {
  return useQuery({
    queryKey: ["ans", chainId, "owned", owner],
    queryFn: () => ansApi.ownedNames(owner!, chainId),
    enabled: Boolean(owner),
    staleTime: 10_000,
  });
}

export function useResolvedAnsAddress(value: string, chainId: number) {
  const input = value.trim();
  return useQuery({
    queryKey: ["ans", chainId, "resolve-input", input.toLowerCase()],
    queryFn: () => resolveAddressOrAns(input, chainId),
    enabled: Boolean(input && (isAddress(input) || isAnsName(input))),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAnsMarketplaceData(chainId: number) {
  const primary = useQuery({ queryKey: ["ans", chainId, "primary-auctions"], queryFn: () => ansApi.primaryAuctions(chainId), staleTime: 10_000 });
  const listings = useQuery({ queryKey: ["ans", chainId, "listings"], queryFn: () => ansApi.listings(chainId), staleTime: 10_000 });
  const auctions = useQuery({ queryKey: ["ans", chainId, "market-auctions"], queryFn: () => ansApi.marketplaceAuctions(chainId), staleTime: 10_000 });
  const reserved = useQuery({ queryKey: ["ans", chainId, "reserved"], queryFn: () => ansApi.reserved(chainId), staleTime: 30_000 });
  return {
    primary: primary.data ?? [],
    listings: listings.data ?? [],
    auctions: auctions.data ?? [],
    reserved: reserved.data ?? [],
    isLoading: primary.isLoading || listings.isLoading || auctions.isLoading || reserved.isLoading,
    error: primary.error || listings.error || auctions.error || reserved.error,
  };
}

type ContractRequest = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
};

export function useAnsTransaction() {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const execute = async (request: ContractRequest, successMessage: string) => {
    try {
      const hash = await writeContractAsync(request as never);
      toast.info("Transaction submitted", { description: `${hash.slice(0, 10)}…` });
      await publicClient?.waitForTransactionReceipt({ hash });
      toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: ["ans"] });
      return hash;
    } catch (error) {
      const message =
        error && typeof error === "object" && "shortMessage" in error
          ? String(error.shortMessage)
          : error instanceof Error
            ? error.message
            : "Transaction failed";
      toast.error(message);
      throw error;
    }
  };

  return { execute, isPending };
}
