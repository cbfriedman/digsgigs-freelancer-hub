import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation, useRouteError, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { useDiggerPresence, useTrackDiggerPresence } from "./hooks/useDiggerPresence";
import { useUserPresence, useTrackUserPresence } from "./hooks/useUserPresence";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Index from "./pages/Index";
import { PageViewTracker } from "./components/PageViewTracker";
import { FloatingChatButton } from "./components/FloatingChatButton";
import FloatingMessageWidget from "./components/FloatingMessageWidget";
import { Navigation } from "./components/Navigation";
import { GlobalProgressBar } from "./components/GlobalProgressBar";
import { GlobalAnalytics } from "./components/GlobalAnalytics";
import { GlobalMessageSound } from "./components/GlobalMessageSound";
import { NewGigAlertListener } from "./components/NewGigAlertListener";
import { AwardNotificationListener } from "./components/AwardNotificationListener";
// Auth page removed - using Register for all authentication
import DiggerRegistration from "./pages/DiggerRegistration";
import DiggerRegistrationDemo from "./pages/DiggerRegistrationDemo";
import GigRegistrationDemo from "./pages/GigRegistrationDemo";
import PostGig from "./pages/PostGig";
import BrowseDiggers from "./pages/BrowseDiggers";
import BrowseGigs from "./pages/BrowseGigs";
import LegacyDiggerRedirect from "./pages/LegacyDiggerRedirect";
import GigDetail from "./pages/GigDetail";
import MyLeads from "./pages/MyLeads";
import MyBids from "./pages/MyBids";
import MyGigs from "./pages/MyGigs";
import Contact from "./pages/Contact";
import HowItWorks from "./pages/HowItWorks";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import LegalDocuments from "./pages/LegalDocuments";
import Pricing from "./pages/Pricing";
import PricingStrategy from "./pages/PricingStrategy";
import Transactions from "./pages/Transactions";
import Account from "./pages/Account";
import EmailPreferences from "./pages/EmailPreferences";
import LeadLimits from "./pages/LeadLimits";
import DiggerGuide from "./pages/DiggerGuide";
import SavedSearches from "./pages/SavedSearches";
import Messages from "./pages/Messages";
import ProfileByHandle from "./pages/ProfileByHandle";
import GiggerDetail from "./pages/GiggerDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminNotificationPreferences from "./pages/AdminNotificationPreferences";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminLeadDistributionTest from "./pages/AdminLeadDistributionTest";
import Notifications from "./pages/Notifications";
import TestAIMatching from "./pages/TestAIMatching";
import E2ETestSuite from "./pages/E2ETestSuite";
import TestResultsDashboard from "./pages/admin/TestResultsDashboard";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AdminBlog from "./pages/AdminBlog";
import AdminInbox from "./pages/AdminInbox";
import Sitemap from "./pages/Sitemap";
import SitemapXML from "./pages/SitemapXML";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";
import EscrowDashboard from "./pages/EscrowDashboard";
import PreDemoRegistration from "./pages/PreDemoRegistration";
import ProfileWorkspaceRedirect from "./pages/ProfileWorkspaceRedirect";
import MyProfileRedirect from "./pages/MyProfileRedirect";
import ProfileDashboard from "./pages/ProfileDashboard";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import TelemarketerDashboard from "./pages/TelemarketerDashboard";
import ProfileCreationDemo from "./pages/ProfileCreationDemo";
import Register from "./pages/Register";
import ProDiggerSignup from "./pages/ProDiggerSignup";
import RoleDashboard from "./pages/RoleDashboard";
import Logout from "./pages/Logout";
import KeywordSummary from "./pages/KeywordSummary";
import GigConfirmed from "./pages/GigConfirmed";
import GigPendingConfirmation from "./pages/GigPendingConfirmation";
import ReviewGigConfirmation from "./pages/ReviewGigConfirmation";
import ConfirmGig from "./pages/ConfirmGig";
import GigEdit from "./pages/GigEdit";
import GigCancel from "./pages/GigCancel";
import LeadUnlock from "./pages/LeadUnlock";
import LogoGeneratorPage from "./pages/LogoGeneratorPage";
import BrandAssets from "./pages/BrandAssets";
import GetFreeQuote from "./pages/GetFreeQuote";
import Unsubscribe from "./pages/Unsubscribe";
import VerifyReference from "./pages/VerifyReference";
import UnsubscribeCold from "./pages/UnsubscribeCold";
import ServiceLocationPage from "./pages/ServiceLocationPage";
import ServiceIndexPage from "./pages/ServiceIndexPage";
import CityLandingPage from "./pages/CityLandingPage";
import FAQHub from "./pages/FAQHub";
import FAQCategory from "./pages/FAQCategory";
import CompareHub from "./pages/CompareHub";
import CompareDetail from "./pages/CompareDetail";
import EmailLanding from "./pages/EmailLanding";
import AdvertiserPortal from "./pages/AdvertiserPortal";
import BusinessPlan from "./pages/BusinessPlan";
import ColdEmailDocs from "./pages/ColdEmailDocs";
import FoundingDigger from "./pages/FoundingDigger";
import FirstProfileCreate from "./pages/FirstProfileCreate";
import About from "./pages/About";
import ApplyDigger from "./pages/ApplyDigger";
import FBDiggerLanding from "./pages/FBDiggerLanding";
import ApplyDiggerFB from "./pages/ApplyDiggerFB";
import ApplyLanding from "./pages/ApplyLanding";
import BidTemplatePreview from "./pages/BidTemplatePreview";
import LeadUnlockPreview from "./pages/LeadUnlockPreview";
import Subscribe from "./pages/Subscribe";
import ImportSubscribers from "./pages/admin/ImportSubscribers";
import BecomeADigger from "./pages/BecomeADigger";
import HireAPro from "./pages/HireAPro";
import EmbedWidget from "./pages/EmbedWidget";
import ProductHuntLanding from "./pages/landings/ProductHuntLanding";
import IndieHackersLanding from "./pages/landings/IndieHackersLanding";
import HackerNewsLanding from "./pages/landings/HackerNewsLanding";
import DevToLanding from "./pages/landings/DevToLanding";

const queryClient = new QueryClient();

// Subscribe to presence channels on app load so all pages see consistent online/offline state.
const PresenceTracker = () => {
  useDiggerPresence();
  useUserPresence();
  useTrackDiggerPresence();
  useTrackUserPresence();
  return null;
};

// Layout wrapper: persistent header + page content. data-role-mode enables Gigger vs Digger styling (see docs/GIGGER_DIGGER_UX_AND_TONE.md).
const RootLayout = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { activeRole } = useAuth();
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthPage = pathname === "/register"; // sign-in and sign-up
  const isBlogPost = /^\/blog\/[^/]+$/.test(pathname);
  const isBlogIndex = pathname === "/blog";
  const showBackButton = isBlogPost || isBlogIndex;
  const backTo = isBlogPost ? "/blog" : "/";
  const backLabel = isBlogPost ? "Back to Blog" : "Back to Home";
  const roleMode = activeRole === "digger" || activeRole === "gigger" ? activeRole : "";
  const showHeader = !isAdminRoute && !isAuthPage;
  return (
    <div {...(roleMode ? { "data-role-mode": roleMode } : {})} className="min-h-screen flex flex-col">
      <GlobalProgressBar />
      <NewGigAlertListener />
      <AwardNotificationListener />
      {showHeader && (
        <Navigation
          showBackButton={showBackButton}
          backTo={backTo}
          backLabel={backLabel}
        />
      )}
      <PageViewTracker />
      <div style={{ paddingTop: showHeader ? "var(--header-height)" : 0 }} className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
      {showHeader && (
        <>
          <FloatingChatButton />
          <FloatingMessageWidget />
        </>
      )}
    </div>
  );
};

function RegisterRouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error);
  if (typeof console !== "undefined" && console.error) console.error("Register route error:", error);
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The sign-up page couldn’t load. Try reloading or go back home.
        </p>
        {message && (
          <p className="mt-2 text-xs font-mono text-muted-foreground break-words">{message}</p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload
          </button>
          <Link
            to="/"
            className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

// Create router with all routes - forcing fresh registration
const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
      {
        path: "/",
        element: <Index />,
      },
      {
        path: "/contractors-in/:city",
        element: <CityLandingPage />,
      },
      {
        path: "/register",
        element: <Register />,
        errorElement: <RegisterRouteError />,
      },
      {
        path: "/pro-digger-signup",
        element: <ProDiggerSignup />,
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
        element: <Navigate to="/pricing" replace />,
      },
      {
        path: "/subscription",
        element: <Navigate to="/pricing" replace />,
      },
      {
        path: "/subscription-success",
        element: <Navigate to="/pricing" replace />,
      },
      {
        path: "/checkout",
        element: <ProtectedRoute requireVerified={true}><Checkout /></ProtectedRoute>,
      },
      {
        path: "/checkout-success",
        element: <ProtectedRoute><CheckoutSuccess /></ProtectedRoute>,
      },
      {
        path: "/payment-methods",
        element: <Navigate to="/account" replace />,
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
        path: "/my-profile",
        element: <ProtectedRoute><MyProfileRedirect /></ProtectedRoute>,
      },
      {
        path: "/my-profiles",
        element: <ProtectedRoute><ProfileWorkspaceRedirect /></ProtectedRoute>,
      },
      {
        path: "/create-first-profile",
        element: <ProtectedRoute><FirstProfileCreate /></ProtectedRoute>,
      },
      {
        path: "/my-profiles/:profileId/dashboard",
        element: <ProtectedRoute><ProfileDashboard /></ProtectedRoute>,
      },
      {
        path: "/profile/:handle",
        element: <ProfileByHandle />,
      },
      {
        path: "/profile/:handle/:role",
        element: <ProfileByHandle />,
      },
      {
        path: "/gigger/:userId",
        element: <GiggerDetail />,
      },
      {
        path: "/post-gig",
        element: <PostGig />,  // No auth required - Craigslist model
      },
      {
        path: "/get-free-quote",
        element: <GetFreeQuote />,  // PEWC landing page - no auth required
      },
      {
        path: "/my-gigs",
        element: <ProtectedRoute requireRole="gigger"><MyGigs /></ProtectedRoute>,
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
        element: <LegacyDiggerRedirect />,
      },
      {
        path: "/gig-confirmed",
        element: <GigConfirmed />,
      },
      {
        path: "/gig-pending",
        element: <GigPendingConfirmation />,
      },
      {
        path: "/confirm-gig",
        element: <ConfirmGig />,
      },
      {
        path: "/review-gig",
        element: <ReviewGigConfirmation />,
      },
      {
        path: "/gig/:id/edit",
        element: <GigEdit />,
      },
      {
        path: "/gig/:id/cancel",
        element: <GigCancel />,
      },
      {
        path: "/lead/:id/unlock",
        element: <LeadUnlock />,
      },
      {
        path: "/how-it-works",
        element: <HowItWorks />,
      },
      {
        path: "/apply",
        element: <ApplyLanding />,
      },
      {
        path: "/freelancers",
        element: <ApplyLanding />,
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
        path: "/verify-reference",
        element: <VerifyReference />,
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
        path: "/legal",
        element: <LegalDocuments />,
      },
      {
        path: "/brand",
        element: <BrandAssets />,
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
        path: "/account",
        element: <ProtectedRoute><Account /></ProtectedRoute>,
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
        path: "/admin/inbox",
        element: <ProtectedRoute><AdminInbox /></ProtectedRoute>,
      },
      {
        path: "/admin/notifications",
        element: <ProtectedRoute><AdminNotificationPreferences /></ProtectedRoute>,
      },
      {
        path: "/admin/lead-distribution-test",
        element: <ProtectedRoute><AdminLeadDistributionTest /></ProtectedRoute>,
      },
      {
        path: "/admin/test-results",
        element: <ProtectedRoute><TestResultsDashboard /></ProtectedRoute>,
      },
      {
        path: "/admin/import-subscribers",
        element: <ProtectedRoute><ImportSubscribers /></ProtectedRoute>,
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
        path: "/bid-template-preview",
        element: <BidTemplatePreview />,
      },
      {
        path: "/lead-unlock-preview",
        element: <LeadUnlockPreview />,
      },
      {
        path: "/logo-generator",
        element: <LogoGeneratorPage />,
      },
      {
        path: "/email",
        element: <EmailLanding />,
      },
      {
        path: "/subscribe",
        element: <Subscribe />,
      },
      {
        path: "/unsubscribe",
        element: <Unsubscribe />,
      },
      {
        path: "/unsubscribe-cold",
        element: <UnsubscribeCold />,
      },
      {
        path: "/services/:service",
        element: <ServiceIndexPage />,
      },
      {
        path: "/services/:service/:city",
        element: <ServiceLocationPage />,
      },
      {
        path: "/faq/:category",
        element: <FAQCategory />,
      },
      {
        path: "/compare",
        element: <CompareHub />,
      },
      {
        path: "/compare/:competitor",
        element: <CompareDetail />,
      },
      {
        path: "/advertiser",
        element: <AdvertiserPortal />,
      },
      {
        path: "/business-plan",
        element: <BusinessPlan />,
      },
      {
        path: "/cold-email-docs",
        element: <ColdEmailDocs />,
      },
      {
        path: "/founding-digger",
        element: <FoundingDigger />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/apply-digger",
        element: <ApplyDigger />,
      },
      {
        path: "/fb-digger",
        element: <FBDiggerLanding />,
      },
      {
        path: "/apply-digger-fb",
        element: <ApplyDiggerFB />,
      },
      {
        path: "/become-a-digger",
        element: <BecomeADigger />,
      },
      {
        path: "/hire-a-pro",
        element: <HireAPro />,
      },
      {
        path: "/embed-widget",
        element: <EmbedWidget />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
  ],
);

const App = () => {
  return (
    <AppErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="digsgigs-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CartProvider>
              <TooltipProvider>
                <Sonner />
                <GlobalAnalytics />
                <PresenceTracker />
                <GlobalMessageSound />
                <RouterProvider router={router} />
              </TooltipProvider>
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
};

export default App;
