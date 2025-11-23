import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { useTrackDiggerPresence } from "./hooks/useDiggerPresence";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
// Auth page removed - using Register for all authentication
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
import TelemarketerDashboard from "./pages/TelemarketerDashboard";
import ProfileCreationDemo from "./pages/ProfileCreationDemo";
import Register from "./pages/Register";
import RoleDashboard from "./pages/RoleDashboard";

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
          {/* Public routes - no authentication required */}
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<Register />} />
          {/* Redirect /auth to /register */}
          <Route path="/auth" element={<Register />} />
          <Route path="/pre-demo-registration" element={<ProtectedRoute><PreDemoRegistration /></ProtectedRoute>} />
          <Route path="/digger-registration" element={<ProtectedRoute><DiggerRegistration /></ProtectedRoute>} />
          <Route path="/digger-registration-demo" element={<ProtectedRoute><DiggerRegistrationDemo /></ProtectedRoute>} />
          <Route path="/gig-registration-demo" element={<ProtectedRoute><GigRegistrationDemo /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditDiggerProfile /></ProtectedRoute>} />
          <Route path="/edit-digger-profile" element={<ProtectedRoute><EditDiggerProfile /></ProtectedRoute>} />
          <Route path="/edit-digger-profile/:profileId" element={<ProtectedRoute><EditDiggerProfile /></ProtectedRoute>} />
          <Route path="/my-profiles" element={<ProtectedRoute><MyProfiles /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/checkout-success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
          <Route path="/post-gig" element={<ProtectedRoute><PostGig /></ProtectedRoute>} />
          <Route path="/browse-diggers" element={<ProtectedRoute><BrowseDiggers /></ProtectedRoute>} />
          <Route path="/browse-gigs" element={<ProtectedRoute><BrowseGigs /></ProtectedRoute>} />
          <Route path="/digger/:id" element={<ProtectedRoute><DiggerDetail /></ProtectedRoute>} />
          <Route path="/gig/:id" element={<ProtectedRoute><GigDetail /></ProtectedRoute>} />
          <Route path="/my-leads" element={<ProtectedRoute><MyLeads /></ProtectedRoute>} />
          <Route path="/my-bids" element={<ProtectedRoute><MyBids /></ProtectedRoute>} />
          <Route path="/my-gigs" element={<ProtectedRoute><MyGigs /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
          <Route path="/how-it-works" element={<ProtectedRoute><HowItWorks /></ProtectedRoute>} />
          <Route path="/terms" element={<ProtectedRoute><TermsOfService /></ProtectedRoute>} />
          <Route path="/privacy" element={<ProtectedRoute><PrivacyPolicy /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          <Route path="/pricing-strategy" element={<ProtectedRoute><PricingStrategy /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/email-preferences" element={<ProtectedRoute><EmailPreferences /></ProtectedRoute>} />
          <Route path="/lead-limits" element={<ProtectedRoute><LeadLimits /></ProtectedRoute>} />
          <Route path="/digger-guide" element={<ProtectedRoute><DiggerGuide /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/profile-completion" element={<ProtectedRoute><ProfileCompletion /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/notification-preferences" element={<ProtectedRoute><AdminNotificationPreferences /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUserManagement /></ProtectedRoute>} />
          <Route path="/saved-searches" element={<ProtectedRoute><SavedSearches /></ProtectedRoute>} />
          <Route path="/test-ai-matching" element={<ProtectedRoute><TestAIMatching /></ProtectedRoute>} />
          <Route path="/e2e-test" element={<ProtectedRoute><E2ETestSuite /></ProtectedRoute>} />
          <Route path="/blog" element={<ProtectedRoute><Blog /></ProtectedRoute>} />
          <Route path="/blog/:slug" element={<ProtectedRoute><BlogPost /></ProtectedRoute>} />
          <Route path="/admin/blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />
          <Route path="/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} />
          <Route path="/sitemap" element={<ProtectedRoute><Sitemap /></ProtectedRoute>} />
          <Route path="/sitemap.xml" element={<ProtectedRoute><SitemapXML /></ProtectedRoute>} />
          <Route path="/escrow-dashboard" element={<ProtectedRoute><EscrowDashboard /></ProtectedRoute>} />
          <Route path="/digger-subscription" element={<ProtectedRoute><DiggerSubscription /></ProtectedRoute>} />
          <Route path="/telemarketer-dashboard" element={<ProtectedRoute><TelemarketerDashboard /></ProtectedRoute>} />
          <Route path="/profile-demo" element={<ProtectedRoute><ProfileCreationDemo /></ProtectedRoute>} />
          <Route path="/role-dashboard" element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>} />
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
