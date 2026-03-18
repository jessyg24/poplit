import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ENTRY_FEE_CENTS } from "@poplit/core/constants";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

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

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: ENTRY_FEE_CENTS,
          product_data: {
            name: "PopLit Entry Fee",
            description: "One story submission to the current Popcycle",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id,
      popcycle_id,
      story_id,
    },
    success_url: `${siteUrl}/submit/success?story_id=${story_id}`,
    cancel_url: `${siteUrl}/submit/cancel?story_id=${story_id}`,
  });

  return NextResponse.json({ url: session.url });
}
