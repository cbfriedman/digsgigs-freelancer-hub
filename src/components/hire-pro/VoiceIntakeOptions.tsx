import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Phone, 
  PhoneOutgoing,
  ArrowRight,
  Loader2
} from "lucide-react";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoiceIntakeOptionsProps {
  displayPhoneNumber?: string;
}

export function VoiceIntakeOptions({ displayPhoneNumber = "(555) 123-DIGS" }: VoiceIntakeOptionsProps) {
  const navigate = useNavigate();
  const { trackButtonClick } = useGA4Tracking();
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackName, setCallbackName] = useState("");
  const [isRequestingCallback, setIsRequestingCallback] = useState(false);
  const [showCallbackForm, setShowCallbackForm] = useState(false);

  const handleFormClick = () => {
    trackButtonClick('Post Project Form', 'hire-a-pro-voice');
    navigate("/post-gig");
  };

  const handleRequestCallback = async () => {
    if (!callbackPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setIsRequestingCallback(true);
    trackButtonClick('Request Callback', 'hire-a-pro-voice');

    try {
      const { error } = await supabase.functions.invoke("request-ai-callback", {
        body: {
          phone: callbackPhone,
          name: callbackName || "Guest",
          source: "hire-a-pro-landing"
        }
      });

      if (error) throw error;

      toast.success("We'll call you within 5 minutes!", {
        description: "Our AI assistant will help you describe your project."
      });
      setShowCallbackForm(false);
      setCallbackPhone("");
      setCallbackName("");
    } catch (err) {
      console.error("Callback request error:", err);
      toast.error("Couldn't schedule callback. Please try again.");
    } finally {
      setIsRequestingCallback(false);
    }
  };

  const handlePhoneClick = () => {
    trackButtonClick('Call Phone Number', 'hire-a-pro-voice');
    window.location.href = `tel:${displayPhoneNumber.replace(/\D/g, '')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="font-display text-xl font-semibold mb-2">How would you like to share your project?</h3>
        <p className="text-muted-foreground">Choose the option that works best for you</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {/* Option 1: Fill Out Form */}
        <Card 
          className="group p-6 cursor-pointer border-2 border-border/50 hover:border-accent/50 hover:shadow-card-hover transition-all duration-300"
          onClick={handleFormClick}
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <FileText className="h-7 w-7 text-accent" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Fill Out Form</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Type your project details online with AI assistance
            </p>
            <Button variant="outline" size="sm" className="w-full group-hover:bg-accent group-hover:text-accent-foreground">
              Start Form
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Option 2: Request Callback */}
        <Card 
          className={`group p-6 border-2 transition-all duration-300 ${
            showCallbackForm ? 'border-primary/50 shadow-card-hover' : 'border-border/50 hover:border-primary/50 hover:shadow-card-hover cursor-pointer'
          }`}
          onClick={() => !showCallbackForm && setShowCallbackForm(true)}
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <PhoneOutgoing className="h-7 w-7 text-primary" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Request a Callback</h4>
            <p className="text-sm text-muted-foreground mb-4">
              We'll call you within 5 minutes
            </p>
            
            {showCallbackForm ? (
              <div className="space-y-3 text-left" onClick={(e) => e.stopPropagation()}>
                <div>
                  <Label htmlFor="callback-name" className="text-xs">Your Name</Label>
                  <Input
                    id="callback-name"
                    placeholder="John"
                    value={callbackName}
                    onChange={(e) => setCallbackName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="callback-phone" className="text-xs">Phone Number *</Label>
                  <Input
                    id="callback-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={callbackPhone}
                    onChange={(e) => setCallbackPhone(e.target.value)}
                    className="h-9"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCallbackForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-gradient-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestCallback();
                    }}
                    disabled={isRequestingCallback}
                  >
                    {isRequestingCallback ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Call Me</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                Get a Call
                <Phone className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Option 3: Call Us Directly */}
        <Card 
          className="group p-6 cursor-pointer border-2 border-border/50 hover:border-success/50 hover:shadow-card-hover transition-all duration-300"
          onClick={handlePhoneClick}
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Phone className="h-7 w-7 text-success" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Call Us Directly</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Speak to our AI assistant now
            </p>
            <div className="font-mono text-xl font-bold text-success group-hover:scale-105 transition-transform">
              {displayPhoneNumber}
            </div>
          </div>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Our AI assistant will help you describe your project in 2-3 minutes. Your info is never shared until you approve.
      </p>
    </div>
  );
}
