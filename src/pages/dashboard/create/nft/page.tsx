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
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "@/lib/hooks";
import { useUserAssetsStore } from "@/lib/store/user-assets-store";
import { uploadNFTImageWithMetadata } from "@/lib/utils/pinata";
import { getFriendlyTxErrorMessage } from "@/lib/utils/tx-errors";
import { cn } from "@/lib/utils/utils";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  Upload,
  X
} from "lucide-react";
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
  const {
    data: hash,
    writeContract,
    isPending,
    error,
    reset,
  } = useWriteContract();
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
  const [createdCollectionAddress, setCreatedCollectionAddress] = useState<
    string | null
  >(null);
  const [showModal, setShowModal] = useState(false);
  const [txStatus, setTxStatus] = useState<
    "idle" | "pending" | "confirming" | "success" | "error"
  >("idle");
  const [txError, setTxError] = useState<string | null>(null);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  console.log({imageFile})

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (address) {
      setPayoutWallet(address);
    }
  }, [address]);

  const handleImageUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Image must be less than 50MB");
      return;
    }

    setImageFile(file);
    setUploadStatus("uploading");
    setUploadError(null);

    // Create local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      toast.info("Uploading image to IPFS via Pinata…");

      const { imageUri: imgUri, metadataUri } =
        await uploadNFTImageWithMetadata(
          file,
          name || "Unnamed Collection",
          symbol || "NFT",
        );

      setImageUri(imgUri);
      setBaseURI(metadataUri);
      setUploadStatus("done");

      toast.success("Image uploaded to IPFS! Metadata JSON generated.");
    } catch (err) {
      console.error("[CreateNFT] Upload failed:", err);
      const message =
        err instanceof Error ? err.message : "Unknown upload error";
      setUploadStatus("error");
      setUploadError(message);
      toast.error(`Upload failed: ${message}`);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUri(null);
    setBaseURI("");
    setUploadStatus("idle");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateNFT = () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate inputs
    if (
      !name ||
      !symbol ||
      !maxSupply ||
      !price ||
      !saleStart ||
      !saleEnd ||
      !walletLimit
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Reset states
    setCreatedCollectionAddress(null);
    processedHash.current = null;
    setTxStatus("pending");
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

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

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
        const event = logs[0] as {
          args?: { nft?: string; acceptsEth?: boolean; creator?: string };
        };
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
      console.log(
        "[CreateNFT] NFT Collection created successfully:",
        newCollection,
      );
      setTxStatus("success");
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
      clearImage();
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
      setTxStatus("error");
      setTxError(
        "Transaction succeeded but couldn't find NFT address in events. Check explorer.",
      );
      toast.error(
        "Transaction succeeded but couldn't find NFT address in events. Check explorer.",
      );
    }
  }, [isConfirmed, receipt, hash, address, name, symbol, maxSupply]);

  // Handle write errors
  useEffect(() => {
    if (error) {
      console.error("[CreateNFT] Write contract error:", error);
      console.error(
        "[CreateNFT] Error message:",
        getFriendlyTxErrorMessage(error, "NFT creation"),
      );
      setTxStatus("error");
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
      setTxStatus("confirming");
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
            {txStatus === "pending" && (
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
            {txStatus === "confirming" && (
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
            {txStatus === "success" && (
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
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                      Collection Address
                    </p>
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
            {txStatus === "error" && (
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
                    setTxStatus("idle");
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
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                Collection Address
              </p>
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
            <CardTitle className="text-2xl font-bold">
              Create a new NFT Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. My NFT"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g. MNFT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                />
              </div>
            </div>
            {/* Image Upload — replaces manual Base URI input */}
            <div className="space-y-2">
              <Label>Collection Image</Label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Drop zone / upload area */}
              {uploadStatus === "idle" && !imagePreview && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={cn(
                    "border-4 border-dashed border-black p-8 rounded-lg",
                    "flex flex-col items-center justify-center gap-3",
                    "cursor-pointer hover:bg-gray-50 transition-colors",
                    "min-h-[200px]",
                  )}
                >
                  <Upload className="w-10 h-10 text-gray-500" />
                  <p className="font-bold uppercase tracking-wider text-sm text-center">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF, WebP (max 50MB)
                  </p>
                </div>
              )}

              {/* Uploading state */}
              {uploadStatus === "uploading" && (
                <div className="border-4 border-black bg-gray-50 p-8 rounded-lg flex flex-col items-center justify-center gap-3 min-h-[200px]">
                  <Loader2 className="w-10 h-10 animate-spin text-black" />
                  <p className="font-bold uppercase tracking-wider text-sm text-center">
                    Uploading to IPFS…
                  </p>
                  <p className="text-xs text-gray-500">
                    Uploading image &amp; generating metadata
                  </p>
                </div>
              )}

              {/* Upload error state */}
              {uploadStatus === "error" && (
                <div className="border-4 border-red-500 bg-red-50 p-6 rounded-lg flex flex-col items-center gap-3">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                  <p className="font-bold uppercase tracking-wider text-sm text-center text-red-700">
                    Upload Failed
                  </p>
                  <p className="text-xs text-red-600 text-center">
                    {uploadError}
                  </p>
                  <Button
                    onClick={clearImage}
                    variant="outline"
                    className="border-2 border-red-500 text-red-700"
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {/* Upload success — show preview + metadata URI */}
              {(uploadStatus === "done" || imagePreview) && (
                <div className="border-4 border-black bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-start gap-4">
                    {/* Image preview */}
                    <div className="relative w-28 h-28 shrink-0 border-2 border-black overflow-hidden rounded-lg bg-white">
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="NFT preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Upload info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="text-sm font-bold text-green-700">
                          Uploaded to IPFS
                        </span>
                      </div>
                      {imageUri && (
                        <p className="text-xs font-mono text-gray-500 break-all">
                          Image: {imageUri}
                        </p>
                      )}
                      {baseURI && (
                        <p className="text-xs font-mono text-gray-500 break-all">
                          Metadata: {baseURI}
                        </p>
                      )}
                      <Button
                        onClick={clearImage}
                        variant="outline"
                        size="sm"
                        className="border-2 border-black text-xs h-7"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Remove &amp; re-upload
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-supply">Max Supply</Label>
                <Input
                  id="max-supply"
                  type="number"
                  placeholder="10000"
                  value={maxSupply}
                  onChange={(e) => setMaxSupply(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.05"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-4">
              <Label className="font-bold uppercase text-xs">
                Payment Token
              </Label>
              <Select
                value={paymentType}
                onValueChange={(value: string) =>
                  setPaymentType(value as "ETH" | "USDC")
                }
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
                    <strong>Note:</strong> Make sure USDC is supported on your
                    network. The contract will use the standard USDC address for
                    this chain.
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sale-start">Sale Start</Label>
                <Input
                  id="sale-start"
                  type="datetime-local"
                  value={saleStart}
                  onChange={(e) => setSaleStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-end">Sale End</Label>
                <Input
                  id="sale-end"
                  type="datetime-local"
                  value={saleEnd}
                  onChange={(e) => setSaleEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-limit">Wallet Limit</Label>
              <Input
                id="wallet-limit"
                type="number"
                placeholder="10"
                value={walletLimit}
                onChange={(e) => setWalletLimit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-wallet">Payout Wallet</Label>
              <Input
                id="payout-wallet"
                placeholder="0x..."
                value={payoutWallet}
                onChange={(e) => setPayoutWallet(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreateNFT}
              disabled={isBusy || !name || !symbol || uploadStatus !== "done"}
              className="-rotate-[0.35deg] w-full border-4 border-black bg-[#22C55E] text-black font-black uppercase tracking-wider shadow-[4px_4px_0_rgba(0,0,0,1)] hover:bg-[#E45845] hover:shadow-[6px_6px_0_rgba(0,0,0,1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
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
