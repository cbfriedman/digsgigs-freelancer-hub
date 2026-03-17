import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, GripVertical, User, Mail, Phone, Calendar, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PipelineLead {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
  stage: PipelineStage;
  // Enriched data
  converted_to_digger_id: string | null;
  digger_profile?: {
    business_name: string;
    registration_status: string | null;
    subscription_status: string | null;
    profession: string | null;
  } | null;
  cold_lead?: {
    status: string;
    lead_type: string;
    industry: string | null;
    sequence_step: number;
  } | null;
}

type PipelineStage = 
  | "new_lead"
  | "contacted"
  | "engaged"
  | "converted"
  | "active_subscriber"
  | "churned";

const STAGES: { id: PipelineStage; label: string; color: string; description: string }[] = [
  { id: "new_lead", label: "New Lead", color: "bg-blue-500/10 border-blue-500/30", description: "Just captured" },
  { id: "contacted", label: "Contacted", color: "bg-yellow-500/10 border-yellow-500/30", description: "Email/SMS sent" },
  { id: "engaged", label: "Engaged", color: "bg-orange-500/10 border-orange-500/30", description: "Opened/clicked" },
  { id: "converted", label: "Converted", color: "bg-green-500/10 border-green-500/30", description: "Signed up" },
  { id: "active_subscriber", label: "Active Sub", color: "bg-primary/10 border-primary/30", description: "Paying customer" },
  { id: "churned", label: "Churned", color: "bg-destructive/10 border-destructive/30", description: "Unsubscribed/lapsed" },
];

function determineStage(lead: any): PipelineStage {
  // Check if converted to digger with active subscription
  if (lead.converted_to_digger_id && lead.digger_profile?.subscription_status === 'active') {
    return "active_subscriber";
  }
  // Check if converted to digger
  if (lead.converted_to_digger_id) {
    return "converted";
  }
  // Check if unsubscribed
  if (lead.unsubscribed) {
    return "churned";
  }
  // Check cold email sequence status
  if (lead.cold_lead) {
    if (lead.cold_lead.status === 'unsubscribed') return "churned";
    if (lead.cold_lead.status === 'converted') return "converted";
    if (lead.cold_lead.sequence_step >= 2) return "engaged";
    if (lead.cold_lead.sequence_step >= 1) return "contacted";
  }
  return "new_lead";
}

const sourceLabel = (source: string | null, utm: string | null) => {
  if (utm) return utm;
  if (source === 'facebook_lead_ad') return 'Facebook Ad';
  if (source === 'csv_import') return 'CSV Import';
  if (source === 'website') return 'Website';
  if (source === 'cold_outreach') return 'Cold Outreach';
  return source || 'Direct';
};

const LeadCard = ({ 
  lead, 
  onMoveStage 
}: { 
  lead: PipelineLead; 
  onMoveStage: (leadId: string, newStage: PipelineStage) => void;
}) => {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        dragging ? "opacity-50 scale-95" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-sm truncate">
            {lead.full_name || lead.email.split('@')[0]}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] flex-shrink-0">
          {sourceLabel(lead.source, lead.utm_source)}
        </Badge>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          <span className="truncate">{lead.email}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(lead.created_at), "MMM d, yyyy")}</span>
        </div>
      </div>

      {lead.digger_profile && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs">
            <User className="h-3 w-3 text-primary" />
            <span className="font-medium text-primary truncate">
              {lead.digger_profile.business_name}
            </span>
          </div>
          {lead.digger_profile.profession && (
            <span className="text-[10px] text-muted-foreground ml-4.5">
              {lead.digger_profile.profession}
            </span>
          )}
        </div>
      )}

      {lead.cold_lead && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {lead.cold_lead.lead_type}
            </Badge>
            {lead.cold_lead.industry && (
              <span className="text-[10px] text-muted-foreground capitalize">
                {lead.cold_lead.industry}
              </span>
            )}
            <div className="flex gap-0.5 ml-auto">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`w-1.5 h-1.5 rounded-full ${
                    s <= lead.cold_lead!.sequence_step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PipelineColumn = ({ 
  stage, 
  leads, 
  onMoveStage 
}: { 
  stage: typeof STAGES[number]; 
  leads: PipelineLead[]; 
  onMoveStage: (leadId: string, newStage: PipelineStage) => void;
}) => {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col min-w-[260px] max-w-[300px] rounded-xl border-2 transition-colors ${
        dragOver ? "border-primary bg-primary/5" : stage.color
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const leadId = e.dataTransfer.getData("text/plain");
        if (leadId) {
          onMoveStage(leadId, stage.id);
        }
      }}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{stage.label}</h3>
          <Badge variant="secondary" className="text-xs">
            {leads.length}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{stage.description}</p>
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[120px]">
        {leads.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            Drop leads here
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onMoveStage={onMoveStage} />
          ))
        )}
      </div>
    </div>
  );
};

export default function LeadPipelineTab() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      // Load subscribers (main lead source)
      const { data: subscribers, error: subError } = await supabase
        .from("subscribers")
        .select(`
          id, email, full_name, phone, source, utm_source, utm_campaign,
          created_at, unsubscribed, converted_to_digger_id
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (subError) throw subError;

      // Load cold email leads
      const { data: coldLeads, error: coldError } = await supabase
        .from("cold_email_leads")
        .select(`
          id, email, first_name, last_name, lead_type, industry, status, source, created_at,
          cold_email_sequence(current_step, opened, clicked, converted)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (coldError) throw coldError;

      // Get digger profile data for converted subscribers
      const convertedIds = (subscribers || [])
        .filter(s => s.converted_to_digger_id)
        .map(s => s.converted_to_digger_id!);

      let diggerProfiles: Record<string, any> = {};
      if (convertedIds.length > 0) {
        const { data: profiles } = await supabase
          .from("digger_profiles")
          .select("id, business_name, registration_status, subscription_status, profession")
          .in("id", convertedIds);

        if (profiles) {
          diggerProfiles = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }

      // Merge cold leads into subscriber-based pipeline
      const coldLeadEmails = new Set((coldLeads || []).map(cl => cl.email));
      const subscriberEmails = new Set((subscribers || []).map(s => s.email));

      const allLeads: PipelineLead[] = [];

      // Process subscribers
      for (const sub of (subscribers || [])) {
        const coldMatch = (coldLeads || []).find(cl => cl.email === sub.email);
        const lead: PipelineLead = {
          id: sub.id,
          email: sub.email,
          full_name: sub.full_name,
          phone: sub.phone,
          source: sub.source,
          utm_source: sub.utm_source,
          utm_campaign: sub.utm_campaign,
          created_at: sub.created_at || new Date().toISOString(),
          stage: "new_lead",
          converted_to_digger_id: sub.converted_to_digger_id,
          digger_profile: sub.converted_to_digger_id 
            ? diggerProfiles[sub.converted_to_digger_id] || null 
            : null,
          cold_lead: coldMatch ? {
            status: coldMatch.status,
            lead_type: coldMatch.lead_type,
            industry: coldMatch.industry,
            sequence_step: (coldMatch as any).cold_email_sequence?.[0]?.current_step || 0,
          } : null,
        };
        lead.stage = determineStage({ ...lead, unsubscribed: sub.unsubscribed });
        allLeads.push(lead);
      }

      // Add cold leads not in subscribers
      for (const cl of (coldLeads || [])) {
        if (!subscriberEmails.has(cl.email)) {
          const lead: PipelineLead = {
            id: cl.id,
            email: cl.email,
            full_name: [cl.first_name, cl.last_name].filter(Boolean).join(' ') || null,
            phone: null,
            source: 'cold_outreach',
            utm_source: null,
            utm_campaign: null,
            created_at: cl.created_at,
            stage: "new_lead",
            converted_to_digger_id: null,
            digger_profile: null,
            cold_lead: {
              status: cl.status,
              lead_type: cl.lead_type,
              industry: cl.industry,
              sequence_step: (cl as any).cold_email_sequence?.[0]?.current_step || 0,
            },
          };
          lead.stage = determineStage({ ...lead, unsubscribed: false });
          allLeads.push(lead);
        }
      }

      setLeads(allLeads);
    } catch (error) {
      console.error("Error loading pipeline:", error);
      toast.error("Failed to load pipeline data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleMoveStage = (leadId: string, newStage: PipelineStage) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
    toast.success(`Lead moved to ${STAGES.find(s => s.id === newStage)?.label}`);
  };

  const filteredLeads = sourceFilter === "all" 
    ? leads 
    : leads.filter(l => {
        if (sourceFilter === "facebook") return l.source === 'facebook_lead_ad' || l.utm_source === 'facebook';
        if (sourceFilter === "cold") return l.source === 'cold_outreach' || l.source === 'csv_import';
        if (sourceFilter === "organic") return !l.source || l.source === 'website';
        return true;
      });

  const stageCounts = STAGES.map(s => ({
    ...s,
    count: filteredLeads.filter(l => l.stage === s.id).length,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lead Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            {leads.length} total leads across all stages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="facebook">Facebook Ads</SelectItem>
              <SelectItem value="cold">Cold Outreach</SelectItem>
              <SelectItem value="organic">Organic / Website</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadLeads} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-6 gap-2">
        {stageCounts.map(s => (
          <Card key={s.id} className={`${s.color} border`}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion funnel summary */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm">
            {stageCounts.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="font-medium">{s.count}</span>
                <span className="text-muted-foreground text-xs">{s.label}</span>
                {i < stageCounts.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
            {stageCounts[0].count > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                Conv. rate: {((stageCounts[3].count + stageCounts[4].count) / stageCounts[0].count * 100 || 0).toFixed(1)}%
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={filteredLeads.filter(l => l.stage === stage.id)}
              onMoveStage={handleMoveStage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
