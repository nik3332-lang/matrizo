import Link from "next/link";
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@matrizo/shared";
export const metadata = {
  title: "Privacy policy | Matrizo",
  description:
    "How Matrizo uses your information and how to manage or delete your account.",
};
export default function Privacy() {
  return (
    <article className="policy-page">
      <p className="eyebrow">Your information, with care</p>
      <h1>Privacy at Matrizo</h1>
      <p>Updated {PRIVACY_UPDATED}</p>
      {PRIVACY_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <p>
        <Link href="/delete-account">
          Delete your account and personal data
        </Link>{" "}
        · <Link href="/support">Contact & support</Link>
      </p>
    </article>
  );
}
