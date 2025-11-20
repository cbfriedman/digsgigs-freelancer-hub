import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { useTrackDiggerPresence } from "./hooks/useDiggerPresence";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DiggerRegistration from "./pages/DiggerRegistration";
import DiggerRegistrationDemo from "./pages/DiggerRegistrationDemo";
import GigRegistrationDemo from "./pages/GigRegistrationDemo";
import EditDiggerProfile from "./pages/EditDiggerProfile";
import PostGig from "./pages/PostGig";
import BrowseDiggers from "./pages/BrowseDiggers";
import BrowseGigs from "./pages/BrowseGigs";
import DiggerDetail from "./pages/DiggerDetail";
import GigDetail from "./pages/GigDetail";
import MyLeads from "./pages/MyLeads";
import MyBids from "./pages/MyBids";
import MyGigs from "./pages/MyGigs";
import Contact from "./pages/Contact";
import HowItWorks from "./pages/HowItWorks";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Subscription from "./pages/Subscription";
import Pricing from "./pages/Pricing";
import PricingStrategy from "./pages/PricingStrategy";
import Transactions from "./pages/Transactions";
import EmailPreferences from "./pages/EmailPreferences";
import LeadLimits from "./pages/LeadLimits";
import DiggerGuide from "./pages/DiggerGuide";
import SavedSearches from "./pages/SavedSearches";
import Messages from "./pages/Messages";
import ProfileCompletion from "./pages/ProfileCompletion";
import AdminDashboard from "./pages/AdminDashboard";
import AdminNotificationPreferences from "./pages/AdminNotificationPreferences";
import AdminUserManagement from "./pages/AdminUserManagement";
import Notifications from "./pages/Notifications";
import TestAIMatching from "./pages/TestAIMatching";
import E2ETestSuite from "./pages/E2ETestSuite";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AdminBlog from "./pages/AdminBlog";
import Sitemap from "./pages/Sitemap";
import SitemapXML from "./pages/SitemapXML";
import DiggerSubscription from "./pages/DiggerSubscription";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import EscrowDashboard from "./pages/EscrowDashboard";
import PreDemoRegistration from "./pages/PreDemoRegistration";
import MyProfiles from "./pages/MyProfiles";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";

const queryClient = new QueryClient();

// Component to track digger presence
const PresenceTracker = () => {
  useTrackDiggerPresence();
  return null;
};

// Global router guard to detect recovery/error parameters and redirect to /auth
const AuthRecoveryGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? (window.location.hash || '') : '';
    const search = typeof window !== 'undefined' ? (window.location.search || '') : '';

    const hasRecoveryOrError =
      hash.includes('type=recovery') ||
      hash.includes('error=') ||
      search.includes('type=recovery') ||
      search.includes('error=');

    if (hasRecoveryOrError && location.pathname !== '/auth') {
      // Redirect to /auth while preserving query and hash
      const target = '/auth' + (search || '') + (hash || '');
      navigate(target, { replace: true });
    }
  }, [navigate, location]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PresenceTracker />
          <BrowserRouter>
        <AuthRecoveryGuard />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pre-demo-registration" element={<PreDemoRegistration />} />
          <Route path="/digger-registration" element={<DiggerRegistration />} />
          <Route path="/digger-registration-demo" element={<DiggerRegistrationDemo />} />
          <Route path="/gig-registration-demo" element={<GigRegistrationDemo />} />
          <Route path="/edit-profile" element={<EditDiggerProfile />} />
          <Route path="/edit-digger-profile" element={<EditDiggerProfile />} />
          <Route path="/edit-digger-profile/:profileId" element={<EditDiggerProfile />} />
          <Route path="/my-profiles" element={<MyProfiles />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/post-gig" element={<PostGig />} />
          <Route path="/browse-diggers" element={<BrowseDiggers />} />
          <Route path="/browse-gigs" element={<BrowseGigs />} />
          <Route path="/digger/:id" element={<DiggerDetail />} />
          <Route path="/gig/:id" element={<GigDetail />} />
          <Route path="/my-leads" element={<MyLeads />} />
          <Route path="/my-bids" element={<MyBids />} />
          <Route path="/my-gigs" element={<MyGigs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/pricing-strategy" element={<PricingStrategy />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/email-preferences" element={<EmailPreferences />} />
          <Route path="/lead-limits" element={<LeadLimits />} />
          <Route path="/digger-guide" element={<DiggerGuide />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile-completion" element={<ProfileCompletion />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/notification-preferences" element={<AdminNotificationPreferences />} />
          <Route path="/admin/users" element={<AdminUserManagement />} />
          <Route path="/saved-searches" element={<SavedSearches />} />
          <Route path="/test-ai-matching" element={<TestAIMatching />} />
          <Route path="/e2e-test" element={<E2ETestSuite />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/admin/blog" element={<AdminBlog />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/sitemap.xml" element={<SitemapXML />} />
          <Route path="/escrow-dashboard" element={<EscrowDashboard />} />
          <Route path="/digger-subscription" element={<DiggerSubscription />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
