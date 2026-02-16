import { Suspense } from "react";
import { AuthError } from "@/42go/auth/components/AuthError";
import {
  CredentialsLogin,
  GitHubLogin,
  GoogleLogin,
} from "@/42go/auth/components/login-strategies";
import { getAppConfig } from "@/42go/config/app-config";

const safeInternalPath = (input?: string | null): string | null => {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.includes("://") || trimmed.includes("\\")) return null;
  // normalize duplicate slashes (except protocol which we don't allow anyway)
  return trimmed.replace(/\/+/, "/");
};

export default async function LoginPage() {
  const appConfig = await getAppConfig();
  const fallback = "/dashboard";
  const configured = appConfig?.app?.default?.page ?? null;
  const callbackUrl = safeInternalPath(configured) ?? fallback;
  const providers: string[] =
    appConfig?.auth?.providers.map((provider) => provider.type) || [];

  let tabIndex = 0;
  const socialLogins = providers
    .map((name) => {
      if (name === "github") {
        return (
          <GitHubLogin
            key="github"
            tabIndex={(tabIndex += 1)}
            callbackUrl={callbackUrl}
          />
        );
      }

      if (name === "google") {
        return (
          <GoogleLogin
            key="google"
            tabIndex={(tabIndex += 1)}
            callbackUrl={callbackUrl}
          />
        );
      }

      return null;
    })
    .filter((_) => _ !== null);

  return (
    <div className="login-page max-w-md mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>

      {/* Error Display */}
      <Suspense fallback={null}>
        <AuthError />
      </Suspense>

      {/* OAuth Section */}
      {socialLogins.length > 0 && (
        <div className="mb-6 space-y-3">
          {socialLogins.map((LoginComponent) => (
            <div key={LoginComponent.key} className="w-full">
              {LoginComponent}
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      {socialLogins.length > 0 && providers.includes("credentials") && (
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
              Or continue with credentials
            </span>
          </div>
        </div>
      )}

      {/* Credentials Form */}
      {providers.includes("credentials") && (
        <div className="w-full">
          <CredentialsLogin tabIndex={tabIndex} callbackUrl={callbackUrl} />
        </div>
      )}
    </div>
  );
}
