import { useNavigate } from "react-router-dom";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border/50 bg-secondary/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              digsandgigs
            </h3>
            <p className="text-sm text-muted-foreground">
              Connecting skilled professionals with clients seeking expertise.
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
                  Find Talent
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/browse-gigs")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Find Work
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/blog")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => navigate("/faq")} className="text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/contact")} className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact Us
                </button>
              </li>
              <li>
                <a href="mailto:support@digsandgigs.com" className="text-muted-foreground hover:text-foreground transition-colors">
                  support@digsandgigs.com
                </a>
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
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} DiggsAndGiggs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
