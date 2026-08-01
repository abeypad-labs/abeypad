import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACTIVE_CHAIN_ID,
  ANSAuctionHouse,
  ANSMarketplace,
  ANSRegistry,
  getAbeyChain,
  isSupportedAbeyChain,
} from "@/config";
import type {
  MarketplaceAuction,
  MarketplaceListing,
  PrimaryAuction,
} from "@/features/ans/api";
import { ansApi } from "@/features/ans/api";
import {
  useAnsMarketplaceData,
  useAnsOwnedNames,
  useAnsTransaction,
} from "@/features/ans/hooks";
import { useConnectModal, useContractAddresses } from "@/lib/hooks";
import {
  ArrowDownToLine,
  Clock3,
  Gavel,
  Mail,
  Search,
  ShoppingBag,
  Tag,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { formatEther, parseEther, type Address } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";

type Filter = "all" | "buy" | "auction" | "reserved";

function formatAbey(value: string | bigint) {
  const number = Number(formatEther(BigInt(value)));
  return `${number.toLocaleString(undefined, { maximumFractionDigits: number >= 1 ? 3 : 6 })} $ABEY`;
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function timeLeft(value: string) {
  const seconds = Number(value) - Math.floor(Date.now() / 1_000);
  if (seconds <= 0) return "Ended";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.max(1, Math.floor((seconds % 3_600) / 60));
  return `${hours}h ${minutes}m left`;
}

function MarketBadge({ children, color = "bg-[#B8EF53]" }: { children: React.ReactNode; color?: string }) {
  return <span className={`border-2 border-black px-2 py-1 text-[9px] font-black uppercase tracking-wider ${color}`}>{children}</span>;
}

export default function NamesMarketplacePage() {
  const [params] = useSearchParams();
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const chainId = isSupportedAbeyChain(connectedChainId)
    ? connectedChainId
    : ACTIVE_CHAIN_ID;
  const chain = getAbeyChain(chainId);
  const contracts = useContractAddresses();
  const { openConnectModal } = useConnectModal();
  const { execute } = useAnsTransaction();
  const market = useAnsMarketplaceData(chainId);
  const owned = useAnsOwnedNames(address, chainId);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sellName, setSellName] = useState(params.get("sell") ?? "");
  const [saleMode, setSaleMode] = useState<"listing" | "auction">("listing");
  const [price, setPrice] = useState("");
  const [auctionDays, setAuctionDays] = useState("3");
  const [bidValues, setBidValues] = useState<Record<string, string>>({});
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

  const { data: approved, refetch: refetchApproval } = useReadContract({
    address: contracts.registry,
    abi: ANSRegistry.abi,
    functionName: "isApprovedForAll",
    args: address ? [address, contracts.marketplace] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: primaryReturns, refetch: refetchPrimaryReturns } = useReadContract({
    address: contracts.auctionHouse,
    abi: ANSAuctionHouse.abi,
    functionName: "pendingReturns",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: marketReturns, refetch: refetchMarketReturns } = useReadContract({
    address: contracts.marketplace,
    abi: ANSMarketplace.abi,
    functionName: "pendingReturns",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const { data: proceeds, refetch: refetchProceeds } = useReadContract({
    address: contracts.marketplace,
    abi: ANSMarketplace.abi,
    functionName: "claimableProceeds",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const normalizedSearch = search.trim().toLowerCase().replace(/\.abey$/, "");
  const normalizedLookup = debouncedSearch.trim().toLowerCase().replace(/\.abey$/, "");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const nameLookup = useQuery({
    queryKey: ["ans", chainId, "market-search", normalizedLookup],
    queryFn: () => ansApi.search(normalizedLookup, chainId),
    enabled: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalizedLookup),
    staleTime: 10_000,
    retry: 1,
  });
  const visibleListings = useMemo(
    () => market.listings.filter((item) => (!normalizedSearch || item.name.includes(normalizedSearch)) && (filter === "all" || filter === "buy")),
    [market.listings, normalizedSearch, filter],
  );
  const visiblePrimary = useMemo(
    () => market.primary.filter((item) => (!normalizedSearch || item.name.includes(normalizedSearch)) && (filter === "all" || filter === "auction")),
    [market.primary, normalizedSearch, filter],
  );
  const visibleAuctions = useMemo(
    () => market.auctions.filter((item) => (!normalizedSearch || item.name.includes(normalizedSearch)) && (filter === "all" || filter === "auction")),
    [market.auctions, normalizedSearch, filter],
  );
  const visibleReserved = useMemo(
    () => market.reserved.filter((item) => (!normalizedSearch || item.label.includes(normalizedSearch)) && (filter === "all" || filter === "reserved")),
    [market.reserved, normalizedSearch, filter],
  );

  const requireWallet = () => {
    if (address) return true;
    openConnectModal?.();
    return false;
  };

  const approveMarketplace = async () => {
    if (!requireWallet()) return;
    await runAction("marketplace:approve", async () => {
      await execute(
        { address: contracts.registry, abi: ANSRegistry.abi, functionName: "setApprovalForAll", args: [contracts.marketplace, true] },
        "Marketplace approved for your ANS names",
      );
      await refetchApproval();
    });
  };

  const createSale = async () => {
    if (!requireWallet() || !sellName || !price || Number(price) <= 0) {
      toast.error("Choose a name and enter a valid $ABEY price");
      return;
    }
    if (!approved) {
      toast.error("Approve the marketplace first");
      return;
    }
    const days = Number(auctionDays);
    if (
      saleMode === "auction" &&
      (!Number.isFinite(days) || days < 1 || days > 30)
    ) {
      toast.error("Auction duration must be 1-30 days");
      return;
    }
    await runAction(`sale:create:${saleMode}:${sellName}`, async () => {
      if (saleMode === "listing") {
        await execute(
          { address: contracts.marketplace, abi: ANSMarketplace.abi, functionName: "createListing", args: [sellName, parseEther(price)] },
          `${sellName}.abey listed`,
        );
      } else {
        const start = BigInt(Math.floor(Date.now() / 1_000) + 90);
        const end = start + BigInt(Math.floor(days * 86_400));
        await execute(
          {
            address: contracts.marketplace,
            abi: ANSMarketplace.abi,
            functionName: "createAuction",
            args: [sellName, parseEther(price), 500n, start, end],
          },
          `${sellName}.abey auction created`,
        );
      }
      setPrice("");
    });
  };

  const buyListing = async (item: MarketplaceListing) => {
    if (!requireWallet()) return;
    await runAction(`listing:buy:${item.listingId}`, () =>
      execute(
        { address: contracts.marketplace, abi: ANSMarketplace.abi, functionName: "buy", args: [BigInt(item.listingId)], value: BigInt(item.price) },
        `${item.fqdn} purchased`,
      ),
    );
  };

  const cancelListing = async (item: MarketplaceListing) => {
    await runAction(`listing:cancel:${item.listingId}`, () =>
      execute(
        { address: contracts.marketplace, abi: ANSMarketplace.abi, functionName: "cancelListing", args: [BigInt(item.listingId)] },
        `${item.fqdn} listing cancelled`,
      ),
    );
  };

  const bid = async (source: "primary" | "marketplace", item: PrimaryAuction | MarketplaceAuction) => {
    if (!requireWallet()) return;
    const key = `${source}-${item.auctionId}`;
    const value = bidValues[key];
    if (!value || Number(value) <= 0) {
      toast.error("Enter a bid amount");
      return;
    }
    const contract = source === "primary"
      ? { address: contracts.auctionHouse, abi: ANSAuctionHouse.abi }
      : { address: contracts.marketplace, abi: ANSMarketplace.abi };
    await runAction(`auction:${source}:bid:${item.auctionId}`, async () => {
      await execute(
        { address: contract.address, abi: contract.abi, functionName: "bid", args: [BigInt(item.auctionId)], value: parseEther(value) },
        `Bid placed on ${item.fqdn}`,
      );
      setBidValues((current) => ({ ...current, [key]: "" }));
    });
  };

  const settle = async (source: "primary" | "marketplace", item: PrimaryAuction | MarketplaceAuction) => {
    const contract = source === "primary"
      ? { address: contracts.auctionHouse, abi: ANSAuctionHouse.abi }
      : { address: contracts.marketplace, abi: ANSMarketplace.abi };
    await runAction(`auction:${source}:settle:${item.auctionId}`, () =>
      execute(
        { address: contract.address, abi: contract.abi, functionName: source === "primary" ? "settle" : "settleAuction", args: [BigInt(item.auctionId)] },
        `${item.fqdn} auction settled`,
      ),
    );
  };

  const cancelAuction = async (item: MarketplaceAuction) => {
    await runAction(`auction:marketplace:cancel:${item.auctionId}`, () =>
      execute(
        { address: contracts.marketplace, abi: ANSMarketplace.abi, functionName: "cancelAuction", args: [BigInt(item.auctionId)] },
        `${item.fqdn} auction cancelled`,
      ),
    );
  };

  const withdraw = async (kind: "primary" | "returns" | "proceeds") => {
    const contract = kind === "primary"
      ? { address: contracts.auctionHouse, abi: ANSAuctionHouse.abi }
      : { address: contracts.marketplace, abi: ANSMarketplace.abi };
    await runAction(`withdraw:${kind}`, async () => {
      await execute(
        { address: contract.address, abi: contract.abi, functionName: kind === "proceeds" ? "withdrawProceeds" : "withdraw" },
        kind === "proceeds" ? "Sale proceeds withdrawn" : "Outbid funds withdrawn",
      );
      await Promise.all([refetchPrimaryReturns(), refetchMarketReturns(), refetchProceeds()]);
    });
  };

  const claimRows = [
    { key: "primary" as const, label: "Primary refunds", value: BigInt((primaryReturns as bigint | undefined) ?? 0n) },
    { key: "returns" as const, label: "Market refunds", value: BigInt((marketReturns as bigint | undefined) ?? 0n) },
    { key: "proceeds" as const, label: "Sale proceeds", value: BigInt((proceeds as bigint | undefined) ?? 0n) },
  ];

  return (
    <div className="min-h-full bg-[#F7F1E1] px-4 py-8 text-black sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b-[3px] border-black pb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="border-2 border-black bg-[#F95D9B] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">Onchain escrow · 2.5% fee</span>
              <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.04em] sm:text-6xl">.abey marketplace</h1>
              <p className="mt-3 max-w-2xl font-bold text-black/60">Bid on reserved names, buy fixed listings, or auction a name you own. Every sale settles through the ANS registry.</p>
            </div>
            <div className="flex gap-3">
              <Link className="border-[3px] border-black bg-white px-5 py-3 text-xs font-black uppercase [box-shadow:6px_6px_0_#000]" to="/names">Register</Link>
              <Link className="border-[3px] border-black bg-[#B8EF53] px-5 py-3 text-xs font-black uppercase [box-shadow:6px_6px_0_#000]" to="/names/marketplace">Marketplace</Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="border-[3px] border-black bg-white p-5 [box-shadow:9px_9px_0_#000] sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" /><Input className="pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search marketplace" /></div>
              <div className="flex flex-wrap gap-2">
                {([['all','All'],['buy','Buy now'],['auction','Auctions'],['reserved','Reserved']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setFilter(value)} className={`border-2 border-black px-3 py-2 text-xs font-black uppercase ${filter === value ? 'bg-[#42C9FF]' : 'bg-[#FFF2D5]'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-black uppercase tracking-wider text-black/50"><span>{visibleListings.length + visiblePrimary.length + visibleAuctions.length + visibleReserved.length} items</span><span>{chain.name}</span></div>
            {normalizedLookup && nameLookup.data && !nameLookup.data.available && (
              <div className={`mt-5 border-[3px] border-black p-4 ${address?.toLowerCase() === nameLookup.data.owner?.toLowerCase() ? "bg-[#B8EF53]" : "bg-[#FFF2D5]"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-black">{nameLookup.data.name}</p><p className="mt-1 text-sm font-bold text-black/60">{address?.toLowerCase() === nameLookup.data.owner?.toLowerCase() ? "You own this name. It appears for buyers only after you list or auction it." : "Registered, but not currently listed for sale."}</p></div>
                  {address?.toLowerCase() === nameLookup.data.owner?.toLowerCase() && <Button size="sm" onClick={() => setSellName(nameLookup.data.label)}>List this name</Button>}
                </div>
              </div>
            )}
            {normalizedLookup && nameLookup.data?.available && (
              <div className="mt-5 flex items-center justify-between gap-3 border-[3px] border-black bg-[#42C9FF] p-4"><div><p className="font-black">{nameLookup.data.name} is available</p><p className="text-sm font-bold text-black/60">Register it before listing.</p></div><Button asChild size="sm"><Link to={`/names?q=${nameLookup.data.label}`}>Register</Link></Button></div>
            )}
          </div>

          <div className="border-[3px] border-black bg-[#F5CF85] p-5 [box-shadow:9px_9px_0_#000]">
            <div className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5" /><h2 className="font-black uppercase">Withdrawable balance</h2></div>
            <div className="mt-4 space-y-3">
              {claimRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between border-2 border-black bg-white p-3"><div><p className="text-[10px] font-black uppercase text-black/50">{row.label}</p><p className="font-black">{formatAbey(row.value)}</p></div><Button size="sm" loading={activeAction === `withdraw:${row.key}`} loadingText="Claiming" disabled={row.value === 0n || activeAction !== null} onClick={() => withdraw(row.key)}>Claim</Button></div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            {market.isLoading && <div className="border-[3px] border-black bg-white p-8 font-black">Loading marketplace…</div>}
            {market.error && <div className="border-[3px] border-black bg-[#FFB09C] p-6 font-black">Marketplace API unavailable. Start the backend and retry.</div>}
            {!market.isLoading && !market.error && visibleListings.length + visiblePrimary.length + visibleAuctions.length + visibleReserved.length === 0 && (
              <div className="border-[3px] border-dashed border-black bg-white p-10 text-center"><ShoppingBag className="mx-auto h-10 w-10" /><p className="mt-3 text-2xl font-black">No matching listings yet.</p><p className="mt-2 font-bold text-black/55">Be the first wallet to list a .abey name.</p></div>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              {visibleListings.map((item, index) => {
                const mine = address?.toLowerCase() === item.seller.toLowerCase();
                return (
                  <article key={`listing-${item.listingId}`} className={`border-[3px] border-black bg-white p-5 [box-shadow:7px_7px_0_#000] ${index % 2 ? 'rotate-[0.25deg]' : '-rotate-[0.25deg]'}`}>
                    <div className="flex items-start justify-between"><MarketBadge color="bg-[#42C9FF]">Buy now</MarketBadge><MarketBadge color={item.status === 'active' ? 'bg-[#B8EF53]' : 'bg-[#DDD]'}>{item.status}</MarketBadge></div>
                    <h3 className="mt-5 text-2xl font-black">{item.fqdn}</h3><p className="mt-1 text-xs font-bold text-black/50">Seller {shortAddress(item.seller)}</p>
                    <p className="mt-5 border-y-2 border-black py-3 text-2xl font-black">{formatAbey(item.price)}</p>
                    <div className="mt-4">{item.active && (mine ? <Button loading={activeAction === `listing:cancel:${item.listingId}`} loadingText="Cancelling" disabled={activeAction !== null} variant="destructive" className="w-full" onClick={() => cancelListing(item)}>Cancel listing</Button> : <Button loading={activeAction === `listing:buy:${item.listingId}`} loadingText="Buying" disabled={activeAction !== null} className="w-full" onClick={() => buyListing(item)}>Buy name</Button>)}</div>
                  </article>
                );
              })}

              {visiblePrimary.map((item) => <AuctionCard key={`primary-${item.auctionId}`} source="primary" item={item} address={address} activeAction={activeAction} bidValue={bidValues[`primary-${item.auctionId}`] ?? ''} setBidValue={(value) => setBidValues((current) => ({ ...current, [`primary-${item.auctionId}`]: value }))} onBid={() => bid('primary', item)} onSettle={() => settle('primary', item)} />)}
              {visibleAuctions.map((item) => <AuctionCard key={`market-${item.auctionId}`} source="marketplace" item={item} address={address} activeAction={activeAction} bidValue={bidValues[`marketplace-${item.auctionId}`] ?? ''} setBidValue={(value) => setBidValues((current) => ({ ...current, [`marketplace-${item.auctionId}`]: value }))} onBid={() => bid('marketplace', item)} onSettle={() => settle('marketplace', item)} onCancel={() => cancelAuction(item)} />)}

              {visibleReserved.map((item) => (
                <article key={`reserved-${item.id}`} className="border-[3px] border-black bg-[#FFF2D5] p-5 [box-shadow:7px_7px_0_#000]">
                  <div className="flex justify-between"><MarketBadge color="bg-[#F95D9B]">Reserved</MarketBadge><MarketBadge>{item.saleMode === 'buy_now' ? 'Fixed price' : 'Auction'}</MarketBadge></div>
                  <h3 className="mt-5 text-2xl font-black">{item.fqdn}</h3><p className="mt-1 text-xs font-black uppercase text-black/50">{item.category.replaceAll('_',' ')}</p>
                  <p className="mt-5 border-y-2 border-black py-3 text-xl font-black">{item.saleMode === 'buy_now' && item.fixedPriceWei ? formatAbey(item.fixedPriceWei) : item.reservePriceWei ? `Reserve ${formatAbey(item.reservePriceWei)}` : 'Price pending'}</p>
                  <Button asChild className="mt-4 w-full" variant="secondary"><Link to={`/names?q=${item.label}`}>{item.activatedAt ? 'View sale' : 'Coming to auction'}</Link></Button>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="border-[3px] border-black bg-[#B8EF53] p-5 [box-shadow:8px_8px_0_#000]">
              <div className="flex items-center gap-2"><Tag className="h-6 w-6" /><h2 className="text-xl font-black uppercase">Sell a name</h2></div>
              {!address ? <Button className="mt-5 w-full" onClick={openConnectModal}><Wallet /> Connect wallet</Button> : (
                <div className="mt-5 space-y-4">
                  <label className="block"><span className="text-xs font-black uppercase tracking-wider">Name</span><select className="mt-2 h-11 w-full border-[3px] border-black bg-white px-3 font-bold" value={sellName} onChange={(event) => setSellName(event.target.value)}><option value="">Select your name</option>{owned.data?.filter((name) => name.custody === 'wallet' && !name.isExpired).map((name) => <option key={name.node} value={name.label}>{name.fqdn}</option>)}</select></label>
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setSaleMode('listing')} className={`border-2 border-black p-2 text-xs font-black uppercase ${saleMode === 'listing' ? 'bg-[#42C9FF]' : 'bg-white'}`}>Fixed price</button><button type="button" onClick={() => setSaleMode('auction')} className={`border-2 border-black p-2 text-xs font-black uppercase ${saleMode === 'auction' ? 'bg-[#F95D9B]' : 'bg-white'}`}>Auction</button></div>
                  <label className="block"><span className="text-xs font-black uppercase tracking-wider">{saleMode === 'listing' ? 'Price' : 'Reserve'} in $ABEY</span><Input className="mt-2" type="number" min="0" step="any" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="1000" /></label>
                  {saleMode === 'auction' && <label className="block"><span className="text-xs font-black uppercase tracking-wider">Duration in days</span><Input className="mt-2" type="number" min="1" max="30" value={auctionDays} onChange={(event) => setAuctionDays(event.target.value)} /></label>}
                  {!approved && <div className="border-2 border-black bg-white p-3"><p className="text-xs font-bold">One-time registry approval is required before the escrow can hold a name.</p><Button size="sm" loading={activeAction === "marketplace:approve"} loadingText="Approving" disabled={activeAction !== null} className="mt-3 w-full" onClick={approveMarketplace}>1. Approve marketplace</Button></div>}
                  <Button className="w-full" loading={Boolean(activeAction?.startsWith("sale:create:"))} loadingText="Confirming" disabled={!approved || activeAction !== null} onClick={createSale}>{approved ? `Create ${saleMode}` : 'Approve first'}</Button>
                  <p className="text-[11px] font-bold text-black/60">Auctions start after 90 seconds. Names must remain valid through settlement plus the one-day safety buffer.</p>
                </div>
              )}
            </div>

            <div className="border-[3px] border-black bg-[#F5CF85] p-5 [box-shadow:8px_8px_0_#000]"><Mail className="h-6 w-6" /><h3 className="mt-2 font-black uppercase">Bid & sale alerts</h3><p className="mt-2 text-sm font-bold text-black/60">Get notified when you are outbid or a listing sells.</p><span className="mt-3 inline-block border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase">Coming soon</span></div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function AuctionCard({
  source,
  item,
  address,
  activeAction,
  bidValue,
  setBidValue,
  onBid,
  onSettle,
  onCancel,
}: {
  source: "primary" | "marketplace";
  item: PrimaryAuction | MarketplaceAuction;
  address?: Address;
  activeAction: string | null;
  bidValue: string;
  setBidValue: (value: string) => void;
  onBid: () => void;
  onSettle: () => void;
  onCancel?: () => void;
}) {
  const seller = "seller" in item ? item.seller : null;
  const mine = Boolean(seller && address?.toLowerCase() === seller.toLowerCase());
  const current = BigInt(item.highestBid) > 0n ? item.highestBid : item.reservePrice;
  const bidAction = `auction:${source}:bid:${item.auctionId}`;
  const settleAction = `auction:${source}:settle:${item.auctionId}`;
  const cancelAction = `auction:${source}:cancel:${item.auctionId}`;
  return (
    <article className="border-[3px] border-black bg-white p-5 [box-shadow:7px_7px_0_#000]">
      <div className="flex items-start justify-between"><MarketBadge color={source === 'primary' ? 'bg-[#F95D9B]' : 'bg-[#F5CF85]'}>{source === 'primary' ? 'Premium auction' : 'Resale auction'}</MarketBadge><MarketBadge color={item.status === 'active' ? 'bg-[#B8EF53]' : 'bg-[#DDD]'}>{item.status}</MarketBadge></div>
      <h3 className="mt-5 text-2xl font-black">{item.fqdn}</h3>
      <div className="mt-2 flex items-center gap-2 text-xs font-bold text-black/55"><Clock3 className="h-4 w-4" />{timeLeft(item.endTime)} · {item.bidCount} bid{item.bidCount === 1 ? '' : 's'}</div>
      <div className="mt-5 border-y-2 border-black py-3"><p className="text-[10px] font-black uppercase text-black/50">{BigInt(item.highestBid) > 0n ? 'Highest bid' : 'Reserve price'}</p><p className="text-2xl font-black">{formatAbey(current)}</p>{item.highestBidder && <p className="mt-1 text-xs font-bold">by {shortAddress(item.highestBidder)}</p>}</div>
      {item.status === 'active' && !mine && <div className="mt-4 flex gap-2"><Input type="number" min="0" step="any" value={bidValue} onChange={(event) => setBidValue(event.target.value)} placeholder="Bid in $ABEY" /><Button loading={activeAction === bidAction} loadingText="Bidding" disabled={activeAction !== null} onClick={onBid}><Gavel /></Button></div>}
      {item.status === 'ended' && <Button loading={activeAction === settleAction} loadingText="Settling" disabled={activeAction !== null} className="mt-4 w-full" variant="secondary" onClick={onSettle}>Settle auction</Button>}
      {source === 'marketplace' && mine && ['active','scheduled'].includes(item.status) && onCancel && <Button loading={activeAction === cancelAction} loadingText="Cancelling" disabled={activeAction !== null} className="mt-4 w-full" variant="destructive" onClick={onCancel}>Cancel auction</Button>}
    </article>
  );
}
