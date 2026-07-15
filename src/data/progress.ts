import type { Genre } from '../domain/exercise';

const STORAGE_KEY = 'anwriting:progress';
const STORAGE_VERSION = 1;

export interface PracticeProgress {
  completedPassages: string[];
  completedByGenre: Record<Genre, number>;
  totalChecks: number;
}

const EMPTY_PROGRESS: PracticeProgress = {
  completedPassages: [],
  completedByGenre: { fiction: 0, academic: 0, business: 0 },
  totalChecks: 0,
};

export class ProgressStore {
  constructor(private readonly storage: Storage | null = defaultStorage()) {}

  load(): PracticeProgress {
    if (!this.storage) return copyProgress(EMPTY_PROGRESS);

    try {
      const value = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '') as Partial<
        PracticeProgress & { version: number }
      >;
      if (
        value.version !== STORAGE_VERSION ||
        !Array.isArray(value.completedPassages) ||
        !isGenreRecord(value.completedByGenre) ||
        typeof value.totalChecks !== 'number'
      ) {
        return copyProgress(EMPTY_PROGRESS);
      }

      return {
        completedPassages: value.completedPassages.filter(
          (id): id is string => typeof id === 'string',
        ),
        completedByGenre: { ...value.completedByGenre },
        totalChecks: Math.max(0, Math.trunc(value.totalChecks)),
      };
    } catch {
      return copyProgress(EMPTY_PROGRESS);
    }
  }

  recordCheck(progress: PracticeProgress): PracticeProgress {
    const next = copyProgress(progress);
    next.totalChecks += 1;
    this.save(next);
    return next;
  }

  recordCompletion(progress: PracticeProgress, passageId: string, genre: Genre): PracticeProgress {
    if (progress.completedPassages.includes(passageId)) return progress;

    const next = copyProgress(progress);
    next.completedPassages.push(passageId);
    next.completedByGenre[genre] += 1;
    this.save(next);
    return next;
  }

  private save(progress: PracticeProgress): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...progress }));
    } catch {
      // Progress is an optional enhancement; the exercise works without storage.
    }
  }
}

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function isGenreRecord(value: unknown): value is Record<Genre, number> {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<Record<Genre, unknown>>;
  return (
    typeof record.fiction === 'number' &&
    typeof record.academic === 'number' &&
    typeof record.business === 'number'
  );
}

function copyProgress(progress: PracticeProgress): PracticeProgress {
  return {
    completedPassages: [...progress.completedPassages],
    completedByGenre: { ...progress.completedByGenre },
    totalChecks: progress.totalChecks,
  };
}
