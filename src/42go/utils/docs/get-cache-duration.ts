import { getAppConfig } from "@/lib/config/app-config";

export const getCacheDuration = async () => {
  const config = await getAppConfig();
  return config?.public?.docs?.cache?.duration ?? 0;
};
