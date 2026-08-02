"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TokenInfo } from "@/components/TokenInfo";
import { useAccount, useChainId } from "@/lib/hooks";
import { useAllLocks } from "@/lib/hooks/useAllLocks";
import { useLaunchpadPresales } from "@/lib/hooks/useLaunchpadPresales";
import { useUserTokens } from "@/lib/hooks/useUserTokens";
import { ACTIVE_CHAIN_ID, isSupportedAbeyChain } from "@/config";
import { useAnsOwnedNames } from "@/features/ans/hooks";
import { PrimaryNameControl } from "@/features/ans/PrimaryNameControl";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Address } from "viem";
import { formatUnits } from "viem";
import { AbeyUsdValue } from "@/components/AbeyUsdValue";

function PresaleInfo({ presaleAddress }: { presaleAddress: Address }) {
  const { presales, isLoading } = useLaunchpadPresales("all", false);

  // Find the presale in the list
  const presaleData = presales?.find(
    (p) => p.address.toLowerCase() === presaleAddress.toLowerCase(),
  );

  if (isLoading || !presaleData) {
    return (
      <div className="py-3 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  const progress =
    presaleData.hardCap > 0n
      ? Math.round(
          Number((presaleData.totalRaised * 100n) / presaleData.hardCap),
        )
      : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-500";
      case "upcoming":
        return "bg-yellow-500";
      case "finalized":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="border-2 border-black bg-[#FFFDF7] p-4 shadow-[2px_2px_0_rgba(0,0,0,1)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-lg uppercase">
              {presaleData.saleTokenSymbol || "Token"} Presale
            </h3>
            <span
              className={`px-2 py-0.5 text-xs font-bold uppercase text-white ${getStatusColor(presaleData.status)}`}
            >
              {presaleData.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 break-all font-mono">
            {presaleAddress}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <Button
            size="sm"
            asChild
            className="border-2 border-black bg-[#FFE38A] text-black font-bold text-xs uppercase shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#F6CF62]"
          >
            <Link to={`/dashboard/presales/manage/${presaleAddress}`}>
              Manage <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
      {presaleData.hardCap > 0n && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold">{progress}% Funded</span>
            <span className="text-right text-gray-500">
              <span className="block">
              {Math.round(
                Number(formatUnits(presaleData.totalRaised, 18)),
              ).toLocaleString()}{" "}
              /{" "}
              {Math.round(
                Number(formatUnits(presaleData.hardCap, 18)),
              ).toLocaleString()}{" "}
              $ABEY
              </span>
              <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] font-black text-black/45">
                <AbeyUsdValue value={presaleData.totalRaised} unit="wei" className="inline" />
                <span>/</span>
                <AbeyUsdValue value={presaleData.hardCap} unit="wei" className="inline" />
              </span>
            </span>
          </div>
          <Progress value={progress} className="h-2 border border-black" />
        </div>
      )}
    </div>
  );
}

function LockPreviewCard({
  lock,
}: {
  lock: {
    id: bigint;
    token: `0x${string}`;
    amount: bigint;
    lockDate: bigint;
    unlockDate: bigint;
    withdrawn: boolean;
    name: string;
    tokenSymbol?: string;
    formattedAmount: string;
  };
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000); // Update every minute instead of every second

    return () => clearInterval(interval);
  }, []);

  // Safe bigint to string conversion
  const lockIdString =
    lock.id !== undefined && lock.id !== null ? String(lock.id) : "0";

  // Safe number conversions with fallbacks
  let lockTimestamp = 0;
  let unlockTimestamp = 0;
  try {
    lockTimestamp = lock.lockDate ? Number(lock.lockDate) * 1000 : 0;
    unlockTimestamp = lock.unlockDate ? Number(lock.unlockDate) * 1000 : 0;
  } catch (e) {
    console.error("Error converting lock timestamps:", e);
  }

  const totalDuration = unlockTimestamp - lockTimestamp;
  const elapsed = now - lockTimestamp;
  const progress =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
      : 0;
  const isExpired = unlockTimestamp > 0 && now >= unlockTimestamp;

  // Safe distance calculation
  let timeRemaining = "Ready";
  if (!isExpired && unlockTimestamp > 0) {
    try {
      timeRemaining = formatDistanceToNow(new Date(unlockTimestamp), {
        addSuffix: true,
      });
    } catch (e) {
      console.error("Error formatting distance:", e);
      timeRemaining = "Unknown";
    }
  }

  return (
    <div className="border-2 border-black bg-[#FFFDF7] p-4 shadow-[2px_2px_0_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm uppercase">
            {lock.name || `Lock #${lockIdString}`}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-bold uppercase ${lock.withdrawn ? "bg-gray-400 text-white" : isExpired ? "bg-green-500 text-white" : "bg-yellow-500 text-black"}`}
        >
          {lock.withdrawn ? "Withdrawn" : isExpired ? "Unlockable" : "Locked"}
        </span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold">
          {lock.formattedAmount || "0"} {lock.tokenSymbol || ""}
        </span>
        <span className="text-xs text-gray-500">{timeRemaining}</span>
      </div>
      {!lock.withdrawn && (
        <Progress
          value={progress}
          className={`h-1.5 border border-black ${isExpired ? "bg-green-100" : "bg-gray-100"}`}
        />
      )}
      <div className="mt-3 flex justify-end">
        <Link to={`/locks/${lockIdString}`}>
          <Button
            size="sm"
            variant="outline"
            className="border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_rgba(0,0,0,1)]"
          >
            View <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const { address, isConnected } = useAccount();
  const {
    tokens: createdTokens,
    isLoading,
    isError: isTokenError,
  } = useUserTokens();
  const { presales, isLoading: isLoadingPresales } = useLaunchpadPresales(
    "all",
    false,
  );
  const { locks: userLocks, isLoading: isLoadingLocks } = useAllLocks();
  const chainId = useChainId();
  const ansChainId = isSupportedAbeyChain(chainId) ? chainId : ACTIVE_CHAIN_ID;
  const ownedNames = useAnsOwnedNames(address, ansChainId);
  // const { isWhitelisted, isLoading: isLoadingWhitelist } = useWhitelistedCreator(
  //   address as Address | undefined
  // );
  // const [isModalOpen, setIsModalOpen] = useState(false);
  const [tokenPage, setTokenPage] = useState(0);
  // const navigate = useNavigate();

  // Pagination for tokens (newest first)
  const TOKENS_PER_PAGE = 3;
  const tokenList = [...((createdTokens as `0x${string}`[]) || [])].reverse();
  const totalTokenPages = Math.ceil(tokenList.length / TOKENS_PER_PAGE);
  const paginatedTokens = tokenList.slice(
    tokenPage * TOKENS_PER_PAGE,
    (tokenPage + 1) * TOKENS_PER_PAGE,
  );

  // Filter presales owned by the user
  const myPresales =
    presales?.filter(
      (p) => address && p.owner?.toLowerCase() === address.toLowerCase(),
    ) || [];

  const activeLocks = [
    ...(userLocks?.filter((l) => !l.withdrawn) || []),
  ].reverse();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12 text-black">
        <div className="border-b-4 border-black bg-[#FFE38A] p-4 sm:p-6 shadow-[4px_4px_0_rgba(0,0,0,1)] mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider">
            Your Dashboard
          </h1>
        </div>
        <Card className="before:hidden -rotate-[0.45deg] border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <CardContent className="py-12 text-center">
            <p className="text-lg text-gray-600 mb-4">
              Please connect your wallet to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 text-black">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="border-b-4 border-black bg-[#FFE38A] p-4 sm:p-6 shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider">
                Your Dashboard
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* My Created Tokens - Full Width */}
      <Card className="before:hidden -rotate-[0.5deg] border-4 border-black bg-[#FFFDF7] p-0 gap-0 mt-2 mb-6 shadow-[4px_4px_0_rgba(0,0,0,1)]">
        <CardHeader className="border-b-2 border-black bg-[#FFE8BD] p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2 text-black">
              My Created Tokens
            </CardTitle>
            {tokenList.length > 0 && (
              <Link to="/dashboard/create/token">
                <Button
                  size="sm"
                  className="border-2 border-black bg-white text-black font-bold text-xs uppercase shadow-[2px_2px_0_rgba(0,0,0,1)]"
                >
                  <Plus className="w-3 h-3 mr-1" /> New Token
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded mb-3"></div>
                <div className="h-16 bg-gray-200 rounded mb-3"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : isTokenError ? (
            <div className="border-2 border-red-500 bg-red-50 p-4 text-center">
              <p className="font-black text-red-700 uppercase text-sm mb-1">
                Contract Unavailable
              </p>
              <p className="text-xs text-red-600">
                The TokenFactory contract is not deployed at the configured
                address. Contact the team to deploy contracts on Abeychain.
              </p>
            </div>
          ) : tokenList.length > 0 ? (
            <div className="space-y-3">
              {paginatedTokens.map((token) => (
                <TokenInfo key={token} tokenAddress={token} />
              ))}
              {totalTokenPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTokenPage((p) => Math.max(0, p - 1))}
                    disabled={tokenPage === 0}
                    className="border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <span className="text-sm font-bold">
                    Page {tokenPage + 1} of {totalTokenPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTokenPage((p) => Math.min(totalTokenPages - 1, p + 1))
                    }
                    disabled={tokenPage >= totalTokenPages - 1}
                    className="border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4 text-base sm:text-lg font-medium">
                You have not created any tokens yet.
              </p>
              <Link to="/dashboard/create/token">
                <Button className="border-4 border-black bg-[#22C55E] text-white uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#16A34A]">
                  Create Your First Token
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My .abey names - Full Width */}
      <Card className="before:hidden rotate-[0.4deg] border-4 border-black bg-[#FFFDF7] p-0 gap-0 mb-6 shadow-[4px_4px_0_rgba(0,0,0,1)]">
        <CardHeader className="border-b-2 border-black bg-[#B8EF53] p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2 text-black">
              My .abey Names
            </CardTitle>
            <Link to="/names" className="hidden sm:block">
              <Button size="sm" className="border-2 border-black bg-white text-black font-bold text-xs uppercase shadow-[2px_2px_0_rgba(0,0,0,1)]">
                <Plus className="w-3 h-3 mr-1" /> Register name
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {ownedNames.isLoading ? (
            <div className="space-y-3">
              <div className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded mb-3"></div>
                <div className="h-16 bg-gray-200 rounded mb-3"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : ownedNames.isError ? (
            <div className="border-2 border-red-500 bg-red-50 p-4 text-center">
              <p className="font-black text-red-700 uppercase text-sm mb-1">Names unavailable</p>
              <p className="text-xs text-red-600">The .abey portfolio could not be loaded. Please retry.</p>
            </div>
          ) : (ownedNames.data?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {ownedNames.data?.map((name) => (
                <article
                  key={name.node}
                  className="relative w-full overflow-hidden border-2 border-black bg-[#FFF8E8] shadow-[3px_3px_0_#000]"
                >
                  <div
                    aria-hidden="true"
                    className="absolute right-0 top-0 h-14 w-14 -translate-y-8 translate-x-8 rotate-12 border-2 border-black bg-[#F95D9B]"
                  />
                  <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="truncate text-xl font-black tracking-tight sm:text-2xl">
                          {name.fqdn}
                        </h3>
                        <span className="bg-[#B8EF53] px-2 py-1 text-[9px] font-black uppercase tracking-wider">
                          {name.custody === "wallet" ? "Owned" : "For sale"}
                        </span>
                        <PrimaryNameControl
                          name={name}
                          className="h-7 rounded-none border-0 bg-transparent px-2 text-[9px] shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-white/70"
                        />
                      </div>
                      <p className="mt-1 break-all font-mono text-[11px] font-bold text-black/45 sm:text-xs">
                        {name.resolvedAddress ?? name.registrant}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 border-t border-black/15 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="rounded-none border-0 bg-transparent shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-white/70"
                      >
                        <Link to="/names">Manage</Link>
                      </Button>
                      {name.custody === "wallet" && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="rounded-none border-0 bg-transparent shadow-none [box-shadow:none] hover:translate-x-0 hover:translate-y-0 hover:bg-white/70"
                        >
                          <Link to={`/names/marketplace?sell=${name.label}`}>
                            Sell
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-600 mb-4 text-base sm:text-lg font-medium">No .abey names in this wallet yet.</p>
              <Button asChild className="border-4 border-black bg-[#B8EF53] text-black uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)]"><Link to="/names">Find your name</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Presales */}
        <Card className="before:hidden rotate-[0.55deg] border-4 border-black bg-[#FFFDF7] p-0 gap-0 shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black bg-[#42C9FF] p-4">
            <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2">
              My Presales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingPresales ? (
              <div className="space-y-3">
                <div className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded mb-3"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : myPresales.length > 0 ? (
              <div className="space-y-3">
                {myPresales.slice(0, 3).map((presale, index) => (
                  <div
                    key={presale.address}
                    className={
                      index % 2 === 0 ? "rotate-[0.35deg]" : "-rotate-[0.35deg]"
                    }
                  >
                    <PresaleInfo presaleAddress={presale.address} />
                  </div>
                ))}
                {myPresales.length > 3 && (
                  <Link to="/dashboard/presales" className="block text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-black font-bold text-xs uppercase"
                    >
                      View All ({myPresales.length}){" "}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4 text-base sm:text-lg font-medium">
                  No presales yet
                </p>
                <Link to="/dashboard/create/presale">
                  <Button className="border-4 border-black bg-[#42C9FF] text-white font-black uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)]">
                    Create Presale
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Locks */}
        <Card className="before:hidden -rotate-[0.55deg] border-4 border-black bg-[#FFFDF7] p-0 gap-0 shadow-[4px_4px_0_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black bg-[#FFE38A] p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2">
                My Token Locks
              </CardTitle>
              <Link
                to="/dashboard/tools/token-locker"
                className="hidden sm:block"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="border-2 border-black font-bold text-xs uppercase"
                >
                  Manage
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingLocks ? (
              <div className="space-y-3">
                <div className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded mb-3"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : activeLocks.length > 0 ? (
              <div className="space-y-3">
                {activeLocks.slice(0, 3).map((lock, index) => {
                  // Safety check for lock data
                  if (!lock || lock.id === undefined) return null;
                  try {
                    return (
                      <div
                        key={lock.id.toString()}
                        className={
                          index % 2 === 0
                            ? "-rotate-[0.35deg]"
                            : "rotate-[0.35deg]"
                        }
                      >
                        <LockPreviewCard lock={lock} />
                      </div>
                    );
                  } catch (e) {
                    console.error("Error rendering lock:", e, lock);
                    return null;
                  }
                })}
                {activeLocks.length > 3 && (
                  <Link
                    to="/dashboard/tools/token-locker"
                    className="block text-center"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-black font-bold text-xs uppercase"
                    >
                      View All ({activeLocks.length}){" "}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4 text-base sm:text-lg font-medium">
                  No active locks
                </p>
                <Link to="/dashboard/tools/token-locker">
                  <Button className="border-4 border-black bg-[#FFE38A] text-white uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#F6CF62]">
                    Create Lock
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
