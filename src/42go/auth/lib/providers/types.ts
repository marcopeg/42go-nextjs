/**
 * Authentication Provider Type System
 *
 * Defines type-safe provider configurations for multi-app OAuth support.
 * Each AppConfig can specify different auth providers with their own credentials.
 */

// Core provider types supported by the system
export type AuthProviderType = "credentials" | "github" | "google";

// Provider-specific configuration interfaces
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CredentialsProviderConfig {
  // No configuration needed - provider behavior is hardcoded
  // This interface exists for type safety and explicit enabling
}

export interface GitHubProviderConfig {
  clientId: string;
  clientSecret: string;
  domain?: string; // Optional override for redirect URI
}

export interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
  domain?: string; // Optional override for redirect URI
  prompt?: "select_account" | "consent" | "none";
}

// Type mapping for provider configs
export type ProviderConfig<T extends AuthProviderType> = T extends "credentials"
  ? CredentialsProviderConfig
  : T extends "github"
  ? GitHubProviderConfig
  : T extends "google"
  ? GoogleProviderConfig
  : never;

// Generic provider interface with type safety
export interface AuthProvider<T extends AuthProviderType = AuthProviderType> {
  type: T;
  config: ProviderConfig<T>;
}

// Specific provider types for better type inference
export type CredentialsProvider = AuthProvider<"credentials">;
export type GitHubProvider = AuthProvider<"github">;
export type GoogleProvider = AuthProvider<"google">;

// Union type for all possible providers
export type AnyAuthProvider =
  | CredentialsProvider
  | GitHubProvider
  | GoogleProvider;

// Helper type for provider arrays in AppConfig
export type TAuthProviders = AnyAuthProvider[];

// Extend NextAuth's session type to include our custom user fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      grants: string[];
      roles: string[];
      appId: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    grants: string[];
    roles: string[];
    appId: string;
  }
}
