import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RegistrationCategorySelector } from "@/components/RegistrationCategorySelector";
import { Loader2, Tag, Info, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KeywordSuggestions } from "@/components/KeywordSuggestions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DiggerProfilePreview } from "@/components/DiggerProfilePreview";
import { DiggerOnboardingTour } from "@/components/DiggerOnboardingTour";
import { BioGenerator } from "@/components/BioGenerator";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";
import { generateEnhancedKeywordSuggestions } from "@/utils/enhancedKeywordSuggestions";
import { getLeadTierDescription } from "@/config/pricing";

// Helper function to get country flag emoji
const getCountryFlag = (country: string): string => {
  const flags: { [key: string]: string } = {
    "United States": "🇺🇸",
    "Canada": "🇨🇦",
    "United Kingdom": "🇬🇧",
    "Australia": "🇦🇺",
    "Germany": "🇩🇪",
    "France": "🇫🇷",
    "Spain": "🇪🇸",
    "Italy": "🇮🇹",
    "Mexico": "🇲🇽",
    "Brazil": "🇧🇷",
    "India": "🇮🇳",
    "China": "🇨🇳",
    "Japan": "🇯🇵",
    "South Korea": "🇰🇷",
    "Netherlands": "🇳🇱",
    "Sweden": "🇸🇪",
    "Norway": "🇳🇴",
    "Denmark": "🇩🇰",
    "Finland": "🇫🇮",
    "Poland": "🇵🇱",
    "Ireland": "🇮🇪",
    "Switzerland": "🇨🇭",
    "Austria": "🇦🇹",
    "Belgium": "🇧🇪",
    "Portugal": "🇵🇹",
    "Greece": "🇬🇷",
    "New Zealand": "🇳🇿",
    "Singapore": "🇸🇬",
    "South Africa": "🇿🇦",
    "Argentina": "🇦🇷",
    "Chile": "🇨🇱",
    "Colombia": "🇨🇴",
    "Peru": "🇵🇪",
    "Israel": "🇮🇱",
    "UAE": "🇦🇪",
    "Saudi Arabia": "🇸🇦",
    "Turkey": "🇹🇷",
    "Thailand": "🇹🇭",
    "Vietnam": "🇻🇳",
    "Philippines": "🇵🇭",
    "Indonesia": "🇮🇩",
    "Malaysia": "🇲🇾",
    "Egypt": "🇪🇬",
    "Nigeria": "🇳🇬",
    "Kenya": "🇰🇪",
    "Other": "🌍"
  };
  return flags[country] || "🌍";
};

// Component disabled - not applicable to exclusivity-based pricing
const DiggerRegistration = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    toast.info("This registration page is being updated for the new pricing model.");
    navigate("/pricing");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
};

export default DiggerRegistration;
