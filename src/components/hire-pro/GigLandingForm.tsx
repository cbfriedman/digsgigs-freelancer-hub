 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Badge } from "@/components/ui/badge";
 import { Textarea } from "@/components/ui/textarea";
 import { 
 Lightbulb, 
 DollarSign, 
 Clock, 
 CheckCircle2, 
 ArrowRight, 
 Loader2,
 Sparkles,
 AlertCircle
 } from "lucide-react";
 import { PROBLEM_OPTIONS, TIMELINE_OPTIONS } from "@/config/giggerProblems";
 import { RegionCountrySelector } from "@/components/RegionCountrySelector";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 interface GigLandingFormProps {
   onComplete?: (data: FormData) => void;
 }
 
 interface FormData {
   projectTypes: string[];
   description: string;
   budgetMin: number;
   budgetMax: number;
   timeline: string;
   preferredRegions: string[];
 }
 
 // Budget suggestion based on project types and description length
 const BUDGET_SUGGESTIONS: Record<string, { min: number; max: number }> = {
   'build-website': { min: 2000, max: 5000 },
   'build-webapp': { min: 5000, max: 15000 },
   'design-something': { min: 1000, max: 3000 },
   'get-customers': { min: 1500, max: 4000 },
   'automate-ai': { min: 3000, max: 8000 },
   'business-systems': { min: 2000, max: 5000 },
   'create-content': { min: 500, max: 2000 },
 };
 
 export function GigLandingForm({ onComplete }: GigLandingFormProps) {
   const navigate = useNavigate();
   const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>([]);
   const [description, setDescription] = useState("");
   const [budgetMin, setBudgetMin] = useState("");
   const [budgetMax, setBudgetMax] = useState("");
   const [timeline, setTimeline] = useState("");
   const [isEnhancing, setIsEnhancing] = useState(false);
   const [budgetError, setBudgetError] = useState<string | null>(null);
   const [suggestedBudget, setSuggestedBudget] = useState<{ min: number; max: number } | null>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   // Calculate suggested budget based on selected project types and description
   useEffect(() => {
     if (selectedProjectTypes.length === 0) {
       setSuggestedBudget(null);
       return;
     }
 
     // Calculate average budget from selected types
     let totalMin = 0;
     let totalMax = 0;
     let count = 0;
 
     selectedProjectTypes.forEach(type => {
       const suggestion = BUDGET_SUGGESTIONS[type];
       if (suggestion) {
         totalMin += suggestion.min;
         totalMax += suggestion.max;
         count++;
       }
     });
 
     if (count > 0) {
       // Average of selected types, multiplied by type count (more types = more work)
       const multiplier = Math.min(selectedProjectTypes.length, 2); // Cap at 2x
       const baseMin = Math.round(totalMin / count);
       const baseMax = Math.round(totalMax / count);
       
       // Adjust based on description complexity
       const descriptionMultiplier = description.length > 500 ? 1.2 : 
                                      description.length > 200 ? 1.1 : 1;
       
       setSuggestedBudget({
         min: Math.round(baseMin * multiplier * descriptionMultiplier),
         max: Math.round(baseMax * multiplier * descriptionMultiplier),
       });
     }
   }, [selectedProjectTypes, description]);
 
   // Validate budget range (max must be within 20% of min)
   useEffect(() => {
     const min = parseCurrency(budgetMin);
     const max = parseCurrency(budgetMax);
     
     if (min && max) {
       const maxAllowed = min * 1.2;
       if (max > maxAllowed) {
         setBudgetError(`Maximum budget should be within 20% of minimum ($${formatNumber(Math.round(maxAllowed))})`);
       } else if (max < min) {
         setBudgetError("Maximum budget must be greater than minimum");
       } else {
         setBudgetError(null);
       }
     } else {
       setBudgetError(null);
     }
   }, [budgetMin, budgetMax]);
 
   const formatNumber = (num: number): string => {
     return num.toLocaleString('en-US');
   };
 
   const formatCurrency = (value: string): string => {
     const numericValue = value.replace(/[^0-9]/g, '');
     if (!numericValue) return '';
     const number = parseInt(numericValue);
     if (isNaN(number)) return '';
     return number.toLocaleString('en-US');
   };
 
   const parseCurrency = (value: string): number => {
     return parseInt(value.replace(/[^0-9]/g, '')) || 0;
   };
 
   const handleProjectTypeToggle = (typeId: string, checked: boolean) => {
     setSelectedProjectTypes(prev => {
       if (checked && !prev.includes(typeId)) {
         return [...prev, typeId];
       } else if (!checked && prev.includes(typeId)) {
         return prev.filter(id => id !== typeId);
       }
       return prev;
     });
   };
 
   const applySuggestedBudget = () => {
     if (suggestedBudget) {
       setBudgetMin(formatNumber(suggestedBudget.min));
       setBudgetMax(formatNumber(suggestedBudget.max));
     }
   };
 
   const enhanceDescription = async () => {
     if (!description.trim() || selectedProjectTypes.length === 0) {
       toast.error("Please select project types and add a description first");
       return;
     }
 
     setIsEnhancing(true);
     try {
       const typeLabels = selectedProjectTypes
         .map(id => PROBLEM_OPTIONS.find(p => p.id === id)?.label)
         .filter(Boolean)
         .join(', ');
 
       const { data, error } = await supabase.functions.invoke("enhance-description", {
         body: {
           description,
           context: typeLabels,
         },
       });
 
       if (error) throw error;
       if (data?.enhanced) {
         setDescription(data.enhanced);
         toast.success("Description enhanced!");
       }
     } catch (err) {
       console.error("Enhancement error:", err);
       toast.error("Couldn't enhance description");
     } finally {
       setIsEnhancing(false);
     }
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     // Validation
     if (selectedProjectTypes.length === 0) {
       toast.error("Please select at least one project type");
       return;
     }
     if (!description.trim()) {
       toast.error("Please describe your project");
       return;
     }
     if (!budgetMin || !budgetMax) {
       toast.error("Please enter your budget range");
       return;
     }
     if (budgetError) {
       toast.error(budgetError);
       return;
     }
     if (!timeline) {
       toast.error("Please select a timeline");
       return;
     }
 
     setIsSubmitting(true);
 
     const formData: FormData = {
       projectTypes: selectedProjectTypes,
       description,
       budgetMin: parseCurrency(budgetMin),
       budgetMax: parseCurrency(budgetMax),
       timeline,
      preferredRegions: [],
     };
 
     if (onComplete) {
       onComplete(formData);
     } else {
       // Navigate to full form with prefilled data
       navigate("/post-gig", { 
         state: { 
           prefillData: {
             problemId: selectedProjectTypes[0], // Primary type
             description,
             budgetMin: parseCurrency(budgetMin),
             budgetMax: parseCurrency(budgetMax),
             timeline,
            preferredRegions: [],
             additionalTypes: selectedProjectTypes.slice(1),
           }
         }
       });
     }
 
     setIsSubmitting(false);
   };
 
   const currentStep = () => {
     if (selectedProjectTypes.length === 0) return 1;
     if (!description.trim()) return 2;
     if (!budgetMin || !budgetMax || !timeline) return 3;
    return 3;
   };
 
   return (
     <Card className="border-border/50 shadow-lg overflow-hidden">
       <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/50 pb-6">
         <CardTitle className="text-xl flex items-center gap-3">
           <div className="p-2 rounded-lg bg-primary/10">
             <Lightbulb className="h-5 w-5 text-primary" />
           </div>
           Project Details
         </CardTitle>
         <p className="text-sm text-muted-foreground mt-2">
           The more details you provide, the better matches you'll receive.
         </p>
       </CardHeader>
 
       <CardContent className="pt-8">
         <form onSubmit={handleSubmit} className="space-y-8">
           
           {/* Step 1: Project Type Selection (Multi-select) */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
               <Label className="text-base font-semibold">
                 What are you trying to do? <span className="text-destructive">*</span>
               </Label>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Step 1 of 3</span>
             </div>
             <p className="text-sm text-muted-foreground">
               Select all project types that apply to your needs.
             </p>
            <div className="grid grid-cols-2 gap-2">
               {PROBLEM_OPTIONS.map((option) => {
                 const isChecked = selectedProjectTypes.includes(option.id);
                 return (
                   <label
                     key={option.id}
                     htmlFor={`project-type-${option.id}`}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all text-sm ${
                       isChecked 
                         ? 'border-primary bg-primary/5 shadow-sm' 
                         : 'border-border/50 hover:border-primary/30 hover:bg-muted/50'
                     }`}
                   >
                     <Checkbox
                       id={`project-type-${option.id}`}
                       checked={isChecked}
                       onCheckedChange={(checked) => handleProjectTypeToggle(option.id, checked === true)}
                      className="h-4 w-4"
                     />
                    <span className="flex-1 text-xs font-medium leading-tight">{option.label}</span>
                    {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                   </label>
                 );
               })}
             </div>
             {selectedProjectTypes.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-2">
                 {selectedProjectTypes.map(typeId => {
                   const option = PROBLEM_OPTIONS.find(p => p.id === typeId);
                   return option ? (
                     <Badge key={typeId} variant="secondary" className="text-xs">
                       {option.label}
                     </Badge>
                   ) : null;
                 })}
               </div>
             )}
           </div>
 
           {/* Step 2: Description */}
           <div className="space-y-3">
             <div className="flex items-center justify-between">
               <Label htmlFor="description" className="text-base font-semibold">
                 Project Description <span className="text-destructive">*</span>
               </Label>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Step 2 of 3</span>
             </div>
             <p className="text-sm text-muted-foreground">
               Describe what you want done. Include any specific requirements, goals, or examples.
             </p>
             <div className="relative">
               <Textarea
                 id="description"
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 placeholder="No technical terms needed. Just explain the goal..."
                 className="min-h-[120px] resize-y rounded-xl border-border/50"
               />
               <div className="flex justify-between items-center mt-2">
                 <span className="text-xs text-muted-foreground">
                   {description.length > 0 ? `${description.length} characters` : 'No technical terms needed. Just explain the goal.'}
                 </span>
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   onClick={enhanceDescription}
                   disabled={isEnhancing || !description.trim() || selectedProjectTypes.length === 0}
                   className="text-xs gap-1"
                 >
                   {isEnhancing ? (
                     <Loader2 className="h-3 w-3 animate-spin" />
                   ) : (
                     <Sparkles className="h-3 w-3" />
                   )}
                   Enhance with AI
                 </Button>
               </div>
             </div>
           </div>
 
           {/* Step 3: Budget & Timeline */}
           <div className="space-y-6 p-6 rounded-xl bg-muted/30 border border-border/50">
             <div className="flex items-center justify-between">
               <h3 className="text-base font-semibold flex items-center gap-2">
                 <DollarSign className="h-5 w-5 text-success" />
                 Budget & Timeline
               </h3>
              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">Step 3 of 3</span>
             </div>
 
             {/* Suggested Budget */}
             {suggestedBudget && (
               <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                 <Sparkles className="h-4 w-4 text-accent" />
                 <span className="text-sm flex-1">
                   Suggested budget: <strong>${formatNumber(suggestedBudget.min)} - ${formatNumber(suggestedBudget.max)}</strong>
                 </span>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={applySuggestedBudget}
                   className="text-xs"
                 >
                   Apply
                 </Button>
               </div>
             )}
 
             <div className="space-y-3">
               <Label className="text-sm font-medium">
                 Budget Range <span className="text-destructive">*</span>
               </Label>
               <p className="text-xs text-muted-foreground">
                 Enter your expected budget range. This helps freelancers understand your expectations.
               </p>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">Minimum</Label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                     <Input
                       type="text"
                       value={budgetMin}
                       onChange={(e) => setBudgetMin(formatCurrency(e.target.value))}
                       placeholder="1,000"
                       className="pl-7 h-12 text-base rounded-xl"
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">Maximum</Label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                     <Input
                       type="text"
                       value={budgetMax}
                       onChange={(e) => setBudgetMax(formatCurrency(e.target.value))}
                       placeholder="2,500"
                       className="pl-7 h-12 text-base rounded-xl"
                     />
                   </div>
                 </div>
               </div>
               {budgetError && (
                 <div className="flex items-center gap-2 text-destructive text-xs">
                   <AlertCircle className="h-3 w-3" />
                   {budgetError}
                 </div>
               )}
             </div>
 
             <div className="space-y-3">
               <Label className="text-sm font-medium flex items-center gap-2">
                 <Clock className="h-4 w-4 text-muted-foreground" />
                 Timeline <span className="text-destructive">*</span>
               </Label>
               <p className="text-xs text-muted-foreground">
                 When do you need this project completed?
               </p>
               <Select value={timeline} onValueChange={setTimeline}>
                 <SelectTrigger className="w-full h-12 text-base rounded-xl">
                   <SelectValue placeholder="Select a Timeline..." />
                 </SelectTrigger>
                 <SelectContent>
                   {TIMELINE_OPTIONS.map((option) => (
                     <SelectItem key={option.value} value={option.value}>
                       {option.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
 
           {/* Submit Button */}
           <div className="pt-4">
             <Button
               type="submit"
               size="lg"
               className="w-full h-14 text-lg bg-gradient-primary shadow-primary-lg hover:shadow-xl transition-all"
               disabled={isSubmitting || !!budgetError}
             >
               {isSubmitting ? (
                 <Loader2 className="h-5 w-5 animate-spin mr-2" />
               ) : null}
               Continue to Contact Details
               <ArrowRight className="ml-2 h-5 w-5" />
             </Button>
             <p className="text-xs text-muted-foreground text-center mt-3">
               Free to post • No obligations • Get proposals in hours
             </p>
           </div>
         </form>
       </CardContent>
     </Card>
   );
 }