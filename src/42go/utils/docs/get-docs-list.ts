import { notFound } from "next/navigation";
import { getAppConfig } from "@/lib/config/app-config";
import { scanDir } from "../md";
import { getSlug } from "./get-slug";

export const getDocsList = async () => {
  const config = await getAppConfig();
  const docsPath = config?.public?.docs?.source;
  const cacheDuration = config?.public?.docs?.cache?.duration;

  if (!docsPath) {
    notFound();
  }

  const files = await scanDir(docsPath!, cacheDuration);
  return files
    ?.map((file) => ({
      ...file,
      slug: getSlug(file.path, docsPath),
    }))
    .filter((file) => file.slug.toLowerCase() !== "sidebar");
};
