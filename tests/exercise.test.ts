import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../src/data/passages';
import {
  createEditorDraft,
  createGuidedExercise,
  findArticleMatches,
  getEditorHint,
  gradeEditorDraft,
  selectPassage,
} from '../src/domain/exercise';

const original =
  'The editor found an error in a short note. A careful revision gave the sentence a clearer meaning.';

describe('guided exercises', () => {
  it('finds standalone articles while preserving their casing', () => {
    expect(findArticleMatches('The artist carried an easel and a brush.')).toEqual([
      { answer: 'the', surface: 'The', start: 0, end: 3 },
      { answer: 'an', surface: 'an', start: 19, end: 21 },
      { answer: 'a', surface: 'a', start: 32, end: 33 },
    ]);
    expect(findArticleMatches('Another theatre reopened.')).toEqual([]);
  });

  it('splits a passage into reversible text segments and gaps', () => {
    const passage = PASSAGES[0];
    if (!passage) throw new Error('Expected a fixture passage.');
    const exercise = createGuidedExercise(passage);
    const restored = exercise.segments.reduce(
      (text, segment, index) => `${text}${segment}${exercise.gaps[index]?.answerSurface ?? ''}`,
      '',
    );

    expect(exercise.gaps).toHaveLength(findArticleMatches(passage.text).length);
    expect(restored).toBe(passage.text);
  });
});

describe('editor exercises', () => {
  it('creates a readable draft with every article removed', () => {
    const draft = createEditorDraft(original);

    expect(draft).toBe(
      'Editor found error in short note. Careful revision gave sentence clearer meaning.',
    );
    expect(findArticleMatches(draft)).toEqual([]);
  });

  it('grades exact article placements independently of capitalisation', () => {
    expect(gradeEditorDraft(original, original)).toMatchObject({
      validDraft: true,
      correct: 6,
      total: 6,
      missing: 0,
      wrong: 0,
      extra: 0,
    });
    expect(
      gradeEditorDraft(
        original,
        'the Editor found an error in a short note. a Careful revision gave the sentence a clearer meaning.',
      ),
    ).toMatchObject({ validDraft: true, correct: 6 });
  });

  it('distinguishes missing, wrong, and extra articles', () => {
    const grade = gradeEditorDraft(
      original,
      'An editor found error in a short note. Careful revision gave the sentence an clearer meaning.',
    );

    expect(grade).toMatchObject({
      validDraft: true,
      correct: 2,
      total: 6,
      missing: 2,
      wrong: 2,
      extra: 0,
    });
  });

  it('refuses to grade when non-article wording changes', () => {
    expect(gradeEditorDraft(original, 'The writer found an error in a short note.')).toMatchObject({
      validDraft: false,
      correct: 0,
    });
  });

  it('points toward an unresolved placement without revealing the answer', () => {
    const hint = getEditorHint(original, createEditorDraft(original));

    expect(hint).toBe('Look closely just before “editor found”.');
    expect(hint).not.toMatch(/\b(?:a|an|the)\b/iu);
  });
});

describe('passage selection', () => {
  it('only selects the requested genre and avoids the previous draft', () => {
    const selected = selectPassage(PASSAGES, 'academic', {
      previousId: 'academic-urban-trees',
      random: () => 0,
    });

    expect(selected?.genre).toBe('academic');
    expect(selected?.id).not.toBe('academic-urban-trees');
  });

  it('provides several article decisions in every studio passage', () => {
    PASSAGES.forEach((passage) => {
      expect(findArticleMatches(passage.text).length, passage.id).toBeGreaterThanOrEqual(5);
    });
  });
});
