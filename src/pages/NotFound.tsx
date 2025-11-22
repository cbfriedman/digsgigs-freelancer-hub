import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <Link to="/" className="inline-block mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Digs and Gigs
          </h1>
        </Link>
        <h2 className="text-6xl font-bold text-foreground">404</h2>
        <p className="text-xl text-muted-foreground">Oops! Page not found</p>
        <p className="text-sm text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or an error occurred.
        </p>
        <Link to="/">
          <Button variant="hero" className="mt-4">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
