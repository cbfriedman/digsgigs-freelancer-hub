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

  // Calculate total leads and costs with volume discount
  const totalLeads = professions.reduce((sum, p) => sum + (p.quantity || 0), 0);
  
  const getDiscountRate = () => {
    if (totalLeads >= 51) return 0.30; // 30% discount
    if (totalLeads >= 11) return 0.15; // 15% discount
    return 0; // No discount
  };

  const getTierName = () => {
    if (totalLeads >= 51) return "Premium";
    if (totalLeads >= 11) return "Pro";
    return "Standard";
  };

  const getCostPerLead = (prof: Profession) => {
    if (totalLeads >= 51) return prof.cpl.premium;
    if (totalLeads >= 11) return prof.cpl.pro;
    return prof.cpl.free;
  };

  const subtotal = professions.reduce((sum, prof) => {
    const quantity = prof.quantity || 0;
    if (quantity === 0) return sum;
    return sum + (getCostPerLead(prof) * quantity);
  }, 0);

  const discountRate = getDiscountRate();
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;

  const handleSaveProfile = async () => {
    if (!userId) {
      toast.error("Please complete Step 1 first");
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
      
      toast.success("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
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
              const costPerLead = getCostPerLead(prof);
              const lineCost = costPerLead * quantity;

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
                    <div className="text-sm text-muted-foreground">
                      Standard: ${prof.cpl.free} • Pro: ${prof.cpl.pro} • Premium: ${prof.cpl.premium}
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
                      <div className="flex flex-col items-end min-w-[100px]">
                        <span className="text-xs text-muted-foreground">Cost</span>
                        <span className="text-lg font-bold text-primary">
                          ${lineCost.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @ ${costPerLead}/lead
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({totalLeads} leads):</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                
                {discountRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Volume Discount ({getTierName()} - {(discountRate * 100).toFixed(0)}%):
                    </span>
                    <span className="font-semibold text-green-600">
                      -${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                
                <div className="h-px bg-border my-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total Monthly Cost:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>
                
                <div className="text-xs text-center text-muted-foreground mt-2">
                  {totalLeads < 11 && "Add 11+ leads for 15% discount or 51+ for 30% discount"}
                  {totalLeads >= 11 && totalLeads < 51 && "Add 51+ leads for 30% discount"}
                  {totalLeads >= 51 && "Maximum volume discount applied!"}
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !userId}
                  variant="outline"
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Profile"}
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
