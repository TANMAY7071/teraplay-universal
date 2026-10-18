import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground dragon-scales">
      <div className="text-center space-y-6 max-w-md px-4">
        <h1 className="text-8xl font-black tracking-tighter text-primary animate-pulse">404</h1>
        <div className="space-y-2">
          <p className="text-2xl font-bold tracking-tight">Oops! Realm Not Found</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The path you seek has been blocked by a spatial distortion, or the cultivation scroll has been lost.
          </p>
        </div>
        <div className="pt-2">
          <Button asChild className="rounded-full font-bold px-6 py-2">
            <Link to="/">
              Return to Sect (Home)
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
