import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { IdCard, Clock, Loader2, CheckCircle2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

type CountryRow = { id: string; code_alpha2: string; name: string };
type RegionRow = { id: string; name: string };

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const mime = file.type || "image/jpeg";
      resolve({ base64: dataUrl, mimeType: mime });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ID_TYPES = [
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "Passport" },
  { value: "state_id", label: "State ID" },
  { value: "green_card", label: "Green Card" },
  { value: "government_id", label: "Government ID" },
] as const;

export interface IdVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string | null;
  onSuccess?: () => void;
  /** Called when user closes the dialog after submitting (status pending_review). */
  onPendingReview?: () => void;
}

export function IdVerificationDialog({
  open,
  onOpenChange,
  userName,
  onSuccess,
  onPendingReview,
}: IdVerificationDialogProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"approved" | "pending_review" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [form, setForm] = useState({
    legalName: "",
    streetAddress: "",
    apt: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    idType: "" as string,
    frontFile: null as File | null,
    backFile: null as File | null,
  });
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("id, code_alpha2, name")
        .order("name");
      if (!error && data?.length) {
        setCountries(data as CountryRow[]);
        setForm((f) => {
          if (f.country) return f;
          const us = (data as CountryRow[]).find((c) => c.name === "United States");
          const defaultCountry = us?.name ?? (data as CountryRow[])[0]?.name ?? "";
          return { ...f, country: defaultCountry };
        });
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!form.country || !countries.length) {
      setRegions([]);
      return;
    }
    const countryId = countries.find((c) => c.name === form.country)?.id;
    if (!countryId) {
      setRegions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("id, name")
        .eq("country_id", countryId)
        .order("name");
      if (cancelled) return;
      if (!error && data?.length) setRegions(data as RegionRow[]);
      else setRegions([]);
    })();
    return () => { cancelled = true; };
  }, [form.country, countries]);

  const resetAndClose = () => {
    setStep(0);
    setVerificationStatus(null);
    setSubmitError(null);
    setForm({
      legalName: "",
      streetAddress: "",
      apt: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      idType: "",
      frontFile: null,
      backFile: null,
    });
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 0) resetAndClose();
    else setStep((s) => s - 1);
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!form.legalName.trim()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!form.city.trim() || !form.zip.trim() || !form.country.trim()) return;
      if (regions.length > 0 && !form.state.trim()) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!form.idType || !form.frontFile) return;
      setSubmitting(true);
      setSubmitError(null);
      (async () => {
        try {
          const [frontData, backData] = await Promise.all([
            fileToBase64(form.frontFile!),
            form.backFile ? fileToBase64(form.backFile) : Promise.resolve(null),
          ]);
          let extractedTextFront = "";
          let extractedTextBack = "";
          try {
            const Tesseract = await import("tesseract.js");
            if (form.frontFile?.type?.startsWith("image/")) {
              const r = await Tesseract.recognize(form.frontFile, "eng", { logger: () => {} });
              extractedTextFront = r.data.text || "";
            }
            if (form.backFile?.type?.startsWith("image/")) {
              const r = await Tesseract.recognize(form.backFile, "eng", { logger: () => {} });
              extractedTextBack = r.data.text || "";
            }
          } catch {
            // OCR failed; submission will go to pending_review
          }
          const body = {
            legalName: form.legalName.trim(),
            streetAddress: form.streetAddress.trim(),
            apt: form.apt?.trim() || null,
            city: form.city.trim(),
            state: form.state.trim(),
            zip: form.zip.trim(),
            country: form.country.trim(),
            idType: form.idType,
            frontFileBase64: frontData.base64,
            backFileBase64: backData?.base64 ?? null,
            extractedTextFront: extractedTextFront.trim() || null,
            extractedTextBack: extractedTextBack.trim() || null,
            frontMimeType: frontData.mimeType,
            backMimeType: backData?.mimeType ?? null,
          };
          const data = await invokeEdgeFunction<{ submissionId: string; status: "approved" | "pending_review" }>(
            supabase,
            "submit-id-verification",
            { method: "POST", body }
          );
          setVerificationStatus(data.status);
          setStep(4);
        } catch (e) {
          setSubmitError(e instanceof Error ? e.message : "Verification request failed");
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }
  };

  const displayName = form.legalName.trim() || userName || "—";
  const displayAddress = [
    form.streetAddress,
    form.apt ? `Apt ${form.apt}` : null,
    [form.city, form.state, form.zip].filter(Boolean).join(", "),
    form.country,
  ]
    .filter(Boolean)
    .join(", ");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStep(0);
      setVerificationStatus(null);
      setSubmitError(null);
      setForm({
        legalName: "",
        streetAddress: "",
        apt: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        idType: "",
        frontFile: null,
        backFile: null,
      });
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => step === 0 && (e.preventDefault?.(), resetAndClose())}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg font-semibold">Verify your identity</DialogTitle>
          {step === 0 && (
            <DialogDescription asChild>
              <p className="text-sm text-muted-foreground mt-1">
                Hi {userName || "there"}, let&apos;s verify your identity so you can access all features on Digs & Gigs.
              </p>
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-5 py-2">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <IdCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">How you&apos;ll verify your identity</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Upload a government-issued photo ID that shows your <strong>name</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-medium text-sm">What you can expect</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Unless we find an issue with the information you provide, you&apos;ll be verified in about a minute.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The information you submit will be used to verify your identity. We may also use this information to
              protect against fraud and abuse and to improve our verification services. Your verified information will
              be stored securely, and documents you submit will be handled in accordance with our{" "}
              <Link to="/privacy-policy" className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">
                Privacy Notice
              </Link>.
            </p>
            <DialogFooter className="flex justify-end pt-2">
              <Button onClick={() => setStep(1)}>Get started</Button>
            </DialogFooter>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <h4 className="font-medium text-sm">Review and confirm your information</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure the information you enter here matches the information on the documents you&apos;re providing.
              </p>
            </div>
            <div>
              <Label htmlFor="id-legal-name">Enter your name</Label>
              <Input
                id="id-legal-name"
                value={form.legalName}
                onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                placeholder="Legal name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="id-street">Enter your address</Label>
              <Input
                id="id-street"
                value={form.streetAddress}
                onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))}
                placeholder="Street address"
                className="mt-1.5"
              />
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
              <Button type="button" variant="ghost" className="text-primary" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleNext} disabled={!form.legalName.trim()}>Next</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <Label>Country/region</Label>
              <Select
                value={form.country || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, country: v, state: "" }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {regions.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>State / Province / Region</Label>
                  <Select value={form.state || undefined} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={r.name}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="id-zip">Zip / Postal code</Label>
                  <Input
                    id="id-zip"
                    value={form.zip}
                    onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                    placeholder="Zip or postal code"
                    className="mt-1.5"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="id-state">State / Province / Region</Label>
                  <Input
                    id="id-state"
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    placeholder="Optional"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="id-zip">Zip / Postal code</Label>
                  <Input
                    id="id-zip"
                    value={form.zip}
                    onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                    placeholder="Zip or postal code"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="id-apt">Apt, suite, etc. (optional)</Label>
              <Input
                id="id-apt"
                value={form.apt}
                onChange={(e) => setForm((f) => ({ ...f, apt: e.target.value }))}
                placeholder="Optional"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="id-city">City</Label>
              <Input
                id="id-city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
                className="mt-1.5"
              />
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
              <Button type="button" variant="ghost" className="text-primary" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext} disabled={!form.city.trim() || !form.zip.trim() || !form.country.trim() || (regions.length > 0 && !form.state.trim())}>Next</Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div>
              <h4 className="font-medium text-sm">Provide an ID</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a document that contains the <strong>name</strong> you provided.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ID_TYPES.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={form.idType === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, idType: value }))}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">ID upload guidelines</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Provide both the front and back of your ID when applicable</li>
                <li>Make sure your ID is shown in color with all four corners clearly visible</li>
              </ul>
            </div>
            <div>
              <Label>Front of ID</Label>
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setForm((f) => ({ ...f, frontFile: e.target.files?.[0] ?? null }))}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full mt-1.5 gap-2"
                onClick={() => frontInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {form.frontFile ? form.frontFile.name : "Upload front"}
              </Button>
            </div>
            <div>
              <Label>Back of ID (optional for passport)</Label>
              <input
                ref={backInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setForm((f) => ({ ...f, backFile: e.target.files?.[0] ?? null }))}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full mt-1.5 gap-2"
                onClick={() => backInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {form.backFile ? form.backFile.name : "Upload back"}
              </Button>
            </div>
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
              <Button type="button" variant="ghost" className="text-primary" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext} disabled={!form.idType || !form.frontFile || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Next"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 4 && verificationStatus === "approved" && (
          <div className="space-y-5 py-2">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="font-semibold text-lg mt-3">Verification successful</h4>
              <p className="text-sm text-muted-foreground">Your information was verified successfully.</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{displayName}</span>
                <span className="rounded-md bg-green-600/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                  Verified
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{displayAddress}</p>
              <p className="text-xs text-muted-foreground">
                ID document: {form.frontFile?.name ?? "front"} {form.backFile?.name ? `• ${form.backFile.name}` : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Your profile and address have been updated. We&apos;ve sent you a confirmation email for your records.
            </p>
            <DialogFooter className="pt-2">
              <Button
                onClick={() => {
                  onSuccess?.();
                  resetAndClose();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 4 && verificationStatus === "pending_review" && (
          <div className="space-y-5 py-2">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-8 w-8" />
              </div>
              <h4 className="font-semibold text-lg mt-3">Under review</h4>
              <p className="text-sm text-muted-foreground">
                Your ID and details have been submitted. Our team will review them and update your account shortly.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{displayName}</span>
              </div>
              <p className="text-sm text-muted-foreground">{displayAddress}</p>
              <p className="text-xs text-muted-foreground">
                ID document: {form.frontFile?.name ?? "front"} {form.backFile?.name ? `• ${form.backFile.name}` : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              You will receive an email once the review is complete.
            </p>
            <DialogFooter className="pt-2">
              <Button
                onClick={() => {
                  onPendingReview?.();
                  resetAndClose();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
