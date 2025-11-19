import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getLeadCostForIndustry } from '@/config/pricing';

interface LeadPricingChartProps {
  selectedIndustries: string[];
}

export const LeadPricingChart = ({ selectedIndustries }: LeadPricingChartProps) => {
  if (selectedIndustries.length === 0) return null;

  // Get highest cost across selected industries for each tier
  const getHighestCost = (tier: 'free' | 'pro' | 'premium'): number => {
    return Math.max(...selectedIndustries.map(ind => getLeadCostForIndustry(ind, tier)));
  };

  const freeCost = getHighestCost('free');
  const proCost = getHighestCost('pro');
  const premiumCost = getHighestCost('premium');

  const data = [
    {
      tier: '1-10 Leads',
      name: 'Free',
      cost: freeCost,
      savings: 0,
      color: 'hsl(var(--chart-1))',
    },
    {
      tier: '11-50 Leads',
      name: 'Pro',
      cost: proCost,
      savings: Math.round(((freeCost - proCost) / freeCost) * 100),
      color: 'hsl(var(--chart-2))',
    },
    {
      tier: '51+ Leads',
      name: 'Premium',
      cost: premiumCost,
      savings: Math.round(((freeCost - premiumCost) / freeCost) * 100),
      color: 'hsl(var(--chart-3))',
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{data.tier}</p>
          <p className="text-sm">Cost per lead: <span className="font-bold text-primary">${data.cost}</span></p>
          {data.savings > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Save {data.savings}% vs standard rate
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="space-y-3">
        <div className="text-center">
          <h3 className="text-sm font-semibold">Volume Pricing Chart</h3>
          <p className="text-xs text-muted-foreground">Cost per lead decreases with volume commitment</p>
        </div>
        
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            <XAxis 
              dataKey="tier" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Cost per Lead ($)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex justify-center gap-4 text-xs">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">
                {item.name} {item.savings > 0 && `(-${item.savings}%)`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
