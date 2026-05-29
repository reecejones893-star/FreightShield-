import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscribedPage() {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    const qIndex = hash.indexOf("?");
    if (qIndex !== -1) {
      const qs = new URLSearchParams(hash.slice(qIndex + 1));
      const sessionId = qs.get("session_id");
      if (sessionId) {
        apiRequest("POST", "/api/subscribe/confirm", { sessionId })
          .then((res) => res.json())
          .then((data) => {
            setPlan(data.plan);
            setLoading(false);
          })
          .catch(() => setLoading(false));
        return;
      }
    }
    setLoading(false);
  }, []);

  const planNames: Record<string, string> = {
    starter: "Starter",
    broker_pro: "Broker Pro",
    unlimited: "Unlimited",
  };

  const planLimits: Record<string, string> = {
    starter: "10 lookups per month",
    broker_pro: "30 lookups per month",
    unlimited: "Unlimited lookups",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
        <CheckCircle className="w-9 h-9 text-green-500" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="font-display text-xl font-bold tracking-wide text-foreground">
          FREIGHT<span className="text-primary">SHIELD</span>
        </span>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Confirming your subscription...</p>
      ) : (
        <>
          <h1 className="text-3xl font-display font-black text-foreground mb-2 text-center">
            You're subscribed!
          </h1>
          {plan && (
            <p className="text-muted-foreground text-center mb-2">
              <span className="text-primary font-bold">{planNames[plan] || plan} Plan</span> — {planLimits[plan] || "lookups available"}
            </p>
          )}
          <p className="text-muted-foreground text-center mb-8 max-w-sm">
            Start running carrier checks right now. Your lookups reset every month.
          </p>
          <Button
            onClick={() => { window.location.hash = "/"; }}
            className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold"
          >
            Run a Carrier Check →
          </Button>
        </>
      )}
    </div>
  );
}
