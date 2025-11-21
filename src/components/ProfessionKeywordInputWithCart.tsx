import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, ShoppingCart, FolderOpen } from "lucide-react";
import { lookupBarkPrice, findSimilarBarkKeywords } from "@/utils/barkPricingLookup";
import { lookupCPC } from "@/utils/cpcLookup";
import { PRICING_TIERS } from "@/config/pricing";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Profession {
  keyword: string;
  nonExclusive: number;
  exclusive24h: number;
  valueIndicator: string;
  quantity?: number;
  isExclusive?: boolean; // Default false for non-exclusive
}

interface ProfessionKeywordInputWithCartProps {
  professions: Profession[];
  onProfessionsChange: (professions: Profession[]) => void;
  userId?: string;
  companyName?: string;
  profileId?: string;
}

export function ProfessionKeywordInputWithCart({ 
  professions, 
  onProfessionsChange,
  userId,
  companyName,
  profileId 
}: ProfessionKeywordInputWithCartProps) {
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const calculatePricing = (keyword: string) => {
    // Try Bark pricing first (most accurate)
    const barkData = lookupBarkPrice(keyword);
    if (barkData) {
      return {
        nonExclusive: Math.max(0.50, barkData.barkPrice - 0.50), // Bark - $0.50
        exclusive24h: barkData.barkPrice * 2.5, // Roughly Google CPC × 2.5 based on Bark
      };
    }
    
    // Fallback to CPC-based estimation
    const cpcData = lookupCPC(keyword);
    if (cpcData) {
      const estimatedBarkPrice = cpcData.estimatedCPC / 2; // Approximate Bark from CPC
      return {
        nonExclusive: Math.max(0.50, estimatedBarkPrice - 0.50),
        exclusive24h: cpcData.estimatedCPC * 2.5,
      };
    }
    
    // Default mid-value pricing if not found
    return {
      nonExclusive: 14.50,
      exclusive24h: 87.50,
    };
  };

  const getValueIndicator = (keyword: string): string => {
    const barkData = lookupBarkPrice(keyword);
    if (barkData) {
      return barkData.valueIndicator === 'low-value' ? 'Low Value' : 
             barkData.valueIndicator === 'mid-value' ? 'Mid Value' : 'High Value';
    }
    
    const cpcData = lookupCPC(keyword);
    if (cpcData) {
      return cpcData.valueIndicator === 'low-value' ? 'Low Value' : 
             cpcData.valueIndicator === 'mid-value' ? 'Mid Value' : 'High Value';
    }
    
    return "Mid Value";
  };

  const addProfession = () => {
    if (!input.trim()) return;
    
    const keywords = input.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const newProfessions: Profession[] = [];
    
    for (const keyword of keywords) {
      if (professions.some(p => p.keyword.toLowerCase() === keyword.toLowerCase())) {
        continue;
      }

      const pricing = calculatePricing(keyword);
      newProfessions.push({
        keyword: keyword,
        nonExclusive: pricing.nonExclusive,
        exclusive24h: pricing.exclusive24h,
        valueIndicator: getValueIndicator(keyword),
        quantity: 0,
        isExclusive: false, // Default to non-exclusive
      });
    }

    if (newProfessions.length > 0) {
      onProfessionsChange([...professions, ...newProfessions]);
    }
    setInput("");
  };

  const removeProfession = (keyword: string) => {
    onProfessionsChange(professions.filter(p => p.keyword !== keyword));
  };

  const updateQuantity = (keyword: string, quantity: number) => {
    onProfessionsChange(
      professions.map(p => 
        p.keyword === keyword ? { ...p, quantity: Math.max(0, quantity) } : p
      )
    );
  };

  const toggleExclusivity = (keyword: string) => {
    onProfessionsChange(
      professions.map(p => 
        p.keyword === keyword ? { ...p, isExclusive: !p.isExclusive } : p
      )
    );
  };

  // Calculate total leads for display
  const totalLeads = professions.reduce((sum, p) => sum + (p.quantity || 0), 0);
  
  const total = professions.reduce((sum, prof) => {
    const quantity = prof.quantity || 0;
    if (quantity === 0) return sum;
    const costPerLead = prof.isExclusive ? prof.exclusive24h : prof.nonExclusive;
    return sum + (costPerLead * quantity);
  }, 0);

  const handleSaveProfile = async () => {
    if (!userId) {
      toast.error("Please complete Step 1 first to save your profile");
      return;
    }

    if (professions.length === 0) {
      toast.error("Please add at least one profession before saving");
      return;
    }

    setIsSaving(true);
    try {
      // Save profession selections to database
      const { error } = await supabase
        .from('digger_profiles')
        .update({
          keywords: professions.map(p => p.keyword),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success(`Profile saved! ${professions.length} profession(s) saved to your account.`);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToCart = () => {
    if (totalLeads === 0) {
      toast.error("Please enter quantities for at least one profession");
      return;
    }

    if (!profileId) {
      toast.error("Please save your profile first before proceeding to checkout");
      return;
    }

    // Create profession items for checkout
    const professionsForCheckout = professions
      .filter(p => (p.quantity || 0) > 0)
      .map(p => {
        const quantity = p.quantity || 0;
        const exclusivity = p.isExclusive ? 'exclusive-24h' : 'non-exclusive';
        const costPerLead = p.isExclusive ? p.exclusive24h : p.nonExclusive;

        return {
          keyword: p.keyword,
          quantity,
          costPerLead,
          exclusivity,
          totalCost: costPerLead * quantity,
        };
      });

    const checkoutData = {
      profileId,
      companyName: companyName || 'My Profile',
      professions: professionsForCheckout,
      totalCost: total,
    };

    // Navigate to checkout with data
    navigate("/checkout", { state: { checkoutData } });
    
    toast.success("Proceeding to checkout...");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Type professions (separate multiple with commas: plumber, electrician, handyman)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addProfession();
            }
          }}
        />
        <Button
          type="button"
          onClick={addProfession}
          disabled={!input.trim()}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {professions.length > 0 && (
        <>
          <div className="space-y-3">
            {professions.map((prof) => {
              const quantity = prof.quantity || 0;
              const costPerLead = prof.isExclusive ? prof.exclusive24h : prof.nonExclusive;
              const lineCost = costPerLead * quantity;
              const exclusivityLabel = prof.isExclusive ? '24-Hour Exclusive' : 'Non-Exclusive';

              return (
                <div
                  key={prof.keyword}
                  className="flex items-center gap-3 p-4 border rounded-lg bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground">{prof.keyword}</span>
                      <Badge variant="outline" className="text-xs">
                        {prof.valueIndicator}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Non-Exclusive: ${prof.nonExclusive.toFixed(2)}/lead <span className="text-xs opacity-70">(Bark - $0.50)</span></div>
                      <div>24-Hour Exclusive: ${prof.exclusive24h.toFixed(2)}/lead <span className="text-xs opacity-70">(Google CPC × 2.5)</span></div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Switch
                        checked={prof.isExclusive || false}
                        onCheckedChange={() => toggleExclusivity(prof.keyword)}
                        id={`exclusivity-${prof.keyword}`}
                      />
                      <Label htmlFor={`exclusivity-${prof.keyword}`} className="text-xs cursor-pointer">
                        {prof.isExclusive ? '24-Hour Exclusive' : 'Non-Exclusive'}
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <label className="text-xs text-muted-foreground">Qty/Month</label>
                      <Input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => updateQuantity(prof.keyword, parseInt(e.target.value) || 0)}
                        className="w-24 text-center"
                      />
                    </div>
                    
                    {quantity > 0 && (
                      <div className="flex flex-col items-end min-w-[140px]">
                        <span className="text-xs text-muted-foreground">{exclusivityLabel}</span>
                        <span className="text-lg font-bold text-primary">
                          ${lineCost.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {quantity} × ${costPerLead.toFixed(2)}/lead
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProfession(prof.keyword)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {totalLeads > 0 && (
            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total Monthly Cost:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>
                
                <div className="text-xs text-center text-muted-foreground mt-2">
                  <div className="font-semibold mb-1">Exclusivity-Based Pricing</div>
                  <div>Each profession is priced based on your exclusivity choice:</div>
                  <div className="mt-1">Non-Exclusive: Bark - $0.50 • 24-Hour Exclusive: Google CPC × 2.5</div>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !userId}
                  variant="outline"
                  className="flex-1"
                  title={!userId ? "Complete Step 1 to enable saving" : "Save your profession selections"}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : !userId ? "Complete Step 1 First" : "Save Profile"}
                </Button>
                
                <Button
                  onClick={() => navigate("/my-profiles")}
                  variant="outline"
                  className="flex-1"
                  title="View your saved profiles"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  View My Profiles
                </Button>
                
                <Button
                  onClick={handleAddToCart}
                  disabled={!profileId}
                  className="flex-1"
                  title={!profileId ? "Save your profile first before checkout" : "Proceed to secure checkout"}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {!profileId ? "Save Profile First" : "Proceed to Checkout"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
