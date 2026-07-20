
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CONTRACT_ADDRESSES, NFTFactory } from "@/config";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "@/lib/hooks";
import { useUserAssetsStore } from "@/lib/store/user-assets-store";
import { getFriendlyTxErrorMessage } from "@/lib/utils/tx-errors";
import { CheckCircle2, ExternalLink, LayoutDashboard, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { parseEther, parseEventLogs } from "viem";
import { useChainId, useConfig } from "wagmi";

export default function CreateNftPage() {
    const { address } = useAccount();
    const config = useConfig();
    const chainId = useChainId();
    const chain = config.chains.find((c) => c.id === chainId);
    const { nftFactory, nativeUSDC } = CONTRACT_ADDRESSES;
    const explorerUrl = chain?.blockExplorers?.default.url;
    const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
    const navigate = useNavigate();
    const { setUserNFTCollection } = useUserAssetsStore();
    const processedHash = useRef<string | null>(null);

    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [baseURI, setBaseURI] = useState("");
    const [maxSupply, setMaxSupply] = useState("");
    const [payoutWallet, setPayoutWallet] = useState(address ?? "");
    const [saleStart, setSaleStart] = useState("");
    const [saleEnd, setSaleEnd] = useState("");
    const [walletLimit, setWalletLimit] = useState("");
    const [price, setPrice] = useState("");
    const [paymentType, setPaymentType] = useState<"ETH" | "USDC">("ETH");
    const [createdCollectionAddress, setCreatedCollectionAddress] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
    const [txError, setTxError] = useState<string | null>(null);

    useEffect(() => {
        if (address) {
            setPayoutWallet(address);
        }
    }, [address])

    const handleCreateNFT = () => {
        if (!address) {
            toast.error("Please connect your wallet");
            return;
        }

        // Validate inputs
        if (!name || !symbol || !maxSupply || !price || !saleStart || !saleEnd || !walletLimit) {
            toast.error("Please fill in all required fields");
            return;
        }

        // Reset states
        setCreatedCollectionAddress(null);
        processedHash.current = null;
        setTxStatus('pending');
        setTxError(null);
        setShowModal(true);

        const mintConfig = {
            saleStart: BigInt(Math.floor(new Date(saleStart).getTime() / 1000)),
            saleEnd: BigInt(Math.floor(new Date(saleEnd).getTime() / 1000)),
            walletLimit: parseInt(walletLimit),
            price: parseEther(price),
        };

        const params = {
            name,
            symbol,
            baseURI,
            maxSupply: BigInt(maxSupply),
            payoutWallet: payoutWallet as `0x${string}`,
            mintConfig,
        };

        let functionName: "createETHNFT" | "createUSDCNFT";
        let args: unknown[];

        if (paymentType === "ETH") {
            functionName = "createETHNFT";
            args = [params];
        } else {
            functionName = "createUSDCNFT";
            const tokenAddress = nativeUSDC;
            args = [params, tokenAddress];
        }

        console.log("[CreateNFT] Creating NFT with:", {
            paymentType,
            functionName,
            args,
            params,
        });

        writeContract({
            address: nftFactory,
            abi: NFTFactory.abi,
            functionName,
            args: args as never,
        });
    };

    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (!isConfirmed || !receipt || processedHash.current === hash) return;
        processedHash.current = hash ?? null;

        console.log("[CreateNFT] Transaction confirmed!");
        console.log("[CreateNFT] Receipt:", receipt);

        // Parse NFT collection address from NFTCreated event logs
        let newCollection: string | null = null;
        let acceptsEth: boolean | null = null;

        try {
            const logs = parseEventLogs({
                abi: NFTFactory.abi,
                logs: receipt.logs,
                eventName: "NFTCreated",
            });

            console.log("[CreateNFT] Parsed NFTCreated logs:", logs);

            if (logs && logs.length > 0) {
                const event = logs[0] as { args?: { nft?: string; acceptsEth?: boolean; creator?: string } };
                newCollection = event.args?.nft ?? null;
                acceptsEth = event.args?.acceptsEth ?? null;

                console.log("[CreateNFT] Extracted from event:", {
                    newCollection,
                    acceptsEth,
                    creator: event.args?.creator,
                });
            }
        } catch (parseError) {
            console.error("[CreateNFT] Failed to parse event logs:", parseError);
        }

        setCreatedCollectionAddress(newCollection);

        if (newCollection) {
            console.log("[CreateNFT] NFT Collection created successfully:", newCollection);
            setTxStatus('success');
            toast.success("NFT Collection created! Redirecting to your dashboard…");

            // Save to user assets store with complete information
            if (address) {
                console.log("[CreateNFT] Saving NFT collection to user assets store");
                setUserNFTCollection(address as `0x${string}`, {
                    address: newCollection as `0x${string}`,
                    name,
                    symbol,
                    totalSupply: BigInt(maxSupply || "0"),
                    owner: address as `0x${string}`,
                    createdAt: Date.now(),
                });
            }

            // Reset form
            setName("");
            setSymbol("");
            setBaseURI("");
            setMaxSupply("");
            setSaleStart("");
            setSaleEnd("");
            setWalletLimit("");
            setPrice("");
            setPayoutWallet(address ?? "");
            reset();

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                setShowModal(false);
                navigate("/dashboard/user");
            }, 3000);
        } else {
            console.error("[CreateNFT] No NFT address found in logs");
            setTxStatus('error');
            setTxError("Transaction succeeded but couldn't find NFT address in events. Check explorer.");
            toast.error("Transaction succeeded but couldn't find NFT address in events. Check explorer.");
        }
    }, [isConfirmed, receipt, hash, address, name, symbol, maxSupply]);

    // Handle write errors
    useEffect(() => {
        if (error) {
            console.error("[CreateNFT] Write contract error:", error);
            console.error("[CreateNFT] Error message:", getFriendlyTxErrorMessage(error, "NFT creation"));
            setTxStatus('error');
            setTxError(getFriendlyTxErrorMessage(error, "NFT creation"));
            toast.error(getFriendlyTxErrorMessage(error, "NFT creation"));
            reset();
        }
    }, [error, reset]);

    // Log transaction hash when it's received
    useEffect(() => {
        if (hash) {
            console.log("[CreateNFT] Transaction submitted!");
            console.log("[CreateNFT] Transaction hash:", hash);
            console.log("[CreateNFT] Explorer URL:", `${explorerUrl}/tx/${hash}`);
            setTxStatus('confirming');
        }
    }, [hash, explorerUrl]);

    const isBusy = isPending || isConfirming;

    return (
        <div className="container mx-auto px-4 py-12 text-black">
            {/* Full-page transaction status modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="border-4 border-black bg-[#FFE38A] p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] flex flex-col items-center gap-4 max-w-sm w-full mx-4">
                        {/* Pending State - Waiting for wallet */}
                        {txStatus === 'pending' && (
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
                        {txStatus === 'confirming' && (
                            <>
                                <Loader2 className="w-12 h-12 animate-spin" />
                                <p className="font-black uppercase tracking-wider text-xl text-center">
                                    Creating NFT Collection…
                                </p>
                                <p className="text-sm text-gray-700 text-center">
                                    Transaction submitted. Waiting for block confirmation.
                                </p>
                                {hash && (
                                    <a
                                        href={`${explorerUrl}/tx/${hash}`}
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
                        {txStatus === 'success' && (
                            <>
                                <CheckCircle2 className="w-12 h-12 text-green-600" />
                                <p className="font-black uppercase tracking-wider text-xl text-center">
                                    NFT Collection Created!
                                </p>
                                <p className="text-sm text-gray-700 text-center">
                                    Your NFT collection has been deployed successfully.
                                </p>
                                {createdCollectionAddress && (
                                    <div className="w-full">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Collection Address</p>
                                        <code className="block bg-white p-2 border-2 border-black font-mono text-xs break-all">
                                            {createdCollectionAddress}
                                        </code>
                                    </div>
                                )}
                                {hash && (
                                    <a
                                        href={`${explorerUrl}/tx/${hash}`}
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
                        {txStatus === 'error' && (
                            <>
                                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                                    <span className="text-white text-2xl font-black">!</span>
                                </div>
                                <p className="font-black uppercase tracking-wider text-xl text-center">
                                    Transaction Failed
                                </p>
                                <p className="text-sm text-gray-700 text-center">
                                    {txError || "An error occurred during NFT creation."}
                                </p>
                                {hash && (
                                    <a
                                        href={`${explorerUrl}/tx/${hash}`}
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
                                        setTxStatus('idle');
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

            {/* Success card */}
            {createdCollectionAddress && (
                <Card className="before:hidden -rotate-[0.35deg] max-w-2xl mx-auto mb-8 border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] p-0 gap-0">
                    <CardHeader className="border-b-2 border-black bg-[#90EE90] p-6">
                        <CardTitle className="font-black uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            NFT Collection Created Successfully!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Collection Address</p>
                            <code className="block bg-gray-100 p-3 border-2 border-black font-mono text-sm break-all">
                                {createdCollectionAddress}
                            </code>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href={`${explorerUrl}/address/${createdCollectionAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1"
                            >
                                <Button className="-rotate-[0.3deg] w-full border-4 border-black bg-white text-black font-black uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-gray-100">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View on Explorer
                                </Button>
                            </a>
                        </div>
                        <Link to="/dashboard/user" className="block">
                            <Button className="w-full border-4 border-black bg-[#42C9FF] text-black font-black uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#1FB9E7]">
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Go to Dashboard
                            </Button>
                        </Link>
                        <Button
                            onClick={() => setCreatedCollectionAddress(null)}
                            variant="outline"
                            className="w-full border-2 border-black"
                        >
                            Create Another NFT Collection
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Form */}
            {!createdCollectionAddress && (
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Create a new NFT Collection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" placeholder="e.g. My NFT" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="symbol">Symbol</Label>
                                <Input id="symbol" placeholder="e.g. MNFT" value={symbol} onChange={e => setSymbol(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="base-uri">Base URI</Label>
                            <Input id="base-uri" placeholder="ipfs://..." value={baseURI} onChange={e => setBaseURI(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="max-supply">Max Supply</Label>
                                <Input id="max-supply" type="number" placeholder="10000" value={maxSupply} onChange={e => setMaxSupply(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Price</Label>
                                <Input id="price" type="number" placeholder="0.05" value={price} onChange={e => setPrice(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label className="font-bold uppercase text-xs">Payment Token</Label>
                            <Select
                                value={paymentType}
                                onValueChange={(value: string) => setPaymentType(value as "ETH" | "USDC")}
                            >
                                <SelectTrigger className="border-2 border-black">
                                    <SelectValue placeholder="Select payment token" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ETH">
                                        <div className="flex flex-col">
                                            <span className="font-bold">ETH (Native Token)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="USDC">
                                        <div className="flex flex-col">
                                            <span className="font-bold">USDC</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {paymentType === "USDC" && (
                                <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <strong>Note:</strong> Make sure USDC is supported on your network.
                                        The contract will use the standard USDC address for this chain.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sale-start">Sale Start</Label>
                                <Input id="sale-start" type="datetime-local" value={saleStart} onChange={e => setSaleStart(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sale-end">Sale End</Label>
                                <Input id="sale-end" type="datetime-local" value={saleEnd} onChange={e => setSaleEnd(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wallet-limit">Wallet Limit</Label>
                            <Input id="wallet-limit" type="number" placeholder="10" value={walletLimit} onChange={e => setWalletLimit(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payout-wallet">Payout Wallet</Label>
                            <Input id="payout-wallet" placeholder="0x..." value={payoutWallet} onChange={e => setPayoutWallet(e.target.value)} />
                        </div>

                        <Button onClick={handleCreateNFT} disabled={isBusy || !name || !symbol} className="-rotate-[0.35deg] w-full border-4 border-black bg-[#22C55E] text-black font-black uppercase tracking-wider shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-[#E45845] hover:shadow-[6px_6px_0_rgba(0,0,0,1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                            {isPending && (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Confirm in Wallet…
                                </>
                            )}
                            {isConfirming && (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating…
                                </>
                            )}
                            {!isBusy && "Create Collection"}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
