import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, ArrowLeft, Truck, FileText, Clock, Star, Share2, ExternalLink } from "lucide-react";

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
  recommendation: string;
  reason: string;
  pulledAt: string;
}

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = params?.id;

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

  const report: CarrierReport | null = data?.report || null;
  const isGo = report?.recommendation === "CLEAR";
  const isNoGo = report?.recommendation === "NO-GO";

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
