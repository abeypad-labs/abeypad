import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function NFTsPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#F7F1E1] px-4 py-12 text-black">
      <div className="max-w-2xl rotate-[-0.4deg] border-[3px] border-black bg-white p-8 text-center [box-shadow:12px_12px_0_#000] sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center border-[3px] border-black bg-[#F95D9B] [box-shadow:5px_5px_0_#000]">
          <ImageIcon className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <span className="mt-7 inline-flex items-center border-2 border-black bg-[#F5CF85] px-3 py-1 text-xs font-black uppercase tracking-[0.15em]">
          Coming soon
        </span>
        <h1 className="mt-5 text-4xl font-black uppercase tracking-tight sm:text-6xl">NFT launchpad</h1>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild><Link to="/dashboard/create/token">Create a token</Link></Button>
          <Button asChild variant="secondary"><Link to="/names">Claim a .abey name</Link></Button>
        </div>
      </div>
    </div>
  );
}
