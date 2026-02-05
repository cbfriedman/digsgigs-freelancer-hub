import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Lock, Loader2, Calendar, DollarSign, Shield } from "lucide-react";

interface QuickContactCardProps {
  hasViewAccess: boolean;
  isUnlocking: boolean;
  isCallingDigger: boolean;
  phone?: string | null;
  offersFreEstimates?: boolean | null;
  hourlyRateDisplay?: string | null;
  onSendMessage: () => void;
  onCallDigger: () => void;
  onUnlockContact: () => void;
}

export const QuickContactCard = ({
  hasViewAccess,
  isUnlocking,
  isCallingDigger,
  phone,
  offersFreEstimates,
  hourlyRateDisplay,
  onSendMessage,
  onCallDigger,
  onUnlockContact,
}: QuickContactCardProps) => {
  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="px-4 sm:px-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">Contact This Professional</CardTitle>
        <CardDescription className="text-sm">
          Get in touch to discuss your project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Quick Stats */}
        <div className="flex flex-wrap gap-2">
          {offersFreEstimates && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Calendar className="w-3 h-3 mr-1" />
              Free Estimates
            </Badge>
          )}
          {hourlyRateDisplay && (
            <Badge variant="outline">
              <DollarSign className="w-3 h-3 mr-1" />
              {hourlyRateDisplay}
            </Badge>
          )}
        </div>

        {/* Contact Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full" 
            size="lg"
            onClick={onSendMessage}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Send Message
          </Button>

          {hasViewAccess ? (
            phone && (
              <Button 
                className="w-full" 
                size="lg"
                variant="secondary"
                onClick={onCallDigger}
                disabled={isCallingDigger}
              >
                <Phone className="mr-2 h-5 w-5" />
                {isCallingDigger ? 'Connecting...' : 'Call Now'}
              </Button>
            )
          ) : (
            <Button 
              className="w-full" 
              size="lg"
              variant="outline"
              onClick={onUnlockContact}
              disabled={isUnlocking}
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Unlock Contact Info
                </>
              )}
            </Button>
          )}
        </div>

        {!hasViewAccess && (
          <p className="text-xs text-muted-foreground text-center">
            Unlock to view phone number and email
          </p>
        )}

        {/* Trust Indicator */}
        <div className="pt-3 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Secure messaging through platform</span>
        </div>
      </CardContent>
    </Card>
  );
};
