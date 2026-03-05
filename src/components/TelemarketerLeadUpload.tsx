import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface TelemarketerLeadUploadProps {
  telemarketerProfile: any;
}

export function TelemarketerLeadUpload({ telemarketerProfile }: TelemarketerLeadUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  
  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      location: "",
      budgetMin: "",
      budgetMax: "",
      timeline: "",
      contactPreferences: "email",
      leadSource: "telemarketing",
    },
  });

  const onSubmit = async (values: any) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create gig with telemarketer info
      const { data: gig, error: gigError } = await supabase
        .from("gigs")
        .insert({
          consumer_id: user.id,
          title: values.title,
          description: values.description,
          location: values.location,
          budget_min: parseFloat(values.budgetMin) || null,
          budget_max: parseFloat(values.budgetMax) || null,
          timeline: values.timeline,
          contact_preferences: values.contactPreferences,
          lead_source: values.leadSource,
          telemarketer_id: telemarketerProfile.id,
          uploaded_by_telemarketer: true,
          status: "open",
        })
        .select()
        .single();

      if (gigError) throw gigError;

      // Trigger AI matching for industry codes
      await supabase.functions.invoke("match-industry-codes", {
        body: { gigId: gig.id },
      });

      // Notify all diggers (in-app) and send email to admin-selected diggers
      supabase.functions.invoke("send-gig-email-by-settings", {
        body: { gigId: gig.id },
      }).catch((err) => console.error("Gig email by settings error:", err));

      toast({
        title: "Success",
        description: "Lead uploaded successfully and is being matched to diggers",
      });

      form.reset();
    } catch (error: any) {
      console.error("Error uploading lead:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload lead",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload New Lead</CardTitle>
        <CardDescription>
          Enter the lead details below. The system will automatically match it to the appropriate industry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Need Kitchen Remodel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide detailed information about the project..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="City, State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budgetMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Min ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budgetMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Max ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="10000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="timeline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeline</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Within 2 weeks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leadSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Source</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="telemarketing">Telemarketing</SelectItem>
                      <SelectItem value="internet">Internet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Lead"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
