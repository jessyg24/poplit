import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ENTRY_FEE_CENTS } from "@poplit/core/constants";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { popcycle_id, story_id } = await request.json();
  if (!popcycle_id || !story_id) {
    return NextResponse.json({ error: "Missing popcycle_id or story_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: ENTRY_FEE_CENTS,
    currency: "usd",
    customer: customerId,
    metadata: {
      user_id: user.id,
      popcycle_id,
      story_id,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
