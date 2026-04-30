export const getSlug = (filePath: string, basePath: string): string => {
  // Remove basePath
  let slug = filePath.includes(basePath)
    ? filePath.split(basePath).pop() || ""
    : filePath;

  // Remove leading slashes
  slug = slug.replace(/^\/+/, "");
  // Remove extension
  slug = slug.replace(/\.[^.]+$/, "");
  // Split into parts
  const parts = slug.split("/").filter(Boolean);
  // Remove trailing index/readme
  if (
    parts.length &&
    ["index", "readme"].includes(parts[parts.length - 1].toLowerCase())
  ) {
    parts.pop();
  }
  // Rejoin
  return parts.join("/");
};
