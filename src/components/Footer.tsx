import { useNavigate } from "react-router-dom";
import { 
  Mail, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Instagram,
  ArrowRight,
  CheckCircle2,
  Shield,
  Users,
  Briefcase,
  Heart
} from "lucide-react";
import logo from "@/assets/footer-logo.svg";

const platformLinks = [
  { label: "How It Works", path: "/how-it-works" },
  { label: "Browse Freelancers", path: "/browse-diggers" },
  { label: "Browse Projects", path: "/browse-gigs" },
  { label: "Pricing", path: "/pricing" },
  { label: "Post a Project", path: "/post-gig" },
  { label: "Apply as Freelancer", path: "/apply-digger" },
];

const companyLinks = [
  { label: "About Us", path: "/about" },
  { label: "Blog", path: "/blog" },
  { label: "FAQ", path: "/faq" },
  { label: "Contact Us", path: "/contact" },
];

const legalLinks = [
  { label: "Terms of Service", path: "/terms" },
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Legal Documents", path: "/legal" },
];

const socialLinks = [
  { icon: Facebook, href: "https://facebook.com/digsandgigs", label: "Facebook" },
  { icon: Twitter, href: "https://twitter.com/digsandgigs", label: "Twitter" },
  { icon: Linkedin, href: "https://linkedin.com/company/digsandgigs", label: "LinkedIn" },
  { icon: Instagram, href: "https://instagram.com/digsandgigs", label: "Instagram" },
];

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="relative border-t border-border/50 bg-gradient-subtle">
      {/* Decorative Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none" />
      
      <div className="container-wide section-padding-sm relative z-10">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity inline-block mb-6"
              onClick={() => navigate("/")}
            >
              <img 
                src={logo} 
                alt="Digs & Gigs" 
                className="h-20 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              Connecting skilled freelancers and service professionals with clients worldwide. 
              No commissions, no bidding wars—just quality connections.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Secure Platform</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span>Verified Users</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social, i) => (
                <a 
                  key={i}
                  href={social.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110 hover:-translate-y-0.5"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-display font-semibold text-base mb-6 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Platform
            </h4>
            <ul className="space-y-3">
              {platformLinks.map((link, i) => (
                <li key={i}>
                  <button 
                    type="button"
                    onClick={() => navigate(link.path)} 
                    className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-display font-semibold text-base mb-6 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Company
            </h4>
            <ul className="space-y-3">
              {companyLinks.map((link, i) => (
                <li key={i}>
                  <button 
                    type="button"
                    onClick={() => navigate(link.path)} 
                    className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Contact */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <a 
                href="mailto:info@digsandgigs.net" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>info@digsandgigs.net</span>
              </a>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-display font-semibold text-base mb-6 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Legal & Resources
            </h4>
            <ul className="space-y-3 mb-8">
              {legalLinks.map((link, i) => (
                <li key={i}>
                  <button 
                    type="button"
                    onClick={() => navigate(link.path)} 
                    className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Resources */}
            <div className="pt-6 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Resources</p>
              <ul className="space-y-2">
                <li>
                  <button 
                    type="button"
                    onClick={() => navigate("/digger-guide")} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Freelancer Guide
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => navigate("/sitemap")} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Digs & Gigs. All Rights Reserved.
            </p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-destructive fill-destructive" />
              <span>for freelancers & clients</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
