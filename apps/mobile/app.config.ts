import type { ConfigContext, ExpoConfig } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  const production = process.env.EAS_BUILD_PROFILE === "production";
  if (production) {
    if (
      !projectId ||
      !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(projectId)
    )
      throw new Error(
        "Set EXPO_PUBLIC_EAS_PROJECT_ID to the Matrizo Expo project ID.",
      );
    if (!process.env.EXPO_PUBLIC_API_URL?.startsWith("https://"))
      throw new Error("Production requires EXPO_PUBLIC_API_URL with HTTPS.");
    if (!process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.includes("@"))
      throw new Error(
        "Set a working EXPO_PUBLIC_SUPPORT_EMAIL before building for stores.",
      );
    if (process.env.EAS_BUILD_PLATFORM === "android" && !googleServicesFile)
      throw new Error(
        "Set GOOGLE_SERVICES_JSON to the Firebase config file for Android notifications.",
      );
  }
  return {
    ...config,
    name: "Matrizo",
    slug: "matrizo",
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
  };
};
