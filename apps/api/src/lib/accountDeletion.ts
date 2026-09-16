import type { Env } from "../env";

// Close access immediately. Keep only the contact/address details needed to
// finish an existing delivery; this function erases them automatically afterward.
export async function finalizeAccountDeletions(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const eligible = `SELECT u.id FROM users u WHERE u.role='customer'
    AND u.deletion_requested_at IS NOT NULL AND u.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id=u.id AND o.status NOT IN ('delivered','cancelled'))`;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM cart_items WHERE user_id IN (${eligible})`),
    env.DB.prepare(`DELETE FROM push_devices WHERE user_id IN (${eligible})`),
    env.DB.prepare(
      `DELETE FROM auth_challenges WHERE user_id IN (${eligible})`,
    ),
    env.DB.prepare(
      `DELETE FROM addresses WHERE user_id IN (${eligible}) AND NOT EXISTS (SELECT 1 FROM orders WHERE address_id=addresses.id)`,
    ),
    env.DB.prepare(
      `UPDATE addresses SET label=NULL,line1='[removed]',line2=NULL,city='[removed]',state='[removed]',pincode='000000',is_default=0 WHERE user_id IN (${eligible})`,
    ),
    env.DB.prepare(
      `UPDATE wallet_transactions SET note=NULL WHERE user_id IN (${eligible})`,
    ),
    env.DB.prepare(
      `UPDATE order_status_events SET note=NULL WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (${eligible}))`,
    ),
    env.DB.prepare(
      `UPDATE users SET name='Deleted customer',phone=NULL,email=NULL,password_hash=NULL,active=0,deleted_at=? WHERE id IN (${eligible})`,
    ).bind(now),
  ]);
}
