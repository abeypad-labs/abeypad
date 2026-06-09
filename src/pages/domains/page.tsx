import { Registrar } from "@/config/abis/registrar";
import { Resolver } from "@/config/abis/resolver";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import {
  useAccount,
  useConnectModal,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "@/lib/hooks";
import { useMyDomains } from "@/lib/hooks/useMyDomains";
import { namehash } from "@/lib/utils/namehash";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatEther, type Abi, type Address, zeroAddress } from "viem";
import { usePublicClient, useWriteContract as useWriteContractWagmi } from "wagmi";

const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
const TLD = ".abey";

const DURATION_OPTIONS = [
  { label: "1 Year", years: 1 },
  { label: "2 Years", years: 2 },
  { label: "3 Years", years: 3 },
];

function isValidLabel(name: string) {
  return /^[a-z0-9-]+$/.test(name) && name.length >= 3 && name.length <= 63;
}

function formatExpiry(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DomainsPage() {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { writeContractAsync: writeContractAsync2 } = useWriteContractWagmi();

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selectedYears, setSelectedYears] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSettingAddr, setIsSettingAddr] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const processedHash = useRef<string | null>(null);

  const { domains, addDomain, refetch: refetchDomains } = useMyDomains(address);

  const duration = BigInt(selectedYears * YEAR_IN_SECONDS);
  const isValid = isValidLabel(query);
  const node = isValid ? namehash(`${query}${TLD}`) : undefined;

  // Availability check
  const { data: isAvailable, isFetching: isCheckingAvailability } = useReadContract({
    address: Registrar.address,
    abi: Registrar.abi as Abi,
    functionName: "available",
    args: [query],
    query: { enabled: isValid },
  });

  // Fee for selected duration
  const { data: fee, isFetching: isFetchingFee } = useReadContract({
    address: Registrar.address,
    abi: Registrar.abi as Abi,
    functionName: "feeFor",
    args: [duration],
    query: { enabled: isValid },
  });

  // Expiry of searched name (if taken)
  const { data: expiryRaw } = useReadContract({
    address: Registrar.address,
    abi: Registrar.abi as Abi,
    functionName: "expiryOf",
    args: [query],
    query: { enabled: isValid && isAvailable === false },
  });

  // Resolved address for searched name (if taken)
  const { data: resolvedAddr } = useReadContract({
    address: Resolver.address,
    abi: Resolver.abi as Abi,
    functionName: "addr",
    args: node ? [node] : undefined,
    query: { enabled: !!node && isAvailable === false },
  });

  const { isSuccess: isTxSuccess, isError: isTxError } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isTxSuccess && txHash && processedHash.current !== txHash) {
      console.log("[register] tx confirmed", txHash);
      processedHash.current = txHash;
      setIsRegistering(false);
      setTxHash(undefined);
      addDomain(query);
      refetchDomains();
      toast.success(`${query}${TLD} registered!`);
      setSearch("");
      setQuery("");
    }
  }, [isTxSuccess, txHash, query, addDomain, refetchDomains]);

  useEffect(() => {
    if (isTxError && txHash && processedHash.current !== txHash) {
      console.error("[register] tx failed on-chain", txHash);
      processedHash.current = txHash;
      setIsRegistering(false);
      setTxHash(undefined);
      toast.error("Registration failed.");
    }
  }, [isTxError, txHash]);

  const handleSearch = () => {
    const normalized = search.trim().toLowerCase().replace(/\.abey$/, "");
    setQuery(normalized);
  };

  const handleRegister = async () => {
    console.log("[register] guard check", { address, query, isValid, isAvailable, fee: fee?.toString() });
    if (!address || !query || !isValid || !isAvailable || !fee) return;
    try {
      setIsRegistering(true);
      console.log("[register] calling contract", {
        registrar: Registrar.address,
        label: query,
        duration: duration.toString(),
        resolver: CONTRACT_ADDRESSES.resolver,
        value: (fee as bigint).toString(),
      });

      // simulate first to surface revert reason before spending gas
      if (publicClient) {
        try {
          await publicClient.simulateContract({
            address: Registrar.address,
            abi: Registrar.abi as Abi,
            functionName: "register",
            args: [query, duration, CONTRACT_ADDRESSES.resolver],
            value: fee as bigint,
            account: address,
          });
          console.log("[register] simulation OK");
        } catch (simErr) {
          console.error("[register] simulation revert", simErr);
        }
      }

      const hash = await writeContractAsync({
        address: Registrar.address,
        abi: Registrar.abi as Abi,
        functionName: "register",
        args: [query, duration, CONTRACT_ADDRESSES.resolver],
        value: fee as bigint,
      });
      console.log("[register] tx submitted", hash);
      setTxHash(hash as `0x${string}`);
      toast.info("Confirm in your wallet…");
    } catch (err: unknown) {
      console.error("[register] error", err);
      setIsRegistering(false);
      toast.error((err as { shortMessage?: string })?.shortMessage ?? "Registration failed");
    }
  };

  const handleSetAddr = async (label: string, domainNode: `0x${string}`) => {
    console.log("[setAddr] called", { label, domainNode, address });
    if (!address || !publicClient) return;
    try {
      setIsSettingAddr(true);
      const hash = await writeContractAsync2({
        address: Resolver.address,
        abi: Resolver.abi as Abi,
        functionName: "setAddr",
        args: [domainNode, address],
      });
      console.log("[setAddr] tx submitted", hash);
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      console.log("[setAddr] tx confirmed", hash);
      refetchDomains();
      toast.success(`${label}${TLD} now resolves to your wallet.`);
    } catch (err: unknown) {
      console.error("[setAddr] error", err);
      toast.error((err as { shortMessage?: string })?.shortMessage ?? "Failed to set address");
    } finally {
      setIsSettingAddr(false);
    }
  };

  const formattedFee =
    fee !== undefined
      ? Number(formatEther(fee as bigint)).toLocaleString(undefined, { maximumFractionDigits: 6 })
      : null;

  const takenExpiry = expiryRaw ? new Date(Number(expiryRaw as bigint) * 1000) : null;
  const takenResolvedAddr =
    resolvedAddr && resolvedAddr !== zeroAddress ? (resolvedAddr as Address) : null;

  const hasResult = query.length > 0;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 text-black">
      {/* Hero */}
      <div className="mb-8">
        <div className="border-[3px] border-black bg-[#FFF2D5] p-6 sm:p-8 [box-shadow:0_0_0_1px_#000,8px_8px_0_0_#000]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-mono text-4xl sm:text-5xl font-black leading-none">.abey</h1>
              <p className="mt-2 text-lg font-black uppercase tracking-[0.16em]">Names</p>
              <p className="mt-3 text-sm font-bold text-black/70">
                Claim your identity on AbeyChain
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="flex">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={`yourname${TLD}`}
              className="w-full border-[3px] border-r-0 border-black bg-white px-5 py-4 font-mono text-lg font-bold text-black placeholder:text-black/25 outline-none focus:bg-[#FFFDF5]"
            />
            {search && (
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 border-[2px] border-black bg-[#F5CF85] px-2 py-0.5 font-mono text-xs font-black">
                {TLD}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={!search.trim()}
            className="border-[3px] border-black bg-[#B8EF53] px-6 font-black text-black [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,7px_7px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:[box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000]"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Result */}
      {hasResult && (
        <div className="mb-8">
          {!isValid ? (
            <div className="-rotate-[0.25deg] border-[3px] border-black bg-[#FFE4E4] px-5 py-4 [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000]">
              <p className="flex items-center gap-2 font-black">
                <XCircle className="h-5 w-5 shrink-0" />
                Invalid — 3–63 chars, lowercase letters, numbers, hyphens only.
              </p>
            </div>
          ) : isCheckingAvailability ? (
            <div className="border-[3px] border-black bg-white px-5 py-4 [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000]">
              <p className="flex items-center gap-2 font-bold">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking availability…
              </p>
            </div>
          ) : isAvailable ? (
            /* ── Available ── */
            <div className="rotate-[0.25deg] border-[3px] border-black bg-[#B8EF53] p-5 sm:p-6 [box-shadow:0_0_0_1px_#000,7px_7px_0_0_#000]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <span className="font-mono text-2xl sm:text-3xl font-black">
                    {query}{TLD}
                  </span>
                </div>
                <div className="border-[2px] border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                  Available
                </div>
              </div>

              {isConnected ? (
                <>
                  <div className="mb-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-black/60">
                      Registration period
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.years}
                          type="button"
                          onClick={() => setSelectedYears(opt.years)}
                          className={`border-[2px] border-black px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all ${selectedYears === opt.years
                            ? "bg-[#42C9FF] [box-shadow:0_0_0_1px_#000,4px_4px_0_0_#000] -translate-x-0.5 -translate-y-0.5"
                            : "bg-white [box-shadow:0_0_0_1px_#000,3px_3px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,4px_4px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t-[2px] border-black/20 pt-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/60">
                        Total cost
                      </p>
                      <p className="font-mono text-2xl font-black">
                        {isFetchingFee ? (
                          <Loader2 className="inline h-5 w-5 animate-spin" />
                        ) : formattedFee !== null ? (
                          `${formattedFee} ABEY`
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRegister}
                      disabled={isRegistering || isFetchingFee || !fee}
                      className="-rotate-[0.3deg] border-[3px] border-black bg-[#FF7F41] px-6 py-3 text-sm font-black uppercase tracking-wider [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,7px_7px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:[box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000] flex items-center gap-2"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Registering…
                        </>
                      ) : (
                        `Register ${query}${TLD} →`
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="border-t-[2px] border-black/20 pt-4">
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="border-[3px] border-black bg-white px-5 py-2.5 text-xs font-black uppercase tracking-[0.14em] [box-shadow:0_0_0_1px_#000,4px_4px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                  >
                    Connect Wallet to Register
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── Taken ── */
            <div className="-rotate-[0.25deg] border-[3px] border-black bg-[#FFE4E4] p-5 [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 shrink-0" />
                  <span className="font-mono text-2xl sm:text-3xl font-black">
                    {query}{TLD}
                  </span>
                </div>
                <div className="border-[2px] border-black bg-[#FF7F41] px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                  Already Taken
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm font-bold text-black/70">
                {takenExpiry && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0" />
                    Expires {formatExpiry(takenExpiry)}
                  </span>
                )}
                {takenResolvedAddr && (
                  <span className="font-mono text-xs">
                    → {takenResolvedAddr.slice(0, 6)}…{takenResolvedAddr.slice(-4)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Names */}
      {isConnected && domains.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-black/50">
            My Names
          </p>
          <div className="space-y-3">
            {domains.map((domain, i) => (
              <div
                key={domain.label}
                className={`border-[3px] border-black p-4 sm:p-5 [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000] ${i % 2 === 0 ? "rotate-[0.3deg]" : "-rotate-[0.3deg]"
                  } ${domain.isExpired ? "bg-[#FFE4E4]" : "bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-black">{domain.fullName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-black/60">
                      {domain.expiry && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {domain.isExpired ? "Expired" : "Expires"}{" "}
                          {formatExpiry(domain.expiry)}
                        </span>
                      )}
                      {domain.resolvedAddr ? (
                        <span className="font-mono">
                          → {domain.resolvedAddr.slice(0, 6)}…{domain.resolvedAddr.slice(-4)}
                        </span>
                      ) : (
                        <span className="text-black/40">No address set</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {domain.isExpired && (
                      <div className="border-[2px] border-black bg-[#FF7F41] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]">
                        Expired
                      </div>
                    )}
                    {!domain.isExpired && !domain.resolvedAddr && address && (
                      <button
                        type="button"
                        onClick={() => handleSetAddr(domain.label, domain.node)}
                        disabled={isSettingAddr}
                        className="border-[2px] border-black bg-[#42C9FF] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] [box-shadow:0_0_0_1px_#000,3px_3px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,4px_4px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSettingAddr ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        Set Address
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works — only show when no result */}
      {!hasResult && (
        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          {[
            { step: "01", title: "Search", body: "Type a name to check if it's free.", bg: "#F5CF85", rotate: "rotate-[1deg]" },
            { step: "02", title: "Choose", body: "Pick 1, 2, or 3 years.", bg: "#E6FAD3", rotate: "-rotate-[0.8deg]" },
            { step: "03", title: "Register", body: "Pay in ABEY. The name is yours.", bg: "#EAF7FF", rotate: "rotate-[0.6deg]" },
          ].map((item) => (
            <div
              key={item.step}
              className={`${item.rotate} border-[3px] border-black p-5 [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000]`}
              style={{ backgroundColor: item.bg }}
            >
              <p className="font-mono text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">{item.step}</p>
              <p className="mt-1 text-base font-black uppercase tracking-[0.14em]">{item.title}</p>
              <p className="mt-2 text-sm font-bold text-black/70">{item.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
