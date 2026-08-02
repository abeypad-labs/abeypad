import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACTIVE_CHAIN_ID,
  ANSRegistrar,
  ANSRegistry,
  ANSResolver,
  isSupportedAbeyChain,
} from "@/config";
import {
  ansApi,
  ApiError,
  type AnsOwnedName,
  type AnsSuggestion,
} from "@/features/ans/api";
import { resolveAddressOrAns } from "@/features/ans/address";
import { NamesTestnetGate } from "@/features/ans/NamesTestnetGate";
import { PrimaryNameControl } from "@/features/ans/PrimaryNameControl";
import {
  useAnsOwnedNames,
  useAnsPricing,
  useAnsTransaction,
} from "@/features/ans/hooks";
import { useConnectModal, useContractAddresses } from "@/lib/hooks";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgePercent,
  Check,
  History,
  LoaderCircle,
  Mail,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { zeroAddress, type Address } from "viem";
import { useAccount, useChainId } from "wagmi";

const YEAR_SECONDS = 365n * 24n * 60n * 60n;
const periods = [1, 2, 3, 5] as const;
const SEARCH_HISTORY_KEY = "abeypad_ans_search_history";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\.abey$/i, "");
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatExpiry(value: string) {
  if (!value || value === "0") return "No active registration";
  return new Date(Number(value) * 1_000).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function statusCopy(policy: number, available: boolean) {
  if (policy === 1) return { title: "Protected name", body: "This label is reserved for Abey ecosystem operations." };
  if (policy === 2) return { title: "Auction-only name", body: "This premium name can only be won through the primary auction house." };
  if (policy === 3) return { title: "Fixed premium name", body: "This premium label uses its configured marketplace price." };
  if (available) return { title: "Available to register", body: "Secure it now." };
  return { title: "Already registered", body: "Search the marketplace or try another label." };
}

function formatAbey(value: string, maximumFractionDigits = 3) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits });
}

function tierLabel(length: number) {
  if (length === 4) return "4-character rate";
  if (length === 5) return "5-character rate";
  if (length < 10) return "6–9 character rate";
  return "10+ character rate";
}

function discountForYears(years: number) {
  if (years >= 5) return 15;
  if (years >= 3) return 10;
  if (years >= 2) return 5;
  return 0;
}

function loadSearchHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]");
    return Array.isArray(stored)
      ? stored.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function buildLocalSuggestions(input: string) {
  const label = normalize(input);
  if (!label) return [];
  return [...new Set([
    label,
    `${label}hq`,
    `${label}labs`,
    `${label}dao`,
    `get${label}`,
    `${label}x`,
  ])]
    .filter((candidate) =>
      candidate.length <= 32 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(candidate),
    )
    .slice(0, 5);
}

export default function NamesPage() {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const chainId = isSupportedAbeyChain(connectedChainId)
    ? connectedChainId
    : ACTIVE_CHAIN_ID;
  const contracts = useContractAddresses();
  const { openConnectModal } = useConnectModal();
  const { execute } = useAnsTransaction();
  const [input, setInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [searchedName, setSearchedName] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>(loadSearchHistory);
  const [years, setYears] = useState<(typeof periods)[number]>(1);
  const [selectedName, setSelectedName] = useState<AnsOwnedName | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [textKey, setTextKey] = useState("url");
  const [textValue, setTextValue] = useState("");
  const [transferAddress, setTransferAddress] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const runAction = async <T,>(key: string, action: () => Promise<T>) => {
    if (activeAction) return;
    setActiveAction(key);
    try {
      return await action();
    } finally {
      setActiveAction((current) => (current === key ? null : current));
    }
  };

  const label = normalize(searchedName);
  const typedLabel = normalize(debouncedInput);
  const validationError = useMemo(() => {
    const value = normalize(input);
    if (!value) return null;
    if (value.length < 4) return "1-3 character names are reserved.";
    if (value.length > 32) return "Names can be at most 32 characters.";
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) {
      return "Use lowercase letters, numbers, and interior hyphens only.";
    }
    return null;
  }, [input]);

  const search = useQuery({
    queryKey: ["ans", chainId, "search", label],
    queryFn: () => ansApi.search(label, chainId),
    enabled: Boolean(label),
    retry: 1,
  });
  const suggestions = useQuery({
    queryKey: ["ans", chainId, "suggestions", typedLabel, address],
    queryFn: () => ansApi.suggestions(typedLabel, chainId, address),
    enabled: Boolean(
      typedLabel &&
      typedLabel.length <= 32 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(typedLabel),
    ),
    staleTime: 10_000,
    retry: 1,
  });
  const pricing = useAnsPricing(label, years, chainId, address);
  const owned = useAnsOwnedNames(address, chainId);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedInput(input), 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  const addToSearchHistory = (name: string) => {
    const clean = normalize(name);
    if (!clean) return;
    setSearchHistory((current) => {
      const next = [clean, ...current.filter((item) => item !== clean)].slice(0, 5);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const selectSearchName = (name: string) => {
    const clean = normalize(name);
    if (!clean) return;
    setInput(clean);
    setDebouncedInput(clean);
    setSearchedName(clean);
    setYears(1);
    addToSearchHistory(clean);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = normalize(input);
    if (!value || validationError) return;
    setSearchedName(value);
    addToSearchHistory(value);
  };

  const requestQuoteAndWrite = async (
    action: "register" | "renew" | "fixed_premium_register",
    name: string,
  ) => {
    if (!address) {
      openConnectModal?.();
      return;
    }
    await runAction(`${action}:${name}`, async () => {
      try {
        const signed = await ansApi.quote(
          { action, name, beneficiary: address, durationYears: years },
          chainId,
        );
        const quote = {
          action: signed.quote.action,
          labelHash: signed.quote.labelHash,
          beneficiary: signed.quote.beneficiary,
          duration: BigInt(signed.quote.duration),
          priceWei: BigInt(signed.quote.priceWei),
          deadline: BigInt(signed.quote.deadline),
          nonce: signed.quote.nonce,
        };
        if (action === "renew") {
          await execute(
            {
              address: contracts.registrar,
              abi: ANSRegistrar.abi,
              functionName: "renew",
              args: [
                name,
                BigInt(years) * YEAR_SECONDS,
                quote,
                signed.signature,
              ],
              value: quote.priceWei,
            },
            `${name}.abey renewed`,
          );
        } else {
          await execute(
            {
              address: contracts.registrar,
              abi: ANSRegistrar.abi,
              functionName:
                action === "register" ? "register" : "registerFixedPremium",
              args: [
                name,
                BigInt(years) * YEAR_SECONDS,
                zeroAddress,
                quote,
                signed.signature,
              ],
              value: quote.priceWei,
            },
            `${name}.abey registered`,
          );
        }
        // The live lookup reconciles current chain ownership into the index first;
        // refresh the wallet portfolio only after that write has completed.
        await search.refetch();
        await owned.refetch();
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.code === "quote_signer_unavailable"
        ) {
          toast.error("Registration signer is not online yet", {
            description:
              "The ANS contracts are live, but the dedicated backend quote key still needs to be authorized.",
          });
        }
      }
    });
  };

  const updateAddress = async () => {
    if (!selectedName) return;
    const name = selectedName;
    await runAction(`address:${name.node}`, async () => {
      let target: Address;
      try {
        target = await resolveAddressOrAns(resolvedAddress, chainId);
      } catch {
        toast.error("Enter a valid address or .abey name");
        return;
      }
      await execute(
        {
          address: contracts.resolver,
          abi: ANSResolver.abi,
          functionName: "setAddr",
          args: [name.node, target],
        },
        `${name.fqdn} now resolves to ${shortAddress(target)}`,
      );
      setResolvedAddress("");
      await owned.refetch();
    });
  };

  const updateText = async () => {
    if (!selectedName || !textKey.trim()) return;
    const name = selectedName;
    await runAction(`text:${name.node}`, async () => {
      await execute(
        {
          address: contracts.resolver,
          abi: ANSResolver.abi,
          functionName: "setText",
          args: [name.node, textKey.trim(), textValue.trim()],
        },
        `${name.fqdn} text record updated`,
      );
      setTextValue("");
    });
  };

  const transferName = async () => {
    if (!selectedName) return;
    const name = selectedName;
    await runAction(`transfer:${name.node}`, async () => {
      let target: Address;
      try {
        target = await resolveAddressOrAns(transferAddress, chainId);
      } catch {
        toast.error("Enter a valid recipient address or .abey name");
        return;
      }
      await execute(
        {
          address: contracts.registry,
          abi: ANSRegistry.abi,
          functionName: "setOwner",
          args: [name.node, target],
        },
        `${name.fqdn} transferred`,
      );
      setSelectedName(null);
      setTransferAddress("");
      await owned.refetch();
    });
  };

  const result = search.data;
  const copy = result ? statusCopy(result.policy, result.available) : null;
  const canRegister = Boolean(result?.available && result.policy === 0 && label.length >= 4);
  const canFixedRegister = Boolean(result?.available && result.policy === 3 && result.reserved?.enabled);
  const estimate = pricing.data?.estimate;
  const isAdminTestPrice = pricing.data?.pricingMode === "testnet_admin";
  const showActiveSuggestions = Boolean(input.trim() && typedLabel && typedLabel !== label);
  const activeSuggestions = useMemo(() => {
    if (suggestions.data?.length) return suggestions.data;
    return buildLocalSuggestions(typedLabel).map((suggestionLabel) => ({
      chainId,
      label: suggestionLabel,
      name: `${suggestionLabel}.abey`,
      length: suggestionLabel.length,
      available: false,
      policy: suggestionLabel.length < 4 ? 2 : 0,
      status: suggestionLabel.length < 4 ? "reserved" : "checking",
      price: null,
    } satisfies Omit<AnsSuggestion, "status"> & { status: AnsSuggestion["status"] | "checking" }));
  }, [chainId, suggestions.data, typedLabel]);

  return (
    <NamesTestnetGate>
      <div className="min-h-full bg-[#F7F1E1] px-4 py-8 text-black sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 border-b-[3px] border-black pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-[-0.04em] sm:text-6xl">
              Your name on <span className="text-[#FF7F41]">Abey.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base font-bold text-black/65">
              Register, manage, renew, and trade your <span className="text-black">.abey</span> names.
            </p>
          </div>
          <div className="flex gap-3">
            <Link className="border-[3px] border-black bg-white px-5 py-3 text-xs font-black uppercase tracking-wider [box-shadow:6px_6px_0_#000]" to="/names">
              Register
            </Link>
            <Link className="border-[3px] border-black bg-[#F95D9B] px-5 py-3 text-xs font-black uppercase tracking-wider [box-shadow:6px_6px_0_#000]" to="/names/marketplace">
              Marketplace
            </Link>
          </div>
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
          <section className="border-[3px] border-black bg-white p-5 [box-shadow:10px_10px_0_#000] sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <Search className="h-7 w-7" strokeWidth={3} />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/55">Find your identity</p>
                <h2 className="text-2xl font-black">Search .abey</h2>
              </div>
            </div>
            <form onSubmit={submitSearch} className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Input
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    if (!event.target.value.trim()) setSearchedName("");
                  }}
                  placeholder="yourname"
                  minLength={4}
                  maxLength={32}
                  className="h-14 pr-20 text-lg font-black"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-black/45">.abey</span>
              </div>
              <Button size="lg" loading={search.isFetching} loadingText="Checking" disabled={!input || Boolean(validationError)} type="submit">
                Search <ArrowRight />
              </Button>
            </form>
            {validationError && <p className="mt-3 text-sm font-bold text-red-700">{validationError}</p>}
            {showActiveSuggestions && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                    Live suggestions
                  </p>
                  {suggestions.isFetching && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-black/45">
                      <LoaderCircle className="h-3 w-3 animate-spin" /> Checking
                    </span>
                  )}
                </div>
                <div className="grid gap-2">
                  {activeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => selectSearchName(suggestion.label)}
                      className={`group flex w-full items-center justify-between gap-4 border-2 border-black px-4 py-3 text-left transition-transform hover:translate-x-1 ${
                        suggestion.status === "available"
                          ? "bg-[#E9FFC4]"
                          : suggestion.status === "reserved"
                            ? "bg-[#FFD6E7]"
                            : suggestion.status === "checking"
                              ? "bg-white"
                              : "bg-[#FFF2D5]"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-lg font-black tracking-tight">
                          {suggestion.label}<span className="text-black/40">.abey</span>
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                          <span className={`border border-black px-2 py-0.5 ${suggestion.status === "available" ? "bg-[#B8EF53]" : "bg-white"}`}>
                            {suggestion.status}
                          </span>
                          <span className="text-black/45">{suggestion.length} characters</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {suggestion.price && (
                          <span className="hidden text-right sm:block">
                            <span className="block text-sm font-black">
                              {formatAbey(suggestion.price.priceAbey, 2)} $ABEY
                            </span>
                            <span className="block text-[10px] font-bold text-black/50">
                              ${suggestion.price.totalUsd} / year
                            </span>
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </button>
                  ))}
                  {!suggestions.isFetching && activeSuggestions.length === 0 && (
                    <p className="border-2 border-dashed border-black p-3 text-sm font-bold text-black/55">
                      Keep typing to generate valid .abey variations.
                    </p>
                  )}
                </div>
              </div>
            )}

            {!input.trim() && searchHistory.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                    <History className="h-3.5 w-3.5" /> Recent searches
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchHistory([]);
                      localStorage.removeItem(SEARCH_HISTORY_KEY);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase underline"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectSearchName(item)}
                      className="border-2 border-black bg-[#FFF2D5] px-3 py-1.5 text-xs font-black"
                    >
                      {item}.abey
                    </button>
                  ))}
                </div>
              </div>
            )}

            {label && normalize(input) === label && (
              <div className="mt-8 border-t-[3px] border-black pt-7">
                {search.isLoading ? (
                  <div className="animate-pulse border-[3px] border-black bg-[#F7F1E1] p-8 font-black">Checking the ANS registry…</div>
                ) : search.error ? (
                  <div className="border-[3px] border-black bg-[#FFB09C] p-5 font-bold">Could not reach the ANS API. Make sure the backend is running.</div>
                ) : result && copy ? (
                  <div className={`relative overflow-hidden border-[3px] border-black ${result.available ? 'bg-[#DFFFA7]' : 'bg-[#FFF2D5]'} [box-shadow:8px_8px_0_#000]`}>
                    <div className="absolute right-0 top-0 h-24 w-24 translate-x-10 -translate-y-10 rotate-12 border-[3px] border-black bg-[#42C9FF]" />
                    <div className="relative p-5 sm:p-7">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                            {result.available ? <Check className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            {copy.title}
                          </div>
                          <p className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                            {label}<span className="text-black/35">.abey</span>
                          </p>
                          <p className="mt-2 text-sm font-bold text-black/60">{copy.body}</p>
                          {result.owner && <p className="mt-3 font-mono text-xs">Owner: {shortAddress(result.owner)}</p>}
                        </div>
                        {isAdminTestPrice && canRegister && (
                          <span className="inline-flex w-fit items-center gap-2 border-2 border-black bg-[#F95D9B] px-3 py-2 text-[10px] font-black uppercase tracking-wider">
                            <BadgePercent className="h-4 w-4" /> Admin test rate · 1%
                          </span>
                        )}
                      </div>

                      {canRegister && estimate && (
                        <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.68fr)]">
                          <div className="border-[3px] border-black bg-white/70 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                              Registration period
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                              {periods.map((period) => {
                                const discount = discountForYears(period);
                                return (
                                  <button
                                    key={period}
                                    type="button"
                                    onClick={() => setYears(period)}
                                    className={`min-h-16 border-2 border-black px-3 py-2 text-left ${years === period ? 'bg-[#42C9FF] [box-shadow:3px_3px_0_#000]' : 'bg-white'}`}
                                  >
                                    <span className="block text-sm font-black">{period} year{period > 1 ? 's' : ''}</span>
                                    <span className="mt-1 block text-[9px] font-black uppercase text-black/45">
                                      {discount ? `${discount}% off` : 'Base rate'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                              <span className="border-2 border-black bg-[#FFF2D5] px-2.5 py-1">
                                {tierLabel(label.length)} · ${(estimate.usdCentsPerYear / 100).toFixed(2)} / year
                              </span>
                              {estimate.discountBps > 0 && (
                                <span className="border-2 border-black bg-[#B8EF53] px-2.5 py-1">
                                  {estimate.discountBps / 100}% term saving
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col border-[3px] border-black bg-white p-5 [box-shadow:5px_5px_0_#000]">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                              Total for {years} year{years > 1 ? 's' : ''}
                            </p>
                            <p className="mt-2 text-3xl font-black leading-none tracking-tight">
                              {formatAbey(estimate.priceAbey)} <span className="text-lg">$ABEY</span>
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-sm font-bold text-black/55">
                              <span>${estimate.totalUsd}</span>
                              {isAdminTestPrice && (
                                <span className="line-through opacity-55">${estimate.standardTotalUsd}</span>
                              )}
                            </div>
                            <Button
                              className="mt-5 w-full"
                              loading={activeAction === `register:${label}`}
                              loadingText="Confirming"
                              disabled={activeAction !== null}
                              onClick={() => requestQuoteAndWrite('register', label)}
                            >
                              {address ? 'Register now' : 'Connect wallet'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {canFixedRegister && (
                        <Button className="mt-6" loading={activeAction === `fixed_premium_register:${label}`} loadingText="Confirming" disabled={activeAction !== null} onClick={() => requestQuoteAndWrite('fixed_premium_register', label)}>
                          {address ? 'Register premium name' : 'Connect to register'}
                        </Button>
                      )}
                      {result.policy === 2 && (
                        <Button asChild variant="secondary" className="mt-6"><Link to={`/names/marketplace?q=${label}`}>View auctions <Tag /></Link></Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="-rotate-[0.4deg] border-[3px] border-black bg-[#F5CF85] p-5 [box-shadow:8px_8px_0_#000]">
              <Mail className="h-6 w-6" />
              <h3 className="mt-2 text-lg font-black uppercase">Expiry reminders</h3>
              <p className="mt-2 text-sm font-bold text-black/65">Email alerts for renewals, bids, and marketplace activity.</p>
              <span className="mt-4 inline-block border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider">Coming soon</span>
            </div>
          </aside>
        </div>

        <section className="mt-12">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-3xl font-black uppercase">My .abey names</h2>
            {!address && <Button variant="secondary" onClick={openConnectModal}><Wallet /> Connect wallet</Button>}
          </div>
          {address && owned.isLoading && <div className="border-[3px] border-black bg-white p-6 font-black">Loading names from the AbeyPad index…</div>}
          {address && !owned.isLoading && (owned.data?.length ?? 0) === 0 && (
            <div className="border-[3px] border-dashed border-black bg-white p-8 text-center">
              <p className="text-xl font-black">No names in this wallet yet.</p>
              <p className="mt-2 font-bold text-black/55">Search above to claim your first .abey identity.</p>
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {owned.data?.map((name) => (
              <article
                key={name.node}
                className="relative overflow-hidden border-[3px] border-black bg-[#FFF8E8] [box-shadow:4px_4px_0_#000]"
              >
                <div className="absolute right-0 top-0 h-16 w-16 -translate-y-9 translate-x-9 rotate-12 border-[3px] border-black bg-[#F95D9B]" />
                <div className="relative p-5">
                  <h3 className="truncate text-2xl font-black tracking-tight">
                    {name.fqdn}
                  </h3>
                  <p className="mt-1 font-mono text-xs font-bold text-black/50">
                    {name.resolvedAddress
                      ? shortAddress(name.resolvedAddress)
                      : "No address record"}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-black/60">
                      Expires {formatExpiry(name.expiry)}
                    </p>
                    <PrimaryNameControl
                      name={name}
                      className="h-8 rounded-none border-0 bg-transparent px-2 text-[10px] shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-white/70"
                    />
                  </div>
                  <div className="mt-5 grid grid-cols-3 items-center border-t border-black/20 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={activeAction === `renew:${name.label}`}
                      loadingText="Renewing"
                      disabled={activeAction !== null}
                      className="h-9 rounded-none border-0 bg-transparent px-2 text-black shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-white/70"
                      onClick={() => requestQuoteAndWrite("renew", name.label)}
                    >
                      Renew
                    </Button>
                    {name.custody === "wallet" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 rounded-none border-0 bg-transparent px-2 shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-white/70"
                          onClick={() => {
                            setSelectedName(name);
                            setResolvedAddress(
                              name.resolvedAddress ?? address ?? "",
                            );
                          }}
                        >
                          Manage
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-9 rounded-none border-0 bg-transparent px-2 shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-white/70"
                        >
                          <Link to={`/names/marketplace?sell=${name.label}`}>
                            Sell
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {selectedName && (
          <section className="mt-10 border-[3px] border-black bg-[#FFF2D5] p-5 [box-shadow:10px_10px_0_#000] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-wider text-black/50">Manage records</p><h2 className="text-2xl font-black">{selectedName.fqdn}</h2></div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedName(null)}>Close</Button>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="border-2 border-black bg-white p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-wider">Resolution address</p>
                <Input value={resolvedAddress} onChange={(event) => setResolvedAddress(event.target.value)} placeholder="0x… or name.abey" />
                <Button size="sm" loading={activeAction === `address:${selectedName.node}`} loadingText="Updating" disabled={activeAction !== null} className="mt-4 w-full" onClick={updateAddress}>Update address</Button>
              </div>
              <div className="border-2 border-black bg-white p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-wider">Text record</p>
                <div className="grid grid-cols-[90px_1fr] gap-2"><Input value={textKey} onChange={(event) => setTextKey(event.target.value)} placeholder="url" /><Input value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder="https://…" /></div>
                <Button size="sm" loading={activeAction === `text:${selectedName.node}`} loadingText="Saving" disabled={activeAction !== null} className="mt-4 w-full" onClick={updateText}>Save record</Button>
              </div>
              <div className="border-2 border-black bg-[#FFB09C] p-4">
                <p className="mb-1 text-xs font-black uppercase tracking-wider">Transfer ownership</p>
                <p className="mb-3 text-xs font-bold">Permanent until the new owner transfers it back.</p>
                <Input value={transferAddress} onChange={(event) => setTransferAddress(event.target.value)} placeholder="0x… or name.abey" />
                <Button size="sm" loading={activeAction === `transfer:${selectedName.node}`} loadingText="Transferring" disabled={activeAction !== null} variant="destructive" className="mt-4 w-full" onClick={transferName}>Transfer name</Button>
              </div>
            </div>
          </section>
        )}
      </div>
      </div>
    </NamesTestnetGate>
  );
}
