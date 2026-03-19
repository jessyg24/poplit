import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.POPLIT_STRIPE_SECRET_KEY!);
}

const PRICE_IDS: Record<string, string | undefined> = {
  monthly: process.env.POPLIT_STRIPE_PRICE_MONTHLY,
  annual: process.env.POPLIT_STRIPE_PRICE_ANNUAL,
  single: process.env.POPLIT_STRIPE_PRICE_SINGLE,
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await request.json();
  if (!plan || !["monthly", "annual", "single"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://poplit.io";
  const stripe = getStripe();

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured for this plan" },
      { status: 500 },
    );
  }

  const isSubscription = plan === "monthly" || plan === "annual";

  const session = await stripe.checkout.sessions.create({
    mode: isSubscription ? "subscription" : "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      user_id: user.id,
      ...(isSubscription
        ? { tier: plan === "monthly" ? "tier_1" : "tier_2" }
        : { type: "credit_purchase" }),
    },
    ...(isSubscription && {
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: plan === "monthly" ? "tier_1" : "tier_2",
        },
      },
    }),
    success_url: `${siteUrl}/?tab=${isSubscription ? "billing" : "credits"}&status=success`,
    cancel_url: `${siteUrl}/?tab=${isSubscription ? "billing" : "credits"}&status=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
