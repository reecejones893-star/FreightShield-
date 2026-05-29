import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, Zap, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRICES = {
  starter: { monthly: "price_1TcPrm1FcQS0y6rVjHNL4xUd", annual: "price_1TcPrm1FcQS0y6rV6VEX5weL" },
  broker_pro: { monthly: "price_1TcPrm1FcQS0y6rVkYMD2Id3", annual: "price_1TcPrm1FcQS0y6rVsbN1JkrC" },
  unlimited: { monthly: "price_1TcPrm1FcQS0y6rVESLj2EgW", annual: "price_1TcPrn1FcQS0y6rVdJsu5fcV" },
};

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [email, setEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async ({ priceId }: { priceId: string }) => {
      if (!email.trim() || !email.includes("@")) {
        throw new Error("Please enter your email address first");
      }
      const res = await apiRequest("POST", "/api/subscribe", { email: email.trim(), priceId });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    },
  });

  const plans = [
    {
      key: "starter",
      name: "Starter",
      monthlyPrice: "$49",
      annualPrice: "$399",
      annualMonthly: "$33",
      lookups: "10 lookups/month",
      features: ["10 carrier reports per month", "Full FMCSA safety data", "Go/No-Go recommendation", "Email delivery"],
      cta: "Get Started",
      highlight: false,
    },
    {
      key: "broker_pro",
      name: "Broker Pro",
      monthlyPrice: "$99",
      annualPrice: "$899",
      annualMonthly: "$75",
      lookups: "30 lookups/month",
      features: ["30 carrier reports per month", "Full FMCSA safety data", "Go/No-Go recommendation", "Email delivery", "Priority support"],
      cta: "Go Pro",
      highlight: true,
    },
    {
      key: "unlimited",
      name: "Unlimited",
      monthlyPrice: "$199",
      annualPrice: "$1,799",
      annualMonthly: "$150",
      lookups: "Unlimited lookups",
      features: ["Unlimited carrier reports", "Full FMCSA safety data", "Go/No-Go recommendation", "Email delivery", "Priority support", "API access (coming soon)"],
      cta: "Go Unlimited",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <a href="/#/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold tracking-wide text-foreground">
              FREIGHT<span className="text-primary">SHIELD</span>
            </span>
          </a>
        </div>
      </header>

      <section className="px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />
          Simple Pricing
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-black text-foreground mb-4">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          Start with 1 free lookup. Upgrade anytime to run more checks and protect your freight business.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1 mb-10">
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
            Annual <span className="text-primary font-bold ml-1">Save 30%</span>
          </button>
        </div>

        {/* Email input */}
        <div className="max-w-sm mx-auto mb-10">
          <input
            type="email"
            placeholder="Enter your email to subscribe"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* Plans */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-8 text-left flex flex-col ${
                plan.highlight
                  ? "border-primary bg-primary/5 shadow-xl"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> Most Popular
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-xl font-display font-black text-foreground mb-1">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{plan.lookups}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-display font-black text-foreground">
                    {billing === "monthly" ? plan.monthlyPrice : plan.annualMonthly}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">/mo</span>
                </div>
                {billing === "annual" && (
                  <p className="text-xs text-primary font-semibold mt-1">
                    {plan.annualPrice} billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
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
                className={`w-full h-12 font-bold ${
                  plan.highlight
                    ? "bg-primary hover:bg-primary/90 text-white"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {subscribeMutation.isPending && selectedPlan === plan.key
                  ? "Redirecting..."
                  : plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Single lookup option */}
        <div className="max-w-xl mx-auto mt-10 p-6 rounded-2xl border border-border bg-card text-center">
          <p className="text-muted-foreground text-sm mb-2">Just need one report?</p>
          <p className="text-foreground font-semibold">Single lookup available for <span className="text-primary font-bold">$12</span> — no subscription needed.</p>
          <a href="/#/" className="inline-block mt-3 text-primary text-sm font-semibold underline underline-offset-2">
            Run a single lookup →
          </a>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-5 text-center text-xs text-muted-foreground">
        © 2026 FreightShield — Fargo, ND. Data sourced from FMCSA SAFER database.
      </footer>
    </div>
  );
}
