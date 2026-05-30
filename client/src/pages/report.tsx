import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, ArrowLeft, Truck, FileText, Clock, Star, Share2, ExternalLink, MessageSquare } from "lucide-react";
import { useState } from "react";

interface CarrierReport {
  dotNumber: string;
  name: string;
  usdotStatus: string;
  safetyRating: string;
  mcNumber: string;
  powerUnits: string;
  drivers: string;
  address: string;
  crashes: string;
  oosVehicle: string;
  oosDriver: string;
  vehicleInspections: string;
  driverInspections: string;
  vehicleOOSCount: string;
  driverOOSCount: string;
  mcsDate: string;
  yearsInService: string;
  recommendation: string;
  reason: string;
  pulledAt: string;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${(hovered || value) >= n ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`w-4 h-4 ${value >= n ? "text-yellow-400 fill-yellow-400" : value >= n - 0.5 ? "text-yellow-400 fill-yellow-400/50" : "text-muted-foreground"}`}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-foreground">{value > 0 ? value.toFixed(1) : "—"}</span>
      {count > 0 && <span className="text-xs text-muted-foreground">({count} review{count !== 1 ? "s" : ""})</span>}
    </div>
  );
}

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = params?.id;

  // Carrier review state
  const [carrierStars, setCarrierStars] = useState(0);
  const [carrierComment, setCarrierComment] = useState("");
  const [carrierSubmitted, setCarrierSubmitted] = useState(false);
  const [carrierSubmitting, setCarrierSubmitting] = useState(false);

  // App review state
  const [appStars, setAppStars] = useState(0);
  const [appComment, setAppComment] = useState("");
  const [appSubmitted, setAppSubmitted] = useState(false);
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [showAppReview, setShowAppReview] = useState(false);

  // When Stripe redirects back, confirm the session and run the lookup
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/lookup", id],
    queryFn: async () => {
      // Check for Stripe session_id in URL hash query params
      const hash = window.location.hash; // e.g. #/report/5?session_id=cs_xxx
      const qIndex = hash.indexOf('?');
      let sessionId = null;
      if (qIndex !== -1) {
        const qs = new URLSearchParams(hash.slice(qIndex + 1));
        sessionId = qs.get('session_id');
      }

      if (sessionId) {
        // Confirm payment with Stripe session
        await apiRequest("POST", "/api/lookup/confirm", {
          lookupId: id,
          paymentIntentId: sessionId,
        });
        // Clean URL
        window.location.hash = `/report/${id}`;
      }

      const res = await apiRequest("GET", `/api/lookup/${id}`);
      return await res.json();
    },
    enabled: !!id,
    refetchInterval: (data: any) => {
      if (!data || !data.report) return 2000;
      return false;
    },
  });

  // Carrier reviews
  const { data: carrierReviewData, refetch: refetchCarrierReviews } = useQuery({
    queryKey: ["/api/review/carrier", data?.report?.dotNumber],
    queryFn: async () => {
      const dot = data?.report?.dotNumber?.replace(/[^0-9]/g, "");
      if (!dot) return { reviews: [], rating: { avg: 0, count: 0 } };
      const res = await apiRequest("GET", `/api/review/carrier/${dot}`);
      return await res.json();
    },
    enabled: !!data?.report?.dotNumber,
  });

  const report: CarrierReport | null = data?.report || null;
  const isGo = report?.recommendation === "CLEAR";
  const isNoGo = report?.recommendation === "NO-GO";
  const email = data?.lookup?.email || "";

  const submitCarrierReview = async () => {
    if (!carrierStars || !report) return;
    setCarrierSubmitting(true);
    try {
      await apiRequest("POST", "/api/review/carrier", {
        dotNumber: report.dotNumber.replace(/[^0-9]/g, ""),
        email,
        stars: carrierStars,
        comment: carrierComment,
      });
      setCarrierSubmitted(true);
      refetchCarrierReviews();
      // Prompt app review after carrier review
      setTimeout(() => setShowAppReview(true), 800);
    } finally {
      setCarrierSubmitting(false);
    }
  };

  const submitAppReview = async () => {
    if (!appStars) return;
    setAppSubmitting(true);
    try {
      await apiRequest("POST", "/api/review/app", {
        email,
        stars: appStars,
        comment: appComment,
      });
      setAppSubmitted(true);
    } finally {
      setAppSubmitting(false);
    }
  };

  if (isLoading || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="text-center">
          <h2 className="text-2xl font-display font-black text-foreground mb-2">Running FMCSA Lookup</h2>
          <p className="text-muted-foreground">Pulling live data from the FMCSA SAFER database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-display font-black">Report Not Found</h2>
        <Button onClick={() => navigate("/")} variant="outline">Run New Lookup</Button>
      </div>
    );
  }

  const carrierRating = carrierReviewData?.rating || { avg: 0, count: 0 };
  const carrierReviews: { stars: number; comment: string; created_at: string }[] = carrierReviewData?.reviews || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">FREIGHT<span className="text-primary">SHIELD</span></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            New Lookup
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Recommendation Banner */}
        <div className={`rounded-2xl p-6 flex items-start gap-5 border ${
          isGo
            ? "bg-green-500/10 border-green-500/30"
            : isNoGo
            ? "bg-red-500/10 border-red-500/30"
            : "bg-yellow-500/10 border-yellow-500/30"
        }`}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isGo ? "bg-green-500/20" : isNoGo ? "bg-red-500/20" : "bg-yellow-500/20"
          }`}>
            {isGo
              ? <CheckCircle className="w-8 h-8 text-green-500" />
              : isNoGo
              ? <AlertTriangle className="w-8 h-8 text-red-500" />
              : <AlertTriangle className="w-8 h-8 text-yellow-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-display font-black text-foreground">
                {report.recommendation}
              </h1>
              <Badge
                className={`text-sm font-bold uppercase ${
                  isGo
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : isNoGo
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                }`}
                variant="outline"
              >
                {isGo ? "Safe to Book" : isNoGo ? "Do Not Book" : "Review Required"}
              </Badge>
            </div>
            <p className={`text-sm leading-relaxed ${isGo ? "text-green-300/80" : isNoGo ? "text-red-300/80" : "text-yellow-300/80"}`}>
              {report.reason}
            </p>
          </div>
        </div>

        {/* Carrier Identity */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display font-bold">
              <Truck className="w-5 h-5 text-primary" />
              Carrier Identity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: "Legal Name", value: report.name },
                { label: "USDOT Number", value: report.dotNumber },
                { label: "MC Number", value: report.mcNumber },
                { label: "USDOT Status", value: report.usdotStatus },
                { label: "Address", value: report.address },
                { label: "Power Units", value: report.powerUnits },
                { label: "Drivers", value: report.drivers },
                { label: "Time in Service", value: report.yearsInService || "Unknown" },
                { label: "MCS-150 Filed", value: report.mcsDate || "Not Available" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{item.label}</p>
                  <p className={`text-sm font-medium ${
                    item.label === "USDOT Status" && report.usdotStatus.toLowerCase().includes("inactive")
                      ? "text-red-400"
                      : "text-foreground"
                  }`}>{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Safety Data */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display font-bold">
              <Shield className="w-5 h-5 text-primary" />
              Safety Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Safety Rating", value: report.safetyRating, warn: report.safetyRating.toLowerCase().includes("unsatisfactory") || report.safetyRating.toLowerCase().includes("conditional") },
                { label: "Crashes (24mo)", value: report.crashes, warn: Number(report.crashes) > 0 },
                { label: "Vehicle Inspections", value: report.vehicleInspections || "0" },
                { label: "Driver Inspections", value: report.driverInspections || "0" },
                { label: "Vehicle OOS Count", value: report.vehicleOOSCount || "0", warn: Number(report.vehicleOOSCount) > 0 },
                { label: "Driver OOS Count", value: report.driverOOSCount || "0", warn: Number(report.driverOOSCount) > 0 },
                { label: "Vehicle OOS Rate", value: report.oosVehicle, warn: parseFloat(report.oosVehicle) > 20 },
                { label: "Driver OOS Rate", value: report.oosDriver, warn: parseFloat(report.oosDriver) > 5 },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl p-4 border ${item.warn ? "bg-red-500/10 border-red-500/30" : "bg-muted/50 border-border"}`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-xl font-display font-black ${item.warn ? "text-red-400" : "text-foreground"}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insurance Check */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display font-bold">
              <FileText className="w-5 h-5 text-primary" />
              Insurance Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              FMCSA insurance records require direct verification. Tap below to instantly open this carrier's official insurance filing — confirm active coverage before booking.
            </p>
            <a
              href={`https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist?n_dotno=${report.dotNumber.replace(/[^0-9]/g, "")}&s_prefix=MC&n_docketno=${report.mcNumber.replace(/[^0-9]/g, "")}&s_legalname=&s_dbaname=&s_state=`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full h-12 font-bold bg-primary hover:bg-primary/90 text-white">
                <ExternalLink className="w-4 h-4 mr-2" />
                Check Insurance on FMCSA
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Carrier Community Rating */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display font-bold">
              <Star className="w-5 h-5 text-yellow-400" />
              Broker Community Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Aggregate rating */}
            {carrierRating.count > 0 && (
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <StarDisplay value={carrierRating.avg} count={carrierRating.count} />
                <span className="text-xs text-muted-foreground">from brokers who booked this carrier</span>
              </div>
            )}

            {/* Submit form */}
            {!carrierSubmitted ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Have you worked with this carrier? Rate them so other brokers know what to expect.</p>
                <StarPicker value={carrierStars} onChange={setCarrierStars} />
                {carrierStars > 0 && (
                  <>
                    <textarea
                      value={carrierComment}
                      onChange={(e) => setCarrierComment(e.target.value)}
                      placeholder="Optional: share what you experienced (on-time, communication, damage, etc.)"
                      className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                      rows={3}
                    />
                    <Button
                      onClick={submitCarrierReview}
                      disabled={carrierSubmitting}
                      className="bg-primary hover:bg-primary/90 text-white font-bold"
                    >
                      {carrierSubmitting ? "Submitting..." : "Submit Rating"}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
                <CheckCircle className="w-4 h-4" />
                Thanks for rating — your review helps other brokers stay protected.
              </div>
            )}

            {/* Existing reviews */}
            {carrierReviews.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Reviews</p>
                {carrierReviews.map((r, i) => (
                  <div key={i} className="rounded-lg bg-muted/30 border border-border p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={`w-3.5 h-3.5 ${r.stars >= n ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="text-sm text-foreground/80">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Share button */}
        <Button
          variant="outline"
          className="w-full h-12 font-bold border-border"
          onClick={() => {
            const text = `FreightShield Report — DOT #${report.dotNumber} — ${report.name}\n${report.recommendation}: ${report.reason}\n\nCheck any carrier at freightshieldconsulting.com`;
            if (navigator.share) {
              navigator.share({ title: "FreightShield Carrier Report", text });
            } else {
              navigator.clipboard.writeText(text);
              alert("Report copied to clipboard!");
            }
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share This Report
        </Button>

        {/* Rate FreightShield */}
        {(showAppReview || carrierSubmitted) && !appSubmitted && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-display font-bold">
                <MessageSquare className="w-5 h-5 text-primary" />
                Rate FreightShield
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">How was your experience with FreightShield? Your feedback helps us improve.</p>
              <StarPicker value={appStars} onChange={setAppStars} />
              {appStars > 0 && (
                <>
                  <textarea
                    value={appComment}
                    onChange={(e) => setAppComment(e.target.value)}
                    placeholder="Optional: tell us what you loved or what we can do better"
                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    rows={3}
                  />
                  <Button
                    onClick={submitAppReview}
                    disabled={appSubmitting}
                    className="bg-primary hover:bg-primary/90 text-white font-bold"
                  >
                    {appSubmitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {appSubmitted && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 flex items-center gap-3 text-green-400 font-semibold text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            Thank you — your review means everything to us.
          </div>
        )}

        {/* Upgrade banner */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-display font-black text-foreground">Want to run more checks?</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            You used your free lookup. Subscribe to vet every carrier you book — starting at $49/month for 10 checks.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => { window.location.hash = "/pricing"; }}
              className="bg-primary hover:bg-primary/90 text-white font-bold px-8"
            >
              View Plans — From $49/mo
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="border-border font-semibold"
            >
              Run Another — $12
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 pb-6">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Data pulled: {new Date(report.pulledAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Source: FMCSA SAFER Database</span>
          </div>
        </div>
      </div>
    </div>
  );
}
