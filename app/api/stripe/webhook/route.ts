import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

// Stripe SDK needs Node (not edge); never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A subscription is "active" (Pro) when Stripe reports these statuses.
const PRO_STATUSES = new Set(["active", "trialing"]);

// Flip is_pro for the profile that owns this Stripe customer.
async function setProByCustomer(customerId: string, isPro: boolean) {
  await supabaseAdmin()
    .from("profiles")
    .update({ is_pro: isPro })
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) {
    return NextResponse.json({ error: "not configured" }, { status: 400 });
  }

  // Signature verification requires the RAW request body.
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `signature verification failed: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        // client_reference_id is the Supabase user id — ensures the profile is
        // linked to the customer even if the customer was created out-of-band.
        const userId = session.client_reference_id;
        if (customerId && userId) {
          await supabaseAdmin()
            .from("profiles")
            .update({ stripe_customer_id: customerId, is_pro: true })
            .eq("id", userId);
        } else if (customerId) {
          await setProByCustomer(customerId, true);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await setProByCustomer(
          sub.customer as string,
          PRO_STATUSES.has(sub.status)
        );
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await setProByCustomer(sub.customer as string, false);
        break;
      }
      default:
        break; // ignore other event types
    }
  } catch (e) {
    // Log and 500 so Stripe retries — never leave is_pro wrong on a transient
    // DB blip.
    // eslint-disable-next-line no-console
    console.error("[stripe webhook] handler error:", (e as Error).message);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
