import { useNavigate } from "react-router-dom";
import logoWordmark from "@/assets/logo-wordmark.png";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border/50 bg-secondary/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <img 
              src={logoWordmark} 
              alt="Digs & Gigs" 
              className="h-12 w-auto mb-4"
            />
            <p className="text-sm text-muted-foreground">
              Connecting Freelancers & Clients Worldwide
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => navigate("/how-it-works")} className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/browse-diggers")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Browse Freelancers
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/pricing")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/post-gig")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Post a Project
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => navigate("/about")} className="text-muted-foreground hover:text-foreground transition-colors">
                  About
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/blog")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/contact")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => navigate("/terms")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/privacy")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/legal")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Legal Documents
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Digs & Gigs. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};
