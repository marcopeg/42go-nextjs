"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  createContext,
  useContext,
  useEffect,
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
import { ConversationListSkeleton } from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import { clearConversationBrowseCache } from "@/app/(app)/(lingocafe)/conversations/_components/conversation-browse-cache";

type ConversationLibraryContextValue = {
  cacheScope: string | null;
  preferenceRevision: number;
  reportProfile: (profile: ConversationProfile) => void;
  reportNavigation: (navigation: ConversationLibraryNavigation) => void;
  navigateToCategory: (navigation: ConversationCategoryNavigation) => void;
};

type ConversationLibraryNavigation = {
  title: string;
  subtitle?: string;
  backTo?: string;
};

type ConversationCategoryNavigation = {
  href: string;
  title: string;
  backTo: string;
};

const ConversationLibraryContext = createContext<ConversationLibraryContextValue | null>(null);

export const useConversationLibraryShell = () => {
  const value = useContext(ConversationLibraryContext);
  if (!value) throw new Error("Conversation library pages must render inside their library shell.");
  return value;
};

export const ConversationLibraryShell = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBand = searchParams.get("band");
  const [profile, setProfile] = useState<ConversationProfile | null>(null);
  const [preferenceRevision, setPreferenceRevision] = useState(0);
  const [navigation, setNavigation] = useState<ConversationLibraryNavigation>({
    title: "Conversations",
    subtitle: "Pick an everyday situation to practice.",
  });
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const band: ConversationBand = isConversationBand(requestedBand)
    ? requestedBand
    : profile?.defaultBand ?? "intermediate";
  const transitionKey = pendingHref?.split("?")[0] ?? pathname;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) return;
    const pendingPath = new URL(pendingHref, window.location.origin).pathname;
    if (pendingPath === pathname) queueMicrotask(() => setPendingHref(null));
    const recovery = window.setTimeout(() => setPendingHref(null), 10_000);
    return () => window.clearTimeout(recovery);
  }, [pathname, pendingHref]);

  const navigateToCategory = ({ href, title, backTo }: ConversationCategoryNavigation) => {
    setNavigation({ title, backTo });
    setPendingHref(href);
    router.push(href, { scroll: false });
  };

  const preferenceSaved = (patch: LanguagePreferencePatch) => {
    if (patch.targetLang) {
      const targetLanguage = patch.targetLang;
      if (session?.user?.id) clearConversationBrowseCache(session.user.id);
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
      title={navigation.title}
      subtitle={navigation.subtitle}
      pageWidth="content"
      backBtn={navigation.backTo ? { to: navigation.backTo } : undefined}
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
      policy={CONVERSATIONS_POLICY}
    >
      <ConversationLibraryContext.Provider
        value={{
          cacheScope: session?.user?.id ?? null,
          preferenceRevision,
          reportProfile: setProfile,
          reportNavigation: setNavigation,
          navigateToCategory,
        }}
      >
        <div className="min-h-[calc(100dvh+6rem)] min-w-0 overflow-x-clip md:min-h-full">
          <div
            key={transitionKey}
            className="min-w-0 animate-in fade-in-0 slide-in-from-right-4 duration-200 ease-out motion-reduce:animate-none"
          >
            {pendingHref ? <ConversationListSkeleton /> : children}
          </div>
          <div
            aria-hidden="true"
            className="h-[max(30vw,calc(4rem+env(safe-area-inset-bottom)))] shrink-0 md:hidden"
          />
        </div>
      </ConversationLibraryContext.Provider>
    </AppLayout>
  );
};
