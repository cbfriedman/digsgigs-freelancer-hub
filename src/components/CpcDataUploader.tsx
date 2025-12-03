import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, Copy, Check, AlertCircle, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedKeyword {
  keyword: string;
  cpc: number;
  searchVolume: number;
  competitionLevel: string;
}

interface IndustryData {
  industry: string;
  category: string;
  averageCpc: number;
  keywords: ParsedKeyword[];
}

export const CpcDataUploader = () => {
  const [parsedData, setParsedData] = useState<ParsedKeyword[]>([]);
  const [industryName, setIndustryName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; keywords: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): ParsedKeyword[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Find header line (Google exports have different formats)
    let headerIndex = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].toLowerCase().includes('keyword') || lines[i].toLowerCase().includes('search term')) {
        headerIndex = i;
        break;
      }
    }

    const headers = lines[headerIndex].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Find column indices
    const keywordIdx = headers.findIndex(h => h.includes('keyword') || h.includes('search term'));
    const cpcIdx = headers.findIndex(h => h.includes('cpc') || h.includes('cost') || h.includes('top of page bid'));
    const volumeIdx = headers.findIndex(h => h.includes('volume') || h.includes('avg. monthly'));
    const competitionIdx = headers.findIndex(h => h.includes('competition'));

    if (keywordIdx === -1) {
      toast.error("Could not find keyword column in CSV");
      return [];
    }

    const keywords: ParsedKeyword[] = [];
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
      // Handle CSV with quoted values
      const values = parseCSVLine(lines[i]);
      if (values.length <= keywordIdx) continue;

      const keyword = values[keywordIdx]?.trim().replace(/"/g, '');
      if (!keyword) continue;

      // Parse CPC (remove $ and handle ranges like "$10 - $50")
      let cpc = 0;
      if (cpcIdx !== -1 && values[cpcIdx]) {
        const cpcStr = values[cpcIdx].replace(/[$"]/g, '').trim();
        if (cpcStr.includes('-')) {
          // Take the high value for ranges
          const parts = cpcStr.split('-').map(p => parseFloat(p.trim()));
          cpc = Math.max(...parts.filter(p => !isNaN(p)));
        } else {
          cpc = parseFloat(cpcStr) || 0;
        }
      }

      // Parse search volume (handle "10K - 100K" format)
      let searchVolume = 0;
      if (volumeIdx !== -1 && values[volumeIdx]) {
        const volStr = values[volumeIdx].replace(/[",]/g, '').trim().toLowerCase();
        if (volStr.includes('k')) {
          const num = parseFloat(volStr.replace('k', ''));
          searchVolume = Math.round(num * 1000);
        } else if (volStr.includes('-')) {
          const parts = volStr.split('-').map(p => {
            const cleaned = p.trim().replace('k', '');
            const num = parseFloat(cleaned);
            return p.includes('k') ? num * 1000 : num;
          });
          searchVolume = Math.round((parts[0] + parts[1]) / 2);
        } else {
          searchVolume = parseInt(volStr) || 0;
        }
      }

      // Parse competition
      let competitionLevel = "medium";
      if (competitionIdx !== -1 && values[competitionIdx]) {
        const compStr = values[competitionIdx].toLowerCase().trim();
        if (compStr.includes('low')) competitionLevel = "low";
        else if (compStr.includes('high')) competitionLevel = "high";
      }

      if (cpc > 0) {
        keywords.push({
          keyword,
          cpc: Math.round(cpc * 100) / 100,
          searchVolume,
          competitionLevel
        });
      }
    }

    return keywords.sort((a, b) => b.cpc - a.cpc);
  };

  // Helper to parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const keywords = parseCSV(content);
      
      if (keywords.length === 0) {
        toast.error("No valid keywords found in CSV");
        return;
      }

      setParsedData(prev => [...prev, ...keywords]);
      setUploadedFiles(prev => [...prev, { name: file.name, keywords: keywords.length }]);
      toast.success(`Imported ${keywords.length} keywords from ${file.name}`);
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateTypeScriptCode = () => {
    if (!industryName || !categoryName) {
      toast.error("Please enter industry name and category");
      return;
    }

    if (parsedData.length === 0) {
      toast.error("No keywords to generate code for");
      return;
    }

    const avgCpc = Math.round(
      parsedData.reduce((sum, k) => sum + k.cpc, 0) / parsedData.length * 100
    ) / 100;

    const code = `  {
    industry: "${industryName}",
    category: "${categoryName}",
    averageCpc: ${avgCpc},
    keywords: [
${parsedData.map(k => `      { keyword: "${k.keyword}", cpc: ${k.cpc}, searchVolume: ${k.searchVolume}, competitionLevel: "${k.competitionLevel}" }`).join(',\n')}
    ]
  },`;

    setGeneratedCode(code);
    toast.success("Code generated! Copy it to googleCpcKeywords.ts");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${industryName.toLowerCase().replace(/\s+/g, '-')}-cpc-data.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setParsedData([]);
    setUploadedFiles([]);
    setGeneratedCode("");
    setIndustryName("");
    setCategoryName("");
  };

  const removeKeyword = (index: number) => {
    setParsedData(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>How to use this tool</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Export keyword data from Google Keyword Planner as CSV</li>
            <li>Upload the CSV file(s) below - you can upload multiple files</li>
            <li>Enter the industry name and category</li>
            <li>Generate the TypeScript code and copy it</li>
            <li>Paste the code into <code className="bg-muted px-1 rounded">src/config/googleCpcKeywords.ts</code></li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV Files
            </CardTitle>
            <CardDescription>
              Upload Google Keyword Planner exports (.csv)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files:</Label>
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{file.name}</span>
                    <Badge variant="secondary">{file.keywords} keywords</Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry Name *</Label>
                <Input
                  id="industry"
                  placeholder="e.g., Personal Injury Lawyers"
                  value={industryName}
                  onChange={(e) => setIndustryName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  placeholder="e.g., Legal Services"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={generateTypeScriptCode}
                disabled={parsedData.length === 0 || !industryName || !categoryName}
              >
                Generate Code
              </Button>
              <Button variant="outline" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Parsed Keywords ({parsedData.length})</CardTitle>
            <CardDescription>
              {parsedData.length > 0 && (
                <>
                  Avg CPC: ${(parsedData.reduce((sum, k) => sum + k.cpc, 0) / parsedData.length).toFixed(2)} | 
                  Highest: ${Math.max(...parsedData.map(k => k.cpc)).toFixed(2)}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parsedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Upload a CSV file to see keywords
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead>CPC</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 100).map((kw, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{kw.keyword}</TableCell>
                        <TableCell>${kw.cpc}</TableCell>
                        <TableCell>{kw.searchVolume.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeKeyword(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Showing first 100 of {parsedData.length} keywords
                  </p>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generated Code Section */}
      {generatedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated TypeScript Code</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCode}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Add this to the GOOGLE_CPC_KEYWORDS array in src/config/googleCpcKeywords.ts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {generatedCode}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
