import { apiRequestJson } from "@/services/apiClient";
import type { CardProgress } from "@/lib/flashcardStudy";

export type StudyProgressRecord = CardProgress & {
  cardId: string;
  bookId: string;
  updatedAt?: string | null;
};

export function studyProgressRecordsToState(records: StudyProgressRecord[]) {
  return records.reduce<Record<string, CardProgress>>((progressByCard, record) => {
    progressByCard[record.cardId] = {
      status: record.status,
      reviews: record.reviews,
      attempts: record.attempts,
      correct: record.correct,
      lastReviewed: record.lastReviewed,
      dueAt: record.dueAt,
      intervalDays: record.intervalDays,
      easeFactor: record.easeFactor,
    };

    return progressByCard;
  }, {});
}

export function fetchStudyProgress(token: string) {
  return apiRequestJson<StudyProgressRecord[]>("/api/v1/study-progress", {
    token,
    fallbackError: "Could not load study progress.",
  });
}

export function saveStudyProgress({
  token,
  cardId,
  bookId,
  progress,
}: {
  token: string;
  cardId: string;
  bookId: string;
  progress: CardProgress;
}) {
  return apiRequestJson<StudyProgressRecord>(
    `/api/v1/study-progress/${encodeURIComponent(cardId)}`,
    {
      token,
      method: "PUT",
      body: JSON.stringify({
        bookId,
        status: progress.status,
        reviews: progress.reviews,
        attempts: progress.attempts,
        correct: progress.correct,
        lastReviewed: progress.lastReviewed,
        dueAt: progress.dueAt,
        intervalDays: progress.intervalDays,
        easeFactor: progress.easeFactor,
      }),
      fallbackError: "Could not save study progress.",
    },
  );
}
