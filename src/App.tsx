import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
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
import ProfileDashboard from "./pages/ProfileDashboard";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import TelemarketerDashboard from "./pages/TelemarketerDashboard";
import ProfileCreationDemo from "./pages/ProfileCreationDemo";
import Register from "./pages/Register";
import RoleDashboard from "./pages/RoleDashboard";
import Logout from "./pages/Logout";
import KeywordSummary from "./pages/KeywordSummary";

const queryClient = new QueryClient();

// Component to track digger presence
const PresenceTracker = () => {
  useTrackDiggerPresence();
  return null;
};

// Create router with all routes - forcing fresh registration
const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/register",
    element: <Register />,
    errorElement: <div>Register route error</div>,
  },
  {
    path: "/logout",
    element: <Logout />,
  },
  {
    path: "/auth",
    element: <Navigate to="/register" replace />,
  },
  {
    path: "/pre-demo-registration",
    element: <ProtectedRoute><PreDemoRegistration /></ProtectedRoute>,
  },
  {
    path: "/role-dashboard",
    element: <ProtectedRoute><RoleDashboard /></ProtectedRoute>,
  },
  {
    path: "/digger-registration",
    element: <ProtectedRoute><DiggerRegistration /></ProtectedRoute>,
  },
  {
    path: "/digger-subscription",
    element: <ProtectedRoute><DiggerSubscription /></ProtectedRoute>,
  },
  {
    path: "/subscription",
    element: <ProtectedRoute><Subscription /></ProtectedRoute>,
  },
  {
    path: "/checkout",
    element: <ProtectedRoute><Checkout /></ProtectedRoute>,
  },
  {
    path: "/checkout-success",
    element: <ProtectedRoute><CheckoutSuccess /></ProtectedRoute>,
  },
  {
    path: "/browse-diggers",
    element: <ProtectedRoute><BrowseDiggers /></ProtectedRoute>,
  },
  {
    path: "/browse-gigs",
    element: <ProtectedRoute><BrowseGigs /></ProtectedRoute>,
  },
  {
    path: "/my-profiles",
    element: <ProtectedRoute><MyProfiles /></ProtectedRoute>,
  },
  {
    path: "/my-profiles/:profileId/dashboard",
    element: <ProtectedRoute><ProfileDashboard /></ProtectedRoute>,
  },
  {
    path: "/edit-digger-profile/:id",
    element: <ProtectedRoute><EditDiggerProfile /></ProtectedRoute>,
  },
  {
    path: "/edit-digger-profile",
    element: <ProtectedRoute><EditDiggerProfile /></ProtectedRoute>,
  },
  {
    path: "/profile-completion",
    element: <ProtectedRoute><ProfileCompletion /></ProtectedRoute>,
  },
  {
    path: "/post-gig",
    element: <PostGig />,  // No auth required - Craigslist model
  },
  {
    path: "/my-gigs",
    element: <ProtectedRoute><MyGigs /></ProtectedRoute>,
  },
  {
    path: "/my-bids",
    element: <ProtectedRoute><MyBids /></ProtectedRoute>,
  },
  {
    path: "/my-leads",
    element: <ProtectedRoute><MyLeads /></ProtectedRoute>,
  },
  {
    path: "/messages",
    element: <ProtectedRoute><Messages /></ProtectedRoute>,
  },
  {
    path: "/transactions",
    element: <ProtectedRoute><Transactions /></ProtectedRoute>,
  },
  {
    path: "/notifications",
    element: <ProtectedRoute><Notifications /></ProtectedRoute>,
  },
  {
    path: "/gig/:id",
    element: <ProtectedRoute><GigDetail /></ProtectedRoute>,
  },
  {
    path: "/digger/:id",
    element: <ProtectedRoute><DiggerDetail /></ProtectedRoute>,
  },
  {
    path: "/how-it-works",
    element: <HowItWorks />,
  },
  {
    path: "/pricing",
    element: <Pricing />,
  },
  {
    path: "/keyword-summary",
    element: <ProtectedRoute><KeywordSummary /></ProtectedRoute>,
  },
  {
    path: "/pricing-strategy",
    element: <PricingStrategy />,
  },
  {
    path: "/lead-limits",
    element: <LeadLimits />,
  },
  {
    path: "/faq",
    element: <FAQ />,
  },
  {
    path: "/contact",
    element: <Contact />,
  },
  {
    path: "/blog",
    element: <Blog />,
  },
  {
    path: "/blog/:slug",
    element: <BlogPost />,
  },
  {
    path: "/digger-guide",
    element: <DiggerGuide />,
  },
  {
    path: "/terms",
    element: <TermsOfService />,
  },
  {
    path: "/privacy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/sitemap",
    element: <Sitemap />,
  },
  {
    path: "/sitemap.xml",
    element: <SitemapXML />,
  },
  {
    path: "/saved-searches",
    element: <ProtectedRoute><SavedSearches /></ProtectedRoute>,
  },
  {
    path: "/email-preferences",
    element: <ProtectedRoute><EmailPreferences /></ProtectedRoute>,
  },
  {
    path: "/escrow-dashboard",
    element: <ProtectedRoute><EscrowDashboard /></ProtectedRoute>,
  },
  {
    path: "/telemarketer-dashboard",
    element: <ProtectedRoute><TelemarketerDashboard /></ProtectedRoute>,
  },
  {
    path: "/admin",
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
  },
  {
    path: "/admin/users",
    element: <ProtectedRoute><AdminUserManagement /></ProtectedRoute>,
  },
  {
    path: "/admin/blog",
    element: <ProtectedRoute><AdminBlog /></ProtectedRoute>,
  },
  {
    path: "/admin/notifications",
    element: <ProtectedRoute><AdminNotificationPreferences /></ProtectedRoute>,
  },
  {
    path: "/test/ai-matching",
    element: <ProtectedRoute><TestAIMatching /></ProtectedRoute>,
  },
  {
    path: "/e2e-test-suite",
    element: <ProtectedRoute><E2ETestSuite /></ProtectedRoute>,
  },
  {
    path: "/demo/profile-creation",
    element: <ProfileCreationDemo />,
  },
  {
    path: "/demo/digger-registration",
    element: <DiggerRegistrationDemo />,
  },
  {
    path: "/demo/gig-registration",
    element: <GigRegistrationDemo />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PresenceTracker />
            <RouterProvider router={router} />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
