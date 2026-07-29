"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/toast";

type UseBookCompletionMutationOptions = {
  bookId: string;
  onCompletedAtChange: (completedAt: string | null) => void;
};

const getResponseMessage = async (response: Response, fallback: string) => {
  const payload = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  return typeof payload?.message === "string" ? payload.message : fallback;
};

export const useBookCompletionMutation = ({
  bookId,
  onCompletedAtChange,
}: UseBookCompletionMutationOptions) => {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const setCompleted = async (completed: boolean) => {
    if (pending) return false;
    setPending(true);

    try {
      const response = await fetch(
        `/api/lingocafe/books/${encodeURIComponent(bookId)}/completion`,
        {
          method: completed ? "PUT" : "DELETE",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          await getResponseMessage(
            response,
            completed
              ? "Could not mark this book as read."
              : "Could not mark this book as unread."
          )
        );
      }

      const payload = (await response.json()) as {
        completedAt?: unknown;
      };
      const completedAt =
        typeof payload.completedAt === "string" ? payload.completedAt : null;

      onCompletedAtChange(completedAt);
      toast({
        title: completed ? "Book marked as read" : "Book marked as unread",
      });
      return true;
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : completed
              ? "Could not mark this book as read."
              : "Could not mark this book as unread.",
        variant: "destructive",
      });
      return false;
    } finally {
      setPending(false);
    }
  };

  return { pending, setCompleted };
};
