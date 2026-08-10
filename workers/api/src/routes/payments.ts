import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { getDb } from '../db/client';
import { orders } from '../db/schema';
import type { Env } from '../env';
import { verifyRazorpayWebhookSignature } from '../lib/razorpay';

export const paymentRoutes = new Hono<{ Bindings: Env }>();

paymentRoutes.post('/razorpay/webhook', async (c) => {
  const signature = c.req.header('X-Razorpay-Signature');
  const rawBody = await c.req.text();

  if (!signature || !(await verifyRazorpayWebhookSignature(c.env, rawBody, signature))) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string } } };
  };
  const razorpayOrderId = payload.payload?.payment?.entity?.order_id;

  if (razorpayOrderId && payload.event === 'payment.captured') {
    const db = getDb(c.env.DB);
    await db
      .update(orders)
      .set({ paymentStatus: 'paid', status: 'confirmed' })
      .where(eq(orders.razorpayOrderId, razorpayOrderId));
  }

  return c.json({ received: true });
});
