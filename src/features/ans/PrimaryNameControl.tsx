import { Button } from "@/components/ui/button";
import {
  ACTIVE_CHAIN_ID,
  ANSResolver,
  abeyMainnet,
  isSupportedAbeyChain,
} from "@/config";
import { useContractAddresses } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Star, StarOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount, useChainId } from "wagmi";
import { ansApi, type AnsOwnedName } from "./api";
import { useAnsTransaction } from "./hooks";

async function waitForPrimaryState(
  name: AnsOwnedName,
  address: `0x${string}`,
  chainId: number,
  shouldBePrimary: boolean,
) {
  await ansApi.search(name.label, chainId);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const portfolio = await ansApi.ownedNames(address, chainId);
    const updatedName = portfolio.find((item) => item.node === name.node);
    if (Boolean(updatedName?.isPrimary) === shouldBePrimary) {
      return true;
    }
    if (attempt < 11) {
      await new Promise((resolve) => window.setTimeout(resolve, 1_000));
    }
  }

  return false;
}

export function PrimaryNameControl({
  name,
  className,
}: {
  name: AnsOwnedName;
  className?: string;
}) {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const chainId = isSupportedAbeyChain(connectedChainId)
    ? connectedChainId
    : ACTIVE_CHAIN_ID;
  const contracts = useContractAddresses();
  const { execute } = useAnsTransaction();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  if (
    chainId === abeyMainnet.id ||
    !address ||
    (!name.isPrimary && name.custody !== "wallet")
  ) {
    return null;
  }

  const updatePrimary = async () => {
    if (isUpdating || name.custody !== "wallet") return;
    const isRemoving = name.isPrimary;
    setIsUpdating(true);
    try {
      if (
        !isRemoving &&
        name.resolvedAddress?.toLowerCase() !== address.toLowerCase()
      ) {
        await execute(
          {
            address: contracts.resolver,
            abi: ANSResolver.abi,
            functionName: "setAddr",
            args: [name.node, address],
          },
          `${name.fqdn} now points to this wallet`,
        );
      }

      await execute(
        {
          address: contracts.resolver,
          abi: ANSResolver.abi,
          functionName: "setName",
          args: [name.node, isRemoving ? "" : name.fqdn],
        },
        isRemoving
          ? `${name.fqdn} is no longer your primary name`
          : `${name.fqdn} is now your primary name`,
      );

      const indexed = await waitForPrimaryState(
        name,
        address,
        chainId,
        !isRemoving,
      );
      await queryClient.invalidateQueries({ queryKey: ["ans", chainId] });
      if (!indexed) {
        toast.info(
          isRemoving
            ? "Primary name removed. Identity is still syncing."
            : "Primary name set. Identity is still syncing.",
        );
      }
    } catch {
      // The shared transaction helper surfaces wallet and contract errors.
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      loading={isUpdating}
      loadingText={name.isPrimary ? "Removing" : "Setting"}
      disabled={name.custody !== "wallet"}
      title={
        name.custody === "wallet"
          ? undefined
          : "Remove the name from sale before changing its primary status"
      }
      className={className}
      onClick={updatePrimary}
    >
      {name.isPrimary ? (
        <>
          <StarOff className="h-3.5 w-3.5" /> Remove primary
        </>
      ) : (
        <>
          <Star className="h-3.5 w-3.5" /> Set primary
        </>
      )}
    </Button>
  );
}
