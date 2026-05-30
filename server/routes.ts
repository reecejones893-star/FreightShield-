import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import axios from "axios";

// FMCSA lookup — supports both USDOT and MC numbers
async function lookupCarrier(dotNumber: string) {
  try {
    // Clean input — strip spaces, commas, periods, dashes (except MC- prefix detection)
    const rawInput = dotNumber.trim().replace(/[,\s.]+/g, "");
    const cleaned = rawInput.toUpperCase().replace(/^MC-?/, "");
    const isMC = rawInput.toUpperCase().startsWith("MC");
    const queryParam = isMC ? "MC_MX" : "USDOT";
    const queryString = cleaned;
    const url = `https://safer.fmcsa.dot.gov/query.asp?query_type=queryCarrierSnapshot&query_param=${queryParam}&query_string=${queryString}`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      }
    });

    const html = response.data as string;

    // Check for inactive record markers in raw HTML
    if (html.includes("RECORD INACTIVE") || html.includes("is INACTIVE in the SAFER")) {
      return {
        dotNumber,
        name: "Record Inactive",
        usdotStatus: "INACTIVE",
        safetyRating: "None Assigned",
        mcNumber: "Not Available",
        powerUnits: "Not Available",
        drivers: "Not Available",
        address: "Not Available",
        crashes: "0",
        oosVehicle: "0%",
        oosDriver: "0%",
        recommendation: "NO-GO",
        reason: "Carrier authority is INACTIVE in the FMCSA SAFER database — not legally authorized to haul freight",
        pulledAt: new Date().toISOString(),
      };
    }

    // Helper: extract value from <TD class="queryfield"> after a label (uses loose match for reliability)
    const extractField = (label: string): string => {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped + "[\\s\\S]{0,60}<TD[^>]*>([^&<]+)", "i");
      const match = html.match(regex);
      return match ? match[1].trim() : "Not Available";
    };

    const nameRaw = extractField("Legal Name:");
    const name = nameRaw === "Not Available" ? "Not Found" : nameRaw;
    const safetyRating = extractField("Safety Rating:") || "None Assigned";
    const powerUnits = extractField("Power Units:") || "Not Available";
    const address = extractField("Physical Address:") || "Not Available";

    // MCS-150 Form Date — tells us when carrier last filed, used to calculate time in service
    const mcsDateRaw = extractField("MCS-150 Form Date:") || "Not Available";
    // Calculate years in service from MCS-150 date (earliest known filing = start of operation)
    let yearsInService = "Unknown";
    if (mcsDateRaw !== "Not Available") {
      const filed = new Date(mcsDateRaw);
      if (!isNaN(filed.getTime())) {
        const now = new Date();
        const years = Math.floor((now.getTime() - filed.getTime()) / (1000 * 60 * 60 * 24 * 365));
        const months = Math.floor((now.getTime() - filed.getTime()) / (1000 * 60 * 60 * 24 * 30)) % 12;
        yearsInService = years > 0 ? `${years} yr${years !== 1 ? "s" : ""}${months > 0 ? ` ${months} mo` : ""}` : `${months} month${months !== 1 ? "s" : ""}`;
      }
    }
    // Drivers value is inside <B> tag, not queryfield td
    const driversSection = html.match(/Drivers:<\/A><\/TH>[\s\S]{0,300}?<B>(\d+)/i);
    const drivers = driversSection ? driversSection[1] : "Not Available";

    // MC number is inside an <A> href tag
    const mcMatch2 = html.match(/s_prefix=MC[^>]+>\s*(MC-[\d]+)<\/A>/i);
    const mcNumber = mcMatch2 ? mcMatch2[1].trim() : "Not Available";

    // USDOT status — stored as comment: <!--ACTIVE--> then text ACTIVE
    const statusMatch = html.match(/<!--(ACTIVE|INACTIVE|OUT OF SERVICE)-->\s*(ACTIVE|INACTIVE|OUT OF SERVICE)/i)
      || html.match(/USDOT Status[\s\S]{0,300}?(ACTIVE|INACTIVE)/i);
    const usdotStatus = statusMatch ? (statusMatch[2] || statusMatch[1]).trim() : "Unknown";

    // Operating authority
    const opMatch = html.match(/Operating Authority Status[\s\S]{0,300}?<TD[^>]*>([^<]+)/i);
    const operatingStatus = opMatch ? opMatch[1].trim() : "";

    // Crashes — in a different section
    const crashSection = html.match(/US Crashes[\s\S]{0,1000}/i)?.[0] || "";
    const crashNumbers = crashSection.match(/<TD[^>]*>(\d+)<\/TD>/gi) || [];
    // Last number in the crash section is usually the total
    const crashTotal = crashNumbers.length > 0 ? crashNumbers[crashNumbers.length - 1].replace(/<[^>]+>/g, "") : "0";
    const crashes = crashTotal;

    // Inspection counts — from the "Inspections" TH row in the inspection table
    // Pattern: >Inspections</TH> followed by TD cells: vehicle, driver, hazmat, IEP
    const inspectionRowMatch = html.match(/>Inspections<\/TH>[\s\S]{0,600}?<TD[^>]*class="queryfield"[^>]*>(\d+)<\/TD>[\s\S]{0,200}?<TD[^>]*class="queryfield"[^>]*>(\d+)<\/TD>/i);
    const vehicleInspections = inspectionRowMatch ? inspectionRowMatch[1] : "0";
    const driverInspections = inspectionRowMatch ? inspectionRowMatch[2] : "0";

    // OOS counts — from the "Out of Service" TH row (not "Out of Service %")
    const oosCountRowMatch = html.match(/>Out of Service<\/TH>[\s\S]{0,600}?<TD[^>]*class="queryfield"[^>]*>(\d+)<\/TD>[\s\S]{0,200}?<TD[^>]*class="queryfield"[^>]*>(\d+)<\/TD>/i);
    const vehicleOOSCount = oosCountRowMatch ? oosCountRowMatch[1] : "0";
    const driverOOSCount = oosCountRowMatch ? oosCountRowMatch[2] : "0";

    // OOS rates — first two percentages after "Out of Service %" header are vehicle then driver
    const oosSection = html.match(/Out of Service %[\s\S]{0,800}/i)?.[0] || "";
    const oosNumbers = oosSection.match(/(\d+\.?\d*)%/g) || [];
    const oosVehicle = oosNumbers[0] || "0%";
    const oosDriver = oosNumbers[1] || "0%";

    // Determine recommendation
    const isInactive = usdotStatus.toLowerCase().includes("inactive") || usdotStatus.toLowerCase().includes("out-of-service");
    const isNotAuthorized = operatingStatus.toLowerCase().includes("not authorized") || operatingStatus.toLowerCase().includes("revoked");
    const isUnknown = usdotStatus === "Unknown" || name === "Not Found" || name === "Not Available";
    const isBadRating = safetyRating.toLowerCase().includes("unsatisfactory") || safetyRating.toLowerCase().includes("conditional");
    const isHighCrashRisk = Number(crashes) >= 5;
    const isHighVehicleOOS = parseFloat(oosVehicle) > 20;
    const isHighDriverOOS = parseFloat(oosDriver) > 5;

    let recommendation: string;
    let reason: string;

    if (isUnknown) {
      recommendation = "NO-GO";
      reason = "DOT number could not be verified in the FMCSA SAFER database — do not book until carrier is confirmed";
    } else if (isInactive) {
      recommendation = "NO-GO";
      reason = "Carrier authority is INACTIVE — not legally authorized to haul freight";
    } else if (isNotAuthorized) {
      recommendation = "NO-GO";
      reason = "Carrier operating authority is NOT AUTHORIZED — not legally cleared to haul freight";
    } else if (isBadRating) {
      recommendation = "NO-GO";
      reason = `Safety rating is ${safetyRating} — carrier does not meet minimum safety standards`;
    } else if (isHighVehicleOOS || isHighDriverOOS || isHighCrashRisk) {
      recommendation = "REVIEW";
      reason = `Elevated risk indicators: ${[
        isHighCrashRisk ? `${crashes} crashes in 24 months` : "",
        isHighVehicleOOS ? `Vehicle OOS rate ${oosVehicle} (threshold: 20%)` : "",
        isHighDriverOOS ? `Driver OOS rate ${oosDriver} (threshold: 5%)` : "",
      ].filter(Boolean).join("; ")}. Verify insurance and safety program before booking.`;
    } else {
      recommendation = "CLEAR";
      reason = "Active authority, acceptable safety rating, and no major red flags in FMCSA records";
    }

    return {
      dotNumber,
      name,
      usdotStatus,
      safetyRating,
      mcNumber,
      powerUnits,
      drivers,
      address,
      crashes,
      oosVehicle,
      oosDriver,
      vehicleInspections,
      driverInspections,
      vehicleOOSCount,
      driverOOSCount,
      mcsDate: mcsDateRaw,
      yearsInService,
      recommendation,
      reason,
      pulledAt: new Date().toISOString(),
    };
  } catch (err) {
    // Fallback: return a partial report with the DOT number
    return {
      dotNumber,
      name: "Lookup Error",
      usdotStatus: "Could not retrieve",
      safetyRating: "Could not retrieve",
      mcNumber: "Could not retrieve",
      powerUnits: "Could not retrieve",
      drivers: "Could not retrieve",
      address: "Could not retrieve",
      crashes: "Could not retrieve",
      oosVehicle: "Could not retrieve",
      oosDriver: "Could not retrieve",
      recommendation: "MANUAL CHECK REQUIRED",
      reason: "FMCSA data could not be retrieved automatically. Please verify manually at safer.fmcsa.dot.gov",
      pulledAt: new Date().toISOString(),
    };
  }
}

export function registerRoutes(httpServer: Server, app: Express) {

  // Serve publishable key to frontend
  app.get("/api/stripe/config", (req, res) => {
    const pk = process.env.STRIPE_PUBLISHABLE_KEY || "";
    res.json({ publishableKey: pk });
  });

  // Check subscriber status by email
  app.get("/api/subscriber/:email", (req, res) => {
    const email = decodeURIComponent(req.params.email);
    const subscriber = storage.getSubscriberByEmail(email);
    if (!subscriber) {
      return res.json({ plan: "none", lookupsUsed: 0, lookupsLimit: 1, hasFreeLookup: false });
    }
    const hasFreeLookup = subscriber.plan === "free" && subscriber.lookupsUsed < 1;
    const canLookup =
      subscriber.plan === "unlimited" ||
      (subscriber.plan !== "free" && subscriber.lookupsUsed < subscriber.lookupsLimit) ||
      hasFreeLookup;
    res.json({
      plan: subscriber.plan,
      lookupsUsed: subscriber.lookupsUsed,
      lookupsLimit: subscriber.lookupsLimit,
      hasFreeLookup,
      canLookup,
      status: subscriber.status,
    });
  });

  // Create subscription checkout
  app.post("/api/subscribe", async (req, res) => {
    try {
      const { email, priceId } = req.body;
      if (!email || !priceId) return res.status(400).json({ error: "Email and plan required" });

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(400).json({ error: "Stripe not configured" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);

      const host = req.headers.origin || `https://${req.headers.host}`;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${host}/#/subscribed?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${host}/#/pricing`,
        customer_email: email,
        metadata: { email },
      });

      res.json({ checkoutUrl: session.url });
    } catch (err: any) {
      console.error("Subscribe error:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // Confirm subscription after checkout
  app.post("/api/subscribe/confirm", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ error: "Session ID required" });

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(400).json({ error: "Stripe not configured" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      if (session.payment_status !== "paid" && session.status !== "complete") {
        return res.status(402).json({ error: "Payment not confirmed" });
      }

      const email = (session.metadata?.email || session.customer_email) as string;
      const sub = session.subscription as any;

      // Determine plan from price
      const priceId = sub?.items?.data?.[0]?.price?.id;
      const planMap: Record<string, { plan: string; limit: number }> = {
        "price_1TcPrm1FcQS0y6rVjHNL4xUd": { plan: "starter", limit: 10 },
        "price_1TcPrm1FcQS0y6rV6VEX5weL": { plan: "starter", limit: 10 },
        "price_1TcPrm1FcQS0y6rVkYMD2Id3": { plan: "broker_pro", limit: 30 },
        "price_1TcPrm1FcQS0y6rVsbN1JkrC": { plan: "broker_pro", limit: 30 },
        "price_1TcPrm1FcQS0y6rVESLj2EgW": { plan: "unlimited", limit: -1 },
        "price_1TcPrn1FcQS0y6rVdJsu5fcV": { plan: "unlimited", limit: -1 },
      };
      const planInfo = planMap[priceId] || { plan: "starter", limit: 10 };

      const existing = storage.getSubscriberByEmail(email);
      if (existing) {
        storage.updateSubscriber(existing.id, {
          plan: planInfo.plan,
          stripeSubscriptionId: sub?.id,
          stripeCustomerId: session.customer as string,
          lookupsLimit: planInfo.limit,
          lookupsUsed: 0,
          billingInterval: sub?.items?.data?.[0]?.price?.recurring?.interval,
          status: "active",
          periodStart: sub?.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
          periodEnd: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        });
      } else {
        storage.createSubscriber({
          email,
          plan: planInfo.plan,
          stripeSubscriptionId: sub?.id,
          stripeCustomerId: session.customer as string,
          lookupsLimit: planInfo.limit,
          lookupsUsed: 0,
          billingInterval: sub?.items?.data?.[0]?.price?.recurring?.interval,
          status: "active",
          periodStart: sub?.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
          periodEnd: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          createdAt: new Date().toISOString(),
        });
      }

      res.json({ success: true, plan: planInfo.plan });
    } catch (err: any) {
      console.error("Subscribe confirm error:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // Create a lookup order and payment intent
  app.post("/api/lookup/create", async (req, res) => {
    try {
      const { dotNumber, email } = req.body;
      if (!dotNumber || !email) {
        return res.status(400).json({ error: "DOT number and email required" });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeKey) {
        // Demo mode
        const lookup = storage.createLookup({
          dotNumber: dotNumber.trim(),
          email: email.trim(),
          paymentStatus: "paid",
          createdAt: new Date().toISOString(),
        });
        const report = await lookupCarrier(dotNumber.trim());
        storage.updateLookupReport(lookup.id, JSON.stringify(report));
        return res.json({ lookupId: lookup.id, demoMode: true, report });
      }

      // Check if subscriber has lookups available
      let subscriber = storage.getSubscriberByEmail(email.trim());

      // New user — give free lookup
      if (!subscriber) {
        subscriber = storage.createSubscriber({
          email: email.trim(),
          plan: "free",
          lookupsUsed: 0,
          lookupsLimit: 1,
          status: "active",
          createdAt: new Date().toISOString(),
        });
      }

      const isUnlimited = subscriber.plan === "unlimited";
      const hasLookupsLeft = isUnlimited || subscriber.lookupsUsed < subscriber.lookupsLimit;

      if (hasLookupsLeft) {
        // Run free or subscription lookup
        const lookup = storage.createLookup({
          dotNumber: dotNumber.trim(),
          email: email.trim(),
          paymentStatus: subscriber.plan === "free" ? "free" : "subscription",
          createdAt: new Date().toISOString(),
        });
        storage.incrementLookupsUsed(subscriber.id);
        const report = await lookupCarrier(dotNumber.trim());
        storage.updateLookupReport(lookup.id, JSON.stringify(report));
        return res.json({
          lookupId: lookup.id,
          report,
          isFree: subscriber.plan === "free",
          plan: subscriber.plan,
        });
      }

      // No lookups left — require payment
      const lookup = storage.createLookup({
        dotNumber: dotNumber.trim(),
        email: email.trim(),
        paymentStatus: "pending",
        createdAt: new Date().toISOString(),
      });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);
      const host = req.headers.origin || `https://${req.headers.host}`;
      const successUrl = `${host}/#/report/${lookup.id}?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${host}/#/`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "FreightShield Carrier Safety Report",
              description: `Instant FMCSA report for DOT #${dotNumber}`,
            },
            unit_amount: 1200,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email,
        metadata: { lookupId: String(lookup.id), dotNumber, email },
      });

      storage.updateLookupPayment(lookup.id, session.id, "pending");

      res.json({
        lookupId: lookup.id,
        checkoutUrl: session.url,
        needsUpgrade: subscriber.plan === "free",
      });
    } catch (err: any) {
      console.error("Create lookup error:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // Confirm payment and run FMCSA lookup
  app.post("/api/lookup/confirm", async (req, res) => {
    try {
      const { lookupId, paymentIntentId } = req.body;
      const lookup = storage.getLookupById(Number(lookupId));
      if (!lookup) return res.status(404).json({ error: "Lookup not found" });

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey && paymentIntentId) {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey);
        // paymentIntentId may be a checkout session id (cs_) or payment intent id (pi_)
        if (paymentIntentId.startsWith("cs_")) {
          const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
          if (session.payment_status !== "paid") {
            return res.status(402).json({ error: "Payment not confirmed" });
          }
        } else {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (pi.status !== "succeeded") {
            return res.status(402).json({ error: "Payment not confirmed" });
          }
        }
      }

      // Run FMCSA lookup
      const report = await lookupCarrier(lookup.dotNumber);
      storage.updateLookupReport(lookup.id, JSON.stringify(report));

      res.json({ report });
    } catch (err: any) {
      console.error("Confirm lookup error:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // Get client secret for payment page
  app.get("/api/lookup/:id/secret", async (req, res) => {
    const lookup = storage.getLookupById(Number(req.params.id));
    if (!lookup) return res.status(404).json({ error: "Not found" });
    if (!lookup.stripePaymentIntentId) return res.status(404).json({ error: "No payment intent" });

    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(400).json({ error: "No Stripe key" });
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);
      const pi = await stripe.paymentIntents.retrieve(lookup.stripePaymentIntentId);
      res.json({ clientSecret: pi.client_secret });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get report by lookup ID
  app.get("/api/lookup/:id", async (req, res) => {
    const lookup = storage.getLookupById(Number(req.params.id));
    if (!lookup) return res.status(404).json({ error: "Not found" });
    const report = lookup.reportData ? JSON.parse(lookup.reportData) : null;
    res.json({ lookup, report });
  });

  // Stripe webhook
  app.post("/api/webhook/stripe", async (req, res) => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripeKey) return res.json({ received: true });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);

      let event = req.body;
      if (webhookSecret) {
        const sig = req.headers["stripe-signature"] as string;
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      }

      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;
        const lookupId = Number(pi.metadata?.lookupId);
        if (lookupId) {
          const lookup = storage.getLookupById(lookupId);
          if (lookup && lookup.paymentStatus !== "paid") {
            const report = await lookupCarrier(lookup.dotNumber);
            storage.updateLookupReport(lookupId, JSON.stringify(report));
          }
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });
}
