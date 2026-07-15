
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NFTFactoryContract, CONTRACT_ADDRESSES } from "@/config";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { parseEther, parseEventLogs } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "@/lib/hooks";
import { getFriendlyTxErrorMessage } from "@/lib/utils/tx-errors";
import { useUserAssetsStore } from "@/lib/store/user-assets-store";

export default function CreateNftPage() {
    const { address } = useAccount();
    const { nftFactory } = CONTRACT_ADDRESSES;
    const { data: hash, writeContract, isPending, error } = useWriteContract();
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
    const [paymentToken, setPaymentToken] = useState(""); // 0x0 for native ABEY

    useEffect(() => {
        if (address) {
            setPayoutWallet(address);
        }
    }, [address])

    const handleCreateNFT = () => {
        const mintConfig = {
            saleStart: BigInt(new Date(saleStart).getTime() / 1000),
            saleEnd: BigInt(new Date(saleEnd).getTime() / 1000),
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
        }

        const isETH = paymentToken.trim() === "" || paymentToken.trim() === "0x0000000000000000000000000000000000000000";

        const functionName = isETH ? "createETHNFT" : "createUSDCNFT";
        const args: unknown[] = isETH ? [params] : [params, paymentToken as `0x${string}`];

        writeContract({
            address: nftFactory,
            abi: NFTFactoryContract.abi,
            functionName,
            args: args as never
        });
    };

    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (!isConfirmed || !receipt || processedHash.current === hash) return;
        processedHash.current = hash ?? null;

        // Parse NFT collection address from event logs
        let newCollection: string | null = null;
        try {
            const logs = parseEventLogs({
                abi: NFTFactoryContract.abi,
                logs: receipt.logs,
                // Try different possible event names
            });
            // Look for any log that has an address that could be the collection
            for (const log of logs) {
                // Check if log has args with an address property
                if (log && typeof log === 'object' && 'args' in log) {
                    const args = log.args as Record<string, unknown>;
                    // Look for common field names that might contain the collection address
                    const possibleFields = ['collection', 'nft', 'token', 'contractAddress', 'address'];
                    for (const field of possibleFields) {
                        if (args[field] && typeof args[field] === 'string' && 
                            (args[field] as string).startsWith('0x') && (args[field] as string).length === 42) {
                            newCollection = args[field] as string;
                            break;
                        }
                    }
                    if (newCollection) break;
                }
            }
        } catch {
            // parsing failed, will try alternative method
        }
        
        // Alternative: if we couldn't parse from events, we might need to fetch from contract
        // For now, we'll show a success message even without the address

        if (newCollection) {
            toast.success("NFT Collection created successfully!");
            // Save to user assets store
            if (address) {
                setUserNFTCollection(address as `0x${string}`, {
                    address: newCollection as `0x${string}`,
                    name,
                    symbol,
                    totalSupply: BigInt(maxSupply || "0"),
                    owner: address as `0x${string}`,
                    createdAt: Date.now(),
                });
            }
        } else {
            toast.success("NFT Collection created successfully! Check explorer for details.");
        }
    }, [isConfirmed, receipt, hash, address, name, symbol, maxSupply]);

    useEffect(() => {
        if (error) {
            toast.error(getFriendlyTxErrorMessage(error, "NFT creation"));
        }
    }, [error])

    return (
        <div className="container mx-auto px-4 py-12 text-black">
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
                    <div className="space-y-2">
                        <Label htmlFor="payment-token">Payment Token Address</Label>
                        <Input id="payment-token" placeholder="0x... (or leave empty for ABEY)" value={paymentToken} onChange={e => setPaymentToken(e.target.value)} />
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

                    <Button onClick={handleCreateNFT} disabled={isPending || isConfirming} className="w-full">
                        {isPending || isConfirming ? "Creating Collection..." : "Create Collection"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
