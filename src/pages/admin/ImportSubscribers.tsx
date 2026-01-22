import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportResult {
  total: number;
  inserted: number;
  duplicates: number;
  errors: string[];
}

interface ParsedRow {
  email: string;
  full_name?: string;
  phone?: string;
}

export default function ImportSubscribers() {
  const [csvContent, setCsvContent] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [source, setSource] = useState("facebook_lead");

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    // Parse header
    const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
    
    // Find column indices
    const emailIdx = header.findIndex(h => h.includes("email"));
    const nameIdx = header.findIndex(h => h.includes("name") || h.includes("full"));
    const phoneIdx = header.findIndex(h => h.includes("phone") || h.includes("tel"));

    if (emailIdx === -1) {
      throw new Error("CSV must have an 'email' column");
    }

    const rows: ParsedRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted values)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const email = values[emailIdx]?.toLowerCase().trim();
      if (!email || !email.includes("@")) continue;

      rows.push({
        email,
        full_name: nameIdx >= 0 ? values[nameIdx]?.trim() : undefined,
        phone: phoneIdx >= 0 ? values[phoneIdx]?.trim() : undefined,
      });
    }

    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      toast.error("Please upload or paste CSV content");
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const rows = parseCSV(csvContent);
      
      if (rows.length === 0) {
        toast.error("No valid rows found in CSV");
        setIsImporting(false);
        return;
      }

      const importResult: ImportResult = {
        total: rows.length,
        inserted: 0,
        duplicates: 0,
        errors: [],
      };

      // Import in batches of 50
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        const insertData = batch.map(row => ({
          email: row.email,
          full_name: row.full_name || null,
          phone: row.phone || null,
          source,
        }));

        const { data, error } = await supabase
          .from("subscribers")
          .upsert(insertData, { 
            onConflict: "email",
            ignoreDuplicates: true 
          })
          .select("id");

        if (error) {
          importResult.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          importResult.inserted += data?.length || 0;
        }
      }

      importResult.duplicates = importResult.total - importResult.inserted - importResult.errors.length;
      setResult(importResult);

      if (importResult.inserted > 0) {
        toast.success(`Imported ${importResult.inserted} subscribers`);
      } else if (importResult.duplicates === importResult.total) {
        toast.info("All emails were already subscribed");
      }

    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Failed to import");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Facebook Lead Ads Subscribers
            </CardTitle>
            <CardDescription>
              Upload a CSV file exported from Facebook Lead Ads to add subscribers. 
              They'll start receiving lead emails immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Source Selection */}
            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="facebook_lead">Facebook Lead Ads</option>
                <option value="reddit">Reddit</option>
                <option value="manual">Manual Entry</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  CSV should have columns: email, name (optional), phone (optional)
                </p>
              </div>
            </div>

            {/* Or Paste */}
            <div className="space-y-2">
              <Label htmlFor="csvContent">Or Paste CSV Content</Label>
              <Textarea
                id="csvContent"
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  setResult(null);
                }}
                placeholder="email,name,phone&#10;john@example.com,John Doe,555-1234&#10;jane@example.com,Jane Smith,555-5678"
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Import Button */}
            <Button 
              onClick={handleImport} 
              disabled={isImporting || !csvContent.trim()}
              className="w-full"
            >
              {isImporting ? "Importing..." : "Import Subscribers"}
            </Button>

            {/* Results */}
            {result && (
              <Alert variant={result.errors.length > 0 ? "destructive" : "default"}>
                {result.errors.length > 0 ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Total rows:</strong> {result.total}</p>
                    <p><strong>Imported:</strong> {result.inserted}</p>
                    <p><strong>Already subscribed:</strong> {result.duplicates}</p>
                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <strong>Errors:</strong>
                        <ul className="list-disc list-inside text-sm">
                          {result.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
              <h4 className="font-semibold">How to export from Facebook Lead Ads:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to Facebook Ads Manager → Forms Library</li>
                <li>Find your Lead Form and click "Download"</li>
                <li>Select date range and download as CSV</li>
                <li>Upload the CSV file above</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}