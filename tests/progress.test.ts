import { describe, expect, it } from 'vitest';
import { ProgressStore } from '../src/data/progress';

describe('ProgressStore', () => {
  it('records checks and counts each completed passage once', () => {
    const store = new ProgressStore(localStorage);
    let progress = store.load();
    progress = store.recordCheck(progress);
    progress = store.recordCompletion(progress, 'fiction-one', 'fiction');
    progress = store.recordCompletion(progress, 'fiction-one', 'fiction');

    expect(progress).toEqual({
      completedPassages: ['fiction-one'],
      completedByGenre: { fiction: 1, academic: 0, business: 0 },
      totalChecks: 1,
    });
    expect(new ProgressStore(localStorage).load()).toEqual(progress);
  });

  it('recovers safely from malformed storage', () => {
    localStorage.setItem('anwriting:progress', '{broken');

    expect(new ProgressStore(localStorage).load()).toEqual({
      completedPassages: [],
      completedByGenre: { fiction: 0, academic: 0, business: 0 },
      totalChecks: 0,
    });
  });
});
