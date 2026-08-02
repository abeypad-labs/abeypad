import { AdminRoute } from "@/components/admin/AdminRoute";
import { ReservedNamesAdmin } from "@/components/admin/ReservedNamesAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/lib/hooks";
import { useSetFeeRecipient } from "@/lib/hooks/useAdminActions";
import { useLaunchpadPresales } from "@/lib/hooks/useLaunchpadPresales";
import { useFactoryOwner, useFeeRecipient } from "@/lib/utils/admin";
import { getFriendlyTxErrorMessage } from "@/lib/utils/tx-errors";
import { resolveAddressOrAns } from "@/features/ans/address";
import {
  ArrowRight,
  AtSign,
  BarChart3,
  Coins,
  CoinsIcon,
  PlusCircle,
  Settings,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
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
