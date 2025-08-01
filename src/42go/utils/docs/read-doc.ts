import { getAppConfig } from "@/lib/config/app-config";

import { read, type MDFile } from "../md";
import { getSlug } from "./get-slug";

export interface DocFile extends MDFile {
  slug: string;
}

export const readDoc = async (filePath: string): Promise<DocFile | null> => {
  const config = await getAppConfig();
  const docsDirectory = config?.public?.docs?.source;
  const cacheDuration = config?.public?.docs?.cache?.duration;

  const file = await read([docsDirectory, filePath].join("/"), cacheDuration);
  if (file === null) return null;

  return {
    ...file,
    slug: getSlug(file.path, docsDirectory!),
  } as DocFile;
};
