import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-12 text-black">
      <Card className="max-w-2xl mx-auto border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,1)]">
        <CardContent className="py-16 text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-gray-100 border-2 border-black rounded-full flex items-center justify-center">
            <span className="text-6xl font-black">404</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-wider">
              Page Not Found
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved.
              Please check the URL or navigate back to the homepage.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="font-bold uppercase tracking-wide"
            >
              Go Back
            </Button>
            <Link to="/">
              <Button className="font-bold uppercase tracking-wide w-full sm:w-auto">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
