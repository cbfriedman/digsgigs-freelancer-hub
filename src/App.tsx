import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AIChatbot from "./components/AIChatbot";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DiggerRegistration from "./pages/DiggerRegistration";
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
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/digger-registration" element={<DiggerRegistration />} />
          <Route path="/edit-profile" element={<EditDiggerProfile />} />
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
          <Route path="/saved-searches" element={<SavedSearches />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AIChatbot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
