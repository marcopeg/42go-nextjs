import type { TAppQrConfig } from "@/AppConfig";

export const resolveQrDestination = ({
  qr,
  href,
  origin,
}: {
  qr: TAppQrConfig;
  href: string;
  origin: string;
}) => {
  if (qr.url) return qr.url;

  const shouldUsePageUrl = qr.pageURL?.some((pattern) => {
    try {
      return new RegExp(pattern).test(href);
    } catch {
      return false;
    }
  });

  if (shouldUsePageUrl) return href;

  return `${origin.replace(/\/+$/, "")}/`;
};
