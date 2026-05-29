import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Shield, Lock } from "lucide-react";

function CheckoutForm({ lookupId }: { lookupId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Payment failed");
      setLoading(false);
      return;
    }

    const { paymentIntent, error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await apiRequest("POST", "/api/lookup/confirm", {
          lookupId,
          paymentIntentId: paymentIntent.id,
        });
        navigate(`/report/${lookupId}`);
      } catch (err: any) {
        setError(err.message || "Could not load report");
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-white"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Pay $12 — Get My Report
          </span>
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Secured by Stripe. Your card info is never stored.
      </p>
    </form>
  );
}

export default function PaymentPage() {
  const params = useParams<{ lookupId: string }>();
  const lookupId = params.lookupId;
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [, navigate] = useLocation();
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    // Fetch publishable key from backend
    apiRequest("GET", "/api/stripe/config")
      .then((data: any) => {
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        } else {
          setLoadError("Payment configuration error. Please try again.");
        }
      })
      .catch(() => setLoadError("Could not load payment. Please try again."));
  }, []);

  useEffect(() => {
    if (!lookupId) return;
    apiRequest("GET", `/api/lookup/${lookupId}/secret`)
      .then((data: any) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setLoadError("Could not load payment. Please try again.");
        }
      })
      .catch(() => setLoadError("Could not load payment. Please try again."));
  }, [lookupId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-wide text-foreground">
              FREIGHT<span className="text-primary">SHIELD</span>
            </span>
            <p className="text-xs text-muted-foreground -mt-0.5">Instant Carrier Lookup</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-black text-foreground mb-2">
              Complete Payment
            </h1>
            <p className="text-muted-foreground">
              One-time payment — your FMCSA report delivers instantly after.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">Carrier Safety Report</p>
                <p className="text-sm text-muted-foreground">Full FMCSA analysis</p>
              </div>
              <span className="text-2xl font-display font-black text-primary">$12</span>
            </div>

            {loadError ? (
              <div className="text-center py-6">
                <p className="text-red-400 mb-4">{loadError}</p>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Go Back
                </Button>
              </div>
            ) : !clientSecret || !stripePromise ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading payment...</p>
              </div>
            ) : (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                    variables: {
                      colorPrimary: "#c95f00",
                      colorBackground: "#1a1a1a",
                      colorText: "#ffffff",
                      borderRadius: "8px",
                    },
                  },
                }}
              >
                <CheckoutForm lookupId={lookupId} />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
