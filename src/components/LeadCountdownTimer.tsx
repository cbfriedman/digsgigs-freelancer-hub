import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface LeadCountdownTimerProps {
  expiresAt: string;
  label?: string;
  onExpire?: () => void;
}

export function LeadCountdownTimer({ expiresAt, label = "Time remaining", onExpire }: LeadCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft("Expired");
        onExpire?.();
        return;
      }

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const isExpiringSoon = () => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const hoursLeft = (expiry - now) / (1000 * 60 * 60);
    return hoursLeft <= 6 && hoursLeft > 0;
  };

  return (
    <div className={`flex items-center gap-2 ${isExpiringSoon() ? "text-yellow-600" : ""}`}>
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">
        {label}: <span className="font-bold">{timeLeft}</span>
      </span>
    </div>
  );
}
