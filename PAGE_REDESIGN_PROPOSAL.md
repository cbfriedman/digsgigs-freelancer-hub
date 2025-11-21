# Page Redesign Proposal: Exclusivity-Based Pricing Model

## Overview

The following pages need to be redesigned to support the new **exclusivity-based pricing model**:
- **DiggerRegistration** - Remove subscription tiers, add exclusivity selection
- **DiggerSubscription** - Transform into lead purchase/management page
- **Pricing** - Update to show exclusivity pricing instead of subscription tiers
- **Subscription** - Merge functionality or redirect to new lead purchase flow

---

## New Pricing Model Summary

**Key Changes:**
- ❌ **Remove:** Monthly subscription tiers (free/pro/premium)
- ❌ **Remove:** Volume-based tier pricing (1-10, 11-50, 51+)
- ✅ **Add:** Exclusivity-based pricing:
  - **Non-exclusive:** $0.50 per lead (Bark pricing)
  - **Exclusive-24h:** Google CPC × 2.5 per lead
- ✅ **Keep:** Escrow fees (8% min $10) - optional, only if consumer requests

---

## 1. DiggerRegistration.tsx Redesign

### Current Issues
- Shows subscription tier selection
- Displays tier-based pricing ($20/$10/$5)
- Includes pricing model selection (fixed/hourly/both)
- References volume-based tiers

### Proposed Redesign

#### Step 1: Basic Information (Keep as-is)
- Business name, location, contact info
- No changes needed

#### Step 2: Services & Pricing (REDESIGN)

**Remove:**
- Subscription tier selection
- Pricing model radio buttons (fixed/hourly/both)
- Tier-based pricing displays

**Add:**
- **Exclusivity Preference Selection**
  - Default exclusivity choice for all leads
  - Can be changed per profession later

```tsx
<div className="space-y-4">
  <Label className="text-base font-semibold">Default Lead Exclusivity *</Label>
  <p className="text-sm text-muted-foreground mb-3">
    Choose your default exclusivity preference. You can customize this per profession.
  </p>
  
  <RadioGroup value={defaultExclusivity} onValueChange={setDefaultExclusivity}>
    <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <RadioGroupItem value="non-exclusive" id="non-exclusive" className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Label htmlFor="non-exclusive" className="font-semibold cursor-pointer">
            Non-Exclusive Leads
          </Label>
          <Badge variant="outline" className="text-xs">Bark Pricing</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-semibold text-foreground">$0.50 per lead</span>
          <br />
          Leads are shared with other professionals. Lower cost, higher competition.
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          ✓ Best for: High-volume, competitive markets
          <br />
          ✓ Similar to Bark.com pricing model
        </div>
      </div>
    </div>

    <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors">
      <RadioGroupItem value="exclusive-24h" id="exclusive-24h" className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Label htmlFor="exclusive-24h" className="font-semibold cursor-pointer">
            Exclusive 24-Hour Leads
          </Label>
          <Badge className="text-xs bg-primary">Recommended</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-semibold text-foreground">
            Google CPC × 2.5 per lead
          </span>
          <br />
          You're the only professional who receives this lead for 24 hours.
        </p>
        <div className="mt-2 text-xs text-muted-foreground">
          ✓ Best for: Quality over quantity
          <br />
          ✓ No competition for 24 hours
          <br />
          ✓ Higher conversion rates
        </div>
      </div>
    </div>
  </RadioGroup>
</div>
```

#### Step 3: Professions (UPDATE)

**Update ProfessionKeywordInputWithCart:**
- Add exclusivity toggle per profession
- Show pricing based on exclusivity choice
- Remove tier-based pricing display

**New Display:**
```tsx
{professions.map((prof) => {
  const nonExclusivePrice = 0.50;
  const exclusivePrice = (prof.cpl.exclusive24h || calculateExclusivePrice(prof.keyword));
  
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-semibold">{prof.keyword}</span>
          <Badge variant="outline" className="ml-2">{prof.valueIndicator}</Badge>
        </div>
      </div>
      
      {/* Exclusivity Selection */}
      <RadioGroup 
        value={prof.exclusivity || defaultExclusivity}
        onValueChange={(value) => updateProfessionExclusivity(prof.keyword, value)}
        className="mb-3"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="non-exclusive" id={`${prof.keyword}-non-exclusive`} />
          <Label htmlFor={`${prof.keyword}-non-exclusive`} className="font-normal">
            Non-Exclusive: <span className="font-semibold">${nonExclusivePrice.toFixed(2)}/lead</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="exclusive-24h" id={`${prof.keyword}-exclusive-24h`} />
          <Label htmlFor={`${prof.keyword}-exclusive-24h`} className="font-normal">
            Exclusive-24h: <span className="font-semibold">${exclusivePrice.toFixed(2)}/lead</span>
          </Label>
        </div>
      </RadioGroup>
      
      {/* Quantity Input */}
      <div className="flex items-center gap-3">
        <Label className="text-sm">Monthly Lead Quantity:</Label>
        <Input
          type="number"
          min="0"
          value={prof.quantity || 0}
          onChange={(e) => updateQuantity(prof.keyword, parseInt(e.target.value) || 0)}
          className="w-24"
        />
      </div>
      
      {/* Cost Display */}
      {prof.quantity > 0 && (
        <div className="mt-2 text-sm">
          <span className="font-semibold">
            ${((prof.exclusivity === 'non-exclusive' ? nonExclusivePrice : exclusivePrice) * prof.quantity).toFixed(2)}
          </span>
          <span className="text-muted-foreground ml-1">
            /month ({prof.quantity} leads × ${prof.exclusivity === 'non-exclusive' ? nonExclusivePrice : exclusivePrice}/lead)
          </span>
        </div>
      )}
    </div>
  );
})}
```

#### Step 4: Summary (UPDATE)

**Remove:**
- Subscription tier selection
- Tier-based pricing summary

**Add:**
- Total monthly cost by exclusivity type
- Breakdown by profession
- Clear pricing explanation

```tsx
<div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl">
  <h3 className="text-lg font-bold mb-4">Monthly Lead Cost Summary</h3>
  
  <div className="space-y-2 mb-4">
    {professions.filter(p => (p.quantity || 0) > 0).map(prof => (
      <div key={prof.keyword} className="flex justify-between text-sm">
        <span>{prof.keyword} ({prof.quantity} leads, {prof.exclusivity === 'non-exclusive' ? 'Non-Exclusive' : 'Exclusive-24h'}):</span>
        <span className="font-semibold">
          ${calculateProfessionCost(prof).toFixed(2)}
        </span>
      </div>
    ))}
  </div>
  
  <div className="border-t pt-4">
    <div className="flex justify-between items-center">
      <span className="text-lg font-bold">Total Monthly Cost:</span>
      <span className="text-2xl font-bold text-primary">
        ${totalMonthlyCost.toFixed(2)}
      </span>
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      Pay only for leads you purchase. No monthly subscription fees.
    </p>
  </div>
</div>
```

---

## 2. DiggerSubscription.tsx → LeadPurchase.tsx Redesign

### Current Purpose
- Subscription tier management
- Monthly subscription checkout

### New Purpose
- **Lead Purchase & Management Dashboard**
- View purchased leads
- Purchase additional leads
- Manage exclusivity preferences

### Proposed Structure

```tsx
export default function LeadPurchase() {
  const [activeTab, setActiveTab] = useState<'purchase' | 'history' | 'settings'>('purchase');
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Lead Purchase & Management</h1>
        <p className="text-muted-foreground mb-8">
          Purchase leads and manage your exclusivity preferences
        </p>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="purchase">Purchase Leads</TabsTrigger>
            <TabsTrigger value="history">Purchase History</TabsTrigger>
            <TabsTrigger value="settings">Exclusivity Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="purchase">
            {/* Use ProfessionKeywordInputWithCart component */}
            <ProfessionKeywordInputWithCart
              professions={professions}
              onProfessionsChange={setProfessions}
              userId={user?.id}
              companyName={profile?.business_name}
            />
          </TabsContent>
          
          <TabsContent value="history">
            {/* Show lead purchase history */}
            <LeadPurchaseHistory />
          </TabsContent>
          
          <TabsContent value="settings">
            {/* Manage default exclusivity preferences */}
            <ExclusivitySettings />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
}
```

---

## 3. Pricing.tsx Redesign

### Current Issues
- Shows subscription tiers (free/pro/premium)
- Displays monthly subscription prices
- Volume-based tier pricing
- Complex tier comparison

### Proposed Redesign

#### New Structure: Exclusivity-Based Pricing Comparison

```tsx
export default function Pricing() {
  const [selectedProfession, setSelectedProfession] = useState<string>("plumber");
  const [exclusivity, setExclusivity] = useState<'non-exclusive' | 'exclusive-24h'>('exclusive-24h');
  
  const cpcData = lookupCPC(selectedProfession);
  const baseCPC = cpcData?.estimatedCPC || 15;
  
  const nonExclusivePrice = 0.50;
  const exclusivePrice = baseCPC * 2.5;
  
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pay only for the leads you purchase. No monthly subscriptions, no hidden fees.
          </p>
        </div>
      </section>
      
      {/* Pricing Comparison */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Choose Your Lead Type</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Non-Exclusive Card */}
              <Card className="relative">
                <CardHeader>
                  <CardTitle className="text-2xl">Non-Exclusive Leads</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">$0.50</span>
                    <span className="text-muted-foreground">/lead</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>Bark.com pricing model</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>Shared with other professionals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>Best for high-volume markets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>Lower cost, higher competition</span>
                    </li>
                  </ul>
                  
                  <div className="p-4 bg-muted rounded-lg mb-4">
                    <p className="text-sm font-semibold mb-1">Example:</p>
                    <p className="text-sm text-muted-foreground">
                      100 leads/month = <span className="font-bold">$50/month</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Exclusive-24h Card */}
              <Card className="relative border-2 border-primary">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Recommended
                </Badge>
                <CardHeader>
                  <CardTitle className="text-2xl">Exclusive 24-Hour Leads</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">
                      ${exclusivePrice.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">/lead</span>
                    <br />
                    <span className="text-sm">(Google CPC × 2.5)</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>You're the only professional for 24 hours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>No competition during exclusivity period</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>Higher conversion rates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span>Pricing varies by profession (CPC-based)</span>
                    </li>
                  </ul>
                  
                  <div className="p-4 bg-primary/10 rounded-lg mb-4">
                    <p className="text-sm font-semibold mb-1">Example ({selectedProfession}):</p>
                    <p className="text-sm text-muted-foreground">
                      10 leads/month = <span className="font-bold">${(exclusivePrice * 10).toFixed(2)}/month</span>
                      <br />
                      <span className="text-xs">(Based on ${baseCPC} Google CPC)</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Profession Selector */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>See Pricing for Your Profession</CardTitle>
                <CardDescription>
                  Exclusive-24h pricing varies by profession based on Google AdWords CPC
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedProfession} onValueChange={setSelectedProfession}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select profession" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllIndustries().map(prof => (
                      <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {cpcData && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Google CPC:</span>
                        <span className="font-semibold ml-2">${baseCPC}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Exclusive-24h Price:</span>
                        <span className="font-semibold ml-2">${exclusivePrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Pricing Calculator */}
            <Card>
              <CardHeader>
                <CardTitle>Calculate Your Monthly Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Number of Leads per Month</Label>
                    <Input
                      type="number"
                      min="1"
                      value={leadQuantity}
                      onChange={(e) => setLeadQuantity(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div>
                    <Label>Exclusivity Type</Label>
                    <RadioGroup value={exclusivity} onValueChange={setExclusivity}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non-exclusive" id="calc-non-exclusive" />
                        <Label htmlFor="calc-non-exclusive">Non-Exclusive ($0.50/lead)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="exclusive-24h" id="calc-exclusive-24h" />
                        <Label htmlFor="calc-exclusive-24h">Exclusive-24h (${exclusivePrice.toFixed(2)}/lead)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="p-6 bg-primary/10 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Estimated Monthly Cost</p>
                      <p className="text-4xl font-bold text-primary">
                        ${(exclusivity === 'non-exclusive' 
                          ? nonExclusivePrice * leadQuantity 
                          : exclusivePrice * leadQuantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Comparison with Competitors */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <CompetitorCostComparison />
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
```

---

## 4. Subscription.tsx Redesign

### Option A: Redirect to Lead Purchase
Since there are no monthly subscriptions, redirect users to the lead purchase page:

```tsx
export default function Subscription() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to lead purchase page
    navigate('/lead-purchase', { replace: true });
  }, [navigate]);
  
  return null;
}
```

### Option B: Merge with Lead Purchase
Combine functionality into a single "Lead Management" page that handles both purchasing and viewing subscription history (if any legacy subscriptions exist).

---

## Implementation Checklist

### Phase 1: Data Structure Updates
- [ ] Update `Profession` interface to include `exclusivity` field
- [ ] Update pricing calculation functions to support exclusivity
- [ ] Create exclusivity pricing constants
- [ ] Update database schema if needed (add exclusivity field to lead_purchases)

### Phase 2: Component Updates
- [ ] Update `ProfessionKeywordInputWithCart` with exclusivity toggle
- [ ] Update `ProfessionKeywordInput` with exclusivity selection
- [ ] Create `ExclusivitySettings` component
- [ ] Create `LeadPurchaseHistory` component

### Phase 3: Page Redesigns
- [ ] Redesign `DiggerRegistration.tsx`
  - Remove subscription tier selection
  - Add exclusivity preference selection
  - Update profession selection with exclusivity
- [ ] Transform `DiggerSubscription.tsx` → `LeadPurchase.tsx`
  - Remove subscription management
  - Add lead purchase interface
  - Add purchase history
- [ ] Redesign `Pricing.tsx`
  - Remove tier-based pricing
  - Add exclusivity comparison
  - Add profession-based pricing calculator
- [ ] Update `Subscription.tsx`
  - Redirect or merge functionality

### Phase 4: Backend Updates
- [ ] Update `create-lead-purchase-checkout` to accept exclusivity parameter
- [ ] Update `create-bulk-lead-purchase` to handle exclusivity
- [ ] Update `calculate-lead-price` to use exclusivity pricing
- [ ] Remove subscription-related edge functions (or mark as deprecated)

### Phase 5: Testing
- [ ] Test exclusivity selection in registration
- [ ] Test lead purchase with exclusivity
- [ ] Test pricing calculations
- [ ] Test cart functionality with exclusivity
- [ ] Verify backend receives exclusivity parameter

---

## Key Design Principles

1. **Simplicity:** Remove complex tier systems, focus on two clear options
2. **Transparency:** Show exact pricing upfront, no hidden fees
3. **Flexibility:** Allow per-profession exclusivity selection
4. **Value Communication:** Clearly explain benefits of exclusive vs non-exclusive
5. **No Lock-in:** Pay per lead, no monthly commitments

---

## Migration Strategy

1. **Phase 1:** Implement new pages alongside old ones (feature flag)
2. **Phase 2:** Redirect old pages to new pages with migration message
3. **Phase 3:** Remove old subscription code after migration period
4. **Phase 4:** Update all references and documentation

---

## User Experience Flow

### New User Registration:
1. Sign up → Basic info
2. Select default exclusivity preference
3. Add professions with exclusivity per profession
4. See total monthly cost estimate
5. Complete registration
6. Purchase leads as needed

### Existing User:
1. Navigate to Lead Purchase page
2. View current lead purchases
3. Purchase additional leads with exclusivity choice
4. Manage exclusivity preferences per profession

---

## Success Metrics

- User understanding of exclusivity options
- Conversion rate on lead purchases
- Average exclusivity preference selection
- User satisfaction with simplified pricing


