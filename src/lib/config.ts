import { headers as getHeaders } from "next/headers";
import { cache } from "react";
import type { AppConfig } from "../AppConfig"; // Changed to relative path

export const getRequestConfig = cache(async (): Promise<AppConfig | null> => {
  console.log("@@@ Executing getRequestConfig");
  const headerList = await getHeaders(); // Added await and used renamed import
  const configHeader = headerList.get("X-Request-Config");

  if (!configHeader) {
    console.error("X-Request-Config: header not found.");
    return null;
  }

  try {
    return JSON.parse(configHeader);
  } catch (error) {
    console.error("X-Request-Config: parse failed:", error);
    return null;
  }
});
