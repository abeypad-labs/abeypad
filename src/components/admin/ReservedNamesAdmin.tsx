import {
  ACTIVE_CHAIN_ID,
  ANSRegistrar,
  isSupportedAbeyChain,
} from "@/config";
import { ansApi } from "@/features/ans/api";
import { useAnsTransaction } from "@/features/ans/hooks";
import {
  useAccount,
  useContractAddresses,
  useReadContract,
} from "@/lib/hooks";
import { AtSign, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  isAddress,
  keccak256,
  stringToBytes,
  type Address,
  zeroAddress,
} from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAnsName, resolveAddressOrAns } from "@/features/ans/address";
import { useChainId } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";

const YEAR_SECONDS = 365n * 24n * 60n * 60n;

async function reconcileAllocatedName(
  label: string,
  beneficiary: Address,
  chainId: number,
) {
  const retryDelays = [0, 600, 1_000, 1_600, 2_400];

  for (const delay of retryDelays) {
    if (delay > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }

    try {
      const liveName = await ansApi.search(label, chainId);
      if (
        !liveName.available &&
        liveName.owner?.toLowerCase() === beneficiary.toLowerCase()
      ) {
        const portfolio = await ansApi.ownedNames(beneficiary, chainId);
        if (portfolio.some((name) => name.label === label)) return true;
      }
    } catch {
      // The transaction is already confirmed. Retry reconciliation without
      // turning a temporary API delay into a failed allocation message.
    }
  }

  return false;
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\.abey$/i, "");
}

function validateLabel(value: string) {
  const label = normalizeLabel(value);
  if (!label) return "Enter a name.";
  if (label.length > 3) return "This allocator is only for 1-3 character names.";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) {
    return "Use letters, numbers, and interior hyphens only.";
  }
  return null;
}

export function ReservedNamesAdmin() {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const chainId = isSupportedAbeyChain(connectedChainId)
    ? connectedChainId
    : ACTIVE_CHAIN_ID;
  const { registrar } = useContractAddresses();
  const { execute } = useAnsTransaction();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [beneficiary, setBeneficiary] = useState<string | null>(null);
  const [years, setYears] = useState(1);
  const [isAllocating, setIsAllocating] = useState(false);

  const label = normalizeLabel(name);
  const labelError = useMemo(() => validateLabel(name), [name]);
  const beneficiaryValue = beneficiary ?? address ?? "";
  const beneficiaryIsValid = isAddress(beneficiaryValue) || isAnsName(beneficiaryValue);
  const canReadLabel = Boolean(label && !labelError);

  const {
    data: registrarOwner,
    isLoading: isLoadingOwner,
  } = useReadContract({
    address: registrar,
    abi: ANSRegistrar.abi,
    functionName: "owner",
    chainId,
  });

  const {
    data: ownerIsController,
    refetch: refetchController,
  } = useReadContract({
    address: registrar,
    abi: ANSRegistrar.abi,
    functionName: "controllers",
    args: [address ?? zeroAddress],
    chainId,
    query: { enabled: Boolean(address) },
  });

  const {
    data: isAvailable,
    isLoading: isCheckingAvailability,
    refetch: refetchAvailability,
  } = useReadContract({
    address: registrar,
    abi: ANSRegistrar.abi,
    functionName: "available",
    args: [label],
    chainId,
    query: { enabled: canReadLabel },
  });

  const {
    data: effectivePolicy,
    refetch: refetchPolicy,
  } = useReadContract({
    address: registrar,
    abi: ANSRegistrar.abi,
    functionName: "effectivePolicy",
    args: [label],
    chainId,
    query: { enabled: canReadLabel },
  });

  const isRegistrarOwner = Boolean(
    address &&
      registrarOwner &&
      address.toLowerCase() === String(registrarOwner).toLowerCase(),
  );

  const allocate = async () => {
    if (!address || !isRegistrarOwner) {
      toast.error("Connect the ANS registrar owner wallet");
      return;
    }
    if (labelError) {
      toast.error(labelError);
      return;
    }
    if (!beneficiaryIsValid) {
      toast.error("Enter a valid beneficiary address");
      return;
    }
    if (isAvailable !== true) {
      toast.error(`${label}.abey is already registered`);
      return;
    }

    setIsAllocating(true);
    try {
      const resolvedBeneficiary = await resolveAddressOrAns(beneficiaryValue, chainId);
      // One- and two-character labels are auction-only by contract. Three-character
      // labels need an explicit policy before the controller can allocate them.
      if (label.length === 3 && Number(effectivePolicy) !== 2) {
        await execute(
          {
            address: registrar,
            abi: ANSRegistrar.abi,
            functionName: "setLabelPolicy",
            args: [keccak256(stringToBytes(label)), 2],
          },
          `${label}.abey marked as reserved`,
        );
      }

      if (ownerIsController !== true) {
        await execute(
          {
            address: registrar,
            abi: ANSRegistrar.abi,
            functionName: "setController",
            args: [address, true],
          },
          "Owner wallet enabled for reserved-name allocation",
        );
      }

      await execute(
        {
          address: registrar,
          abi: ANSRegistrar.abi,
          functionName: "controllerRegisterReserved",
          args: [
            label,
            BigInt(years) * YEAR_SECONDS,
            resolvedBeneficiary,
            zeroAddress,
          ],
          value: 0n,
        },
        `${label}.abey assigned`,
      );

      const wasReconciled = await reconcileAllocatedName(
        label,
        resolvedBeneficiary,
        chainId,
      );
      await queryClient.invalidateQueries({ queryKey: ["ans", chainId] });

      if (!wasReconciled) {
        toast.info("Name assigned. Portfolio is still syncing.");
      }

      setName("");
      await Promise.all([
        refetchAvailability(),
        refetchController(),
        refetchPolicy(),
      ]);
    } catch {
      // Transaction errors are surfaced by the shared transaction helper.
    } finally {
      setIsAllocating(false);
    }
  };

  return (
    <section
      id="reserved-names"
      className="mb-8 scroll-mt-6 border-[3px] border-black bg-[#42C9FF] p-5 text-black [box-shadow:8px_8px_0_#000] sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b-[2px] border-black pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
            <ShieldCheck className="h-4 w-4" /> Owner only
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            Reserved .abey names
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-bold text-black/65">
            Assign a 1-3 character name directly to a beneficiary. Public users
            remain limited to names with four or more characters.
          </p>
        </div>
        <div className="border-[2px] border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]">
          {isLoadingOwner
            ? "Checking owner"
            : isRegistrarOwner
              ? "Owner wallet connected"
              : "Wrong wallet"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1.3fr_0.55fr_auto] lg:items-end">
        <label className="space-y-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.14em]">
            Reserved name
          </span>
          <div className="relative">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="abc"
              maxLength={8}
              className="h-12 bg-white pr-16 font-mono font-black"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black">
              .abey
            </span>
          </div>
        </label>

        <label className="space-y-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.14em]">
            Beneficiary
          </span>
          <Input
            value={beneficiaryValue}
            onChange={(event) => setBeneficiary(event.target.value)}
            placeholder="0x... or name.abey"
            className="h-12 bg-white font-mono"
          />
        </label>

        <label className="space-y-2">
          <span className="block text-[10px] font-black uppercase tracking-[0.14em]">
            Term
          </span>
          <select
            value={years}
            onChange={(event) => setYears(Number(event.target.value))}
            className="h-12 w-full border-[3px] border-black bg-white px-3 text-sm font-black outline-none [box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000]"
          >
            {[1, 2, 3, 5, 10].map((term) => (
              <option key={term} value={term}>
                {term} year{term === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>

        <Button
          type="button"
          onClick={allocate}
          loading={isAllocating}
          loadingText="Assigning"
          disabled={
            isAllocating ||
            isLoadingOwner ||
            isCheckingAvailability ||
            !isRegistrarOwner ||
            Boolean(labelError) ||
            !beneficiaryIsValid ||
            isAvailable !== true
          }
          className="h-12 bg-[#B8EF53] px-6"
        >
          <AtSign className="h-4 w-4" />
          {isAllocating ? "Allocating..." : "Assign name"}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-black uppercase tracking-[0.1em]">
        {name && labelError ? (
          <span className="text-red-800">{labelError}</span>
        ) : canReadLabel && isCheckingAvailability ? (
          <span>Checking availability…</span>
        ) : canReadLabel ? (
          <span>{isAvailable ? `${label}.abey is available` : `${label}.abey is already registered`}</span>
        ) : (
          <span>Enter a 1-3 character label</span>
        )}
        <span className="text-black/55">
          {ownerIsController ? "Owner controller enabled" : "First use requires controller approval"}
        </span>
      </div>
    </section>
  );
}
