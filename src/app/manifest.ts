import type { MetadataRoute } from "next";
import { getAppConfig } from "@/42go/config/app-config";
import type { TPWAConfig } from "@/42go/pwa/types";
import { resolvePWAColor, type TColorInput } from "@/42go/pwa/colors";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getAppConfig();
  const pwa: TPWAConfig | undefined = config?.public?.pwa as
    | TPWAConfig
    | undefined;

  const name = pwa?.name || config?.name || "App";
  const short_name = pwa?.shortName || name;
  const themeColorInput = pwa?.themeColor as TColorInput | undefined;
  const backgroundColorInput = pwa?.backgroundColor as TColorInput | undefined;
  const theme_color = resolvePWAColor(themeColorInput) || "#000000";
  const background_color = resolvePWAColor(backgroundColorInput) || "#ffffff";
  const start_url = pwa?.startUrl || "/";
  const scope = pwa?.scope || "/";
  const display = pwa?.display || "standalone";

  const icons: MetadataRoute.Manifest["icons"] = [];
  if (pwa?.icons?.manifest192) {
    icons.push({
      src: pwa.icons.manifest192,
      sizes: "192x192",
      type: "image/png",
    });
  }
  if (pwa?.icons?.manifest512) {
    icons.push({
      src: pwa.icons.manifest512,
      sizes: "512x512",
      type: "image/png",
    });
  }
  if (pwa?.icons?.maskable512) {
    icons.push({
      src: pwa.icons.maskable512,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    });
  }

  return {
    name,
    short_name,
    description: pwa?.description,
    theme_color,
    background_color,
    start_url,
    scope,
    display,
    icons,
  };
}
