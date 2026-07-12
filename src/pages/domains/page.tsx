import { abeychainDevnet } from "@/config";
import { Registrar } from "@/config/abis/registrar";
import { Resolver } from "@/config/abis/resolver";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import {
  useAccount,
  useConnectModal,
  useMyDomains,
} from "@/lib/hooks";
import { formatFee, parseANSError, validateName } from "@/lib/utils/ans";
import { namehash } from "@/lib/utils/namehash";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Abi, type Address, zeroAddress } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

const TLD = ".abey";

const DURATION_OPTIONS = [
  { label: "1 Year", years: 1 },
  { label: "2 Years", years: 2 },
  { label: "3 Years", years: 3 },
];

function formatExpiry(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDomainSuggestions(searchVal: string): string[] {
  const clean = searchVal.trim().toLowerCase().replace(/\.abey$/, "");
  if (!clean || clean.length < 2 || !/^[a-z0-9-]+$/.test(clean)) return [];

  return [
    `go${clean}`,
    `${clean}web3`,
    `${clean}defi`,
    `${clean}labs`,
    `${clean}pay`,
    `my${clean}`,
    `${clean}vault`,
    `${clean}protocol`,
    `${clean}app`,
    `get${clean}`,
    `${clean}hub`,
  ].slice(0, 3);
}

export default function DomainsPage() {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const explorerUrl = abeychainDevnet.blockExplorers.default.url;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedYears, setSelectedYears] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingAddrLabel, setPendingAddrLabel] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // States from contract check
  const [validation, setValidation] = useState<{ valid: boolean; reason?: string } | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [fee, setFee] = useState<bigint>(0n);
  const [isFetchingFee, setIsFetchingFee] = useState(false);
  const [takenAddr, setTakenAddr] = useState<Address | null>(null);
  const [takenExpiry, setTakenExpiry] = useState<Date | null>(null);

  const { domains, addDomain, refetch: refetchDomains } = useMyDomains(address);

  const suggestions = getDomainSuggestions(search);

  // Debounce input to prevent overwhelming the node with RPC requests
  useEffect(() => {
    const handler = setTimeout(() => {
      const normalized = search.trim().toLowerCase().replace(/\.abey$/, "");
      setDebouncedSearch(normalized);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Perform contract check for availability / taken details when debouncedSearch changes
  useEffect(() => {
    if (!debouncedSearch) {
      setIsAvailable(null);
      setIsChecking(false);
      setValidation(null);
      setFee(0n);
      setTakenAddr(null);
      setTakenExpiry(null);
      return;
    }

    const val = validateName(debouncedSearch);
    setValidation(val);

    if (!val.valid) {
      setIsAvailable(null);
      setIsChecking(false);
      setFee(0n);
      setTakenAddr(null);
      setTakenExpiry(null);
      return;
    }

    let active = true;

    const checkAvailability = async () => {
      setIsChecking(true);
      try {
        if (!publicClient) return;

        const availableResult = await publicClient.readContract({
          address: Registrar.address as Address,
          abi: Registrar.abi as Abi,
          functionName: "available",
          args: [debouncedSearch],
        });

        if (!active) return;
        setIsAvailable(availableResult as boolean);

        if (availableResult) {
          // Available -> fetch fee
          setIsFetchingFee(true);
          const duration = BigInt(selectedYears * 365 * 24 * 60 * 60);
          const feeResult = await publicClient.readContract({
            address: Registrar.address as Address,
            abi: Registrar.abi as Abi,
            functionName: "feeFor",
            args: [debouncedSearch, duration],
          });
          if (active) {
            setFee(feeResult as bigint);
            setTakenAddr(null);
            setTakenExpiry(null);
          }
        } else {
          // Taken -> fetch expiry and resolved address
          const node = namehash(`${debouncedSearch}${TLD}`);
          const [expiryResult, addrResult] = await Promise.all([
            publicClient.readContract({
              address: Registrar.address as Address,
              abi: Registrar.abi as Abi,
              functionName: "expiryOf",
              args: [debouncedSearch],
            }).catch(() => 0n),
            publicClient.readContract({
              address: Resolver.address as Address,
              abi: Resolver.abi as Abi,
              functionName: "addr",
              args: [node],
            }).catch(() => zeroAddress),
          ]);

          if (active) {
            setFee(0n);
            setTakenExpiry(expiryResult ? new Date(Number(expiryResult) * 1000) : null);
            setTakenAddr(addrResult && addrResult !== zeroAddress ? (addrResult as Address) : null);
          }
        }
      } catch (err) {
        console.error("Error checking name availability:", err);
      } finally {
        if (active) {
          setIsChecking(false);
          setIsFetchingFee(false);
        }
      }
    };

    checkAvailability();

    return () => {
      active = false;
    };
  }, [debouncedSearch, publicClient]);

  // Separate effect to handle fee updates when selectedYears changes (only if available)
  useEffect(() => {
    if (!debouncedSearch || isAvailable !== true || !validation?.valid) return;

    let active = true;

    const fetchUpdatedFee = async () => {
      setIsFetchingFee(true);
      try {
        if (!publicClient) return;
        const duration = BigInt(selectedYears * 365 * 24 * 60 * 60);
        const feeResult = await publicClient.readContract({
          address: Registrar.address as Address,
          abi: Registrar.abi as Abi,
          functionName: "feeFor",
          args: [debouncedSearch, duration],
        });
        if (active) {
          setFee(feeResult as bigint);
        }
      } catch (err) {
        console.error("Error fetching updated fee:", err);
      } finally {
        if (active) {
          setIsFetchingFee(false);
        }
      }
    };

    fetchUpdatedFee();

    return () => {
      active = false;
    };
  }, [selectedYears, debouncedSearch, isAvailable, validation, publicClient]);

  const handleSearch = () => {
    const normalized = search.trim().toLowerCase().replace(/\.abey$/, "");
    setDebouncedSearch(normalized);
  };

  const handleSuggestionClick = (name: string) => {
    setSearch(name);
    setDebouncedSearch(name);
  };

  const handleRegister = async () => {
    if (!address || !debouncedSearch || !validation?.valid || !isAvailable || !fee || !publicClient) return;
    const label = debouncedSearch;
    const duration = BigInt(selectedYears * 365 * 24 * 60 * 60);
    setIsRegistering(true);
    try {
      const hash = await writeContractAsync({
        address: Registrar.address,
        abi: Registrar.abi as Abi,
        functionName: "register",
        args: [label, duration, CONTRACT_ADDRESSES.resolver],
        value: fee,
      });
      toast.info("Transaction submitted — waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      addDomain(label);
      refetchDomains();
      toast.success(`${label}${TLD} registered!`);
      setSearch("");
      setDebouncedSearch("");
    } catch (err: unknown) {
      toast.error(parseANSError(err) || (err as { shortMessage?: string })?.shortMessage || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSetAddr = async (label: string, domainNode: `0x${string}`) => {
    if (!address || !publicClient) return;
    setPendingAddrLabel(label);
    try {
      const hash = await writeContractAsync({
        address: Resolver.address,
        abi: Resolver.abi as Abi,
        functionName: "setAddr",
        args: [domainNode, address],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      refetchDomains();
      toast.success(`${label}${TLD} now resolves to your wallet.`);
    } catch (err: unknown) {
      toast.error((err as { shortMessage?: string })?.shortMessage ?? "Failed to set address");
    } finally {
      setPendingAddrLabel(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(text);
    toast.success("Copied address to clipboard");
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const formattedFee = fee > 0n ? formatFee(fee) : null;
  const hasInput = search.length > 0;
  const showResult = debouncedSearch.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 text-black max-w-5xl">
      {/* Hero Header */}
      <div className="mb-10 animate-fade-in-up">
        <div className="border-[3px] border-black bg-[#FFF2D5] p-6 sm:p-10 [box-shadow:0_0_0_1px_#000,8px_8px_0_0_#000] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Globe className="h-40 w-40 animate-pulse" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="bg-[#42C9FF] text-black border-[3px] border-black px-4 py-1.5 font-mono text-3xl sm:text-4xl font-black rotate-[-2deg] [box-shadow:2px_2px_0_0_#000] inline-block">
                .abey
              </span>
              <h1 className="font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight">
                Domains
              </h1>
            </div>
            <p className="mt-4 text-base font-bold text-black/80 max-w-2xl leading-relaxed">
              Claim your unique web3 handle. Map simple names directly to your wallet address, manage your assets, and host decentralized sites on Abeychain.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Card */}
      <div className="mb-6 animate-fade-in-up animation-delay-200">
        <div className="border-[3px] border-black bg-white p-5 sm:p-6 [box-shadow:0_0_0_1px_#000,8px_8px_0_0_#000]">
          <label htmlFor="domain-search-input" className="block text-xs font-black uppercase tracking-[0.18em] text-black/60 mb-3">
            Search Domain Name
          </label>
          <div className="flex">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/50">
                <Search className="h-5 w-5" />
              </div>
              <input
                id="domain-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="search name"
                disabled={isRegistering || pendingAddrLabel !== null}
                className={`w-full border-[3px] border-r-0 border-black bg-white pl-12 pr-16 py-4 font-mono text-lg font-bold text-black placeholder:text-black/35 outline-none transition-colors ${isRegistering || pendingAddrLabel !== null
                    ? "bg-gray-50 opacity-50 cursor-not-allowed"
                    : "focus:bg-[#FFFDF5]"
                  }`}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 border-[2px] border-black bg-[#F5CF85] px-2 py-0.5 font-mono text-xs font-black [box-shadow:1.5px_1.5px_0_0_#000]">
                {TLD}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={!search.trim() || isRegistering || pendingAddrLabel !== null}
              className="border-[3px] border-black bg-[#B8EF53] px-6 sm:px-8 font-black text-black [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,7px_7px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:[box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000]"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Dynamic Recommendations */}
          {suggestions.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-black/40 mr-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Suggestions:
              </span>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSuggestionClick(sug)}
                  disabled={isRegistering || pendingAddrLabel !== null}
                  className={`border-[2px] border-black bg-white px-2 py-0.5 text-xs font-mono font-bold transition-all ${isRegistering || pendingAddrLabel !== null
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-[#FFFDF5] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-y-0 active:translate-x-0 hover:[box-shadow:2px_2px_0_0_#000]"
                    }`}
                >
                  {sug}{TLD}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Results Area */}
      {showResult && (
        <div className="mb-10 animate-fade-in-soft">
          {validation && !validation.valid ? (
            /* ── Format Error ── */
            <div className="-rotate-[0.3deg] border-[3px] border-black bg-[#FFE4E4] p-5 [box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000] transition-transform">
              <div className="flex items-center gap-3 text-red-700">
                <XCircle className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-mono text-lg font-black uppercase tracking-[0.05em] leading-tight">
                    Invalid Format
                  </p>
                  <p className="text-sm font-bold text-black/80 mt-1">
                    {validation.reason || "Please adjust your name structure."}
                  </p>
                </div>
              </div>
            </div>
          ) : isChecking ? (
            /* ── Checking State ── */
            <div className="border-[3px] border-black bg-white p-6 [box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1E5BFF]" />
                  <div>
                    <p className="font-mono text-base font-black uppercase tracking-[0.05em]">
                      Checking availability…
                    </p>
                    <p className="text-xs font-bold text-black/50 mt-0.5">
                      Querying Registrar for "{debouncedSearch}{TLD}"
                    </p>
                  </div>
                </div>
                <span className="font-mono text-lg font-black text-black/40">
                  {debouncedSearch}{TLD}
                </span>
              </div>
            </div>
          ) : isAvailable ? (
            /* ── Available State ── */
            <div className="rotate-[0.3deg] border-[3px] border-black bg-[#B8EF53] p-6 sm:p-8 [box-shadow:0_0_0_1px_#000,8px_8px_0_0_#000] transition-all">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b-[2px] border-black/10 pb-5 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-black" />
                    <span className="font-mono text-3xl font-black tracking-tight break-all">
                      {debouncedSearch}{TLD}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black/60 mt-1">
                    This domain name is unoccupied and ready for registration.
                  </p>
                </div>
                <div className="border-[2px] border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] [box-shadow:2px_2px_0_0_#000]">
                  Available to Claim
                </div>
              </div>

              {isConnected ? (
                <div className="space-y-6">
                  {/* Years select */}
                  <div>
                    <p className="mb-2.5 text-xs font-black uppercase tracking-[0.16em] text-black/60">
                      Registration period
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.years}
                          type="button"
                          onClick={() => setSelectedYears(opt.years)}
                          disabled={isRegistering || pendingAddrLabel !== null}
                          className={`border-[2px] border-black px-5 py-2.5 text-xs font-black uppercase tracking-[0.12em] transition-all ${isRegistering || pendingAddrLabel !== null
                              ? selectedYears === opt.years
                                ? "bg-[#42C9FF] opacity-60 cursor-not-allowed"
                                : "bg-gray-100 text-black/40 opacity-40 cursor-not-allowed"
                              : selectedYears === opt.years
                                ? "bg-[#42C9FF] [box-shadow:0_0_0_1px_#000,4px_4px_0_0_#000] -translate-x-0.5 -translate-y-0.5"
                                : "bg-white [box-shadow:0_0_0_1px_#000,3px_3px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,4px_4px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="border-[2px] border-black bg-white/70 p-4 font-mono text-sm space-y-2.5">
                    <div className="flex justify-between border-b border-black/10 pb-1.5">
                      <span className="font-bold text-black/50">Domain name:</span>
                      <span className="font-black">{debouncedSearch}{TLD}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/10 pb-1.5">
                      <span className="font-bold text-black/50">Duration:</span>
                      <span className="font-black">{selectedYears} Year{selectedYears > 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex justify-between border-b border-black/10 pb-1.5">
                      <span className="font-bold text-black/50">Resolver:</span>
                      <span className="font-black truncate max-w-[200px] sm:max-w-xs" title={CONTRACT_ADDRESSES.resolver}>
                        {CONTRACT_ADDRESSES.resolver.slice(0, 8)}…{CONTRACT_ADDRESSES.resolver.slice(-6)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-mono">
                      <span className="font-black text-black">Total Price:</span>
                      <span className="font-black text-base text-black flex items-center gap-1.5">
                        {isFetchingFee ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : formattedFee ? (
                          formattedFee
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleRegister}
                      disabled={isRegistering || isFetchingFee || fee === 0n || pendingAddrLabel !== null}
                      className={`border-[3px] border-black bg-[#FF7F41] px-8 py-4 text-base font-black uppercase tracking-wider transition-all flex items-center gap-2 ${isRegistering || isFetchingFee || fee === 0n || pendingAddrLabel !== null
                          ? "opacity-50 cursor-not-allowed [box-shadow:none] translate-x-0 translate-y-0"
                          : "bg-[#FF7F41] [box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,8px_8px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5"
                        }`}
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Registering…
                        </>
                      ) : (
                        <>
                          <span>Register Name</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t-[2px] border-black/15 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-sm font-bold text-black/75">
                    Connect your wallet to configure the registration duration and register this name.
                  </p>
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="border-[3px] border-black bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] [box-shadow:0_0_0_1px_#000,4px_4px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-y-0 active:translate-x-0 transition-all shrink-0 flex items-center justify-center gap-2"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── Taken State ── */
            <div className="-rotate-[0.3deg] border-[3px] border-black bg-[#FFE4E4] p-6 [box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000] transition-all">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b-[2px] border-black/10 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-black">
                    <XCircle className="h-6 w-6 shrink-0" />
                    <span className="font-mono text-2xl font-black break-all">
                      {debouncedSearch}{TLD}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black/60 mt-1">
                    This name is registered to another account.
                  </p>
                </div>
                <div className="border-[2px] border-black bg-[#FF7F41] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] [box-shadow:2px_2px_0_0_#000]">
                  Already Registered
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-sm font-mono mt-3">
                {takenExpiry && (
                  <div className="border border-black/10 bg-white/40 p-3 flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-black/50 mt-0.5 shrink-0" />
                    <div>
                      <span className="block text-[10px] font-black uppercase text-black/40 tracking-[0.1em]">Expiry Date</span>
                      <span className="font-bold text-black">{formatExpiry(takenExpiry)}</span>
                    </div>
                  </div>
                )}
                {takenAddr && (
                  <div className="border border-black/10 bg-white/40 p-3 flex items-start gap-2.5">
                    <Wallet className="h-4 w-4 text-black/50 mt-0.5 shrink-0" />
                    <div className="w-full min-w-0">
                      <span className="block text-[10px] font-black uppercase text-black/40 tracking-[0.1em]">Resolver Address</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-black truncate max-w-[140px] sm:max-w-xs" title={takenAddr}>
                          {takenAddr.slice(0, 6)}…{takenAddr.slice(-4)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(takenAddr)}
                          className="text-black/50 hover:text-black p-0.5 transition-colors shrink-0"
                          title="Copy full address"
                        >
                          {copiedAddr === takenAddr ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {explorerUrl && (
                          <a
                            href={`${explorerUrl}/address/${takenAddr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black/50 hover:text-black p-0.5 transition-colors shrink-0"
                            title="View on Explorer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Helper text when search is typing but too short */}
      {hasInput && search.length < 3 && (
        <div className="mb-10 border-[3px] border-black bg-[#FFFDF5] p-5 [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000] animate-fade-in-soft">
          <div className="flex items-center gap-2.5 text-black/70 font-mono text-sm">
            <RefreshCw className="h-4 w-4 animate-spin text-black/40 shrink-0" />
            <span>Keep typing... Domain names must be at least 3 characters.</span>
          </div>
        </div>
      )}

      {/* My Names Section */}
      {isConnected && domains.length > 0 && (
        <div className="mb-10 animate-fade-in-up">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-black/50 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            <span>My Registered Names ({domains.length})</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {domains.map((domain, i) => (
              <div
                key={domain.label}
                className={`border-[3px] border-black p-5 [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 ${i % 2 === 0 ? "rotate-[0.2deg]" : "-rotate-[0.2deg]"
                  } ${domain.isExpired ? "bg-[#FFE4E4]" : "bg-white"}`}
              >
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xl font-black tracking-tight truncate">
                        {domain.fullName}
                      </span>
                      {domain.isExpired ? (
                        <span className="border border-black bg-[#FF7F41] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]">
                          Expired
                        </span>
                      ) : (
                        <span className="border border-black bg-[#B8EF53] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-3 font-mono text-xs text-black/75 space-y-1.5 border-t border-black/10 pt-2.5">
                      {domain.expiry && (
                        <div className="flex items-center justify-between">
                          <span className="text-black/45">Expires:</span>
                          <span className="font-bold flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatExpiry(domain.expiry)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-black/45">Resolves to:</span>
                        {domain.resolvedAddr ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold" title={domain.resolvedAddr}>
                              {domain.resolvedAddr.slice(0, 6)}…{domain.resolvedAddr.slice(-4)}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(domain.resolvedAddr!)}
                              className="text-black/40 hover:text-black transition-colors"
                            >
                              {copiedAddr === domain.resolvedAddr ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-[#FF7F41]">No address set</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!domain.isExpired && !domain.resolvedAddr && address && (
                    <div className="pt-2 border-t border-dashed border-black/15">
                      <button
                        type="button"
                        onClick={() => handleSetAddr(domain.label, domain.node)}
                        disabled={isRegistering || pendingAddrLabel !== null}
                        className={`w-full border-[2px] border-black bg-[#42C9FF] py-2 text-xs font-black uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-1.5 ${isRegistering || pendingAddrLabel !== null
                            ? "opacity-40 cursor-not-allowed [box-shadow:none] translate-x-0 translate-y-0"
                            : "bg-[#42C9FF] [box-shadow:0_0_0_1px_#000,3px_3px_0_0_#000] hover:[box-shadow:0_0_0_1px_#000,4px_4px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
                          }`}
                      >
                        {pendingAddrLabel === domain.label ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Linking...</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="h-3.5 w-3.5" />
                            <span>Link Your Wallet Address</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide / How it Works */}
      {!showResult && (
        <div className="animate-fade-in-up animation-delay-400">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-black/50">
            Registration Guide
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Search Name",
                body: "Enter your desired name. We'll automatically verify availability with the registrar contract.",
                bg: "#F5CF85",
                rotate: "rotate-[0.5deg]",
              },
              {
                step: "02",
                title: "Choose Period",
                body: "Select a registration duration: 1, 2, or 3 years. Standard fees will apply accordingly.",
                bg: "#E6FAD3",
                rotate: "-rotate-[0.5deg]",
              },
              {
                step: "03",
                title: "Register Handle",
                body: "Submit the transaction. Once confirmed, link your name to your wallet with one click.",
                bg: "#EAF7FF",
                rotate: "rotate-[0.3deg]",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`${item.rotate} border-[3px] border-black p-5 sm:p-6 [box-shadow:0_0_0_1px_#000,5px_5px_0_0_#000] transition-all hover:rotate-0`}
                style={{ backgroundColor: item.bg }}
              >
                <span className="font-mono text-xs font-black text-black/40 uppercase tracking-[0.2em]">
                  Step {item.step}
                </span>
                <h3 className="mt-2 text-lg font-black uppercase tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm font-bold text-black/75 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Click Blocker Overlay during active transactions */}
      {(isRegistering || pendingAddrLabel !== null) && (
        <div className="fixed inset-0 z-50 cursor-wait bg-black/5 pointer-events-auto" />
      )}
    </div>
  );
}
