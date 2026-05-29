import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Search, Zap, CheckCircle, AlertTriangle, DollarSign, Star, Users } from "lucide-react";

const PRICES = {
  starter: { monthly: "price_1TcPrm1FcQS0y6rVjHNL4xUd", annual: "price_1TcPrm1FcQS0y6rV6VEX5weL" },
  broker_pro: { monthly: "price_1TcPrm1FcQS0y6rVkYMD2Id3", annual: "price_1TcPrm1FcQS0y6rVsbN1JkrC" },
  unlimited: { monthly: "price_1TcPrm1FcQS0y6rVESLj2EgW", annual: "price_1TcPrn1FcQS0y6rVdJsu5fcV" },
  team: { monthly: "price_1TcUdg1FcQS0y6rV7gd9x9sT", annual: "price_1TcUjd1FcQS0y6rV1RzrQn6L" },
  enterprise: { monthly: "price_1TcUqM1FcQS0y6rVlUyAAhM6", annual: "price_1TcUsl1FcQS0y6rV5TlaJ3cx" },
};

export default function LookupPage() {
  const [dotNumber, setDotNumber] = useState("");
  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [planView, setPlanView] = useState<"individual" | "team">("individual");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planEmail, setPlanEmail] = useState("");
  const { toast } = useToast();

  const lookupMutation = useMutation({
    mutationFn: async (data: { dotNumber: string; email: string }) => {
      const res = await apiRequest("POST", "/api/lookup/create", data);
      return await res.json();
    },
    onSuccess: async (data: any) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.report && data.lookupId) {
        window.location.hash = `/report/${data.lookupId}`;
      } else {
        window.location.hash = `/report/${data.lookupId}`;
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ priceId }: { priceId: string }) => {
      if (!planEmail.trim() || !planEmail.includes("@")) throw new Error("Please enter your email address first");
      const res = await apiRequest("POST", "/api/subscribe", { email: planEmail.trim(), priceId });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dotNumber.trim()) { toast({ title: "Enter a DOT number", variant: "destructive" }); return; }
    if (!email.trim() || !email.includes("@")) { toast({ title: "Enter a valid email", variant: "destructive" }); return; }
    lookupMutation.mutate({ dotNumber: dotNumber.trim(), email: email.trim() });
  };

  const individualPlans = [
    {
      key: "starter",
      name: "Starter",
      monthlyPrice: "$49",
      annualPrice: "$399",
      annualMonthly: "$33",
      lookups: "10 checks/mo",
      tagline: "Perfect for a few loads a week",
      features: ["10 carrier checks every month", "Full FMCSA report", "Instant Go / No-Go", "Email report instantly"],
      cta: "Start for $49/mo",
      highlight: false,
    },
    {
      key: "broker_pro",
      name: "Broker Pro",
      monthlyPrice: "$99",
      annualPrice: "$899",
      annualMonthly: "$75",
      lookups: "30 checks/mo",
      tagline: "Best for brokers moving freight daily",
      features: ["30 carrier checks every month", "Full FMCSA report", "Instant Go / No-Go", "Email report instantly", "Priority support"],
      cta: "Go Pro for $99/mo",
      highlight: true,
      badge: "Most Popular",
    },
    {
      key: "unlimited",
      name: "Unlimited",
      monthlyPrice: "$199",
      annualPrice: "$1,799",
      annualMonthly: "$150",
      lookups: "Unlimited checks",
      tagline: "For high-volume brokers",
      features: ["Unlimited checks — no limits", "Full FMCSA report", "Instant Go / No-Go", "Email report instantly", "Priority support"],
      cta: "Go Unlimited for $199/mo",
      highlight: false,
    },
  ];

  const teamPlans = [
    {
      key: "team",
      name: "Team",
      monthlyPrice: "$149",
      annualPrice: "$1,349",
      annualMonthly: "$112",
      lookups: "5 users · Unlimited checks",
      tagline: "Your whole team covered — one flat price",
      features: ["Up to 5 broker seats", "Unlimited checks across the team", "Full FMCSA report", "Instant Go / No-Go", "Shared team dashboard", "Priority support"],
      cta: "Get Team Plan — $149/mo",
      highlight: true,
      badge: "Best for Brokerages",
    },
    {
      key: "enterprise",
      name: "Enterprise",
      monthlyPrice: "$299",
      annualPrice: "$2,699",
      annualMonthly: "$225",
      lookups: "Unlimited users · Unlimited checks",
      tagline: "For large brokerages with no limits",
      features: ["Unlimited broker seats", "Unlimited checks", "Full FMCSA report", "Instant Go / No-Go", "Shared team dashboard", "Dedicated account support"],
      cta: "Go Enterprise — $299/mo",
      highlight: false,
    },
  ];

  const activePlans = planView === "individual" ? individualPlans : teamPlans;

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

      {/* Hero + Lookup */}
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
              <p className="text-xs text-center text-muted-foreground">First lookup free · Scroll down to subscribe and save</p>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Live FMCSA Data</span>
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Instant Results</span>
          <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />Go / No-Go Recommendation</span>
        </div>
      </section>

      {/* What's in every report */}
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

      {/* Pricing Section */}
      <section className="border-t border-border px-6 py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Subscribe & Save
          </div>
          <h2 className="text-4xl font-display font-black text-foreground mb-4">Protect Every Load You Book</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Your first carrier check is free. When you're ready to vet more, pick the plan that fits how you operate.
          </p>

          {/* Individual vs Team toggle */}
          <div className="inline-flex items-center gap-3 bg-background rounded-full p-1 mb-6 border border-border">
            <button
              onClick={() => setPlanView("individual")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${planView === "individual" ? "bg-primary text-white shadow" : "text-muted-foreground"}`}
            >
              Individual Broker
            </button>
            <button
              onClick={() => setPlanView("team")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${planView === "team" ? "bg-primary text-white shadow" : "text-muted-foreground"}`}
            >
              <Users className="w-4 h-4" />
              Brokerage / Team
            </button>
          </div>

          {planView === "team" && (
            <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-foreground font-semibold">
                Have a team of brokers? One plan covers your whole operation at a flat monthly rate — no per-seat fees.
              </p>
            </div>
          )}

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-background rounded-full p-1 mb-10 border border-border">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billing === "monthly" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billing === "annual" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
            >
              Annual <span className="text-primary font-bold ml-1">Save 25%</span>
            </button>
          </div>

          {/* Email for subscription */}
          <div className="max-w-sm mx-auto mb-10">
            <input
              type="email"
              placeholder="Enter your email to subscribe"
              value={planEmail}
              onChange={(e) => setPlanEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Plan cards */}
          <div className={`mx-auto grid gap-6 ${planView === "team" ? "md:grid-cols-2 max-w-3xl" : "md:grid-cols-3 max-w-5xl"}`}>
            {activePlans.map((plan: any) => (
              <div
                key={plan.key}
                className={`relative rounded-2xl border p-8 text-left flex flex-col ${
                  plan.highlight ? "border-primary bg-primary/5 shadow-xl" : "border-border bg-card"
                }`}
              >
                {plan.highlight && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-display font-black text-foreground mb-1">{plan.name}</h3>
                  <p className="text-sm text-primary font-semibold mb-1">{plan.lookups}</p>
                  <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-display font-black text-foreground">
                      {billing === "monthly" ? plan.monthlyPrice : plan.annualMonthly}
                    </span>
                    <span className="text-muted-foreground text-sm mb-1">/mo</span>
                  </div>
                  {billing === "annual" ? (
                    <p className="text-xs text-primary font-semibold mt-1">Billed as {plan.annualPrice}/year</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      Or save with <button onClick={() => setBilling("annual")} className="text-primary underline">annual billing</button>
                    </p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => {
                    setSelectedPlan(plan.key);
                    const priceId = PRICES[plan.key as keyof typeof PRICES][billing === "monthly" ? "monthly" : "annual"];
                    subscribeMutation.mutate({ priceId });
                  }}
                  disabled={subscribeMutation.isPending && selectedPlan === plan.key}
                  className={`w-full h-12 font-bold ${plan.highlight ? "bg-primary hover:bg-primary/90 text-white" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                >
                  {subscribeMutation.isPending && selectedPlan === plan.key ? "Redirecting..." : plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <div className="max-w-xl mx-auto mt-10 p-6 rounded-2xl border border-border bg-card text-center">
            <p className="text-muted-foreground text-sm mb-2">Just need one report?</p>
            <p className="text-foreground font-semibold">Single lookup available for <span className="text-primary font-bold">$12</span> — no subscription needed.</p>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-block mt-3 text-primary text-sm font-semibold underline underline-offset-2">
              Run a single lookup ↑
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        © 2026 FreightShield — Fargo, ND. Data sourced from FMCSA SAFER database.
      </footer>
    </div>
  );
}
