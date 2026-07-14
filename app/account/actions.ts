"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { stripe, stripePriceId } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

function siteOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://peekaboor6.com";
}

// Find (or create) the Stripe customer for a Supabase user, storing the id on
// their profile so future subscribes reuse the same customer and the webhook
// can map events back. Writes with the service role (RLS blocks client writes
// to profiles by design).
async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;

  const customer = await stripe().customers.create({
    email: email || undefined,
    metadata: { supabase_user_id: userId },
  });
  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  return customer.id;
}

// Start a Pro subscription checkout. Logged-in users only; the user id rides
// along as client_reference_id + subscription metadata so the webhook can flip
// the right profile's is_pro.
export async function createCheckoutSession() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customerId = await getOrCreateCustomer(user.id, user.email);
  const origin = siteOrigin();

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: stripePriceId(), quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { supabase_user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/account?upgraded=1`,
    cancel_url: `${origin}/account`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(session.url);
}

// Open the Stripe Billing Portal so the user can manage / cancel / resume.
export async function createPortalSession() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const customerId = data?.stripe_customer_id as string | undefined;
  if (!customerId) redirect("/account");

  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteOrigin()}/account`,
  });
  redirect(session.url);
}
