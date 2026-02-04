import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Phone, 
  PhoneCall, 
  PhoneOutgoing,
  ArrowRight,
  CheckCircle2,
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
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

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

  const handleClickToCall = async () => {
    setIsInitiatingCall(true);
    trackButtonClick('Click to Call', 'hire-a-pro-voice');

    try {
      const { data, error } = await supabase.functions.invoke("initiate-browser-call", {
        body: { source: "hire-a-pro-landing" }
      });

      if (error) throw error;

      // If we get a web call URL, open it
      if (data?.callUrl) {
        window.open(data.callUrl, '_blank');
      } else {
        toast.info("Browser calling coming soon!", {
          description: "For now, please use the callback option or call us directly."
        });
      }
    } catch (err) {
      console.error("Click to call error:", err);
      toast.info("Browser calling coming soon!", {
        description: "For now, please use the callback option or call us directly."
      });
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const handlePhoneClick = () => {
    trackButtonClick('Call Phone Number', 'hire-a-pro-voice');
    window.location.href = `tel:${displayPhoneNumber.replace(/\D/g, '')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="font-display text-xl font-semibold mb-2">How would you like to share your project?</h3>
        <p className="text-muted-foreground">Choose the option that works best for you</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Option 1: Fill Out Form */}
        <Card 
          className="group p-5 cursor-pointer border-2 border-border/50 hover:border-accent/50 hover:shadow-card-hover transition-all duration-300"
          onClick={handleFormClick}
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6 text-accent" />
            </div>
            <h4 className="font-semibold mb-1">Fill Out Form</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Type your project details online
            </p>
            <Button variant="outline" size="sm" className="w-full group-hover:bg-accent group-hover:text-accent-foreground">
              Start Form
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Option 2: Request Callback */}
        <Card 
          className={`group p-5 border-2 transition-all duration-300 ${
            showCallbackForm ? 'border-primary/50 shadow-card-hover' : 'border-border/50 hover:border-primary/50 hover:shadow-card-hover cursor-pointer'
          }`}
          onClick={() => !showCallbackForm && setShowCallbackForm(true)}
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <PhoneOutgoing className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-1">Request a Callback</h4>
            <p className="text-sm text-muted-foreground mb-3">
              We'll call you in 5 minutes
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

        {/* Option 3: Click to Call (WebRTC) */}
        <Card 
          className="group p-5 cursor-pointer border-2 border-border/50 hover:border-success/50 hover:shadow-card-hover transition-all duration-300"
          onClick={handleClickToCall}
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <PhoneCall className="h-6 w-6 text-success" />
            </div>
            <h4 className="font-semibold mb-1">Call from Browser</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Talk now using your mic
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full group-hover:bg-success group-hover:text-success-foreground"
              disabled={isInitiatingCall}
            >
              {isInitiatingCall ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Start Call
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Option 4: Display Phone Number */}
        <Card 
          className="group p-5 cursor-pointer border-2 border-border/50 hover:border-warning/50 hover:shadow-card-hover transition-all duration-300"
          onClick={handlePhoneClick}
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Phone className="h-6 w-6 text-warning" />
            </div>
            <h4 className="font-semibold mb-1">Call Us Directly</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Speak to our AI assistant
            </p>
            <div className="font-mono text-lg font-bold text-warning group-hover:scale-105 transition-transform">
              {displayPhoneNumber}
            </div>
          </div>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Our AI assistant will help you describe your project in 2-3 minutes. Your info is never shared until you approve.
      </p>
    </div>
  );
}
