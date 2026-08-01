import path from "node:path";

export const getQuickSharePublicationRoot = (appId: string) => {
  const configuredRoot = process.env.QUICKSHARE_PUBLICATION_ROOT ?? path.join(process.cwd(), ".quickshare-public");
  // The production public origin mounts only `quickshare`. Local default-app
  // testing gets a physically separate projection and can never leak into it.
  return appId === "quickshare" ? configuredRoot : path.join(configuredRoot, "_development", appId);
};

export const getQuickSharePublicOrigin = () => process.env.QUICKSHARE_PUBLIC_ORIGIN ?? "https://s.42go.dev";
