import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Play, 
  Pause, 
  RefreshCw, 
  Mail, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TrendingUp,
  AlertCircle,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ColdLead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  lead_type: 'gigger' | 'digger';
  industry: string | null;
  source: string | null;
  status: string;
  created_at: string;
  sequence?: {
    current_step: number;
    last_sent_at: string | null;
    opened: boolean;
    clicked: boolean;
    converted: boolean;
  };
}

const INDUSTRY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'home-improvement', label: 'Home Improvement' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'medical', label: 'Medical / Healthcare' },
  { value: 'creative', label: 'Creative / Design' },
  { value: 'tech', label: 'Technology / IT' },
  { value: 'finance', label: 'Finance / Accounting' },
  { value: 'events', label: 'Events / Entertainment' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'education', label: 'Education / Tutoring' },
  { value: 'wellness', label: 'Wellness / Fitness' },
  { value: 'cleaning', label: 'Cleaning Services' },
  { value: 'landscaping', label: 'Landscaping / Lawn Care' },
];

interface Stats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  unsubscribed: number;
  converted: number;
}

export const ColdOutreachTab = () => {
  const [leads, setLeads] = useState<ColdLead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, active: 0, completed: 0, unsubscribed: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'gigger' | 'digger'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [previewingEmail, setPreviewingEmail] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{ subject: string; body: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLeads();
  }, [filterType, filterStatus, filterIndustry]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("cold_email_leads")
        .select(`
          *,
          cold_email_sequence(*)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('lead_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterIndustry !== 'all') {
        query = query.eq('industry', filterIndustry);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedLeads = (data || []).map((lead: any) => ({
        ...lead,
        sequence: lead.cold_email_sequence?.[0] || null,
      }));

      setLeads(formattedLeads);

      // Calculate stats
      const { data: allLeads } = await supabase
        .from("cold_email_leads")
        .select("status");

      if (allLeads) {
        setStats({
          total: allLeads.length,
          pending: allLeads.filter(l => l.status === 'pending').length,
          active: allLeads.filter(l => l.status === 'active').length,
          completed: allLeads.filter(l => l.status === 'completed').length,
          unsubscribed: allLeads.filter(l => l.status === 'unsubscribed').length,
          converted: allLeads.filter(l => l.status === 'converted').length,
        });
      }

    } catch (error) {
      console.error("Error loading leads:", error);
      toast.error("Failed to load cold leads");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error("CSV file is empty or has no data rows");
          return;
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const emailIndex = headers.findIndex(h => h === 'email');
        const firstNameIndex = headers.findIndex(h => h === 'first_name' || h === 'firstname');
        const lastNameIndex = headers.findIndex(h => h === 'last_name' || h === 'lastname');
        const typeIndex = headers.findIndex(h => h === 'type' || h === 'lead_type');
        const industryIndex = headers.findIndex(h => h === 'industry');

        if (emailIndex === -1) {
          toast.error("CSV must have an 'email' column");
          return;
        }

        const leadsToInsert: any[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const email = values[emailIndex];
          
          if (!email || !email.includes('@')) {
            errors.push(`Row ${i + 1}: Invalid email`);
            continue;
          }

          const leadType = typeIndex !== -1 ? values[typeIndex]?.toLowerCase() : 'gigger';
          if (leadType !== 'gigger' && leadType !== 'digger') {
            errors.push(`Row ${i + 1}: Invalid type (must be 'gigger' or 'digger')`);
            continue;
          }

          const industry = industryIndex !== -1 ? values[industryIndex]?.toLowerCase() || 'general' : 'general';
          
          leadsToInsert.push({
            email: email.toLowerCase(),
            first_name: firstNameIndex !== -1 ? values[firstNameIndex] || null : null,
            last_name: lastNameIndex !== -1 ? values[lastNameIndex] || null : null,
            lead_type: leadType,
            industry: industry,
            source: 'csv_import',
            status: 'pending',
          });
        }

        if (leadsToInsert.length === 0) {
          toast.error("No valid leads found in CSV");
          return;
        }

        // Insert leads (upsert to handle duplicates)
        const { data: insertedLeads, error: insertError } = await supabase
          .from("cold_email_leads")
          .upsert(leadsToInsert, { onConflict: 'email', ignoreDuplicates: true })
          .select();

        if (insertError) throw insertError;

        // Create sequence entries for new leads
        if (insertedLeads && insertedLeads.length > 0) {
          const sequenceEntries = insertedLeads.map(lead => ({
            lead_id: lead.id,
            current_step: 0,
          }));

          await supabase
            .from("cold_email_sequence")
            .upsert(sequenceEntries, { onConflict: 'lead_id', ignoreDuplicates: true });
        }

        toast.success(`Imported ${insertedLeads?.length || 0} leads`, {
          description: errors.length > 0 ? `${errors.length} rows had errors` : undefined,
        });

        loadLeads();

      } catch (error: any) {
        console.error("Error importing CSV:", error);
        toast.error("Failed to import CSV: " + error.message);
      }
    };

    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startCampaign = async (leadIds?: string[]) => {
    setProcessing(true);
    try {
      // If specific leads provided, update their status to pending and set next_send_at
      if (leadIds && leadIds.length > 0) {
        await supabase
          .from("cold_email_leads")
          .update({ status: 'pending' })
          .in("id", leadIds);

        await supabase
          .from("cold_email_sequence")
          .update({ next_send_at: new Date().toISOString() })
          .in("lead_id", leadIds);
      }

      // Trigger the sequence processor
      const { data, error } = await supabase.functions.invoke('process-cold-email-sequence', {
        body: {},
      });

      if (error) {
        console.error('Edge function error:', error);
        // Provide more helpful error messages
        if (error.message?.includes('Failed to send a request')) {
          throw new Error('Edge function may not be deployed. Please deploy the process-cold-email-sequence function to Supabase.');
        }
        throw error;
      }

      toast.success(`Campaign processed: ${data?.sent || 0} emails sent`, {
        description: data?.errors?.length > 0 ? `${data.errors.length} errors` : data?.skipped ? `${data.skipped} skipped` : undefined,
      });

      loadLeads();

    } catch (error: any) {
      console.error("Error starting campaign:", error);
      toast.error("Failed to start campaign: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      active: { variant: "default", label: "Active" },
      completed: { variant: "secondary", label: "Completed" },
      unsubscribed: { variant: "destructive", label: "Unsubscribed" },
      converted: { variant: "default", label: "Converted" },
      bounced: { variant: "destructive", label: "Bounced" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStepDisplay = (step: number) => {
    if (step === 0) return <span className="text-muted-foreground">Not started</span>;
    return (
      <div className="flex items-center gap-1">
        <span className="font-medium">{step}/4</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const downloadSampleCSV = () => {
    const csv = `email,first_name,last_name,type,industry
john@example.com,John,Doe,gigger,home-improvement
jane@example.com,Jane,Smith,digger,legal
bob@example.com,Bob,Johnson,gigger,medical
alice@example.com,Alice,Williams,digger,creative
mike@example.com,Mike,Brown,gigger,tech
sarah@example.com,Sarah,Davis,digger,finance`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cold_leads_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewEmailForLead = async (lead: ColdLead) => {
    setPreviewingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-cold-email', {
        body: {
          leadType: lead.lead_type,
          industry: lead.industry || 'general',
          firstName: lead.first_name || 'there',
          step: (lead.sequence?.current_step || 0) + 1,
          leadId: lead.id,
        },
      });

      if (error) throw error;

      setEmailPreview({
        subject: data.subject,
        body: data.body,
      });
      toast.success("Email preview generated!");
    } catch (error: any) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview: " + error.message);
    } finally {
      setPreviewingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold">{stats.converted}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unsubscribed</p>
                <p className="text-2xl font-bold">{stats.unsubscribed}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cold Outreach Campaign</CardTitle>
          <CardDescription>
            Import leads and manage your cold email sequences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
            <Button onClick={downloadSampleCSV} variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button 
              onClick={() => startCampaign()} 
              disabled={processing}
            >
              {processing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Process Sequence
            </Button>
            <Button onClick={loadLeads} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <div>
              <Label className="text-xs">Lead Type</Label>
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="gigger">Gigger</SelectItem>
                  <SelectItem value="digger">Digger</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Industry</Label>
              <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cold Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No cold leads yet</p>
              <p className="text-sm text-muted-foreground mt-1">Import a CSV to get started</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Last Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.email}</TableCell>
                      <TableCell>
                        {lead.first_name || lead.last_name 
                          ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.lead_type === 'gigger' ? 'secondary' : 'outline'}>
                          {lead.lead_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{lead.industry || 'general'}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>
                        {getStepDisplay(lead.sequence?.current_step || 0)}
                      </TableCell>
                      <TableCell>
                        {lead.sequence?.last_sent_at 
                          ? format(new Date(lead.sequence.last_sent_at), "MMM d, h:mm a")
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold">Cold Email Sequence</h3>
              <p className="text-sm text-muted-foreground">
                The cold email sequence sends 4 emails over 14 days: Day 0 (initial), Day 3 (social proof), 
                Day 7 (urgency), and Day 14 (final). The sequence automatically stops if a lead unsubscribes, 
                converts (signs up), or completes all 4 emails.
              </p>
              <div className="mt-4 p-3 bg-background border rounded-md">
                <p className="text-sm font-medium mb-2">CSV Format (with AI-powered industry personalization):</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  email, first_name, last_name, type (gigger/digger), industry
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Industries: general, home-improvement, legal, medical, creative, tech, finance, events, automotive, education, wellness, cleaning, landscaping
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
