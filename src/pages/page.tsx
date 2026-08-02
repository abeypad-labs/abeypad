import { TelegramIcon } from "@/components/ui/icons/telegram-icon";
import { XIcon as XSocialIcon } from "@/components/ui/icons/x-icon";
import { WalletIdenticon } from "@/components/WalletIdenticon";
import { AddressIdentity } from "@/features/ans/AddressIdentity";
import { useConnectModal } from "@/lib/hooks";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { useLaunchpadPresales } from "@/lib/hooks/useLaunchpadPresales";
import { useAbeyPriceUsd } from "@/lib/hooks/useAbeyPriceUsd";
import {
  ArrowRight,
  AtSign,
  BookOpen,
  CalendarClock,
  Menu,
  ShieldCheck,
  ShoppingBag,
  WalletMinimal,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "@/lib/hooks";

const cardStyles = [
  { bg: "bg-[#42C9FF]", text: "text-black" },
  { bg: "bg-[#FF7F41]", text: "text-black" },
  { bg: "bg-[#B8EF53]", text: "text-black" },
];

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { openConnectModal } = useConnectModal();
  const { address } = useAccount();
  const { allPresales, isLoading: isLoadingPresales } =
    useLaunchpadPresales("all");

  const navLinks = [
    { label: "Projects", href: "/projects" },
    { label: "Names", href: "/names" },
    { label: "Staking", href: "/dashboard/staking" },
    { label: "Create", href: "/dashboard/create" },
  ];

  const featuredPresales = useMemo(() => {
    const live = allPresales.filter((p) => p.status === "live");
    const upcoming = allPresales.filter((p) => p.status === "upcoming");
    return [...live, ...upcoming].slice(0, 3);
  }, [allPresales]);

  const totalRaisedValue = useMemo(() => {
    const sum = allPresales.reduce((acc, p) => acc + (p.totalRaised || 0n), 0n);
    return parseFloat(formatEther(sum));
  }, [allPresales]);

  const livePresaleCount = useMemo(() => {
    return allPresales.filter(
      (p) => p.status === "live" || p.status === "upcoming",
    ).length;
  }, [allPresales]);

  const { count: totalProjects, ref: totalProjectsRef } = useCountUp(
    allPresales.length,
  );
  const { count: totalRaised, ref: totalRaisedRef } =
    useCountUp(totalRaisedValue);
  const { count: activePresales, ref: activePresalesRef } =
    useCountUp(livePresaleCount);
  const abeyPriceUsd = useAbeyPriceUsd();

  const totalRaisedUsd = useMemo(() => {
    if (abeyPriceUsd === null) return null;
    return totalRaised * abeyPriceUsd;
  }, [abeyPriceUsd, totalRaised]);

  return (
    <main className="min-h-screen text-black">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <header className="neo-frame mb-12 bg-white p-4 sm:p-6 animate-fade-in-up">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/abeypad.png"
                alt="AbeyPad logo"
                className="h-11 w-11 rounded-[14px] border-[3px] border-black object-cover"
              />
              <p className="text-xl font-black uppercase leading-none tracking-[0.18em]">
                AbeyPad
              </p>
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-xs font-black uppercase tracking-[0.14em] transition-colors hover:text-[#1E5BFF]"
                >
                  {link.label}
                </Link>
              ))}
              {address ? (
                <Link
                  to="/dashboard/user"
                  title={address}
                  className="inline-flex items-center gap-2 border-[3px] border-black bg-[#B8EF53] px-4 py-2 text-xs font-black uppercase tracking-[0.1em] [box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:[box-shadow:0_0_0_1px_#000,9px_9px_0_0_#000]"
                >
                  <WalletIdenticon address={address} className="h-5 w-5" />
                  <AddressIdentity address={address} className="font-mono" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openConnectModal?.()}
                  className="inline-flex items-center gap-2 border-[3px] border-black bg-[#42C9FF] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] [box-shadow:0_0_0_1px_#000,6px_6px_0_0_#000] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:[box-shadow:0_0_0_1px_#000,10px_10px_0_0_#000]"
                >
                  <WalletMinimal className="h-4 w-4" strokeWidth={2.7} />
                  Connect Wallet
                </button>
              )}
            </nav>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-menu"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              className="inline-flex items-center justify-center border-[3px] border-black bg-[#42C9FF] p-2 md:hidden"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          <div
            id="mobile-nav-menu"
            className={`overflow-hidden transition-all duration-200 md:hidden ${
              isMobileMenuOpen
                ? "mt-4 max-h-80 border-t-[3px] border-black pt-4"
                : "max-h-0"
            }`}
          >
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={`${link.href}-mobile`}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-1 py-2 text-xs font-black uppercase tracking-[0.14em] hover:text-[#1E5BFF]"
                >
                  {link.label}
                </Link>
              ))}
              {address ? (
                <Link
                  to="/dashboard/user"
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={address}
                  className="flex items-center justify-between border-[3px] border-black bg-[#B8EF53] px-4 py-3 text-xs font-black uppercase tracking-[0.12em]"
                >
                  <span className="inline-flex items-center gap-2">
                    <WalletIdenticon address={address} className="h-5 w-5" />
                    Connected
                  </span>
                  <AddressIdentity
                    address={address}
                    className="font-mono tracking-normal"
                  />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openConnectModal?.();
                  }}
                  className="inline-flex items-center justify-center gap-2 border-[3px] border-black bg-[#42C9FF] px-4 py-3 text-xs font-black uppercase tracking-[0.14em]"
                >
                  <WalletMinimal className="h-4 w-4" strokeWidth={2.7} />
                  Connect Wallet
                </button>
              )}
            </nav>
          </div>
        </header>

        <section className="mb-16 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="neo-frame bg-[#FFF2D5] p-8 sm:p-10 animate-fade-in-up animation-delay-200">
            <h1 className="text-5xl font-black leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
              The Builder Stack
              <br />
              for Abey.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-bold sm:text-xl">
              Fundraise, create tokens, claim .abey names, secure liquidity,
              and distribute airdrops — all from one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/projects"
                className="-rotate-[0.9deg] sm:-rotate-[0.35deg] border-[3px] border-black bg-[#42C9FF] px-6 py-4 text-sm font-black uppercase tracking-[0.15em] [box-shadow:0_0_0_1px_#000,8px_8px_0_0_#000] transition-all hover:[box-shadow:0_0_0_1px_#000,12px_12px_0_0_#000] hover:-translate-x-1 hover:-translate-y-1"
              >
                Explore Projects
              </Link>
              <Link
                to="/dashboard/create"
                className="rotate-[0.9deg] sm:rotate-[0.35deg] border-[3px] border-black bg-[#FF7F41] px-6 py-4 text-sm font-black uppercase tracking-[0.15em] [box-shadow:0_0_0_1px_#000,8px_8px_0_0_#000] transition-all hover:[box-shadow:0_0_0_1px_#000,12px_12px_0_0_#000] hover:-translate-x-1 hover:-translate-y-1"
              >
                Launch a Project
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <div className="animate-fade-in-soft animation-delay-400">
              <div className="neo-frame rotate-[-1deg] bg-[#42C9FF] p-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em]">
                  Total Projects
                </p>
                <p ref={totalProjectsRef} className="text-5xl font-black">
                  {Math.floor(totalProjects).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="animate-fade-in-soft animation-delay-600">
              <div className="neo-frame rotate-[1deg] bg-[#FF7F41] p-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em]">
                  Total Raised
                </p>
                <p ref={totalRaisedRef} className="text-4xl font-black">
                  {totalRaisedUsd === null
                    ? "..."
                    : `$${totalRaisedUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.14em]">
                  {totalRaised < 0.01 ? "0" : totalRaised.toFixed(2)} $ABEY
                </p>
              </div>
            </div>
            <div className="animate-fade-in-soft animation-delay-800">
              <div className="neo-frame rotate-[-1deg] bg-[#B8EF53] p-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em]">
                  Active Presales
                </p>
                <p ref={activePresalesRef} className="text-5xl font-black">
                  {Math.floor(activePresales).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="neo-frame mb-16 overflow-hidden bg-[#111111] text-white animate-fade-in-up animation-delay-200">
          <div className="overflow-hidden px-3 py-4 sm:px-4">
            <div className="flex w-max items-center animate-launch-bar-slide">
              {[0, 1].map((loop) => (
                <div
                  key={`launch-message-${loop}`}
                  aria-hidden={loop === 1}
                  className="flex shrink-0 items-center gap-2 px-4 text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap sm:gap-8 sm:px-10 sm:text-sm sm:tracking-[0.2em]"
                >
                  <span>Permissionless</span>
                  <span className="text-[#B8EF53]">•</span>
                  <span>Creator-first</span>
                  <span className="text-[#42C9FF]">•</span>
                  <span>On-chain orchestration</span>
                  <span className="text-[#FF7F41]">•</span>
                  <span>Fast launch workflow</span>
                  <span className="text-[#F95D9B]">•</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="neo-frame mb-16 overflow-hidden bg-white animate-fade-in-up">
          <div className="grid lg:grid-cols-[1fr_0.85fr]">
            <div className="p-7 sm:p-10">
              <h2 className="max-w-2xl text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">
                Make <span className="font-mono text-[#1E5BFF]">0x…</span> feel like you.
              </h2>
              <p className="mt-5 max-w-xl text-base font-bold text-black/65 sm:text-lg">
                One .abey name for your wallet—everywhere on AbeyPad.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/names" className="inline-flex items-center gap-2 border-[3px] border-black bg-[#B8EF53] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] [box-shadow:6px_6px_0_#000] transition-transform hover:-translate-x-1 hover:-translate-y-1">Claim yours <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/names/marketplace" className="inline-flex items-center gap-2 border-[3px] border-black bg-[#F95D9B] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] [box-shadow:6px_6px_0_#000] transition-transform hover:-translate-x-1 hover:-translate-y-1">Browse names <ShoppingBag className="h-4 w-4" /></Link>
              </div>
            </div>

            <div className="border-t-[3px] border-black bg-[#42C9FF] p-7 lg:border-l-[3px] lg:border-t-0 sm:p-10">
              <div className="-rotate-[1deg] border-[3px] border-black bg-[#FFF2D5] p-5 [box-shadow:8px_8px_0_#000]">
                <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center border-[3px] border-black bg-white"><AtSign className="h-6 w-6" strokeWidth={3} /></span><div><p className="text-2xl font-black">you.abey</p><p className="font-mono text-xs font-bold text-black/50">0x71f4…9b20</p></div></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="border-2 border-black bg-white p-3"><ShieldCheck className="h-4 w-4" /><p className="mt-2 text-xs font-black">Yours to hold</p><p className="mt-1 text-[11px] font-bold text-black/55">Self-custodied in your wallet.</p></div>
                  <div className="border-2 border-black bg-white p-3"><CalendarClock className="h-4 w-4" /><p className="mt-2 text-xs font-black">Room to renew</p><p className="mt-1 text-[11px] font-bold text-black/55">30-day renewal grace period.</p></div>
                  <div className="border-2 border-black bg-white p-3"><ShoppingBag className="h-4 w-4" /><p className="mt-2 text-xs font-black">Built to trade</p><p className="mt-1 text-[11px] font-bold text-black/55">List or auction it natively.</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16 animate-fade-in-up">
          <h2 className="mb-6 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            Featured Launches
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {isLoadingPresales ? (
              <div className="neo-frame -rotate-[0.7deg] bg-white p-8 text-center font-black uppercase md:col-span-2 lg:col-span-3">
                Loading projects...
              </div>
            ) : featuredPresales.length === 0 ? (
              <div className="neo-frame rotate-[0.7deg] bg-white p-8 text-center md:col-span-2 lg:col-span-3">
                <p className="text-2xl font-black uppercase">
                  No projects to feature
                </p>
                <p className="mt-2 font-bold text-black/70">
                  Check back soon for new launches.
                </p>
              </div>
            ) : (
              featuredPresales.map((presale, index) => (
                <Link
                  to={`/projects/${presale.address}`}
                  key={presale.address}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${0.12 + index * 0.12}s` }}
                >
                  <article
                    className={`${cardStyles[index % cardStyles.length].bg} ${
                      cardStyles[index % cardStyles.length].text
                    } neo-frame ${index % 2 === 0 ? "rotate-[0.8deg]" : "-rotate-[0.8deg]"} h-full p-7 transition-all hover:-translate-x-1 hover:-translate-y-1`}
                  >
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em]">
                      Featured
                    </p>
                    <h3 className="text-2xl font-black uppercase leading-tight">
                      {presale.saleTokenName || "Unnamed Project"}
                    </h3>
                    <p className="mt-6 text-xs font-black uppercase tracking-[0.16em]">
                      Learn More
                    </p>
                  </article>
                </Link>
              ))
            )}
          </div>
        </section>

      </div>

      <footer className="border-t-[3px] border-black bg-[#111111] text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-7 md:flex-row">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-center md:text-left">
            &copy; {new Date().getFullYear()} ABEYPAD
          </p>
          <div className="flex gap-4">
            <a
              href="https://x.com/abeypad"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center border-[2px] border-black bg-[#42C9FF] text-black transition-all hover:-translate-y-1"
            >
              <XSocialIcon size={18} />
            </a>
            <a
              href="https://t.me/abeypad"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center border-[2px] border-black bg-[#FF7F41] text-black transition-all hover:-translate-y-1"
            >
              <TelegramIcon size={18} />
            </a>
            <a
              href="https://abeypad.gitbook.io/abeypad/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center border-[2px] border-black bg-[#B8EF53] text-black transition-all hover:-translate-y-1"
            >
              <BookOpen size={18} />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
