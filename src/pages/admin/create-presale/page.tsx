import { AdminRoute } from "@/components/admin/AdminRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PresaleFactory, erc20Abi } from "@/config";
import { useChainContracts } from "@/lib/hooks/useChainContracts";
import { useBlockchainStore } from "@/lib/store/blockchain-store";
import { getFriendlyTxErrorMessage } from "@/lib/utils/tx-errors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  decodeEventLog,
  parseEther,
  parseUnits,
  type Abi,
  isAddress,
} from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useSimulatedWrite,
} from "@/lib/hooks";
import { ArrowLeft } from "lucide-react";

interface PresaleFormData {
  saleToken: string;
  paymentToken: string;
  startTime: string;
  endTime: string;
  saleAmount: string;
  softCap: string;
  hardCap: string;
  minContribution: string;
  maxContribution: string;
  owner: string;
}

function AdminCreatePresaleForm({
  formData,
  setFormData,
  onPresaleCreated,
}: {
  formData: PresaleFormData;
  setFormData: React.Dispatch<React.SetStateAction<PresaleFormData>>;
  onPresaleCreated: (hash: `0x${string}`) => void;
}) {
  const { address } = useAccount();
  const { presaleFactory } = useChainContracts();

  const {
    saleToken,
    paymentToken,
    startTime,
    endTime,
    saleAmount,
    softCap,
    hardCap,
    minContribution,
    maxContribution,
    owner,
  } = formData;

  const { data: saleTokenDecimals } = useReadContract({
    address: saleToken as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: Boolean(saleToken && saleToken.startsWith("0x") && isAddress(saleToken)),
    },
  });

  const decimals = (saleTokenDecimals as number) || 18;

  useEffect(() => {
    if (address && !owner) {
      setFormData((prev) => ({ ...prev, owner: address }));
    }
  }, [address, owner, setFormData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const validationError = useMemo(() => {
    if (!saleToken) return "Sale Token Address is required.";
    if (!isAddress(saleToken)) return "Invalid Sale Token Address format.";
    if (paymentToken && !isAddress(paymentToken)) return "Invalid Payment Token Address format.";
    if (!owner) return "Presale Owner address is required.";
    if (!isAddress(owner)) return "Invalid Presale Owner address format.";
    if (!startTime || !endTime) return "Start and End times are required.";

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (start >= end) return "End time must be after the start time.";

    if (!saleAmount || Number(saleAmount) <= 0) return "Sale Amount must be greater than 0.";
    if (!hardCap || Number(hardCap) <= 0) return "Hard Cap must be greater than 0.";
    if (!softCap || Number(softCap) <= 0) return "Soft Cap must be greater than 0.";
    if (Number(softCap) > Number(hardCap)) return "Soft Cap cannot exceed the Hard Cap.";
    if (!minContribution || Number(minContribution) <= 0) return "Min contribution must be greater than 0.";
    if (!maxContribution || Number(maxContribution) <= 0) return "Max contribution must be greater than 0.";
    if (Number(minContribution) > Number(maxContribution)) return "Min contribution cannot exceed the Max contribution.";

    return null;
  }, [
    saleToken,
    paymentToken,
    startTime,
    endTime,
    saleAmount,
    softCap,
    hardCap,
    minContribution,
    maxContribution,
    owner,
  ]);

  const params = useMemo(() => {
    if (validationError) return undefined;

    try {
      const saleAmountWei = parseUnits(saleAmount, decimals);
      const hardCapWei = parseEther(hardCap);
      const calculatedRate = (saleAmountWei * 100n) / hardCapWei;

      if (calculatedRate === 0n) return undefined;

      return {
        saleToken: saleToken as `0x${string}`,
        paymentToken: (paymentToken || "0x0000000000000000000000000000000000000000") as `0x${string}`,
        config: {
          startTime: BigInt(Math.floor(new Date(startTime).getTime() / 1000)),
          endTime: BigInt(Math.floor(new Date(endTime).getTime() / 1000)),
          rate: calculatedRate,
          softCap: parseEther(softCap),
          hardCap: hardCapWei,
          minContribution: parseEther(minContribution),
          maxContribution: parseEther(maxContribution),
        },
        owner: owner as `0x${string}`,
      };
    } catch {
      return undefined;
    }
  }, [
    validationError,
    saleToken,
    paymentToken,
    startTime,
    endTime,
    saleAmount,
    softCap,
    hardCap,
    minContribution,
    maxContribution,
    owner,
    decimals,
  ]);

  const {
    write,
    isSimulating,
    isWritePending,
    combinedError,
  } = useSimulatedWrite({
    address: presaleFactory,
    abi: PresaleFactory.abi,
    functionName: "createPresale",
    args: params ? [params] : undefined,
    enabled: Boolean(params),
    onSuccess: onPresaleCreated,
  });

  const displayError = useMemo(() => {
    if (validationError) return validationError;
    if (combinedError) {
      return getFriendlyTxErrorMessage(combinedError, "Presale simulation");
    }
    return null;
  }, [validationError, combinedError]);

  const handleCreatePresale = () => {
    if (displayError) {
      toast.error(displayError);
      return;
    }
    write();
  };

  return (
    <>
      <div className="border-2 border-black bg-[#FFF2D5] p-4 space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-gray-800">
          Admin Presale Creation
        </p>
        <p className="text-sm text-gray-700">
          You are creating a presale as admin — no whitelist check required.
          The presale owner field can be set to any address.
        </p>
      </div>

      {displayError && (
        <div className="border-4 border-black bg-red-50 p-4 space-y-1 shadow-[3px_3px_0_rgba(0,0,0,1)]">
          <p className="text-xs font-black uppercase tracking-wider text-red-700">
            Form / Simulation Status
          </p>
          <p className="text-sm text-red-800 font-medium">
            {displayError}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="saleToken">Sale Token Address</Label>
          <Input
            id="saleToken"
            placeholder="0x..."
            value={saleToken}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentToken">Payment Token Address</Label>
          <Input
            id="paymentToken"
            placeholder="0x... (leave blank for ABEY)"
            value={paymentToken}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="datetime-local"
            className="w-full [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:scale-110 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            value={startTime}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="datetime-local"
            className="w-full [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:scale-110 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            value={endTime}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saleAmount">Total Tokens for Sale</Label>
        <Input
          id="saleAmount"
          type="number"
          placeholder="e.g. 1000000"
          value={saleAmount}
          onChange={handleChange}
        />
        {saleAmount && hardCap && Number(saleAmount) > 0 && Number(hardCap) > 0 && (
          <div className="rounded border border-black/20 bg-gray-50 p-3 text-xs">
            <p className="font-semibold uppercase tracking-wide text-gray-700">Calculated Rate</p>
            <p>
              {(Number(saleAmount) / Number(hardCap)).toFixed(2)} tokens per{" "}
              {paymentToken ? "payment token" : "ABEY"}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="softCap">Soft Cap</Label>
          <Input id="softCap" type="number" placeholder="10" value={softCap} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hardCap">Hard Cap</Label>
          <Input id="hardCap" type="number" placeholder="100" value={hardCap} onChange={handleChange} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minContribution">Min Contribution</Label>
          <Input id="minContribution" type="number" placeholder="0.1" value={minContribution} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxContribution">Max Contribution</Label>
          <Input id="maxContribution" type="number" placeholder="10" value={maxContribution} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner">Presale Owner</Label>
        <Input
          id="owner"
          placeholder="0x... (defaults to your wallet)"
          value={owner}
          onChange={handleChange}
        />
      </div>

      <Button
        onClick={handleCreatePresale}
        disabled={isSimulating || isWritePending}
        className="w-full py-6 text-base font-black uppercase tracking-wider border-4 border-black bg-[#FF7F41] text-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-[#1E5BFF] hover:text-white"
      >
        {isSimulating ? "Simulating..." : isWritePending ? "Creating Presale..." : "Create Presale (Admin)"}
      </Button>
    </>
  );
}

function AdminCreatePresaleContent() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { setPresales } = useBlockchainStore();

  const [creationHash, setCreationHash] = useState<`0x${string}` | undefined>(undefined);
  const [formData, setFormData] = useState<PresaleFormData>({
    saleToken: "",
    paymentToken: "",
    startTime: "",
    endTime: "",
    saleAmount: "",
    softCap: "",
    hardCap: "",
    minContribution: "",
    maxContribution: "",
    owner: address ?? "",
  });

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash: creationHash });

  const newPresaleAddress = useMemo(() => {
    if (!receipt) return null;
    const logs = receipt.logs ?? [];
    if (logs.length === 0) return null;
    for (const log of logs) {
      try {
        const event = decodeEventLog({
          abi: PresaleFactory.abi as Abi,
          data: log.data,
          topics: log.topics,
        });
        if (event.eventName === "PresaleCreated" && event.args && "presale" in event.args) {
          return event.args.presale as `0x${string}`;
        }
      } catch {
        // not the event we want
      }
    }
    return null;
  }, [receipt]);

  const creationToastId = useRef<string | number | null>(null);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (isConfirming && !creationToastId.current) {
      creationToastId.current = toast.loading("Confirming presale creation...");
    } else if (!isConfirming && creationToastId.current) {
      toast.dismiss(creationToastId.current);
      creationToastId.current = null;
    }
  }, [isConfirming]);

  const handlePresaleCreated = useCallback(
    (presaleAddress: `0x${string}`, txHash: string) => {
      console.log("Admin presale created at:", presaleAddress, "tx:", txHash);
    },
    []
  );

  useEffect(() => {
    if (isConfirmed && newPresaleAddress && creationHash && !hasProcessedRef.current) {
      hasProcessedRef.current = true;
      toast.success(
        `Presale created! Tx: ${creationHash.slice(0, 10)}...${creationHash.slice(-8)}`
      );
      setPresales([]);
      handlePresaleCreated(newPresaleAddress, creationHash);
      navigate(`/dashboard/presales/manage/${newPresaleAddress}`);
    }
  }, [isConfirmed, newPresaleAddress, creationHash, setPresales, handlePresaleCreated, navigate]);

  // Handle case where tx confirmed but logs not decoded (PAPI limitation)
  useEffect(() => {
    if (isConfirmed && !newPresaleAddress && creationHash && !hasProcessedRef.current) {
      hasProcessedRef.current = true;
      toast.success(
        `Presale created! Tx: ${creationHash.slice(0, 10)}...${creationHash.slice(-8)}`
      );
      setPresales([]);
      navigate("/admin/presales");
    }
  }, [isConfirmed, newPresaleAddress, creationHash, setPresales, navigate]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-bold">Back to Admin</span>
        </Link>
        <div className="border-b-4 border-black bg-[#FF7F41] p-6 shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black uppercase tracking-wider">Create Presale</h1>
          <p className="text-sm text-gray-800 mt-2">
            Admin-only presale creation — interacts directly with the PresaleFactory contract.
          </p>
        </div>
      </div>

      <Card className="mx-auto max-w-3xl border-4 border-black pt-0 pb-6 shadow-[6px_6px_0_rgba(0,0,0,1)]">
        <CardHeader className="border-b-2 border-black bg-white pt-4">
          <CardTitle className="text-2xl font-black uppercase tracking-wider">
            New Presale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 sm:space-y-8">
          <AdminCreatePresaleForm
            formData={formData}
            setFormData={setFormData}
            onPresaleCreated={(hash) => setCreationHash(hash)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminCreatePresalePage() {
  return (
    <AdminRoute>
      <AdminCreatePresaleContent />
    </AdminRoute>
  );
}
