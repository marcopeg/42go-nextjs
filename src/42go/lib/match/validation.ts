import { apps } from "@/AppConfig";

/**
 * Validates APP_ID environment variable at application startup
 * This should be called during application boot, not during request processing
 * Exits process if invalid app name is specified
 */
export const validateAppEnvironment = (): void => {
  // Only validate in Node.js environment (not Edge Runtime)
  if (typeof process === "undefined" || !process.exit) {
    console.warn("Boot validation skipped: not in Node.js environment");
    return;
  }

  const envAppId = process.env.APP_ID;

  if (envAppId && !(envAppId in apps)) {
    console.error(`❌ APP_ID validation failed:`);
    console.error(`   Specified: "${envAppId}"`);
    console.error(`   Available: ${Object.keys(apps).join(", ")}`);
    process.exit(1);
  }

  if (envAppId) {
    console.log(`✅ APP_ID override validated: ${envAppId}`);
  }
};
