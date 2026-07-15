import { AdminRoute } from "@/components/admin/AdminRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/lib/hooks";
import { useFactoryOwner, useFeeRecipient } from "@/lib/utils/admin";
import { useSetFeeRecipient } from "@/lib/hooks/useAdminActions";
import { useLaunchpadPresales } from "@/lib/hooks/useLaunchpadPresales";
import { useStakingAdmin } from "@/lib/hooks/useStakingAdmin";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { isAddress, type Address } from "viem";
import { Users, Coins, ArrowRight, PlusCircle, CoinsIcon, UserPlus, Lock, Zap } from "lucide-react";
import { getFriendlyTxErrorMessage } from "@/lib/utils/tx-errors";

function AdminDashboardContent() {
  const { address } = useAccount();
  const { factoryOwner, isLoading: isLoadingOwner } = useFactoryOwner();
  const { feeRecipient, isLoading: isLoadingFeeRecipient, refetch: refetchFeeRecipient } = useFeeRecipient();
  const { presales, isLoading: isLoadingPresales } = useLaunchpadPresales("all");
  
  // Fee recipient management
  const [newFeeRecipient, setNewFeeRecipient] = useState("");

  const handleFeeRecipientConfirmed = useCallback(() => {
    toast.success("Fee recipient updated successfully");
    setNewFeeRecipient("");
    refetchFeeRecipient();
  }, [refetchFeeRecipient]);

  const {
    setFeeRecipient,
    isBusy: isSettingFeeRecipient,
    isError: isFeeRecipientError,
    error: feeRecipientError,
    reset: resetFeeRecipient,
  } = useSetFeeRecipient({ onConfirmed: handleFeeRecipientConfirmed });

  useEffect(() => {
    if (isFeeRecipientError && feeRecipientError) {
      toast.error(getFriendlyTxErrorMessage(feeRecipientError, "Update fee recipient"));
      resetFeeRecipient();
    }
  }, [isFeeRecipientError, feeRecipientError, resetFeeRecipient]);

  const handleSetFeeRecipient = () => {
    if (!newFeeRecipient || !isAddress(newFeeRecipient)) {
      toast.error("Please enter a valid address");
      return;
    }
    setFeeRecipient(newFeeRecipient as Address);
  };

  // Presale stats
  const totalPresales = presales?.length ?? 0;
  const livePresales = presales?.filter((p) => p.status === "live").length ?? 0;
  const upcomingPresales = presales?.filter((p) => p.status === "upcoming").length ?? 0;
  const endedPresales = presales?.filter((p) => p.status === "ended" || p.status === "finalized" || p.status === "cancelled").length ?? 0;

  // Staking Admin State
  const [rewardAPY, setRewardAPY] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [userToWhitelist, setUserToWhitelist] = useState("");
  
  // Staking Admin Hook
  const {
    isStakingOwner,
    stakingOwner,
    setRewardApy,
    addToWhitelist,
    supplyRewards,
    releaseRewards,
    isSetApySuccess,
    isSetApyError,
    isAddToWhitelistSuccess,
    isAddToWhitelistError,
    isSupplyRewardsSuccess,
    isSupplyRewardsError,
    isReleaseRewardsSuccess,
    isReleaseRewardsError,
  } = useStakingAdmin();
  
  // Handle staking transaction results
  useEffect(() => {
    if (isSetApySuccess) {
      toast.success("APY set successfully!");
    }
    if (isSetApyError) {
      toast.error("Failed to set APY");
    }
  }, [isSetApySuccess, isSetApyError]);
  
  useEffect(() => {
    if (isAddToWhitelistSuccess) {
      toast.success("User added to whitelist!");
      setUserToWhitelist("");
    }
    if (isAddToWhitelistError) {
      toast.error("Failed to add user to whitelist");
    }
  }, [isAddToWhitelistSuccess, isAddToWhitelistError]);
  
  useEffect(() => {
    if (isSupplyRewardsSuccess) {
      toast.success("Rewards supplied successfully!");
      setRewardAmount("");
    }
    if (isSupplyRewardsError) {
      toast.error("Failed to supply rewards");
    }
  }, [isSupplyRewardsSuccess, isSupplyRewardsError]);
  
  useEffect(() => {
    if (isReleaseRewardsSuccess) {
      toast.success("Rewards released successfully!");
    }
    if (isReleaseRewardsError) {
      toast.error("Failed to release rewards");
    }
  }, [isReleaseRewardsSuccess, isReleaseRewardsError]);
  
  // Admin Actions
  const handleSetRewardApy = async () => {
    const result = await setRewardApy(rewardAPY);
    if (result.success) {
      setRewardAPY("");
    }
  };
  
  const handleAddToWhitelist = async () => {
    const result = await addToWhitelist(userToWhitelist);
    if (result.success) {
      setUserToWhitelist("");
    }
  };
  
  const handleSupplyRewards = async () => {
    const result = await supplyRewards(rewardAmount);
    if (result.success) {
      setRewardAmount("");
    }
  };
  
  const handleReleaseRewards = async () => {
    await releaseRewards();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="border-b-4 border-black bg-[#FFE38A] p-6 shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-wider">Admin Dashboard</h1>
        </div>
      </div>

      {/* Admin Info */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black bg-white">
            <CardTitle className="font-black uppercase tracking-wider">Factory Owner</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingOwner ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <p className="font-mono text-sm break-all">{factoryOwner}</p>
            )}
            {address?.toLowerCase() === factoryOwner?.toLowerCase() && (
              <p className="text-green-600 text-sm mt-2 font-bold">✓ You are the factory owner</p>
            )}
          </CardContent>
        </Card>

        <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black bg-white">
            <CardTitle className="font-black uppercase tracking-wider">Fee Recipient</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingFeeRecipient ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <p className="font-mono text-sm break-all">{feeRecipient}</p>
            )}
            {address?.toLowerCase() === feeRecipient?.toLowerCase() && (
              <p className="text-green-600 text-sm mt-2 font-bold">✓ You are the fee recipient</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] bg-[#42C9FF]">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Total Presales</p>
            <p className="text-3xl font-black">{isLoadingPresales ? "..." : totalPresales}</p>
          </CardContent>
        </Card>
        <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] bg-[#90EE90]">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Live</p>
            <p className="text-3xl font-black">{isLoadingPresales ? "..." : livePresales}</p>
          </CardContent>
        </Card>
        <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] bg-[#FFE38A]">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Upcoming</p>
            <p className="text-3xl font-black">{isLoadingPresales ? "..." : upcomingPresales}</p>
          </CardContent>
        </Card>
        <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] bg-[#FFB6C1]">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">Ended</p>
            <p className="text-3xl font-black">{isLoadingPresales ? "..." : endedPresales}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Link to="/admin/create-presale">
          <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#FF7F41] border-2 border-black">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-wider">Create Presale</p>
                  <p className="text-sm text-gray-600">Deploy a presale contract</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/presales">
          <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#42C9FF] border-2 border-black">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-wider">Manage Presales</p>
                  <p className="text-sm text-gray-600">View all presales, update fees</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/whitelist">
          <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#90EE90] border-2 border-black">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-wider">Whitelist Creators </p>
                  <p className="text-sm text-gray-600">Creator whitelist config</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/dashboard/staking">
          <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer bg-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#B8EF53] border-2 border-black">
                  <CoinsIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-wider">Staking Dashboard</p>
                  <p className="text-sm text-gray-600">Manage staking pools</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Staking Admin Section */}
      <div className="mb-8">
        <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black bg-[#F5CF85]">
            <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Staking Admin Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Set Reward APY */}
              <Card className="before:hidden border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
                <CardHeader className="border-b border-black bg-[#42C9FF] p-4">
                  <CardTitle className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Set Reward APY
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-sm text-gray-700">
                    Initialize or update the annual percentage yield for staking rewards.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="APY (e.g., 12 for 12%)"
                      value={rewardAPY}
                      onChange={(e) => setRewardAPY(e.target.value)}
                      className="border-2 border-black font-mono flex-1"
                    />
                    <Button
                      onClick={handleSetRewardApy}
                      className="border-2 border-black bg-[#42C9FF] text-black font-black uppercase tracking-wider shadow-[2px_2px_0_rgba(0,0,0,1)] hover:bg-[#31BEEB] whitespace-nowrap"
                    >
                      Set APY
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Call setRewardYieldForYear(uint256 rewardApy)
                  </p>
                </CardContent>
              </Card>

              {/* Add to Whitelist */}
              <Card className="before:hidden border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
                <CardHeader className="border-b border-black bg-[#90EE90] p-4">
                  <CardTitle className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add to Whitelist
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-sm text-gray-700">
                    Allow specific users to participate in staking.
                  </p>
                  <div className="space-y-2">
                    <Input
                      placeholder="User address (0x...)"
                      value={userToWhitelist}
                      onChange={(e) => setUserToWhitelist(e.target.value)}
                      className="border-2 border-black font-mono"
                    />
                    <Button
                      onClick={handleAddToWhitelist}
                      className="w-full border-2 border-black bg-[#90EE90] text-black font-black uppercase tracking-wider shadow-[2px_2px_0_rgba(0,0,0,1)] hover:bg-[#7CD87C]"
                    >
                      Add to Whitelist
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Call addToWhitelist(address account)
                  </p>
                </CardContent>
              </Card>

              {/* Supply Rewards */}
              <Card className="before:hidden border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
                <CardHeader className="border-b border-black bg-[#FF7F41] p-4">
                  <CardTitle className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
                    <CoinsIcon className="w-4 h-4" />
                    Supply Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-sm text-gray-700">
                    Fund the rewards pool with reward tokens.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Reward amount"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      className="border-2 border-black font-mono flex-1"
                    />
                    <Button
                      onClick={handleSupplyRewards}
                      className="border-2 border-black bg-[#FF7F41] text-black font-black uppercase tracking-wider shadow-[2px_2px_0_rgba(0,0,0,1)] hover:bg-[#F06A56] whitespace-nowrap"
                    >
                      Supply
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Call supplyRewards(uint256 reward)
                  </p>
                </CardContent>
              </Card>

              {/* Release Rewards */}
              <Card className="before:hidden border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
                <CardHeader className="border-b border-black bg-[#B8EF53] p-4">
                  <CardTitle className="font-black uppercase text-sm tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Release Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-sm text-gray-700">
                    Unlock rewards for immediate withdrawal by users.
                  </p>
                  <Button
                    onClick={handleReleaseRewards}
                    className="w-full border-2 border-black bg-[#B8EF53] text-black font-black uppercase tracking-wider shadow-[2px_2px_0_rgba(0,0,0,1)] hover:bg-[#A6DD4A]"
                  >
                    Release Rewards
                  </Button>
                  <p className="text-xs text-gray-600 mt-2">
                    Call releaseRewards() to override 365-day timelock
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {!isStakingOwner && (
              <div className="mt-6 p-4 border-2 border-red-500 bg-red-50 rounded text-sm">
                <p className="font-bold text-red-700">⚠️ Warning: You are not the staking contract owner.</p>
                <p className="text-red-600">Current owner: {stakingOwner?.toString() || "Loading..."}</p>
                <p className="mt-2">Some admin functions may fail if executed by non-owner.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Fee Recipient */}
      <Card className="before:hidden border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
        <CardHeader className="border-b-2 border-black bg-[#FFF2D5]">
          <CardTitle className="font-black uppercase tracking-wider">Update Fee Recipient</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            The fee recipient receives all platform fees from presales. Only the factory owner can update this.
          </p>
          <div className="flex gap-4">
            <Input
              placeholder="New fee recipient address (0x...)"
              value={newFeeRecipient}
              onChange={(e) => setNewFeeRecipient(e.target.value)}
              className="border-2 border-black font-mono"
            />
            <Button
              onClick={handleSetFeeRecipient}
              disabled={isSettingFeeRecipient || !newFeeRecipient}
              className="border-4 border-black bg-[#FF7F41] text-black font-black uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#1E5BFF] whitespace-nowrap"
            >
              {isSettingFeeRecipient ? "Updating..." : "Update Recipient"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminRoute>
      <AdminDashboardContent />
    </AdminRoute>
  );
}
