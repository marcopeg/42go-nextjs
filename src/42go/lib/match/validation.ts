import { apps } from "@/AppConfig";

/**
 * Validates APP_NAME environment variable at application startup
 * This should be called during application boot, not during request processing
 * Exits process if invalid app name is specified
 */
export const validateAppEnvironment = (): void => {
  // Only validate in Node.js environment (not Edge Runtime)
  if (typeof process === "undefined" || !process.exit) {
    console.warn("Boot validation skipped: not in Node.js environment");
    return;
  }

  const envAppName = process.env.APP_NAME;

  if (envAppName && !(envAppName in apps)) {
    console.error(`❌ APP_NAME validation failed:`);
    console.error(`   Specified: "${envAppName}"`);
    console.error(`   Available: ${Object.keys(apps).join(", ")}`);
    process.exit(1);
  }

  if (envAppName) {
    console.log(`✅ APP_NAME override validated: ${envAppName}`);
  }
};
