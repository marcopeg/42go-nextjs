"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

import { AppLayout } from "@/42go/layouts/app";
import type { Policy } from "@/42go/policy/types";
import { decodeReaderSlug } from "@/lib/lingocafe/slug";
import { QuestionnaireExperience } from "@/app/(app)/(lingocafe)/books/_components/QuestionnaireExperience";

const QUESTIONNAIRE_PAGE_POLICY: Policy = {
  require: { feature: "page:books", session: true },
};

const QuestionnairePage = () => {
  const params = useParams<{ bookId: string | string[] }>();
  const bookId = decodeReaderSlug(params?.bookId);

  return (
    <AppLayout
      title=""
      hideHeader
      hideMobileMenu
      disablePadding
      policy={QUESTIONNAIRE_PAGE_POLICY}
    >
      {bookId ? (
        <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading questionnaire...</p>}>
          <QuestionnaireExperience bookId={bookId} />
        </Suspense>
      ) : null}
    </AppLayout>
  );
};

export default QuestionnairePage;
