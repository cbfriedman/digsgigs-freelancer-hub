import { useNavigate } from "react-router-dom";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  ArrowRight,
  CheckCircle2,
  Shield,
  Users,
  Briefcase
} from "lucide-react";
import logo from "@/assets/footer-logo.svg";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="relative border-t border-border/50 bg-gradient-to-b from-background via-secondary/20 to-secondary/40">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-6">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity flex justify-start"
              onClick={() => navigate("/")}
            >
              <img 
                src={logo} 
                alt="Digs & Gigs" 
                className="w-[280px] h-[100px] mb-6 object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs text-justify">
              Connecting skilled freelancers and service professionals with clients worldwide. 
              No commissions, no bidding wars—just quality connections.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Secure Platform</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Verified Users</span>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-4 pt-4">
              <a 
                href="https://facebook.com/digsandgigs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-secondary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com/digsandgigs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-secondary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://linkedin.com/company/digsandgigs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-secondary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com/digsandgigs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-secondary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div className="flex flex-col">
            <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Platform
            </h4>
            <ul className="space-y-3 flex flex-col items-start">
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/how-it-works")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>How It Works</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/browse-diggers")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Browse Freelancers</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/browse-gigs")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Browse Projects</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/pricing")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Pricing</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/post-gig")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Post a Project</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/apply-digger")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Apply as Freelancer</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="flex flex-col">
            <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Company
            </h4>
            <ul className="space-y-3 flex flex-col items-start">
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/about")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>About Us</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/blog")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Blog</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/faq")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>FAQ</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/contact")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Contact Us</span>
                </button>
              </li>
            </ul>

            {/* Contact Info */}
            <div className="mt-8 pt-8 border-t border-border/50 space-y-3">
              <div className="flex items-start gap-3 text-sm text-muted-foreground justify-start">
                <Mail className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <a 
                  href="mailto:support@digsandgigs.net" 
                  className="hover:text-foreground transition-colors break-words"
                >
                  support@digsandgigs.net
                </a>
              </div>
            </div>
          </div>

          {/* Legal & Resources */}
          <div className="flex flex-col">
            <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Legal & Resources
            </h4>
            <ul className="space-y-3 mb-8 flex flex-col items-start">
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/terms")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Terms of Service</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/privacy")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Privacy Policy</span>
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => navigate("/legal")} 
                  className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>Legal Documents</span>
                </button>
              </li>
            </ul>

            {/* Additional Resources */}
            <div className="pt-8 border-t border-border/50">
              <h5 className="font-semibold text-sm mb-4">Resources</h5>
              <ul className="space-y-2 flex flex-col items-start">
                <li>
                  <button 
                    type="button"
                    onClick={() => navigate("/digger-guide")} 
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    Freelancer Guide
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => navigate("/sitemap")} 
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    Sitemap
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left flex-1">
              &copy; {new Date().getFullYear()} Digs & Gigs. All Rights Reserved.
            </p>
            <div className="flex items-center justify-center md:justify-end gap-6 text-xs text-muted-foreground flex-shrink-0">
              <span className="text-center">Made with ❤️ for freelancers & clients</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
