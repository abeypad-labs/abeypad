import { AdminRoute } from "@/components/admin/AdminRoute";
import { ReservedNamesAdmin } from "@/components/admin/ReservedNamesAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/lib/hooks";
import { useSetFeeRecipient } from "@/lib/hooks/useAdminActions";
import { useLaunchpadPresales } from "@/lib/hooks/useLaunchpadPresales";
import { useStakingAdmin } from "@/lib/hooks/useStakingAdmin";
import { useFactoryOwner, useFeeRecipient } from "@/lib/utils/admin";
import { getFriendlyTxErrorMessage } from "@/lib/utils/tx-errors";
import { resolveAddressOrAns } from "@/features/ans/address";
import {
  ArrowRight,
  AtSign,
  BarChart3,
  Coins,
  CoinsIcon,
  Lock,
  PlusCircle,
  Settings,
  Shield,
  UserPlus,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Address } from "viem";
import { useChainId } from "wagmi";

function AdminDashboardContent() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { factoryOwner, isLoading: isLoadingOwner } = useFactoryOwner();
  const {
    feeRecipient,
    isLoading: isLoadingFeeRecipient,
    refetch: refetchFeeRecipient,
  } = useFeeRecipient();
  const { presales, isLoading: isLoadingPresales } =
    useLaunchpadPresales("all");

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
      toast.error(
        getFriendlyTxErrorMessage(feeRecipientError, "Update fee recipient"),
      );
      resetFeeRecipient();
    }
  }, [isFeeRecipientError, feeRecipientError, resetFeeRecipient]);

  const handleSetFeeRecipient = async () => {
    try { setFeeRecipient(await resolveAddressOrAns(newFeeRecipient, chainId)); }
    catch { toast.error("Please enter a valid address or .abey name"); }
  };

  // Presale stats
  const totalPresales = presales?.length ?? 0;
  const livePresales = presales?.filter((p) => p.status === "live").length ?? 0;
  const upcomingPresales =
    presales?.filter((p) => p.status === "upcoming").length ?? 0;
  const endedPresales =
    presales?.filter(
      (p) =>
        p.status === "ended" ||
        p.status === "finalized" ||
        p.status === "cancelled",
    ).length ?? 0;

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
    isSetApyBusy,
    isAddToWhitelistBusy,
    isSupplyRewardsBusy,
    isReleaseRewardsBusy,
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
    let target: Address;
    try { target = await resolveAddressOrAns(userToWhitelist, chainId); }
    catch { toast.error("Please enter a valid address or .abey name"); return; }
    const result = await addToWhitelist(target);
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
        <div className="border-b-2 border-gray-300 bg-white p-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        </div>
      </div>

      {/* Admin Info */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="border border-gray-300 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-gray-600" />
              Factory Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingOwner ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <p className="font-mono text-sm break-all bg-gray-100 p-2 rounded">
                {factoryOwner}
              </p>
            )}
            {address?.toLowerCase() === factoryOwner?.toLowerCase() && (
              <p className="text-green-600 text-sm mt-2 font-medium">
                ✓ You are the factory owner
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-300 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="w-5 h-5 text-gray-600" />
              Fee Recipient
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingFeeRecipient ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <p className="font-mono text-sm break-all bg-gray-100 p-2 rounded">
                {feeRecipient}
              </p>
            )}
            {address?.toLowerCase() === feeRecipient?.toLowerCase() && (
              <p className="text-green-600 text-sm mt-2 font-medium">
                ✓ You are the fee recipient
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border border-gray-300 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Total Presales
                </p>
                <p className="text-2xl font-bold">
                  {isLoadingPresales ? "..." : totalPresales}
                </p>
              </div>
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-300 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Live
                </p>
                <p className="text-2xl font-bold">
                  {isLoadingPresales ? "..." : livePresales}
                </p>
              </div>
              <BarChart3 className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-300 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Upcoming
                </p>
                <p className="text-2xl font-bold">
                  {isLoadingPresales ? "..." : upcomingPresales}
                </p>
              </div>
              <BarChart3 className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-300 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Ended
                </p>
                <p className="text-2xl font-bold">
                  {isLoadingPresales ? "..." : endedPresales}
                </p>
              </div>
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Link to="/admin/create-presale">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Create Presale</p>
                  <p className="text-xs text-gray-600">Deploy new contract</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/presales">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded">
                  <Coins className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Manage Presales</p>
                  <p className="text-xs text-gray-600">View & update fees</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/dashboard/staking">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-yellow-100 rounded">
                  <CoinsIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Staking</p>
                  <p className="text-xs text-gray-600">Manage pools</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>

        <a href="#reserved-names">
          <Card className="border border-gray-300 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-cyan-100 rounded">
                  <AtSign className="w-5 h-5 text-cyan-700" />
                </div>
                <div>
                  <p className="font-medium">Reserved Names</p>
                  <p className="text-xs text-gray-600">Assign 1-3 characters</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        </a>
      </div>

      <ReservedNamesAdmin />

      {/* Staking Admin Section */}
      <div className="mb-8">
        <Card className="border border-gray-300 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-gray-600" />
              Staking Admin Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Set Reward APY */}
              <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-200 bg-gray-50 p-4">
                  <CardTitle className="font-medium text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Set Reward APY
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      APY Percentage
                    </label>
                    <Input
                      placeholder="e.g., 12 for 12%"
                      value={rewardAPY}
                      onChange={(e) => setRewardAPY(e.target.value)}
                      className="font-mono border-gray-300"
                    />
                    <p className="text-xs text-gray-500">
                      Call: setRewardYieldForYear(uint256 rewardApy)
                    </p>
                  </div>
                  <Button
                    onClick={handleSetRewardApy}
                    loading={isSetApyBusy}
                    loadingText="Setting APY"
                    disabled={isSetApyBusy || !rewardAPY}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Set APY
                  </Button>
                </CardContent>
              </Card>

              {/* Add to Whitelist */}
              <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-200 bg-gray-50 p-4">
                  <CardTitle className="font-medium text-sm flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-green-500" />
                    Add to Whitelist
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      User Address
                    </label>
                    <Input
                      placeholder="0x... or name.abey"
                      value={userToWhitelist}
                      onChange={(e) => setUserToWhitelist(e.target.value)}
                      className="font-mono border-gray-300"
                    />
                    <p className="text-xs text-gray-500">
                      Call: addToWhitelist(address account)
                    </p>
                  </div>
                  <Button
                    onClick={handleAddToWhitelist}
                    loading={isAddToWhitelistBusy}
                    loadingText="Adding"
                    disabled={isAddToWhitelistBusy || !userToWhitelist}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Add to Whitelist
                  </Button>
                </CardContent>
              </Card>

              {/* Supply Rewards */}
              <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-200 bg-gray-50 p-4">
                  <CardTitle className="font-medium text-sm flex items-center gap-2">
                    <CoinsIcon className="w-4 h-4 text-orange-500" />
                    Supply Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Reward Amount
                    </label>
                    <Input
                      placeholder="Amount in tokens"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      className="font-mono border-gray-300"
                    />
                    <p className="text-xs text-gray-500">
                      Call: supplyRewards(uint256 reward)
                    </p>
                  </div>
                  <Button
                    onClick={handleSupplyRewards}
                    loading={isSupplyRewardsBusy}
                    loadingText="Supplying"
                    disabled={isSupplyRewardsBusy || !rewardAmount}
                    size="sm"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Supply Rewards
                  </Button>
                </CardContent>
              </Card>

              {/* Release Rewards */}
              <Card className="border border-gray-200">
                <CardHeader className="border-b border-gray-200 bg-gray-50 p-4">
                  <CardTitle className="font-medium text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4 text-yellow-500" />
                    Release Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      Unlock rewards for immediate withdrawal.
                    </p>
                    <p className="text-xs text-gray-500">
                      Call: releaseRewards() - overrides 365-day timelock
                    </p>
                  </div>
                  <Button
                    onClick={handleReleaseRewards}
                    loading={isReleaseRewardsBusy}
                    loadingText="Releasing"
                    disabled={isReleaseRewardsBusy}
                    size="sm"
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Release Rewards
                  </Button>
                </CardContent>
              </Card>
            </div>

            {!isStakingOwner && (
              <div className="mt-6 p-4 border border-red-200 bg-red-50 rounded-sm text-sm">
                <p className="font-medium text-red-800">
                  ⚠️ Warning: You are not the staking contract owner.
                </p>
                <p className="text-red-700 mt-1">
                  Current owner: {stakingOwner?.toString() || "Loading..."}
                </p>
                <p className="text-red-600 mt-2 text-xs">
                  Some admin functions may fail if executed by non-owner.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Fee Recipient */}
      <Card className="border border-gray-300 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-gray-600" />
            Update Fee Recipient
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              New Fee Recipient Address
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="0x... or name.abey"
                value={newFeeRecipient}
                onChange={(e) => setNewFeeRecipient(e.target.value)}
                className="font-mono border-gray-300 flex-1"
              />
              <Button
                onClick={handleSetFeeRecipient}
                loading={isSettingFeeRecipient}
                loadingText="Updating"
                disabled={isSettingFeeRecipient || !newFeeRecipient}
                className="bg-gray-800 hover:bg-gray-900 text-white"
              >
                {isSettingFeeRecipient ? "Updating..." : "Update"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Only the factory owner can update this. Fee recipient receives all
              platform fees.
            </p>
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
