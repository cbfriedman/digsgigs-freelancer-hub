import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, ShoppingCart } from "lucide-react";
import { lookupCPC, findSimilarKeywords } from "@/utils/cpcLookup";
import { PRICING_TIERS } from "@/config/pricing";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Profession {
  keyword: string;
  cpl: {
    free: number;
    pro: number;
    premium: number;
  };
  valueIndicator: string;
  quantity?: number;
}

interface ProfessionKeywordInputWithCartProps {
  professions: Profession[];
  onProfessionsChange: (professions: Profession[]) => void;
  userId?: string;
  companyName?: string;
}

export function ProfessionKeywordInputWithCart({ 
  professions, 
  onProfessionsChange,
  userId,
  companyName 
}: ProfessionKeywordInputWithCartProps) {
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { addToCart } = useCart();

  const calculateCPL = (keyword: string) => {
    const cpcData = lookupCPC(keyword) || findSimilarKeywords(keyword, 1)[0];
    const baseCPC = cpcData?.estimatedCPC || 15;
    
    return {
      free: Math.round(baseCPC * 3),
      pro: Math.round(baseCPC * 2.5),
      premium: Math.round(baseCPC * 2),
    };
  };

  const getValueIndicator = (keyword: string): string => {
    const cpcData = lookupCPC(keyword) || findSimilarKeywords(keyword, 1)[0];
    if (!cpcData) return "Mid Value";
    
    return cpcData.valueIndicator === 'low-value' ? 'Low Value' : 
           cpcData.valueIndicator === 'mid-value' ? 'Mid Value' : 'High Value';
  };

  const addProfession = () => {
    if (!input.trim()) return;
    
    const keywords = input.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const newProfessions: Profession[] = [];
    
    for (const keyword of keywords) {
      if (professions.some(p => p.keyword.toLowerCase() === keyword.toLowerCase())) {
        continue;
      }

      newProfessions.push({
        keyword: keyword,
        cpl: calculateCPL(keyword),
        valueIndicator: getValueIndicator(keyword),
        quantity: 0,
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

  // Calculate total leads for display
  const totalLeads = professions.reduce((sum, p) => sum + (p.quantity || 0), 0);
  
  const getCostPerLead = (quantity: number, cpl: Profession['cpl']) => {
    if (quantity >= 51) return cpl.premium;
    if (quantity >= 11) return cpl.pro;
    return cpl.free;
  };

  const getTierForQuantity = (quantity: number) => {
    if (quantity >= 51) return "Premium";
    if (quantity >= 11) return "Pro";
    return "Standard";
  };

  const total = professions.reduce((sum, prof) => {
    const quantity = prof.quantity || 0;
    if (quantity === 0) return sum;
    const costPerLead = getCostPerLead(quantity, prof.cpl);
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

    // Create a cart item with the profession selections
    const cartItem = {
      id: `profile-${Date.now()}`,
      title: `${companyName || 'Profile'} - ${professions.filter(p => (p.quantity || 0) > 0).length} professions`,
      budget_min: total,
      budget_max: total,
      location: "Lead Package",
      description: professions
        .filter(p => (p.quantity || 0) > 0)
        .map(p => `${p.keyword}: ${p.quantity} leads`)
        .join(', '),
    };

    addToCart(cartItem);
    toast.success("Added to cart!");
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
              const costPerLead = getCostPerLead(quantity, prof.cpl);
              const lineCost = costPerLead * quantity;
              const tier = getTierForQuantity(quantity);

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
                      <div>Standard: ${prof.cpl.free}/lead <span className="text-xs opacity-70">(1-10 leads/mo)</span></div>
                      <div>Pro: ${prof.cpl.pro}/lead <span className="text-xs opacity-70">(11-50 leads/mo)</span></div>
                      <div>Premium: ${prof.cpl.premium}/lead <span className="text-xs opacity-70">(51+ leads/mo)</span></div>
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
                      <div className="flex flex-col items-end min-w-[120px]">
                        <span className="text-xs text-muted-foreground">{tier} Tier</span>
                        <span className="text-lg font-bold text-primary">
                          ${lineCost.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {quantity} × ${costPerLead}/lead
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
                  <div className="font-semibold mb-1">Per-Profession Volume Pricing</div>
                  <div>Each profession is priced based on its own lead quantity:</div>
                  <div className="mt-1">1-10 leads: Standard • 11-50 leads: Pro (17% off) • 51+ leads: Premium (33% off)</div>
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
                  onClick={handleAddToCart}
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
