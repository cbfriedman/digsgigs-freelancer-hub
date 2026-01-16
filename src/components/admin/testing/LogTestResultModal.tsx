import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import type { TestResult } from "@/pages/admin/TestResultsDashboard";

interface LogTestResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: TestResult | null;
  environment: 'lovable_preview' | 'vercel_production';
  onSuccess: () => void;
}

export function LogTestResultModal({
  isOpen,
  onClose,
  test,
  environment,
  onSuccess,
}: LogTestResultModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('pending');
  const [notes, setNotes] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset form when test changes
  useState(() => {
    if (test) {
      setStatus(test.status);
      setNotes(test.notes || '');
      setScreenshotFile(null);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshotFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!test) return;

    // Validate - notes required for fail/blocked
    if ((status === 'fail' || status === 'blocked') && !notes.trim()) {
      toast({
        title: "Notes required",
        description: "Please provide notes explaining why the test failed or is blocked.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      let screenshotUrl = test.screenshot_url;

      // Upload screenshot if provided
      if (screenshotFile) {
        const fileName = `${environment}/${test.test_category}/${test.test_id}_${Date.now()}.${screenshotFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('test-screenshots')
          .upload(fileName, screenshotFile);

        if (uploadError) {
          throw uploadError;
        }

        screenshotUrl = fileName;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Update test result
      const { error } = await supabase
        .from('manual_test_results')
        .update({
          status,
          notes: notes.trim() || null,
          screenshot_url: screenshotUrl,
          tester_id: user?.id,
          tested_at: new Date().toISOString(),
        })
        .eq('id', test.id);

      if (error) throw error;

      toast({
        title: "Test result saved",
        description: `${test.test_id} - ${test.test_name} marked as ${status.toUpperCase()}`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error saving result",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!test) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Test Result</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Test Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-mono text-sm text-muted-foreground">{test.test_id}</p>
            <p className="font-medium">{test.test_name}</p>
            <p className="text-xs text-muted-foreground mt-1">{test.test_category}</p>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label>Result Status</Label>
            <RadioGroup value={status} onValueChange={setStatus} className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted">
                <RadioGroupItem value="pass" id="pass" />
                <Label htmlFor="pass" className="flex items-center gap-2 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Pass
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted">
                <RadioGroupItem value="fail" id="fail" />
                <Label htmlFor="fail" className="flex items-center gap-2 cursor-pointer">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Fail
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted">
                <RadioGroupItem value="blocked" id="blocked" />
                <Label htmlFor="blocked" className="flex items-center gap-2 cursor-pointer">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Blocked
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted">
                <RadioGroupItem value="pending" id="pending" />
                <Label htmlFor="pending" className="flex items-center gap-2 cursor-pointer">
                  <Clock className="h-4 w-4 text-gray-600" />
                  Reset
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes {(status === 'fail' || status === 'blocked') && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what happened, error messages, observations..."
              rows={4}
            />
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {screenshotFile ? screenshotFile.name : 'Upload Screenshot'}
              </Button>
            </div>
            {test.screenshot_url && !screenshotFile && (
              <p className="text-xs text-muted-foreground">Current: {test.screenshot_url}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
