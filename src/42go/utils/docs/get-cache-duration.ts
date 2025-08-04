import { getAppConfig } from "@/42go/config/app-config";

export const getCacheDuration = async () => {
  const config = await getAppConfig();
  return config?.public?.docs?.cache?.duration ?? 0;
};
