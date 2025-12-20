/**
 * @deprecated - This component has been simplified. Exclusivity options removed.
 * Now only supports simple lead quantity selection without exclusivity toggle.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, ShoppingCart, FolderOpen } from "lucide-react";
import { lookupBarkPrice } from "@/utils/barkPricingLookup";
import { lookupCPC } from "@/utils/cpcLookup";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profession {
  keyword: string;
  leadCost: number;
  valueIndicator: string;
  quantity?: number;
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

  const calculatePricing = (keyword: string): number => {
    // Try Bark pricing first (most accurate)
    const barkData = lookupBarkPrice(keyword);
    if (barkData) {
      return Math.max(0.50, barkData.barkPrice - 0.50);
    }
    
    // Fallback to CPC-based estimation
    const cpcData = lookupCPC(keyword);
    if (cpcData) {
      const estimatedBarkPrice = cpcData.estimatedCPC / 2;
      return Math.max(0.50, estimatedBarkPrice - 0.50);
    }
    
    // Default mid-value pricing
    return 14.50;
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
        leadCost: pricing,
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

  const totalCost = professions.reduce((sum, prof) => {
    const quantity = prof.quantity || 0;
    if (quantity === 0) return sum;
    return sum + (prof.leadCost * quantity);
  }, 0);

  const totalLeads = professions.reduce((sum, prof) => sum + (prof.quantity || 0), 0);

  const handleSaveProfile = async () => {
    if (!userId || !companyName) {
      toast.error("Missing user or company information");
      return;
    }

    setIsSaving(true);
    try {
      const keywords = professions.map(p => p.keyword);
      
      const { error } = await supabase
        .from('digger_profiles')
        .update({ keywords })
        .eq('id', profileId);

      if (error) throw error;
      
      toast.success("Keywords saved to your profile!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckout = () => {
    const selections = professions
      .filter(p => (p.quantity || 0) > 0)
      .map(p => {
        const quantity = p.quantity || 0;

        return {
          keyword: p.keyword,
          quantity,
          costPerLead: p.leadCost,
          totalCost: p.leadCost * quantity,
        };
      });

    if (selections.length === 0) {
      toast.error("Please select at least one lead");
      return;
    }

    sessionStorage.setItem('leadSelections', JSON.stringify(selections));
    navigate('/lead-checkout');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Add profession keywords (comma-separated)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addProfession()}
          className="flex-1"
        />
        <Button onClick={addProfession} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {professions.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Selected Keywords ({professions.length})
          </div>
          
          {professions.map((prof) => {
            const quantity = prof.quantity || 0;
            const lineCost = prof.leadCost * quantity;

            return (
              <div 
                key={prof.keyword} 
                className="p-4 border rounded-lg bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{prof.keyword}</span>
                      <Badge variant="outline" className="text-xs">
                        {prof.valueIndicator}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>${prof.leadCost.toFixed(2)}/lead</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => updateQuantity(prof.keyword, quantity - 1)}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => updateQuantity(prof.keyword, parseInt(e.target.value) || 0)}
                        className="w-16 text-center h-8"
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => updateQuantity(prof.keyword, quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                    
                    {quantity > 0 && (
                      <div className="text-right min-w-[80px]">
                        <div className="font-semibold text-primary">
                          ${lineCost.toFixed(2)}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeProfession(prof.keyword)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {totalLeads > 0 && (
            <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-lg font-semibold">Total: {totalLeads} leads</div>
                  <div className="text-sm text-muted-foreground">Lead credits purchase</div>
                </div>
                <div className="text-2xl font-bold text-primary">
                  ${totalCost.toFixed(2)}
                </div>
              </div>
              
              <div className="flex gap-2">
                {userId && (
                  <Button 
                    variant="outline" 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Keywords"}
                  </Button>
                )}
                <Button 
                  onClick={handleCheckout}
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Purchase Lead Credits
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
