import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "@/lib/hooks";
import { StakingContract } from "@/config";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isAddress, type Address, parseUnits } from "viem";

export function useStakingAdmin() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Transaction hashes for tracking status
  const [setApyTxHash, setSetApyTxHash] = useState<string | undefined>(undefined);
  const [addToWhitelistTxHash, setAddToWhitelistTxHash] = useState<string | undefined>(undefined);
  const [supplyRewardsTxHash, setSupplyRewardsTxHash] = useState<string | undefined>(undefined);
  const [releaseRewardsTxHash, setReleaseRewardsTxHash] = useState<string | undefined>(undefined);

  // Read contract owner for staking
  const { data: stakingOwner } = useReadContract({
    address: StakingContract.address,
    abi: StakingContract.abi,
    functionName: "owner",
  });

  // Check if user is staking owner
  const isStakingOwner = address?.toLowerCase() === (stakingOwner as string)?.toLowerCase();

  // Transaction receipts
  const { isSuccess: isSetApySuccess, isError: isSetApyError } = useWaitForTransactionReceipt({ 
    hash: setApyTxHash as `0x${string}` | undefined 
  });

  const { isSuccess: isAddToWhitelistSuccess, isError: isAddToWhitelistError } = useWaitForTransactionReceipt({ 
    hash: addToWhitelistTxHash as `0x${string}` | undefined 
  });

  const { isSuccess: isSupplyRewardsSuccess, isError: isSupplyRewardsError } = useWaitForTransactionReceipt({ 
    hash: supplyRewardsTxHash as `0x${string}` | undefined 
  });

  const { isSuccess: isReleaseRewardsSuccess, isError: isReleaseRewardsError } = useWaitForTransactionReceipt({ 
    hash: releaseRewardsTxHash as `0x${string}` | undefined 
  });

  // Admin Actions
  const setRewardApy = useCallback(async (apy: string) => {
    if (!apy || isNaN(Number(apy))) {
      toast.error("Please enter a valid APY value");
      return { success: false };
    }

    try {
      const apyValue = BigInt(Math.floor(Number(apy) * 100)); // Convert to basis points
      const hash = await writeContractAsync({
        address: StakingContract.address,
        abi: StakingContract.abi,
        functionName: "setRewardYieldForYear",
        args: [apyValue],
      });
      setSetApyTxHash(hash);
      toast.info("Setting reward APY...");
      return { success: true, hash };
    } catch (error: any) {
      toast.error(error.shortMessage || "Failed to set reward APY");
      return { success: false, error };
    }
  }, [writeContractAsync]);

  const addToWhitelist = useCallback(async (userAddress: string) => {
    if (!userAddress || !isAddress(userAddress)) {
      toast.error("Please enter a valid user address");
      return { success: false };
    }

    try {
      const hash = await writeContractAsync({
        address: StakingContract.address,
        abi: StakingContract.abi,
        functionName: "addToWhitelist",
        args: [userAddress as Address],
      });
      setAddToWhitelistTxHash(hash);
      toast.info("Adding user to whitelist...");
      return { success: true, hash };
    } catch (error: any) {
      toast.error(error.shortMessage || "Failed to add user to whitelist");
      return { success: false, error };
    }
  }, [writeContractAsync]);

  const supplyRewards = useCallback(async (amount: string) => {
    if (!amount || isNaN(Number(amount))) {
      toast.error("Please enter a valid reward amount");
      return { success: false };
    }

    try {
      const amountValue = parseUnits(amount, 18);
      const hash = await writeContractAsync({
        address: StakingContract.address,
        abi: StakingContract.abi,
        functionName: "supplyRewards",
        args: [amountValue],
      });
      setSupplyRewardsTxHash(hash);
      toast.info("Supplying rewards...");
      return { success: true, hash };
    } catch (error: any) {
      toast.error(error.shortMessage || "Failed to supply rewards");
      return { success: false, error };
    }
  }, [writeContractAsync]);

  const releaseRewards = useCallback(async () => {
    try {
      const hash = await writeContractAsync({
        address: StakingContract.address,
        abi: StakingContract.abi,
        functionName: "releaseRewards",
        args: [],
      });
      setReleaseRewardsTxHash(hash);
      toast.info("Releasing rewards...");
      return { success: true, hash };
    } catch (error: any) {
      toast.error(error.shortMessage || "Failed to release rewards");
      return { success: false, error };
    }
  }, [writeContractAsync]);

  return {
    // State
    isStakingOwner,
    stakingOwner,
    
    // Actions
    setRewardApy,
    addToWhitelist,
    supplyRewards,
    releaseRewards,
    
    // Transaction states
    isSetApySuccess,
    isSetApyError,
    isAddToWhitelistSuccess,
    isAddToWhitelistError,
    isSupplyRewardsSuccess,
    isSupplyRewardsError,
    isReleaseRewardsSuccess,
    isReleaseRewardsError,
  };
}