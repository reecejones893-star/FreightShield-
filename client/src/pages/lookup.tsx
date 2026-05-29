import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Search, Zap, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";

export default function LookupPage() {
  const [dotNumber, setDotNumber] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const lookupMutation = useMutation({
    mutationFn: async (data: { dotNumber: string; email: string }) => {
      return await apiRequest("POST", "/api/lookup/create", data);
    },
    onSuccess: async (data: any) => {
      if (data.demoMode && data.report) {
        window.location.hash = `/report/${data.lookupId}`;
      } else if (data.checkoutUrl) {
        // Redirect to Stripe hosted checkout — works on all devices
        window.location.href = data.checkoutUrl;
      } else {
        window.location.hash = `/report/${data.lookupId}`;
      }
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dotNumber.trim()) { toast({ title: "Enter a DOT number", variant: "destructive" }); return; }
    if (!email.trim() || !email.includes("@")) { toast({ title: "Enter a valid email", variant: "destructive" }); return; }
    lookupMutation.mutate({ dotNumber: dotNumber.trim(), email: email.trim() });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-wide text-foreground">FREIGHT<span className="text-primary">SHIELD</span></span>
            <p className="text-xs text-muted-foreground -mt-0.5">Instant Carrier Lookup</p>
          </div>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Instant FMCSA Report
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-black text-foreground mb-4 leading-tight">
            Know Before<br />You Book
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-lg mx-auto">
            Enter any carrier's DOT number and get a full safety report in seconds. Protect your freight. Protect your business.
          </p>
        </div>

        <Card className="w-full max-w-lg border-border bg-card shadow-2xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="dot" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">USDOT Number</Label>
                <Input
                  id="dot"
                  data-testid="input-dot"
                  type="text"
                  placeholder="e.g. 1234567"
                  value={dotNumber}
                  onChange={(e) => setDotNumber(e.target.value)}
                  className="h-12 text-base bg-background border-border focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Email (report sent here)</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base bg-background border-border focus:border-primary"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Instant Carrier Report</p>
                    <p className="text-xs text-muted-foreground">Full FMCSA analysis — results in seconds</p>
                  </div>
                </div>
                <span className="text-2xl font-display font-black text-primary">$12</span>
              </div>

              <Button
                type="submit"
                data-testid="button-submit"
                className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-white"
                disabled={lookupMutation.isPending}
              >
                {lookupMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Redirecting to payment...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Run Carrier Check — $12
                  </span>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">Secure payment via Stripe. Report delivered instantly.</p>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Live FMCSA Data</span>
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Instant Results</span>
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Go / No-Go Recommendation</span>
        </div>
      </section>

      <section className="border-t border-border px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-display font-black text-center text-foreground mb-8">What's In Every Report</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: "Safety Rating", desc: "Official FMCSA rating" },
              { icon: AlertTriangle, label: "OOS Rates", desc: "Vehicle & driver rates" },
              { icon: CheckCircle, label: "Authority Status", desc: "Active or inactive" },
              { icon: Zap, label: "Crash History", desc: "Last 24 months" },
            ].map((item) => (
              <div key={item.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        © 2026 FreightShield — Fargo, ND. Data sourced from FMCSA SAFER database.
      </footer>
    </div>
  );
}
