"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import type { TAppQrConfig } from "@/AppConfig";
import { useAppConfig } from "@/42go/config/use-app-config";
import { resolveQrDestination } from "./qr-destination";

const PHONE_LANDSCAPE_QUERY =
  "(orientation: landscape) and (hover: none) and (pointer: coarse) and (max-width: 960px) and (max-height: 540px)";

const usePhoneLandscapeMatch = () => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(PHONE_LANDSCAPE_QUERY);
    const updateMatch = () => setMatches(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);

    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, []);

  return matches;
};

const overlayLayoutClass = (
  position: NonNullable<TAppQrConfig["title"]>["position"] = "top"
) => {
  const classes = {
    top: "flex-col",
    bottom: "flex-col-reverse",
    left: "flex-row",
    right: "flex-row-reverse",
  };

  return classes[position];
};

const titleAlignmentClass = (
  alignment: NonNullable<TAppQrConfig["title"]>["alignment"] = "center"
) => {
  const classes = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return classes[alignment];
};

const iconAlignmentClass = (
  alignment: NonNullable<
    NonNullable<TAppQrConfig["title"]>["icon"]
  >["alignment"] = "center"
) => {
  const classes = {
    left: "self-start",
    center: "self-center",
    right: "self-end",
  };

  return classes[alignment];
};

const titleContentLayoutClass = (
  position: NonNullable<
    NonNullable<TAppQrConfig["title"]>["icon"]
  >["position"] = "left"
) => {
  const classes = {
    top: "flex-col",
    bottom: "flex-col-reverse",
    left: "flex-row",
    right: "flex-row-reverse",
  };

  return classes[position];
};

const AppQrTitle = ({ title }: { title: TAppQrConfig["title"] }) => {
  const text = title?.text?.trim();
  const icon = title?.icon;
  const iconSrc = icon?.src?.trim();

  if (!text && !iconSrc) return null;

  return (
    <div
      data-app-qr-title="true"
      className={`flex max-w-[40vw] items-center justify-center ${titleContentLayoutClass(
        icon?.position
      )} gap-4 ${titleAlignmentClass(title?.alignment)}`}
    >
      {iconSrc ? (
        <Image
          src={iconSrc}
          alt={icon?.alt || ""}
          width={112}
          height={112}
          className={`h-24 w-24 object-contain ${iconAlignmentClass(
            icon?.alignment
          )}`}
          priority
        />
      ) : null}
      {text ? (
        <div className="text-balance text-3xl font-semibold leading-tight text-foreground">
          {text}
        </div>
      ) : null}
    </div>
  );
};

export const AppQrOverlay = () => {
  const config = useAppConfig();
  const pathname = usePathname();
  const isPhoneLandscape = usePhoneLandscapeMatch();
  const qr = config?.qr;

  const destination = useMemo(() => {
    void pathname;

    if (!qr?.active || typeof window === "undefined") return null;

    return resolveQrDestination({
      qr,
      href: window.location.href,
      origin: window.location.origin,
    });
  }, [qr, pathname]);

  if (!qr?.active || !isPhoneLandscape || !destination) return null;

  return (
    <div
      aria-hidden="true"
      data-app-qr-overlay="true"
      className={`fixed inset-0 z-[2147483647] flex min-h-dvh items-center justify-center gap-10 bg-background p-8 ${overlayLayoutClass(
        qr.title?.position
      )}`}
    >
      <AppQrTitle title={qr.title} />
      <QRCodeSVG
        value={destination}
        size={280}
        marginSize={2}
        className="h-[min(62vmin,280px)] w-[min(62vmin,280px)] shrink-0"
      />
    </div>
  );
};
