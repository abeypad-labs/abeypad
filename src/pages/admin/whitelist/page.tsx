import { AdminRoute } from "@/components/admin/AdminRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CONTRACT_ADDRESSES, PresaleFactory } from "@/config";
import { useReadContract } from "@/lib/hooks";
import { useSetWhitelistedCreator } from "@/lib/hooks/useAdminActions";
import { getFriendlyTxErrorMessage } from "@/lib/utils/tx-errors";
import { ArrowLeft, Check, Search, UserMinus, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { isAddress, type Address } from "viem";

function WhitelistChecker() {
  const [checkAddress, setCheckAddress] = useState("");
  const [addressToCheck, setAddressToCheck] = useState<Address | null>(null);
  const { presaleFactory } = CONTRACT_ADDRESSES;

  const {
    data: isWhitelisted,
    isLoading,
    refetch,
  } = useReadContract({
    address: presaleFactory,
    abi: PresaleFactory.abi,
    functionName: "isWhitelistedCreator",
    args: addressToCheck ? [addressToCheck] : undefined,
    query: {
      enabled: Boolean(addressToCheck),
    },
  });

  const handleCheck = () => {
    if (!checkAddress || !isAddress(checkAddress)) {
      toast.error("Please enter a valid address");
      return;
    }
    setAddressToCheck(checkAddress as Address);
  };

  useEffect(() => {
    if (addressToCheck) {
      refetch();
    }
  }, [addressToCheck, refetch]);

  return (
    <Card className="border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] p-0 gap-0">
      <CardHeader className="border-b-2 border-black bg-white p-6">
        <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2">
          <Search className="w-5 h-5" />
          Check Whitelist Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Enter an address to check if it's whitelisted to create presales.
        </p>
        <div className="flex gap-4">
          <Input
            placeholder="Address to check (0x...)"
            value={checkAddress}
            onChange={(e) => setCheckAddress(e.target.value)}
            className="border-2 border-black font-mono"
          />
          <Button
            onClick={handleCheck}
            disabled={!checkAddress}
            className="border-4 border-black bg-white text-black font-black uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-gray-100 whitespace-nowrap"
          >
            Check
          </Button>
        </div>
        {addressToCheck && !isLoading && (
          <div
            className={`p-4 border-2 border-black ${
              isWhitelisted ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <div className="flex items-center gap-3">
              {isWhitelisted ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : (
                <X className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className="font-bold">
                  {isWhitelisted ? "Whitelisted" : "Not Whitelisted"}
                </p>
                <p className="font-mono text-sm text-gray-600 break-all">
                  {addressToCheck}
                </p>
              </div>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="p-4 border-2 border-black bg-gray-100">
            <p className="text-gray-500">Checking...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhitelistManager() {
  const [addAddress, setAddAddress] = useState("");
  const [removeAddress, setRemoveAddress] = useState("");

  const {
    setWhitelistedCreator: addCreator,
    isBusy: isAdding,
    isSuccess: isAddSuccess,
    isError: isAddError,
    error: addError,
    reset: resetAdd,
  } = useSetWhitelistedCreator();

  const {
    setWhitelistedCreator: removeCreator,
    isBusy: isRemoving,
    isSuccess: isRemoveSuccess,
    isError: isRemoveError,
    error: removeError,
    reset: resetRemove,
  } = useSetWhitelistedCreator();

  // Add success/error handlers
  useEffect(() => {
    if (isAddSuccess) {
      toast.success("Creator added to whitelist");
      // setAddAddress("");
      resetAdd();
    }
  }, [isAddSuccess, resetAdd]);

  useEffect(() => {
    if (isAddError && addError) {
      toast.error(getFriendlyTxErrorMessage(addError, "Whitelist update"));
      resetAdd();
    }
  }, [isAddError, addError, resetAdd]);

  useEffect(() => {
    if (isRemoveSuccess) {
      toast.success("Creator removed from whitelist");
      resetRemove();
    }
  }, [isRemoveSuccess, resetRemove]);

  useEffect(() => {
    if (isRemoveError && removeError) {
      toast.error(getFriendlyTxErrorMessage(removeError, "Whitelist update"));
      resetRemove();
    }
  }, [isRemoveError, removeError, resetRemove]);

  const handleAdd = () => {
    if (!addAddress || !isAddress(addAddress)) {
      toast.error("Please enter a valid address");
      return;
    }
    addCreator(addAddress as Address, true);
  };

  const handleRemove = async () => {
    if (!removeAddress || !isAddress(removeAddress)) {
      toast.error("Please enter a valid address");
      return;
    }
    try {
      removeCreator(removeAddress as Address, false);
      toast.success("Creator removed from whitelist");
      setRemoveAddress("");
    } catch (err) {
      toast.error(getFriendlyTxErrorMessage(err, "Whitelist update"));
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Add to Whitelist */}
      <Card className="border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] p-0 gap-0">
        <CardHeader className="border-b-2 border-black bg-[#90EE90] p-6">
          <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add to Whitelist
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Add an address to allow them to create presales directly.
          </p>
          <Input
            placeholder="Creator address (0x...)"
            value={addAddress}
            onChange={(e) => setAddAddress(e.target.value)}
            className="border-2 border-black font-mono"
          />
          <Button
            onClick={handleAdd}
            disabled={isAdding || !addAddress}
            className="w-full border-4 border-black bg-[#90EE90] text-black font-black uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#7ADF7A]"
          >
            {isAdding ? "Adding..." : "Add Creator"}
          </Button>
        </CardContent>
      </Card>

      {/* Remove from Whitelist */}
      <Card className="border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] p-0 gap-0">
        <CardHeader className="border-b-2 border-black bg-[#FFB6C1] p-6">
          <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2">
            <UserMinus className="w-5 h-5" />
            Remove from Whitelist
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Remove an address from the whitelist to revoke their presale
            creation rights.
          </p>
          <Input
            placeholder="Creator address (0x...)"
            value={removeAddress}
            onChange={(e) => setRemoveAddress(e.target.value)}
            className="border-2 border-black font-mono"
          />
          <Button
            onClick={handleRemove}
            disabled={isRemoving || !removeAddress}
            className="w-full border-4 border-black bg-[#FFB6C1] text-black font-black uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#FFA0AB]"
          >
            {isRemoving ? "Removing..." : "Remove Creator"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminWhitelistContent() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-bold">Back to Admin</span>
        </Link>
        <div className="border-b-4 border-black bg-[#90EE90] p-6 shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-wider">
            Whitelist Creators
          </h1>
        </div>
      </div>

      {/* Checker */}
      <div className="mb-8">
        <WhitelistChecker />
      </div>

      {/* Manager */}
      <div className="mb-8">
        <WhitelistManager />
      </div>
    </div>
  );
}

export default function AdminWhitelist() {
  return (
    <AdminRoute>
      <AdminWhitelistContent />
    </AdminRoute>
  );
}
