import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PresaleFactory } from "@/config";
import { useContractAddresses } from "@/lib/hooks";
import { useBlockchainStore } from "@/lib/store/blockchain-store";
import { useLaunchpadPresaleStore } from "@/lib/store/launchpad-presale-store";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  decodeEventLog,
  erc20Abi,
  parseEther,
  parseUnits,
  type Abi,
  isAddress,
} from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "@/lib/hooks";
import { useChainId, useConfig } from "wagmi";
import { isAnsName } from "@/features/ans/address";
import { useResolvedAnsAddress } from "@/features/ans/hooks";

interface PresaleFormData {
  saleToken: string;
  paymentToken: string;
  startTime: string;
  endTime: string;
  saleAmount: string; // Total tokens to sell (replaces rate)
  softCap: string;
  hardCap: string;
  minContribution: string;
  maxContribution: string;
  owner: string;
  requiresWhitelist: boolean;
}

function CreatePresaleForm({
  formData,
  setFormData,
  onPresaleCreated,
  onError,
}: {
  formData: PresaleFormData;
  setFormData: React.Dispatch<React.SetStateAction<PresaleFormData>>;
  onPresaleCreated: (hash: `0x${string}`) => void;
  onError?: (error: string) => void;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { presaleFactory } = useContractAddresses();

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
    requiresWhitelist,
  } = formData;
  const ownerResolution = useResolvedAnsAddress(owner, chainId);
  const resolvedOwner = isAddress(owner)
    ? owner as `0x${string}`
    : ownerResolution.data;

  // Fetch sale token decimals
  const { data: saleTokenDecimals } = useReadContract({
    address: saleToken as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: Boolean(
        saleToken && saleToken.startsWith("0x") && isAddress(saleToken),
      ),
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

  const handleToggleWhitelist = (checked?: boolean) => {
    setFormData((prev) => ({
      ...prev,
      requiresWhitelist:
        typeof checked === "boolean" ? checked : !prev.requiresWhitelist,
    }));
  };

  // Pre-validate form inputs to prevent unnecessary RPC calls and provide clean feedback
  const validationError = useMemo(() => {
    if (!saleToken) return "Sale Token Address is required.";
    if (!isAddress(saleToken)) return "Invalid Sale Token Address format.";
    if (paymentToken && !isAddress(paymentToken))
      return "Invalid Payment Token Address format.";
    if (!owner) return "Presale Owner address is required.";
    if (!isAddress(owner) && !isAnsName(owner)) return "Use an owner address or .abey name.";
    if (isAnsName(owner) && ownerResolution.isLoading) return "Resolving owner .abey name...";
    if (isAnsName(owner) && !resolvedOwner) return "Owner .abey name could not be resolved.";
    if (!startTime || !endTime) return "Start and End times are required.";

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (start >= end) return "End time must be after the start time.";
    if (start < Date.now() - 60000) return "Start time cannot be in the past.";

    if (!saleAmount || Number(saleAmount) <= 0)
      return "Sale Amount must be greater than 0.";
    if (!hardCap || Number(hardCap) <= 0)
      return "Hard Cap must be greater than 0.";
    if (!softCap || Number(softCap) <= 0)
      return "Soft Cap must be greater than 0.";
    if (Number(softCap) > Number(hardCap))
      return "Soft Cap cannot exceed the Hard Cap.";
    if (!minContribution || Number(minContribution) <= 0)
      return "Min contribution must be greater than 0.";
    if (!maxContribution || Number(maxContribution) <= 0)
      return "Max contribution must be greater than 0.";
    if (Number(minContribution) > Number(maxContribution))
      return "Min contribution cannot exceed the Max contribution.";

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
    ownerResolution.isLoading,
    resolvedOwner,
  ]);

  // Construct contract creation parameters only when validation passes
  const params = useMemo(() => {
    if (validationError) return undefined;

    try {
      const saleAmountWei = parseUnits(saleAmount, decimals);
      const hardCapWei = parseEther(hardCap);
      const calculatedRate = (saleAmountWei * 100n) / hardCapWei;

      if (calculatedRate === 0n) return undefined;

      return {
        saleToken: saleToken as `0x${string}`,
        paymentToken: (paymentToken ||
          "0x0000000000000000000000000000000000000000") as `0x${string}`,
        config: {
          startTime: BigInt(Math.floor(new Date(startTime).getTime() / 1000)),
          endTime: BigInt(Math.floor(new Date(endTime).getTime() / 1000)),
          rate: calculatedRate,
          softCap: parseEther(softCap),
          hardCap: hardCapWei,
          minContribution: parseEther(minContribution),
          maxContribution: parseEther(maxContribution),
        },
        owner: resolvedOwner!,
        requiresWhitelist,
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
    resolvedOwner,
    requiresWhitelist,
    decimals,
  ]);

  const { writeContractAsync } = useWriteContract();

  const [isPending, setIsPending] = useState(false);

  const handleCreatePresale = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!params) {
      toast.error("Invalid presale parameters");
      return;
    }

    try {
      setIsPending(true);
      const hash = await writeContractAsync({
        address: presaleFactory,
        abi: PresaleFactory.abi as Abi,
        functionName: "createPresale",
        args: [params],
      });
      onPresaleCreated(hash);
      toast.info("Creating presale...");
    } catch (error: any) {
      const errorMessage = error.shortMessage || "Failed to create presale";
      toast.error(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="border-2 border-black bg-gray-50 p-4 sm:p-5 space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-gray-800">
          Launchpad Custody & Fees
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700 leading-relaxed">
          <li>
            Deposit your sale tokens once—each presale contract holds custody
            for contributors.
          </li>
          <li>
            2% of the total token supply is routed to the launchpad
            automatically, so approve a little extra before depositing.
          </li>
          <li>
            3% of the native/payment tokens raised are collected when you
            withdraw proceeds.
          </li>
        </ul>
      </div>

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
      {/* START / END TIME */}
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
          placeholder="e.g. 1000000 (total tokens to sell)"
          value={saleAmount}
          onChange={handleChange}
        />
        <p className="text-xs text-gray-500 leading-relaxed">
          Total number of tokens you want to sell. The rate will be
          automatically calculated based on your Hard Cap.
        </p>
        {saleAmount &&
          hardCap &&
          Number(saleAmount) > 0 &&
          Number(hardCap) > 0 && (
            <div className="mt-2 rounded border border-black/20 bg-gray-50 p-3 text-xs">
              <p className="font-semibold uppercase tracking-wide text-gray-700">
                Calculated Rate
              </p>
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
          <Input
            id="softCap"
            type="number"
            placeholder="10"
            value={softCap}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hardCap">Hard Cap</Label>
          <Input
            id="hardCap"
            type="number"
            placeholder="100"
            value={hardCap}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minContribution">Min Contribution</Label>
          <Input
            id="minContribution"
            type="number"
            placeholder="0.1"
            value={minContribution}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxContribution">Max Contribution</Label>
          <Input
            id="maxContribution"
            type="number"
            placeholder="10"
            value={maxContribution}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="owner">Presale Owner</Label>
        <Input
          id="owner"
          placeholder="0x... or name.abey"
          value={owner}
          onChange={handleChange}
        />
      </div>
      <div className="border-2 border-black bg-white p-4 sm:p-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-gray-800">
              Whitelist Access
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {requiresWhitelist
                ? "Only wallets you approve will be able to contribute. Perfect for private or KYC-based launches."
                : "Anyone can contribute while the presale is live."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
              {requiresWhitelist ? "Enabled" : "Disabled"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={requiresWhitelist}
                onChange={(event) =>
                  handleToggleWhitelist(event.target.checked)
                }
              />
              <div className="h-7 w-12 rounded-full border-2 border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,1)] transition-colors peer-checked:bg-black" />
              <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-black transition-transform peer-checked:translate-x-5 peer-checked:bg-white" />
            </label>
          </div>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          You can add or remove addresses from the whitelist as soon as your
          presale is deployed.
        </p>
      </div>
      <Button
        onClick={handleCreatePresale}
        loading={isPending}
        loadingText="Creating Presale"
        disabled={isPending}
        className="w-full py-6 text-base font-bold uppercase tracking-wide"
      >
        Create Presale
      </Button>
    </>
  );
}

export default function CreatePresalePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { setPresales } = useBlockchainStore();
  const [creationHash, setCreationHash] = useState<`0x${string}` | undefined>(
    undefined,
  );
  const [formData, setFormData] = useState({
    saleToken: searchParams.get("token") ?? "",
    paymentToken: "",
    startTime: "",
    endTime: "",
    saleAmount: "",
    softCap: "",
    hardCap: "",
    minContribution: "",
    maxContribution: "",
    owner: address ?? "",
    requiresWhitelist: false,
  });
  const { setPresale } = useLaunchpadPresaleStore();

  // Modal and transaction status states
  const [showModal, setShowModal] = useState(false);
  const [txStatus, setTxStatus] = useState<
    "idle" | "pending" | "confirming" | "success" | "error"
  >("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [createdPresaleAddress, setCreatedPresaleAddress] = useState<
    string | null
  >(null);

  const config = useConfig();
  const chainId = useChainId();
  const chain = config.chains.find((c) => c.id === chainId);
  const explorerUrl = chain?.blockExplorers?.default.url;

  // Creation is permissionless by default; no whitelist restriction is enforced.

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash: creationHash });

  // Derive presale address from receipt instead of using state.
  // NOTE: PAPI receipts don't include EVM logs, so decodeEventLog won't find
  // the PresaleCreated event. When logs are empty we fall back to null and the
  // success handler still fires (the presale is created, we just can't decode
  // the address from logs). A future improvement could fetch logs via ETH-RPC.
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
        if (
          event.eventName === "PresaleCreated" &&
          event.args &&
          "presale" in event.args
        ) {
          return event.args.presale as `0x${string}`;
        }
      } catch {
        // Not the event we're looking for
      }
    }
    return null;
  }, [receipt]);

  const hasProcessedRef = useRef(false);

  // Handle transaction confirmation with modal
  useEffect(() => {
    if (isConfirming && txStatus === "pending") {
      setTxStatus("confirming");
    }
  }, [isConfirming, txStatus]);

  // Database storage removed - presale data is now stored entirely on blockchain
  const savePresaleToDatabase = useCallback(
    async (presaleAddress: `0x${string}`, txHash: string) => {
      // No-op: All presale data is now stored on blockchain and fetched via hooks
      console.log(
        "Presale created at address:",
        presaleAddress,
        "with tx:",
        txHash,
      );
    },
    [],
  );

  // Handle transaction confirmation with modal
  useEffect(() => {
    if (isConfirming && txStatus === "pending") {
      setTxStatus("confirming");
    }
  }, [isConfirming, txStatus]);

  useEffect(() => {
    if (
      isConfirmed &&
      newPresaleAddress &&
      creationHash &&
      !hasProcessedRef.current
    ) {
      hasProcessedRef.current = true;
      toast.success(
        `Presale created successfully! Tx: ${creationHash.slice(
          0,
          10,
        )}...${creationHash.slice(-8)}`,
      );
      // Invalidate the presales cache to force refetch
      setPresales([]);
      // Save presale to launchpad presale store
      if (address) {
        // Save basic presale info to store
        setPresale(newPresaleAddress, {
          address: newPresaleAddress,
          saleToken: formData.saleToken as `0x${string}`,
          paymentToken: (formData.paymentToken ||
            "0x0000000000000000000000000000000000000000") as `0x${string}`,
          isPaymentETH: !formData.paymentToken,
          startTime: BigInt(
            Math.floor(new Date(formData.startTime).getTime() / 1000),
          ),
          endTime: BigInt(
            Math.floor(new Date(formData.endTime).getTime() / 1000),
          ),
          rate: 0n, // Will be fetched from contract later
          softCap: parseEther(formData.softCap),
          hardCap: parseEther(formData.hardCap),
          minContribution: parseEther(formData.minContribution),
          maxContribution: parseEther(formData.maxContribution),
          totalRaised: 0n,
          committedTokens: 0n,
          totalTokensDeposited: parseUnits(formData.saleAmount, 18),
          claimEnabled: false,
          refundsEnabled: false,
          owner: address as `0x${string}`,
        });
      }
      // Save presale to Supabase with transaction hash
      savePresaleToDatabase(newPresaleAddress, creationHash);

      // Set success state and redirect to dashboard after 3 seconds
      setTxStatus("success");
      setCreatedPresaleAddress(newPresaleAddress);
      setTimeout(() => {
        setShowModal(false);
        navigate("/dashboard/user");
      }, 3000);
    }
  }, [
    isConfirmed,
    newPresaleAddress,
    creationHash,
    setPresales,
    savePresaleToDatabase,
    navigate,
    address,
    formData,
  ]);

  return (
    <div className="container mx-auto px-4 py-12 text-black">
      {/* Full-page transaction status modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="border-4 border-black bg-[#FFE38A] p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] flex flex-col items-center gap-4 max-w-sm w-full mx-4">
            {/* Pending State - Waiting for wallet */}
            {txStatus === "pending" && (
              <>
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="font-black uppercase tracking-wider text-xl text-center">
                  Confirm in Wallet
                </p>
                <p className="text-sm text-gray-700 text-center">
                  Please confirm the transaction in your wallet...
                </p>
              </>
            )}

            {/* Confirming State - Transaction submitted */}
            {txStatus === "confirming" && (
              <>
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="font-black uppercase tracking-wider text-xl text-center">
                  Creating Presale…
                </p>
                <p className="text-sm text-gray-700 text-center">
                  Transaction submitted. Waiting for block confirmation.
                </p>
                {creationHash && (
                  <a
                    href={`${explorerUrl}/tx/${creationHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline font-mono break-all text-center text-gray-600 hover:text-black"
                  >
                    View on Explorer
                  </a>
                )}
              </>
            )}

            {/* Success State */}
            {txStatus === "success" && (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-600" />
                <p className="font-black uppercase tracking-wider text-xl text-center">
                  Presale Created!
                </p>
                <p className="text-sm text-gray-700 text-center">
                  Your presale has been deployed successfully.
                </p>
                {createdPresaleAddress && (
                  <div className="w-full">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                      Presale Address
                    </p>
                    <code className="block bg-white p-2 border-2 border-black font-mono text-xs break-all">
                      {createdPresaleAddress}
                    </code>
                  </div>
                )}
                {creationHash && (
                  <a
                    href={`${explorerUrl}/tx/${creationHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline font-mono break-all text-center text-gray-600 hover:text-black"
                  >
                    View Transaction
                  </a>
                )}
                <p className="text-xs text-gray-600 text-center">
                  Redirecting to dashboard...
                </p>
              </>
            )}

            {/* Error State */}
            {txStatus === "error" && (
              <>
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-2xl font-black">!</span>
                </div>
                <p className="font-black uppercase tracking-wider text-xl text-center">
                  Transaction Failed
                </p>
                <p className="text-sm text-gray-700 text-center">
                  {txError || "An error occurred during presale creation."}
                </p>
                {creationHash && (
                  <a
                    href={`${explorerUrl}/tx/${creationHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline font-mono break-all text-center text-gray-600 hover:text-black"
                  >
                    View Transaction
                  </a>
                )}
                <Button
                  onClick={() => {
                    setShowModal(false);
                    setTxStatus("idle");
                    setTxError(null);
                  }}
                  className="mt-4 w-full border-4 border-black bg-white text-black font-black uppercase tracking-wider shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-gray-100"
                >
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Card className="mx-auto max-w-3xl border-4 border-black pt-0 pb-6 shadow-[6px_6px_0_rgba(0,0,0,1)]">
        <CardHeader className="border-b-2 border-black bg-white pt-4">
          <CardTitle className="text-2xl font-black uppercase tracking-wider text-center sm:text-left">
            Create a new Presale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 sm:space-y-8">
          <CreatePresaleForm
            formData={formData}
            setFormData={setFormData}
            onPresaleCreated={(hash) => {
              setCreationHash(hash);
              setTxStatus("pending");
              setShowModal(true);
            }}
            onError={(errorMessage) => {
              setTxStatus("error");
              setTxError(errorMessage);
              setShowModal(true);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
