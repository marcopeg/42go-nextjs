"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppLayout } from "@/42go/layouts/app";
import {
  LanguagePreferencesMenu,
  type LanguagePreferencePatch,
} from "@/app/(app)/(lingocafe)/_components/LanguagePreferencesMenu";
import {
  CONVERSATIONS_POLICY,
  buildBandHref,
  isConversationBand,
  type ConversationBand,
  type ConversationProfile,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";

type ConversationLibraryContextValue = {
  preferenceRevision: number;
  reportProfile: (profile: ConversationProfile) => void;
};

const ConversationLibraryContext = createContext<ConversationLibraryContextValue | null>(null);

export const useConversationLibraryShell = () => {
  const value = useContext(ConversationLibraryContext);
  if (!value) throw new Error("Conversation library pages must render inside their library shell.");
  return value;
};

export const ConversationLibraryShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBand = searchParams.get("band");
  const [profile, setProfile] = useState<ConversationProfile | null>(null);
  const [preferenceRevision, setPreferenceRevision] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const band: ConversationBand = isConversationBand(requestedBand)
    ? requestedBand
    : profile?.defaultBand ?? "intermediate";

  useEffect(() => {
    contentRef.current?.closest("main")?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  const preferenceSaved = (patch: LanguagePreferencePatch) => {
    if (patch.targetLang) {
      const targetLanguage = patch.targetLang;
      setProfile((current) => current ? { ...current, targetLanguage } : current);
      setPreferenceRevision((current) => current + 1);
    }
    if (patch.targetLevel) {
      const targetLevel = patch.targetLevel;
      const nextBand: ConversationBand = targetLevel === "a1"
        ? "beginner"
        : targetLevel === "b2"
          ? "advanced"
          : "intermediate";
      setProfile((current) => current
        ? { ...current, targetLevel, defaultBand: nextBand }
        : current);
      router.replace(buildBandHref(pathname, nextBand), { scroll: false });
    }
  };

  return (
    <AppLayout
      title="Conversations"
      subtitle="Pick an everyday situation to practice."
      actions={profile ? [{
        type: "component",
        component: LanguagePreferencesMenu,
        props: {
          targetLanguage: profile.targetLanguage,
          band,
          onSaved: preferenceSaved,
        },
      }] : []}
      stickyHeader
      disablePadding
      containedMobileScroll
      policy={CONVERSATIONS_POLICY}
    >
      <ConversationLibraryContext.Provider value={{ preferenceRevision, reportProfile: setProfile }}>
        <div className="overflow-x-clip" ref={contentRef}>
          <div
            key={pathname}
            className="animate-in fade-in-0 slide-in-from-right-4 duration-200 ease-out motion-reduce:animate-none"
          >
            {children}
          </div>
        </div>
      </ConversationLibraryContext.Provider>
    </AppLayout>
  );
};
