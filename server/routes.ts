import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import axios from "axios";

// FMCSA lookup using public SAFER API
async function lookupCarrier(dotNumber: string) {
  try {
    // Use FMCSA SAFER web service
    const url = `https://safer.fmcsa.dot.gov/query.asp?query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${dotNumber}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "FreightShield/1.0" }
    });

    const html = response.data as string;

    // Parse key fields from HTML response
    const extract = (label: string, html: string): string => {
      const regex = new RegExp(`${label}[^<]*<[^>]+>([^<]+)<`, "i");
      const match = html.match(regex);
      return match ? match[1].trim() : "Not Available";
    };

    // Check for inactive record
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

    // Extract carrier name
    const nameMatch = html.match(/Legal Name:<\/td>\s*<td[^>]*>([^<]+)</i);
    const name = nameMatch ? nameMatch[1].trim() : "Not Found";

    // Extract USDOT status
    const statusMatch = html.match(/USDOT Status:<\/td>\s*<td[^>]*>([^<]+)</i);
    const usdotStatus = statusMatch ? statusMatch[1].trim() : "Unknown";

    // Extract safety rating
    const ratingMatch = html.match(/Safety Rating:<\/td>\s*<td[^>]*>([^<]+)</i);
    const safetyRating = ratingMatch ? ratingMatch[1].trim() : "None Assigned";

    // Extract MC number
    const mcMatch = html.match(/Docket Number:<\/td>\s*<td[^>]*>([^<]+)</i);
    const mcNumber = mcMatch ? mcMatch[1].trim() : "Not Available";

    // Extract power units
    const unitsMatch = html.match(/Power Units:<\/td>\s*<td[^>]*>([^<]+)</i);
    const powerUnits = unitsMatch ? unitsMatch[1].trim() : "Not Available";

    // Extract drivers
    const driversMatch = html.match(/Drivers:<\/td>\s*<td[^>]*>([^<]+)</i);
    const drivers = driversMatch ? driversMatch[1].trim() : "Not Available";

    // Extract address
    const addrMatch = html.match(/Physical Address:<\/td>\s*<td[^>]*>([^<]+)</i);
    const address = addrMatch ? addrMatch[1].trim() : "Not Available";

    // Extract crashes
    const crashMatch = html.match(/Total Crashes[^<]*<[^>]+>(\d+)/i);
    const crashes = crashMatch ? crashMatch[1] : "0";

    // Extract OOS rate vehicle
    const oosVehicleMatch = html.match(/Vehicle OOS Rate[^<]*<[^>]+>([\d.]+)%/i);
    const oosVehicle = oosVehicleMatch ? oosVehicleMatch[1] + "%" : "0%";

    // Extract OOS rate driver
    const oosDriverMatch = html.match(/Driver OOS Rate[^<]*<[^>]+>([\d.]+)%/i);
    const oosDriver = oosDriverMatch ? oosDriverMatch[1] + "%" : "0%";

    // Determine recommendation
    const isInactive = usdotStatus.toLowerCase().includes("inactive") || usdotStatus.toLowerCase().includes("out");
    const isBadRating = safetyRating.toLowerCase().includes("unsatisfactory") || safetyRating.toLowerCase().includes("conditional");
    const recommendation = isInactive || isBadRating ? "NO-GO" : "CLEAR";
    const reason = isInactive
      ? "Carrier authority is INACTIVE — not legally authorized to haul freight"
      : isBadRating
      ? `Safety rating is ${safetyRating} — elevated risk carrier`
      : "No major red flags detected in FMCSA records";

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

  // Create a lookup order and payment intent
  app.post("/api/lookup/create", async (req, res) => {
    try {
      const { dotNumber, email } = req.body;
      if (!dotNumber || !email) {
        return res.status(400).json({ error: "DOT number and email required" });
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;

      // Create lookup record
      const lookup = storage.createLookup({
        dotNumber: dotNumber.trim(),
        email: email.trim(),
        paymentStatus: stripeKey ? "pending" : "paid", // skip payment if no Stripe key
        createdAt: new Date().toISOString(),
      });

      if (!stripeKey) {
        // No Stripe — run lookup immediately (demo mode)
        const report = await lookupCarrier(dotNumber.trim());
        storage.updateLookupReport(lookup.id, JSON.stringify(report));
        return res.json({ lookupId: lookup.id, demoMode: true, report });
      }

      // Create Stripe Checkout Session
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);

      // Build the base URL from the request
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
            unit_amount: 1200, // $12.00
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
