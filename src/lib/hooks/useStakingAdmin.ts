import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "@/lib/hooks";
import { StakingContract } from "@/config";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isAddress, type Address, parseUnits } from "viem";

export function useStakingAdmin() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Transaction hashes for tracking status
  const [setApyTxHash, setSetApyTxHash] = useState<string | undefined>(
    undefined,
  );
  const [addToWhitelistTxHash, setAddToWhitelistTxHash] = useState<
    string | undefined
  >(undefined);
  const [supplyRewardsTxHash, setSupplyRewardsTxHash] = useState<
    string | undefined
  >(undefined);
  const [releaseRewardsTxHash, setReleaseRewardsTxHash] = useState<
    string | undefined
  >(undefined);
  const [isSetApySubmitting, setIsSetApySubmitting] = useState(false);
  const [isAddingToWhitelist, setIsAddingToWhitelist] = useState(false);
  const [isSupplyingRewards, setIsSupplyingRewards] = useState(false);
  const [isReleasingRewards, setIsReleasingRewards] = useState(false);

  // Read contract owner for staking
  const { data: stakingOwner } = useReadContract({
    address: StakingContract.address,
    abi: StakingContract.abi,
    functionName: "owner",
  });

  // Check if user is staking owner
  const isStakingOwner =
    address?.toLowerCase() === (stakingOwner as string)?.toLowerCase();

  // Transaction receipts
  const {
    isSuccess: isSetApySuccess,
    isError: isSetApyError,
    isLoading: isSetApyConfirming,
  } =
    useWaitForTransactionReceipt({
      hash: setApyTxHash as `0x${string}` | undefined,
    });

  const {
    isSuccess: isAddToWhitelistSuccess,
    isError: isAddToWhitelistError,
    isLoading: isAddToWhitelistConfirming,
  } = useWaitForTransactionReceipt({
      hash: addToWhitelistTxHash as `0x${string}` | undefined,
    });

  const {
    isSuccess: isSupplyRewardsSuccess,
    isError: isSupplyRewardsError,
    isLoading: isSupplyRewardsConfirming,
  } = useWaitForTransactionReceipt({
      hash: supplyRewardsTxHash as `0x${string}` | undefined,
    });

  const {
    isSuccess: isReleaseRewardsSuccess,
    isError: isReleaseRewardsError,
    isLoading: isReleaseRewardsConfirming,
  } = useWaitForTransactionReceipt({
      hash: releaseRewardsTxHash as `0x${string}` | undefined,
    });

  // Admin Actions
  const setRewardApy = useCallback(
    async (apy: string) => {
      if (!apy || isNaN(Number(apy))) {
        toast.error("Please enter a valid APY value");
        return { success: false };
      }

      setIsSetApySubmitting(true);
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
      } finally {
        setIsSetApySubmitting(false);
      }
    },
    [writeContractAsync],
  );

  const addToWhitelist = useCallback(
    async (userAddress: string) => {
      if (!userAddress || !isAddress(userAddress)) {
        toast.error("Please enter a valid user address");
        return { success: false };
      }

      setIsAddingToWhitelist(true);
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
      } finally {
        setIsAddingToWhitelist(false);
      }
    },
    [writeContractAsync],
  );

  const supplyRewards = useCallback(
    async (amount: string) => {
      if (!amount || isNaN(Number(amount))) {
        toast.error("Please enter a valid reward amount");
        return { success: false };
      }

      setIsSupplyingRewards(true);
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
      } finally {
        setIsSupplyingRewards(false);
      }
    },
    [writeContractAsync],
  );

  const releaseRewards = useCallback(async () => {
    setIsReleasingRewards(true);
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
    } finally {
      setIsReleasingRewards(false);
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
    isSetApyBusy: isSetApySubmitting || isSetApyConfirming,
    isAddToWhitelistBusy:
      isAddingToWhitelist || isAddToWhitelistConfirming,
    isSupplyRewardsBusy: isSupplyingRewards || isSupplyRewardsConfirming,
    isReleaseRewardsBusy: isReleasingRewards || isReleaseRewardsConfirming,
  };
}
