import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.POPLIT_STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.POPLIT_STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const storyId = session.metadata?.story_id;
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      if (storyId) {
        await supabase
          .from("stories")
          .update({
            status: "pending_review",
            payment_intent_id: paymentIntentId,
          })
          .eq("id", storyId)
          .eq("status", "draft"); // only promote drafts
      }
      break;
    }

    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const storyId = pi.metadata.story_id;
      if (storyId) {
        await supabase
          .from("stories")
          .update({ status: "pending_review", payment_intent_id: pi.id })
          .eq("id", storyId)
          .eq("status", "draft");
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (user) {
        const tier = sub.metadata.tier as "tier_1" | "tier_2" || "tier_1";
        await supabase.from("subscriptions").upsert({
          user_id: user.id,
          tier,
          status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
          stripe_subscription_id: sub.id,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }, { onConflict: "stripe_subscription_id" });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
