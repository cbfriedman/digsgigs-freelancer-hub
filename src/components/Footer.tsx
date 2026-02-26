import { useNavigate } from "react-router-dom";
import {
  Mail,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Users,
  Briefcase,
  Heart,
} from "lucide-react";
import logo from "@/assets/digsandgigs-logo.png";
import { SUPPORT_EMAIL } from "@/config/siteContact";

const platformLinks = [
  { label: "How It Works", path: "/how-it-works" },
  { label: "Browse Diggers", path: "/browse-diggers" },
  { label: "Browse Gigs", path: "/browse-gigs" },
  { label: "Pricing", path: "/pricing" },
  { label: "Post a gig", path: "/post-gig" },
  { label: "Become a Digger", path: "/apply-digger" },
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
    <footer className="border-t border-border bg-muted/30">
      <div className="container-wide py-12 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 mb-12">
          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-block mb-4 text-left hover:opacity-80"
            >
              <img src={logo} alt="Digs & Gigs" className="h-16 w-auto object-contain" />
            </button>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xs">
              Giggers post gigs. Diggers get leads by email. Pay per lead or when awarded. No membership.
            </p>
            <p className="text-xs text-muted-foreground mb-4">Secure platform · Verified users</p>
            <div className="flex items-center gap-2">
              {socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-4">Platform</h4>
            <ul className="space-y-2">
              {platformLinks.map((link, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => navigate(link.path)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((link, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => navigate(link.path)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-border">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-4">Legal & resources</h4>
            <ul className="space-y-2 mb-6">
              {legalLinks.map((link, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => navigate(link.path)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Resources</p>
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/digger-guide")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Freelancer Guide
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/sitemap")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Sitemap
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Digs & Gigs. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Made with <Heart className="h-4 w-4 text-destructive fill-destructive" /> for freelancers & clients
          </p>
        </div>
      </div>
    </footer>
  );
};
