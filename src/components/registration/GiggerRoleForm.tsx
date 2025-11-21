import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface GiggerRoleFormProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

const GiggerRoleForm = ({ onComplete, onBack }: GiggerRoleFormProps) => {
  const [preferences, setPreferences] = useState({
    receiveDiggerRecommendations: true,
    receiveNewBidNotifications: true,
    allowDirectContact: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ preferences });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Your gigger profile is ready!</p>
            <p className="text-sm text-muted-foreground">
              You can start posting gigs and hiring professionals immediately after registration.
            </p>
          </div>
        </div>

        <Card className="bg-accent/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Communication Preferences (Optional)</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="recommendations"
                  checked={preferences.receiveDiggerRecommendations}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, receiveDiggerRecommendations: !!checked }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="recommendations" className="text-sm font-medium cursor-pointer">
                    Receive digger recommendations
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when qualified professionals match your posted gigs
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="bidNotifications"
                  checked={preferences.receiveNewBidNotifications}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, receiveNewBidNotifications: !!checked }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="bidNotifications" className="text-sm font-medium cursor-pointer">
                    New bid notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Instant alerts when professionals bid on your gigs
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="directContact"
                  checked={preferences.allowDirectContact}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, allowDirectContact: !!checked }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="directContact" className="text-sm font-medium cursor-pointer">
                    Allow direct contact from diggers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Let professionals message you directly about opportunities
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="flex-1">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default GiggerRoleForm;
