import type { MetadataRoute } from "next";

import type { TPWAResolvedInstallTarget } from "@/42go/pwa/types";

export const buildPWAManifest = (
  target: TPWAResolvedInstallTarget
): MetadataRoute.Manifest => ({
  id: target.id,
  name: target.name,
  short_name: target.shortName,
  description: target.description,
  theme_color: target.themeColor,
  background_color: target.backgroundColor,
  start_url: target.startUrl,
  scope: target.scope,
  display: target.display,
  icons: [
    {
      src: target.icons.manifest192,
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: target.icons.manifest512,
      sizes: "512x512",
      type: "image/png",
    },
    {
      src: target.icons.maskable512,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
});

export const createPWAManifestResponse = (
  target: TPWAResolvedInstallTarget
) =>
  Response.json(buildPWAManifest(target), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": target.private
        ? "private, no-store"
        : "public, max-age=0, must-revalidate",
      ...(target.private ? { Vary: "Cookie" } : {}),
    },
  });
