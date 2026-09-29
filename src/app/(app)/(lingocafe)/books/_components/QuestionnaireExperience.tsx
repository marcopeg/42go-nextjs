"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Trophy,
  X,
} from "lucide-react";

import {
  getCurrentQuestionnaireItem,
  getSelectedQuestionnaireOption,
  getWrongQuestionnaireItems,
  normalizeQuestionnaireRound,
  type QuestionnaireRound,
  type QuestionnaireRoundItem,
} from "@/app/(app)/(lingocafe)/books/_components/questionnaire-model";
import { Button } from "@/components/ui/button";
import { Modal } from "@/42go/components/modal/Modal";
import { SwipeableBottomSheet, type SwipeableBottomSheetHandle } from "@/42go/components/SwipeableBottomSheet";
import { cn } from "@/lib/utils";
import { triggerInteractionHaptic } from "@/lib/interaction-haptics";
import { DEFAULT_QUESTIONNAIRE_AUTO_SUBMIT_SECONDS } from "@/lib/lingocafe/questionnaire-preferences";
import type { ReaderTrainingScope } from "@/app/(app)/(lingocafe)/books/_components/reader-training-context";

type QuestionnaireExperienceProps = {
  bookId: string;
  trainingScope?: ReaderTrainingScope;
  onExit?: () => void;
  /** Pass the learner preference here when questionnaire settings are available. Null disables auto-submit. */
  autoSubmitDelaySeconds?: number | null;
};

type QuestionnaireTrainingScope = ReaderTrainingScope;

const AutoSubmitCountdown = ({ seconds, onExpire, onRemainingChange, frozen = false }: {
  seconds: number;
  onExpire: () => void;
  onRemainingChange?: (remaining: number) => void;
  frozen?: boolean;
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const countdownRef = useRef<HTMLSpanElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const onExpireRef = useRef(onExpire);
  const onRemainingChangeRef = useRef(onRemainingChange);

  useEffect(() => {
    onExpireRef.current = onExpire;
    onRemainingChangeRef.current = onRemainingChange;
  }, [onExpire, onRemainingChange]);

  useEffect(() => {
    const badge = countdownRef.current;
    if (!badge) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pulse: Animation | undefined;
    const updatePulse = () => {
      pulse?.cancel();
      if (reducedMotion.matches) return;
      pulse = badge.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.08)" },
          { transform: "scale(1)" },
        ],
        { duration: 900, iterations: Infinity, easing: "ease-in-out" }
      );
    };
    updatePulse();
    reducedMotion.addEventListener("change", updatePulse);
    return () => {
      pulse?.cancel();
      reducedMotion.removeEventListener("change", updatePulse);
    };
  }, []);

  useEffect(() => {
    if (frozen) return;
    let deadline = Date.now() + seconds * 1000;
    let ringAnimation: Animation | undefined;
    onRemainingChangeRef.current?.(seconds);
    const startRing = () => {
      ringAnimation?.cancel();
      ringAnimation = ringRef.current?.animate(
        [{ strokeDashoffset: "0" }, { strokeDashoffset: "100" }],
        { duration: seconds * 1000, easing: "linear", fill: "forwards" }
      );
    };
    startRing();
    const resetOnVisibilityChange = () => {
      // Never submit while the learner is away; give them the full delay on return.
      deadline = Date.now() + seconds * 1000;
      setRemaining(seconds);
      onRemainingChangeRef.current?.(seconds);
      startRing();
    };
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (next === 0) {
        window.clearInterval(timer);
        onExpireRef.current();
      } else {
        setRemaining(next);
        onRemainingChangeRef.current?.(next);
      }
    }, 100);
    document.addEventListener("visibilitychange", resetOnVisibilityChange);
    return () => {
      window.clearInterval(timer);
      ringAnimation?.cancel();
      document.removeEventListener("visibilitychange", resetOnVisibilityChange);
    };
  }, [seconds, frozen]);

  return (
    <span className="absolute right-4 top-1/2 -translate-y-1/2">
      <span ref={countdownRef} className="relative flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold tabular-nums text-primary" role="status" aria-live="polite" aria-atomic="true">
        <svg className="pointer-events-none absolute inset-0 size-full -rotate-90" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" opacity="0.15" />
          <circle ref={ringRef} cx="16" cy="16" r="14" pathLength="100" stroke="currentColor" strokeWidth="2" strokeDasharray="100" strokeLinecap="round" />
        </svg>
        <span className="sr-only">Submitting in </span>{remaining}<span className="sr-only"> seconds</span>
      </span>
    </span>
  );
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null);
  return payload && typeof payload.message === "string" ? payload.message : fallback;
};

const loadRoundFromResponse = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await readErrorMessage(response, fallback));
  const round = normalizeQuestionnaireRound(await response.json());
  if (!round) throw new Error("The questionnaire response was incomplete.");
  return round;
};

const requestStartOrResume = async (bookId: string, scope: QuestionnaireTrainingScope | null) => {
  const search = scope
    ? `?${new URLSearchParams({ scope: scope.kind, scope_page: scope.pageId }).toString()}`
    : "";
  const response = await fetch(
    `/api/lingocafe/books/${encodeURIComponent(bookId)}/questionnaire/rounds${search}`,
    { method: "POST", credentials: "same-origin", cache: "no-store" }
  );
  return loadRoundFromResponse(response, "Could not start this questionnaire.");
};

const requestRound = async (roundId: string) => {
  const response = await fetch(
    `/api/lingocafe/questionnaire-rounds/${encodeURIComponent(roundId)}`,
    { credentials: "same-origin", cache: "no-store" }
  );
  return loadRoundFromResponse(response, "Could not load this questionnaire round.");
};

const buildQuestionnaireHref = (bookId: string, roundId: string, scope: QuestionnaireTrainingScope | null) => {
  const scopeSearch = scope
    ? `&${new URLSearchParams({ scope: scope.kind, scope_page: scope.pageId }).toString()}`
    : "";
  return `/books/${encodeURIComponent(bookId)}/questionnaire?round=${encodeURIComponent(roundId)}${scopeSearch}`;
};

const SingleSelectQuestion = ({
  item,
  questionCount,
  selectedOptionId,
  disabled,
  onSelect,
  onSelectedAgain,
  countdownSeconds,
  countdownFrozen,
  onCountdownChange,
  onSubmit,
}: {
  item: QuestionnaireRoundItem;
  questionCount: number;
  selectedOptionId: string | null;
  disabled: boolean;
  onSelect: (optionId: string) => void;
  onSelectedAgain: () => void;
  countdownSeconds: number | null;
  countdownFrozen?: boolean;
  onCountdownChange?: (remaining: number) => void;
  onSubmit: () => void;
}) => (
  <fieldset className="space-y-3" disabled={disabled}>
    <legend tabIndex={-1} className="mb-7 w-full outline-none">
      <span className="mb-3 block text-xs font-medium tracking-wide text-muted-foreground">
        Question {item.position} of {questionCount}
      </span>
      <span className="block text-2xl font-medium leading-snug text-foreground">
        {item.prompt}
      </span>
    </legend>
    {item.options.map((option) => {
      const selected = selectedOptionId === option.id;
      return (
        <label
          key={option.id}
          onPointerDown={selected && !disabled ? onSelectedAgain : undefined}
          className={cn(
            "relative flex cursor-pointer items-start gap-3 rounded-xl border bg-card py-4 pl-4 pr-16 text-left shadow-sm transition-[translate,scale,background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:translate-x-0 motion-reduce:scale-100 motion-reduce:transition-none",
            "hover:border-primary/50 hover:bg-primary/5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
            selected && "translate-x-1 scale-[1.01] border-primary bg-primary/10 shadow-md ring-1 ring-primary/25",
            !disabled && "active:scale-[0.99]",
            disabled && "cursor-not-allowed opacity-70"
          )}
        >
          <input
            type="radio"
            name={`question-${item.questionId}`}
            value={option.id}
            aria-label={option.text}
            checked={selected}
            onChange={() => onSelect(option.id)}
            onKeyDown={(event) => {
              if (selected && !disabled && (event.key === " " || event.key === "Enter")) {
                onSelectedAgain();
              }
            }}
            className={cn("mt-0.5 size-4 shrink-0 accent-emerald-600 transition-transform duration-200 motion-reduce:translate-x-0 motion-reduce:scale-100 motion-reduce:transition-none", selected && "scale-110")}
          />
          <span className="min-w-0 text-sm leading-6 md:text-base">
            {option.text}
          </span>
          {selected && countdownSeconds !== null && (
            <AutoSubmitCountdown key={countdownSeconds} seconds={countdownSeconds} onExpire={onSubmit} onRemainingChange={onCountdownChange} frozen={countdownFrozen} />
          )}
        </label>
      );
    })}
  </fieldset>
);

const WrongAnswerCard = ({ item }: { item: QuestionnaireRoundItem }) => {
  const [revealed, setRevealed] = useState(false);
  const selected = getSelectedQuestionnaireOption(item);
  const answer = item.answer;
  if (!answer) return null;

  return (
    <article className="min-w-0 space-y-4 rounded-xl border border-amber-500/30 bg-card p-5 shadow-sm md:p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
          Question {item.position}
        </p>
        <h3 className="text-lg font-semibold leading-snug">{item.prompt}</h3>
      </div>

      <div className="rounded-lg bg-destructive/8 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your answer
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {selected?.text ?? "Answer unavailable"}
        </p>
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          aria-expanded={revealed}
          onClick={() => setRevealed((value) => !value)}
        >
          {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {revealed ? "Hide correct answer" : "Reveal correct answer"}
        </Button>
      </div>

      {revealed && (
        <div className="space-y-3 rounded-lg border border-emerald-600/25 bg-emerald-500/8 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Correct answer
            </p>
            <p className="mt-1 text-sm font-semibold">
              {answer.correctOption?.text ?? "Correct answer unavailable"}
            </p>
          </div>
          {answer.rationale && (
            <p className="text-sm leading-6 text-muted-foreground">{answer.rationale}</p>
          )}
        </div>
      )}

      {answer.pageLinks.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Read the explanation in the book</p>
          <div className="flex flex-wrap gap-2">
            {answer.pageLinks.map((page) => (
              <Button key={`${page.bookId}:${page.pageId}`} asChild variant="secondary" className="h-auto min-h-10 max-w-full justify-start whitespace-normal py-2 text-left [&_svg]:shrink-0">
                {/* A full navigation avoids the intercepted reader remounting this
                    results route without its stable round query. */}
                <a href={page.href}>
                  <BookOpen className="size-4" />
                  {page.prefix ? `${page.prefix}: ${page.title}` : page.title}
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

const Results = ({
  round,
  error,
}: {
  round: QuestionnaireRound;
  error: string | null;
}) => {
  const wrongItems = getWrongQuestionnaireItems(round);
  const percent =
    round.scoreTotal > 0 ? Math.round((round.correctCount / round.scoreTotal) * 100) : 0;

  return (
    <div className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-8 text-white md:px-9 md:py-10">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-white/15 p-3">
              <Trophy className="size-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-50/80">
                Round complete
              </p>
              <h1 className="mt-2 font-serif text-4xl font-bold md:text-5xl">
                {round.correctCount} / {round.scoreTotal}
              </h1>
              <p className="mt-2 text-emerald-50/90">{percent}% correct</p>
            </div>
          </div>
        </div>
        {error && (
          <p className="px-5 pb-5 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </section>

      {wrongItems.length === 0 ? (
        <section className="rounded-xl border border-emerald-600/25 bg-emerald-500/8 p-6 text-center">
          <CheckCircle2 className="mx-auto size-8 text-emerald-600" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold">Everything was correct</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your next round will keep spacing these learning items over time.
          </p>
        </section>
      ) : (
        <section className="space-y-4" aria-labelledby="review-heading">
          <div>
            <h2 id="review-heading" className="text-2xl font-semibold">
              Review {wrongItems.length === 1 ? "this answer" : "these answers"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reveal each correct answer when you are ready, or return to the exact book page.
            </p>
          </div>
          {wrongItems.map((item) => (
            <WrongAnswerCard key={item.position} item={item} />
          ))}
        </section>
      )}
    </div>
  );
};

export const QuestionnaireExperience = ({
  bookId,
  trainingScope: embeddedTrainingScope,
  onExit,
  autoSubmitDelaySeconds = DEFAULT_QUESTIONNAIRE_AUTO_SUBMIT_SECONDS,
}: QuestionnaireExperienceProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const embedded = Boolean(onExit);
  const routeRoundId = embedded ? null : searchParams.get("round");
  const scopeKind = searchParams.get("scope");
  const scopePageId = searchParams.get("scope_page");
  const trainingScope = useMemo<QuestionnaireTrainingScope | null>(
    () => embeddedTrainingScope ?? ((scopeKind === "chapter" || scopeKind === "part") && scopePageId
      ? { kind: scopeKind, pageId: scopePageId }
      : null),
    [embeddedTrainingScope, scopeKind, scopePageId]
  );
  const returnHref = trainingScope
    ? `/books/read/${encodeURIComponent(bookId)}/${encodeURIComponent(trainingScope.pageId)}`
    : `/books/${encodeURIComponent(bookId)}`;
  const [panelOpen, setPanelOpen] = useState(true);
  const exitTimerRef = useRef<number | null>(null);
  const returnToSource = () => {
    if (onExit) {
      if (exitTimerRef.current) return;
      setPanelOpen(false);
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300;
      exitTimerRef.current = window.setTimeout(onExit, duration);
      return;
    }
    window.location.replace(new URL(returnHref, window.location.origin).href);
  };
  const [round, setRound] = useState<QuestionnaireRound | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionInFlightRef = useRef(false);
  const leaveAfterSheetCloseRef = useRef(false);
  const countdownRemainingRef = useRef<number | null>(null);
  const cancelSheetRef = useRef<SwipeableBottomSheetHandle | null>(null);
  const questionRef = useRef<HTMLDivElement | null>(null);
  const questionTrackRef = useRef<HTMLDivElement | null>(null);
  const [outgoingQuestion, setOutgoingQuestion] = useState<{
    item: QuestionnaireRoundItem;
    selectedOptionId: string;
    countdownSeconds: number | null;
  } | null>(null);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
  }, []);

  const startOrResume = useCallback(async () => {
    setError(null);
    const nextRound = await requestStartOrResume(bookId, trainingScope);
    if (nextRound.bookId !== bookId) {
      throw new Error("This round belongs to another book.");
    }
    setRound(nextRound);
    setSelectedOptionId(null);
    shownAtRef.current = Date.now();
    if (!embedded) router.replace(buildQuestionnaireHref(bookId, nextRound.id, trainingScope), { scroll: false });
  }, [bookId, embedded, router, trainingScope]);

  useEffect(() => {
    let active = true;
    const request = routeRoundId
      ? requestRound(routeRoundId)
      : requestStartOrResume(bookId, trainingScope);
    request
      .then((nextRound) => {
        if (!active) return;
        if (nextRound.bookId !== bookId) {
          throw new Error("This round belongs to another book.");
        }
        setRound(nextRound);
        setSelectedOptionId(null);
        shownAtRef.current = Date.now();
        if (!embedded && !routeRoundId) {
          router.replace(buildQuestionnaireHref(bookId, nextRound.id, trainingScope), { scroll: false });
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load questionnaire.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId, embedded, routeRoundId, router, trainingScope]);

  const item = round ? getCurrentQuestionnaireItem(round) : null;

  useLayoutEffect(() => {
    const surface = questionRef.current;
    const track = questionTrackRef.current;
    if (!surface || !track) return;
    const focusQuestion = () => surface.querySelector("legend")?.focus({ preventScroll: true });
    if (!outgoingQuestion) {
      surface.closest("main")?.parentElement?.scrollTo({ top: 0 });
      focusQuestion();
      return;
    }

    // Both panels ride the same track: no independent timing, fading, or blank frame.
    surface.closest("main")?.parentElement?.scrollTo({ top: 0 });
    const distance = surface.closest("main")?.clientWidth ?? surface.clientWidth;
    surface.style.transform = `translateX(${distance}px)`;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animation = track.animate(
      [
        { transform: "translateX(0)", offset: 0 },
        { transform: `translateX(${-distance - 12}px)`, offset: 0.72 },
        { transform: `translateX(${-distance + 4}px)`, offset: 0.88 },
        { transform: `translateX(${-distance}px)`, offset: 1 },
      ],
      { duration: reducedMotion.matches ? 0 : 700, easing: "cubic-bezier(0.22, 0.8, 0.3, 1)", fill: "forwards" }
    );
    let active = true;
    animation.finished.then(() => {
      if (active) setOutgoingQuestion(null);
    }).catch(() => undefined);
    return () => {
      active = false;
      animation.cancel();
      surface.style.transform = "";
    };
  }, [item?.questionId, loading, outgoingQuestion]);


  const submitAnswer = useCallback(async () => {
    if (!round || !item || !selectedOptionId || submitting || submissionInFlightRef.current || confirmAbandon || outgoingQuestion) return;
    submissionInFlightRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/lingocafe/questionnaire-rounds/${encodeURIComponent(round.id)}/items/${item.position}/answer`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            optionId: selectedOptionId,
            durationMs:
              shownAtRef.current === null
                ? null
                : Math.min(Date.now() - shownAtRef.current, 86_400_000),
          }),
        }
      );
      const nextRound = await loadRoundFromResponse(response, "Could not save your answer.");
      // Keep the accepted question mounted alongside its successor until the shared slide ends.
      const nextItem = getCurrentQuestionnaireItem(nextRound);
      if (nextRound.status === "in_progress" && nextItem && nextItem.questionId !== item.questionId) {
        setOutgoingQuestion({ item, selectedOptionId, countdownSeconds: countdownRemainingRef.current });
      }
      setRound(nextRound);
      setSelectedOptionId(null);
      countdownRemainingRef.current = null;
      shownAtRef.current = Date.now();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your answer.");
    } finally {
      submissionInFlightRef.current = false;
      setSubmitting(false);
    }
  }, [round, item, selectedOptionId, submitting, confirmAbandon, outgoingQuestion]);

  const abandonRound = async () => {
    if (!round || abandoning || leaveAfterSheetCloseRef.current) return;
    setAbandoning(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/lingocafe/questionnaire-rounds/${encodeURIComponent(round.id)}/abandon`,
        { method: "POST", credentials: "same-origin", cache: "no-store" }
      );
      await loadRoundFromResponse(response, "Could not end this round.");
      leaveAfterSheetCloseRef.current = true;
      cancelSheetRef.current?.close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not end this round.");
    } finally {
      setAbandoning(false);
    }
  };

  const restart = async () => {
    setRestarting(true);
    try {
      await startOrResume();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start another round.");
    } finally {
      setRestarting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12" aria-live="polite">
          <div className="animate-pulse space-y-5">
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-2 rounded bg-muted" />
            <div className="h-8 w-4/5 rounded bg-muted" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((value) => (
                <div key={value} className="h-14 rounded-xl bg-muted" />
              ))}
            </div>
          </div>
          <p className="sr-only">Loading questionnaire</p>
        </div>
      );
    }

    if (!round) {
      return (
        <div className="mx-auto max-w-xl px-4 py-10 text-center md:py-16">
          <AlertCircle className="mx-auto size-9 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold">Questionnaire unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground" role="alert">
            {error ?? "This book does not have practice questions yet."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={() => { setLoading(true); startOrResume().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load questionnaire.")).finally(() => setLoading(false)); }}>
              <RefreshCw className="size-4" />
              Try again
            </Button>
            <Button type="button" variant="outline" onClick={returnToSource}>
              Back to book
            </Button>
          </div>
        </div>
      );
    }

    if (round.status === "completed") {
      return (
        <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
          <Results round={round} error={error} />
        </main>
      );
    }

    if (round.status === "abandoned") {
      return (
        <div className="mx-auto max-w-xl px-4 py-10 text-center">
          <X className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold">Round ended</h1>
          <Button type="button" className="mt-6" onClick={returnToSource}>
            Back to book
          </Button>
        </div>
      );
    }

    if (!item) {
      return (
        <div className="mx-auto max-w-xl px-4 py-10 text-center" role="alert">
          This round cannot be resumed. Please return to the book and try again.
        </div>
      );
    }

    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6 md:px-8 md:py-10">
        <div ref={questionTrackRef} className="relative my-auto w-full shrink-0">
          {outgoingQuestion && (
            <div className="pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2" inert aria-hidden="true">
              <SingleSelectQuestion
                item={outgoingQuestion.item}
                questionCount={round.actualQuestionCount}
                selectedOptionId={outgoingQuestion.selectedOptionId}
                disabled
                onSelectedAgain={() => undefined}
                countdownSeconds={outgoingQuestion.countdownSeconds}
                countdownFrozen
                onSubmit={() => undefined}
                onSelect={() => undefined}
              />
            </div>
          )}
          <div key={item.questionId} ref={questionRef} className="w-full space-y-6" inert={!!outgoingQuestion}>
            {item.responseMode === "single-select" ? (
              <SingleSelectQuestion
                item={item}
                questionCount={round.actualQuestionCount}
                selectedOptionId={selectedOptionId}
                disabled={submitting || !!outgoingQuestion}
                countdownSeconds={
                  !outgoingQuestion && !confirmAbandon && !error && autoSubmitDelaySeconds !== null &&
                  Number.isFinite(autoSubmitDelaySeconds) && autoSubmitDelaySeconds > 0
                    ? Math.ceil(autoSubmitDelaySeconds)
                    : null
                }
                onCountdownChange={(remaining) => { countdownRemainingRef.current = remaining; }}
                onSubmit={submitAnswer}
                onSelectedAgain={() => void submitAnswer()}
                onSelect={(optionId) => {
                  triggerInteractionHaptic();
                  setError(null);
                  setSelectedOptionId(optionId);
                }}
              />
            ) : (
              <div className="rounded-lg border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive" role="alert">
                This question type is not supported yet.
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  };

  const activeRound = round?.status === "in_progress";

  return (
    <Modal
      open={panelOpen}
      onOpenChange={(open) => {
        if (open) return;
        if (confirmAbandon || abandoning || leaveAfterSheetCloseRef.current) return;
        if (activeRound) setConfirmAbandon(true);
        else returnToSource();
      }}
      ariaLabel={round?.title ?? "Book questions"}
      presentation="panel"
      anchor="right"
      size="full"
      showClose={false}
      closeLabel="Back to book"
      closeOnOverlayClick={false}
      className="h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 overflow-hidden data-[state=open]:slide-in-from-right data-[state=open]:duration-300 data-[state=open]:ease-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-300 data-[state=closed]:ease-in md:w-full md:max-w-4xl"
      bodyClassName="min-w-0 overscroll-contain overflow-x-hidden p-0"
      footerClassName="border-t-0 bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8 [&>div:first-child]:hidden [&>div:last-child]:w-full"
      footer={(
        <div className="mx-auto flex w-full min-w-0 max-w-[704px] flex-col gap-3">
          {round?.status === "completed" && (
            <Button type="button" size="lg" onClick={() => void restart()} disabled={restarting} className="w-full">
              <RefreshCw className={cn("size-4", restarting && "animate-spin")} />
              {restarting ? "Starting..." : "Practice again"}
            </Button>
          )}
          {activeRound && item && (
          <Button
            type="button"
            size="lg"
            disabled={!selectedOptionId || submitting || !!outgoingQuestion || item.responseMode !== "single-select"}
            onClick={() => void submitAnswer()}
            className="w-full"
          >
            {submitting ? "Saving answer..." : "Next"}

          </Button>
          )}
          <Button
            type="button"
            variant="neutralLink"
            disabled={submitting || !!outgoingQuestion || abandoning || restarting}
            onClick={() => {
              if (leaveAfterSheetCloseRef.current) return;
              if (activeRound) setConfirmAbandon(true);
              else returnToSource();
            }}
          >
            Stop training
          </Button>
        </div>
      )}
    >
      {renderContent()}
      <SwipeableBottomSheet
        ref={cancelSheetRef}
        open={confirmAbandon}
        onOpenChange={(open) => { if (!abandoning && !leaveAfterSheetCloseRef.current) setConfirmAbandon(open); }}
        onCloseComplete={() => {
          if (!leaveAfterSheetCloseRef.current) return;
          setConfirmAbandon(false);
          returnToSource();
        }}
        onCloseAutoFocus={(event) => {
          if (leaveAfterSheetCloseRef.current) event.preventDefault();
        }}
        title="End this round?"
        zIndex={730}
        className="mx-auto flex max-w-md flex-col"
      >
        <div className="min-h-0 overflow-y-auto overscroll-contain px-1">
          <p className="text-sm leading-6 text-muted-foreground">
            Your submitted answers stay in your learning history. Unanswered questions will be discarded.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="button" variant="destructive" size="lg" onClick={() => void abandonRound()} disabled={abandoning}>
              {abandoning ? "Ending..." : "End round"}
            </Button>
            <Button type="button" variant="neutralLink" onClick={() => cancelSheetRef.current?.close()} disabled={abandoning}>
              Keep practicing
            </Button>
          </div>
        </div>
      </SwipeableBottomSheet>
    </Modal>
  );
};
