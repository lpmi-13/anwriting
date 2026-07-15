export const ARTICLES = ['a', 'an', 'the'] as const;
export const GENRES = ['fiction', 'academic', 'business'] as const;
export const MODES = ['guided', 'editor'] as const;

export type Article = (typeof ARTICLES)[number];
export type Genre = (typeof GENRES)[number];
export type ExerciseMode = (typeof MODES)[number];

export interface PassageSource {
  label: string;
  url?: string;
  note: string;
}

export interface Passage {
  id: string;
  genre: Genre;
  title: string;
  deck: string;
  text: string;
  source: PassageSource;
}

export interface ArticleMatch {
  answer: Article;
  surface: string;
  start: number;
  end: number;
}

export interface GuidedGap {
  answer: Article;
  answerSurface: string;
}

export interface GuidedExercise {
  passage: Passage;
  segments: string[];
  gaps: GuidedGap[];
}

export interface EditorPlacement {
  article: Article;
  contentWordIndex: number;
  targetWord: string | null;
}

export interface EditorGrade {
  validDraft: boolean;
  correct: number;
  total: number;
  missing: number;
  wrong: number;
  extra: number;
  placements: EditorPlacement[];
}

export interface SelectPassageOptions {
  previousId?: string | null;
  random?: () => number;
}

interface WordToken {
  surface: string;
  normalized: string;
  start: number;
  end: number;
}

const ARTICLE_PATTERN = /\b(a|an|the)\b/giu;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function findArticleMatches(text: string): ArticleMatch[] {
  return Array.from(text.matchAll(ARTICLE_PATTERN), (match) => {
    const surface = match[0];
    const start = match.index;

    return {
      answer: surface.toLocaleLowerCase('en') as Article,
      surface,
      start,
      end: start + surface.length,
    };
  });
}

export function countWords(text: string): number {
  return tokenizeWords(text).length;
}

export function createGuidedExercise(passage: Passage): GuidedExercise {
  const matches = findArticleMatches(passage.text);
  if (matches.length === 0) {
    throw new Error(`Passage ${passage.id} does not contain an article.`);
  }

  const segments: string[] = [];
  let cursor = 0;

  matches.forEach((match) => {
    segments.push(passage.text.slice(cursor, match.start));
    cursor = match.end;
  });
  segments.push(passage.text.slice(cursor));

  return {
    passage,
    segments,
    gaps: matches.map((match) => ({
      answer: match.answer,
      answerSurface: match.surface,
    })),
  };
}

export function formatArticle(article: Article, answerSurface: string): string {
  return answerSurface[0] === answerSurface[0]?.toLocaleUpperCase('en')
    ? `${article[0]?.toLocaleUpperCase('en')}${article.slice(1)}`
    : article;
}

export function createEditorDraft(text: string): string {
  const withoutArticles = text
    .replace(ARTICLE_PATTERN, '')
    .replace(/\s+/gu, ' ')
    .replace(/\s+([,.;:!?%)\]}”’])/gu, '$1')
    .replace(/([([{“‘])\s+/gu, '$1')
    .trim();

  return withoutArticles.replace(
    /(^|[.!?]\s+)([“‘"'([{]*)(\p{Ll})/gu,
    (_, boundary: string, opening: string, letter: string) =>
      `${boundary}${opening}${letter.toLocaleUpperCase('en')}`,
  );
}

export function gradeEditorDraft(original: string, draft: string): EditorGrade {
  const originalTokens = tokenizeWords(original);
  const draftTokens = tokenizeWords(draft);
  const originalContent = contentWords(originalTokens);
  const draftContent = contentWords(draftTokens);
  const originalPlacements = extractPlacements(originalTokens);
  const draftPlacements = extractPlacements(draftTokens);
  const validDraft = sameWords(originalContent, draftContent);

  if (!validDraft) {
    return {
      validDraft: false,
      correct: 0,
      total: originalPlacements.length,
      missing: originalPlacements.length,
      wrong: 0,
      extra: draftPlacements.length,
      placements: draftPlacements,
    };
  }

  const expected = groupPlacements(originalPlacements);
  const submitted = groupPlacements(draftPlacements);
  let correct = 0;
  let missing = 0;
  let wrong = 0;

  expected.forEach((answers, index) => {
    const attempts = submitted.get(index) ?? [];
    answers.forEach((answer, answerIndex) => {
      const attempt = attempts[answerIndex];
      if (attempt === answer) correct += 1;
      else if (attempt) wrong += 1;
      else missing += 1;
    });
  });

  let extra = 0;
  submitted.forEach((answers, index) => {
    const expectedCount = expected.get(index)?.length ?? 0;
    extra += Math.max(0, answers.length - expectedCount);
  });

  return {
    validDraft: true,
    correct,
    total: originalPlacements.length,
    missing,
    wrong,
    extra,
    placements: draftPlacements,
  };
}

export function getEditorHint(original: string, draft: string): string | null {
  const originalTokens = tokenizeWords(original);
  const draftTokens = tokenizeWords(draft);
  const originalContent = contentWords(originalTokens);
  if (!sameWords(originalContent, contentWords(draftTokens))) return null;

  const expected = extractPlacements(originalTokens);
  const submitted = groupPlacements(extractPlacements(draftTokens));
  const target = expected.find((placement) => {
    const choices = submitted.get(placement.contentWordIndex) ?? [];
    return !choices.includes(placement.article);
  });

  if (!target) return null;
  const word = originalContent[target.contentWordIndex]?.surface;
  if (!word) return null;

  const nextWord = originalContent[target.contentWordIndex + 1]?.surface;
  return nextWord
    ? `Look closely just before “${word} ${nextWord}”.`
    : `Look closely before “${word}”.`;
}

export function selectPassage(
  passages: Passage[],
  genre: Genre,
  options: SelectPassageOptions = {},
): Passage | null {
  const { previousId = null, random = Math.random } = options;
  const matching = passages.filter((passage) => passage.genre === genre);
  const available =
    matching.length > 1 && previousId
      ? matching.filter((passage) => passage.id !== previousId)
      : matching;
  if (available.length === 0) return null;

  const index = Math.min(
    Math.max(Math.floor(random() * available.length), 0),
    available.length - 1,
  );
  return available[index] ?? null;
}

export function isGenre(value: string | null): value is Genre {
  return GENRES.some((genre) => genre === value);
}

export function isExerciseMode(value: string | null): value is ExerciseMode {
  return MODES.some((mode) => mode === value);
}

function tokenizeWords(text: string): WordToken[] {
  return Array.from(text.matchAll(WORD_PATTERN), (match) => ({
    surface: match[0],
    normalized: match[0].toLocaleLowerCase('en'),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function isArticle(value: string): value is Article {
  return ARTICLES.some((article) => article === value);
}

function contentWords(tokens: WordToken[]): WordToken[] {
  return tokens.filter((token) => !isArticle(token.normalized));
}

function sameWords(left: WordToken[], right: WordToken[]): boolean {
  return (
    left.length === right.length &&
    left.every((token, index) => token.normalized === right[index]?.normalized)
  );
}

function extractPlacements(tokens: WordToken[]): EditorPlacement[] {
  let contentWordIndex = 0;
  const placements: EditorPlacement[] = [];

  tokens.forEach((token, tokenIndex) => {
    if (isArticle(token.normalized)) {
      const target = tokens
        .slice(tokenIndex + 1)
        .find((candidate) => !isArticle(candidate.normalized));
      placements.push({
        article: token.normalized,
        contentWordIndex,
        targetWord: target?.surface ?? null,
      });
    } else {
      contentWordIndex += 1;
    }
  });

  return placements;
}

function groupPlacements(placements: EditorPlacement[]): Map<number, Article[]> {
  const groups = new Map<number, Article[]>();
  placements.forEach(({ article, contentWordIndex }) => {
    const articles = groups.get(contentWordIndex) ?? [];
    articles.push(article);
    groups.set(contentWordIndex, articles);
  });
  return groups;
}
