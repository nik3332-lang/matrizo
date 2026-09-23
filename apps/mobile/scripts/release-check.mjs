import { existsSync, readFileSync } from "node:fs";
const missing = [];
const env = process.env;
const { expo: config } = JSON.parse(
  readFileSync(new URL("../app.json", import.meta.url), "utf8"),
);
const projectId = env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId;
const owner = env.EXPO_OWNER || config.owner;
if (
  !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(
    projectId ?? "",
  )
)
  missing.push("EXPO_PUBLIC_EAS_PROJECT_ID: link the Matrizo Expo project");
try {
  const url = new URL(env.EXPO_PUBLIC_API_URL);
  if (
    url.protocol !== "https:" ||
    !url.pathname.endsWith("/api/v1") ||
    /localhost|127\.0\.0\.1/.test(url.hostname)
  )
    throw new Error();
} catch {
  missing.push("EXPO_PUBLIC_API_URL: HTTPS production API ending in /api/v1");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL ?? ""))
  missing.push("EXPO_PUBLIC_SUPPORT_EMAIL: monitored support mailbox");
if (!owner) missing.push("EXPO_OWNER: owner of the Expo project");
if (!env.GOOGLE_SERVICES_JSON || !existsSync(env.GOOGLE_SERVICES_JSON))
  missing.push(
    "GOOGLE_SERVICES_JSON: local path to the Android Firebase config",
  );
if (missing.length) {
  console.error(
    "Release configuration still needed:\n" +
      missing.map((x) => `- ${x}`).join("\n") +
      "\nSee docs/mobile-release.md. No deployment was attempted.",
  );
  process.exitCode = 1;
} else
  console.log(
    "Local release configuration is present. Validate credentials, physical-device flows and the launch checklist before submitting.",
  );
