import { AuthError } from "@/components/auth/AuthError";
import {
  CredentialsLogin,
  GitHubLogin,
  GoogleLogin,
} from "@/components/auth/login-strategies";
import { getAppConfig } from "@/lib/config/app-config";

export default async function LoginPage() {
  const appConfig = await getAppConfig();
  const providers: string[] =
    appConfig?.auth?.providers.map((provider) => provider.type) || [];

  let tabIndex = 0;
  const socialLogins = providers
    .map((name) => {
      if (name === "github") {
        return <GitHubLogin key="github" tabIndex={(tabIndex += 1)} />;
      }

      if (name === "google") {
        return <GoogleLogin key="google" tabIndex={(tabIndex += 1)} />;
      }

      return null;
    })
    .filter((_) => _ !== null);

  return (
    <div className="login-page max-w-md mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>

      {/* Error Display */}
      <AuthError />

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
          <CredentialsLogin tabIndex={tabIndex} />
        </div>
      )}
    </div>
  );
}
