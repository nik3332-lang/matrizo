import Link from "next/link";
export const metadata = { title: "Help & support | Matrizo" };
export default function Support() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <article className="policy-page">
      <p className="eyebrow">Here for your next project</p>
      <h1>How can we help?</h1>
      <section>
        <h2>An existing order</h2>
        <p>
          <Link href="/orders">Open your orders</Link> to see the latest
          progress. Cancellation is available while the order is placed or
          confirmed, before packing begins. For other issues, include your order
          reference when contacting us.
        </p>
      </section>
      <section>
        <h2>Account access</h2>
        <p>
          Sign in using your email or mobile number and password.{" "}
          <Link href="/forgot-password">Email password recovery</Link> is
          available when the email service is enabled.
        </p>
      </section>
      <section>
        <h2>Contact Matrizo</h2>
        {email ? (
          <p>
            Email <a href={`mailto:${email}`}>{email}</a> with your order
            reference and a description of the issue. Never share your password
            or reset code.
          </p>
        ) : (
          <p>
            Support contact details will be published before the app launches.
          </p>
        )}
      </section>
      <p>
        <Link href="/privacy">Privacy policy</Link> ·{" "}
        <Link href="/delete-account">Delete account & personal data</Link>
      </p>
    </article>
  );
}
