import { headers as getHeaders } from "next/headers";
import { cache } from "react";
import {
  type AppConfig,
  type SetupName,
  DEFAULT_SETUP_NAME,
} from "../AppConfig.type"; // Removed .ts
import { setups } from "../AppConfig"; // Removed .ts

export const getRequestConfig = cache(async (): Promise<AppConfig | null> => {
  console.log("Executing getRequestConfig (setup name based)");
  const headerList = await getHeaders();
  const setupNameHeader = headerList.get("X-App-Name"); // Changed header name

  if (!setupNameHeader) {
    console.warn(
      `X-App-Name header not found, using default setup: ${DEFAULT_SETUP_NAME}` // Updated log
    );
    return setups[DEFAULT_SETUP_NAME] || null;
  }

  const setupName = setupNameHeader as SetupName;

  if (setups[setupName]) {
    return setups[setupName];
  } else {
    console.warn(
      `No setup found for name: ${setupName}, using default: ${DEFAULT_SETUP_NAME}`
    );
    return setups[DEFAULT_SETUP_NAME] || null;
  }
});
