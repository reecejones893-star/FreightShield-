import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, Zap, Star, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRICES = {
  starter: { monthly: "price_1TcPrm1FcQS0y6rVjHNL4xUd", annual: "price_1TcPrm1FcQS0y6rV6VEX5weL" },
  broker_pro: { monthly: "price_1TcPrm1FcQS0y6rVkYMD2Id3", annual: "price_1TcPrm1FcQS0y6rVsbN1JkrC" },
  unlimited: { monthly: "price_1TcPrm1FcQS0y6rVESLj2EgW", annual: "price_1TcPrn1FcQS0y6rVdJsu5fcV" },
  team: { monthly: "price_1TcUdg1FcQS0y6rV7gd9x9sT", annual: "price_1TcUjd1FcQS0y6rV1RzrQn6L" },
  enterprise: { monthly: "price_1TcUqM1FcQS0y6rVlUyAAhM6", annual: "price_1TcUsl1FcQS0y6rV5TlaJ3cx" },
};

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [email, setEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [view, setView] = useState<"individual" | "team">("individual");
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

  const individualPlans = [
    {
      key: "starter",
      name: "Starter",
      monthlyPrice: "$49",
      annualPrice: "$399",
      annualMonthly: "$33",
      lookups: "10 checks per month",
      badge: "",
      tagline: "Perfect if you're booking a few loads a week",
      features: [
        "10 carrier safety checks every month",
        "Full FMCSA report on every carrier",
        "Instant Go / No-Go recommendation",
        "Know if a carrier is active or shut down",
        "See crash history & safety violations",
        "Report sent to your email instantly",
      ],
      cta: "Start for $49/mo",
      highlight: false,
    },
    {
      key: "broker_pro",
      name: "Broker Pro",
      monthlyPrice: "$99",
      annualPrice: "$899",
      annualMonthly: "$75",
      lookups: "30 checks per month",
      badge: "Most Popular",
      tagline: "Best for brokers moving freight daily",
      features: [
        "30 carrier safety checks every month",
        "Full FMCSA report on every carrier",
        "Instant Go / No-Go recommendation",
        "Know if a carrier is active or shut down",
        "See crash history & safety violations",
        "Report sent to your email instantly",
        "Priority support",
      ],
      cta: "Go Pro for $99/mo",
      highlight: true,
    },
    {
      key: "unlimited",
      name: "Unlimited",
      monthlyPrice: "$199",
      annualPrice: "$1,799",
      annualMonthly: "$150",
      lookups: "Unlimited checks",
      badge: "",
      tagline: "For high-volume brokers who vet every load",
      features: [
        "Run as many checks as you need — no limits",
        "Full FMCSA report on every carrier",
        "Instant Go / No-Go recommendation",
        "Know if a carrier is active or shut down",
        "See crash history & safety violations",
        "Report sent to your email instantly",
        "Priority support",
      ],
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
      badge: "Best for Brokerages",
      tagline: "Your whole team vetting carriers — one flat price",
      features: [
        "Up to 5 broker seats on one account",
        "Unlimited carrier safety checks across the team",
        "Full FMCSA report on every carrier",
        "Instant Go / No-Go recommendation",
        "Shared team dashboard — see all lookups",
        "Reports sent to each user's email instantly",
        "Priority support",
      ],
      cta: "Get Team Plan — $149/mo",
      highlight: true,
    },
    {
      key: "enterprise",
      name: "Enterprise",
      monthlyPrice: "$299",
      annualPrice: "$2,699",
      annualMonthly: "$225",
      lookups: "Unlimited users · Unlimited checks",
      badge: "",
      tagline: "For large brokerages with no limits at all",
      features: [
        "Unlimited broker seats — whole office covered",
        "Unlimited carrier safety checks",
        "Full FMCSA report on every carrier",
        "Instant Go / No-Go recommendation",
        "Shared team dashboard — see all lookups",
        "Reports sent to each user's email instantly",
        "Dedicated account support",
        "Custom onboarding for your team",
      ],
      cta: "Go Enterprise — $299/mo",
      highlight: false,
    },
  ];

  const activePlans = view === "individual" ? individualPlans : teamPlans;

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
          Protect Every Load You Book
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          Your first carrier check is free — no card needed. When you're ready to vet more carriers, pick the plan that fits how you operate.
        </p>

        {/* Individual vs Team toggle */}
        <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1 mb-6">
          <button
            onClick={() => setView("individual")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${view === "individual" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            Individual Broker
          </button>
          <button
            onClick={() => setView("team")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${view === "team" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            <Users className="w-4 h-4" />
            Brokerage / Team
          </button>
        </div>

        {view === "team" && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm text-foreground font-semibold">
              Have a team of brokers? Stop paying per person. One team plan covers your whole operation at a flat monthly rate.
            </p>
          </div>
        )}

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
            Annual <span className="text-primary font-bold ml-1">Save 25%</span>
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
        <div className={`max-w-5xl mx-auto grid gap-6 ${view === "team" ? "md:grid-cols-2 max-w-3xl" : "md:grid-cols-3"}`}>
          {activePlans.map((plan) => (
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
                  <Star className="w-3 h-3" /> {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-xl font-display font-black text-foreground mb-1">{plan.name}</h2>
                <p className="text-sm text-primary font-semibold mb-1">{plan.lookups}</p>
                <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-display font-black text-foreground">
                    {billing === "monthly" ? plan.monthlyPrice : plan.annualMonthly}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">/mo</span>
                </div>
                {billing === "annual" ? (
                  <p className="text-xs text-primary font-semibold mt-1">
                    Billed as {plan.annualPrice}/year — save vs monthly
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Or save with <button onClick={() => setBilling("annual")} className="text-primary underline">annual billing</button>
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
