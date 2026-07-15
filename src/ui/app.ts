import { PASSAGES } from '../data/passages';
import { ProgressStore, type PracticeProgress } from '../data/progress';
import {
  ARTICLES,
  countWords,
  createEditorDraft,
  createGuidedExercise,
  formatArticle,
  getEditorHint,
  gradeEditorDraft,
  isExerciseMode,
  isGenre,
  selectPassage,
  type Article,
  type ExerciseMode,
  type Genre,
  type GuidedExercise,
  type Passage,
} from '../domain/exercise';

type GapGrade = 'idle' | 'correct' | 'incorrect' | 'hinted';

interface GapState {
  selection: Article | null;
  grade: GapGrade;
}

interface AppElements {
  deskForm: HTMLFormElement;
  deskSummary: HTMLElement;
  practice: HTMLElement;
  globalStatus: HTMLElement;
  practiceKicker: HTMLElement;
  practiceTitle: HTMLElement;
  practiceDeck: HTMLElement;
  documentMeta: HTMLElement;
  documentStamp: HTMLElement;
  modeInstructions: HTMLElement;
  guidedEditor: HTMLElement;
  freeEditor: HTMLElement;
  textarea: HTMLTextAreaElement;
  sourceLabel: HTMLElement;
  sourceNote: HTMLElement;
  attemptLabel: HTMLElement;
  scoreValue: HTMLElement;
  scoreTotal: HTMLElement;
  scoreRuleFill: HTMLElement;
  feedback: HTMLElement;
  checkButton: HTMLButtonElement;
  hintButton: HTMLButtonElement;
  hintCount: HTMLElement;
  resetButton: HTMLButtonElement;
  revealButton: HTMLButtonElement;
  sessionCount: HTMLElement;
  headerProgress: HTMLElement;
  newPassage: HTMLButtonElement;
  closeDraft: HTMLButtonElement;
}

const GENRE_LABELS: Record<Genre, string> = {
  fiction: 'Fiction',
  academic: 'Academic',
  business: 'Business',
};

const MODE_LABELS: Record<ExerciseMode, string> = {
  guided: 'Guided',
  editor: 'Editor',
};

const MAX_HINTS = 2;

export class AnwritingApp {
  private readonly document: Document;
  private readonly progressStore: ProgressStore;
  private elements!: AppElements;
  private genre: Genre = 'fiction';
  private mode: ExerciseMode = 'guided';
  private passage: Passage | null = null;
  private exercise: GuidedExercise | null = null;
  private gaps: GapState[] = [];
  private hintsRemaining = MAX_HINTS;
  private attempts = 0;
  private revealed = false;
  private progress: PracticeProgress;

  constructor(document: Document = globalThis.document, progressStore = new ProgressStore()) {
    this.document = document;
    this.progressStore = progressStore;
    this.progress = progressStore.load();
  }

  mount(): void {
    this.elements = this.collectElements();
    this.bindEvents();
    this.updateDeskSummary();
    this.updateProgressDisplay();
    this.restoreUrlState();
  }

  private collectElements(): AppElements {
    return {
      deskForm: this.required<HTMLFormElement>('desk-form'),
      deskSummary: this.required('desk-summary'),
      practice: this.required('practice'),
      globalStatus: this.required('global-status'),
      practiceKicker: this.required('practice-kicker'),
      practiceTitle: this.required('practice-title'),
      practiceDeck: this.required('practice-deck'),
      documentMeta: this.required('document-meta'),
      documentStamp: this.required('document-stamp'),
      modeInstructions: this.required('mode-instructions'),
      guidedEditor: this.required('guided-editor'),
      freeEditor: this.required('free-editor'),
      textarea: this.required<HTMLTextAreaElement>('draft-textarea'),
      sourceLabel: this.required('source-label'),
      sourceNote: this.required('source-note'),
      attemptLabel: this.required('attempt-label'),
      scoreValue: this.required('score-value'),
      scoreTotal: this.required('score-total'),
      scoreRuleFill: this.required('score-rule-fill'),
      feedback: this.required('editor-feedback'),
      checkButton: this.required<HTMLButtonElement>('check-button'),
      hintButton: this.required<HTMLButtonElement>('hint-button'),
      hintCount: this.required('hint-count'),
      resetButton: this.required<HTMLButtonElement>('reset-button'),
      revealButton: this.required<HTMLButtonElement>('reveal-button'),
      sessionCount: this.required('session-count'),
      headerProgress: this.required('header-progress'),
      newPassage: this.required<HTMLButtonElement>('new-passage'),
      closeDraft: this.required<HTMLButtonElement>('close-draft'),
    };
  }

  private bindEvents(): void {
    this.elements.deskForm.addEventListener('change', () => this.updateDeskSummary());
    this.elements.deskForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.startFromForm();
    });
    this.elements.guidedEditor.addEventListener('change', (event) => {
      const select = (event.target as HTMLElement).closest<HTMLSelectElement>('select[data-gap]');
      if (!select) return;
      const index = Number.parseInt(select.dataset.gap ?? '', 10);
      const state = this.gaps[index];
      if (!state) return;
      state.selection = this.toArticle(select.value);
      state.grade = 'idle';
      this.renderGuided(index);
      this.setFeedback('Choice noted. Check the draft when you are ready.', 'neutral');
    });
    this.elements.textarea.addEventListener('input', () => {
      if (this.revealed) return;
      this.setFeedback('Draft updated. Send it for review when you are ready.', 'neutral');
    });
    this.elements.checkButton.addEventListener('click', () => this.checkDraft());
    this.elements.hintButton.addEventListener('click', () => this.addHint());
    this.elements.resetButton.addEventListener('click', () => this.resetDraft());
    this.elements.revealButton.addEventListener('click', () => this.revealOriginal());
    this.elements.newPassage.addEventListener('click', () => this.loadAnotherPassage());
    this.elements.closeDraft.addEventListener('click', () => this.closeDraft());
    globalThis.addEventListener('popstate', () => this.restoreUrlState());
  }

  private startFromForm(): void {
    const genre = this.selectedValue('genre');
    const mode = this.selectedValue('mode');
    if (!isGenre(genre) || !isExerciseMode(mode)) return;

    this.genre = genre;
    this.mode = mode;
    const passage = selectPassage(PASSAGES, genre);
    if (!passage) {
      this.showGlobalStatus('No practice draft is available for this desk.', 'error');
      return;
    }
    this.openPassage(passage, true);
  }

  private openPassage(passage: Passage, updateHistory: boolean): void {
    this.passage = passage;
    this.exercise = createGuidedExercise(passage);
    this.resetExerciseState();

    const genreLabel = GENRE_LABELS[this.genre];
    const modeLabel = MODE_LABELS[this.mode];
    const genrePassages = PASSAGES.filter((candidate) => candidate.genre === this.genre);
    const passageNumber =
      Math.max(
        0,
        genrePassages.findIndex(({ id }) => id === passage.id),
      ) + 1;

    this.elements.practiceKicker.textContent = `${genreLabel} desk / ${modeLabel} brief`;
    this.elements.practiceTitle.textContent = passage.title;
    this.elements.practiceDeck.textContent = passage.deck;
    this.elements.documentMeta.textContent = `${countWords(passage.text)} words · ${this.exercise.gaps.length} article decisions`;
    this.elements.documentStamp.textContent = `${genreLabel[0]} / ${String(passageNumber).padStart(2, '0')}`;
    this.elements.sourceLabel.textContent = passage.source.label;
    this.elements.sourceNote.textContent = passage.source.note;
    this.elements.guidedEditor.hidden = this.mode !== 'guided';
    this.elements.freeEditor.hidden = this.mode !== 'editor';
    this.elements.practice.hidden = false;

    this.renderInstructions();
    if (this.mode === 'guided') this.renderGuided();
    else this.elements.textarea.value = createEditorDraft(passage.text);
    this.updateReview(0);
    this.showGlobalStatus(
      `${genreLabel} draft opened in ${modeLabel.toLocaleLowerCase('en')} mode.`,
      'success',
    );

    if (updateHistory) this.updateUrl();
    globalThis.requestAnimationFrame(() => {
      this.elements.practice.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private resetExerciseState(): void {
    if (!this.exercise || !this.passage) return;
    this.gaps = this.exercise.gaps.map(() => ({ selection: null, grade: 'idle' }));
    this.hintsRemaining = MAX_HINTS;
    this.attempts = 0;
    this.revealed = false;
    this.elements.checkButton.disabled = false;
    this.elements.hintButton.disabled = false;
    this.elements.revealButton.disabled = false;
    this.elements.textarea.readOnly = false;
    this.elements.hintCount.textContent = String(this.hintsRemaining);
    this.elements.attemptLabel.textContent = 'Not checked';
    this.setFeedback('Make your choices, then send the draft for review.', 'neutral');
  }

  private renderInstructions(): void {
    const heading = this.document.createElement('strong');
    const copy = this.document.createElement('p');

    if (this.mode === 'guided') {
      heading.textContent = 'Restore each marked gap.';
      copy.textContent = 'Choose a, an, or the from every inline menu, then check the draft.';
    } else {
      heading.textContent = 'Proofread the unmarked copy.';
      copy.textContent =
        'Every article has been removed. Add them back wherever the meaning needs one.';
    }
    this.elements.modeInstructions.replaceChildren(heading, copy);
  }

  private renderGuided(focusIndex?: number): void {
    if (!this.exercise) return;
    const fragment = this.document.createDocumentFragment();

    this.exercise.gaps.forEach((gap, index) => {
      fragment.append(this.document.createTextNode(this.exercise?.segments[index] ?? ''));
      const state = this.gaps[index];
      if (!state) return;

      const select = this.document.createElement('select');
      select.className = `article-gap article-gap-${state.grade}`;
      select.dataset.gap = String(index);
      select.setAttribute('aria-label', `Missing article ${index + 1} of ${this.gaps.length}`);
      select.disabled = state.grade === 'correct' || state.grade === 'hinted' || this.revealed;

      const placeholder = this.document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '—';
      select.append(placeholder);

      ARTICLES.forEach((article) => {
        const option = this.document.createElement('option');
        option.value = article;
        option.textContent = formatArticle(article, gap.answerSurface);
        option.selected = state.selection === article;
        select.append(option);
      });
      fragment.append(select);
    });

    fragment.append(
      this.document.createTextNode(this.exercise.segments[this.exercise.segments.length - 1] ?? ''),
    );
    this.elements.guidedEditor.replaceChildren(fragment);

    if (focusIndex !== undefined) {
      this.elements.guidedEditor
        .querySelector<HTMLSelectElement>(`select[data-gap="${focusIndex}"]`)
        ?.focus({ preventScroll: true });
    }
  }

  private checkDraft(): void {
    if (!this.passage || !this.exercise || this.revealed) return;
    this.attempts += 1;
    this.progress = this.progressStore.recordCheck(this.progress);
    this.elements.attemptLabel.textContent = `Review ${this.attempts}`;

    if (this.mode === 'guided') this.checkGuided();
    else this.checkEditor();
  }

  private checkGuided(): void {
    if (!this.exercise) return;
    let correct = 0;
    let unanswered = 0;

    this.gaps.forEach((state, index) => {
      const answer = this.exercise?.gaps[index]?.answer;
      if (!state.selection) {
        state.grade = 'idle';
        unanswered += 1;
      } else if (state.selection === answer) {
        state.grade = state.grade === 'hinted' ? 'hinted' : 'correct';
        correct += 1;
      } else {
        state.grade = 'incorrect';
      }
    });
    this.renderGuided();
    this.updateReview(correct);

    if (correct === this.gaps.length) {
      this.completeDraft();
      return;
    }

    const incorrect = this.gaps.length - correct - unanswered;
    const parts = [
      `${correct} ${correct === 1 ? 'choice is' : 'choices are'} correct`,
      incorrect > 0 ? `${incorrect} to revise` : '',
      unanswered > 0 ? `${unanswered} still blank` : '',
    ].filter(Boolean);
    this.setFeedback(`${parts.join(' · ')}. Correct choices are locked in place.`, 'review');
  }

  private checkEditor(): void {
    if (!this.passage) return;
    const grade = gradeEditorDraft(this.passage.text, this.elements.textarea.value);

    if (!grade.validDraft) {
      this.updateReview(0);
      this.setFeedback(
        'The wording changed beyond the articles. Reset the draft, then add only a, an, and the.',
        'error',
      );
      return;
    }

    this.updateReview(grade.correct);
    if (
      grade.correct === grade.total &&
      grade.missing === 0 &&
      grade.wrong === 0 &&
      grade.extra === 0
    ) {
      this.completeDraft();
      return;
    }

    const parts = [
      `${grade.correct} correctly placed`,
      grade.missing > 0 ? `${grade.missing} missing` : '',
      grade.wrong > 0 ? `${grade.wrong} different choice` : '',
      grade.extra > 0 ? `${grade.extra} extra` : '',
    ].filter(Boolean);
    this.setFeedback(`${parts.join(' · ')}. Read once more for meaning, then revise.`, 'review');
  }

  private completeDraft(): void {
    if (!this.passage || !this.exercise) return;
    this.progress = this.progressStore.recordCompletion(
      this.progress,
      this.passage.id,
      this.passage.genre,
    );
    this.updateProgressDisplay();
    this.elements.checkButton.disabled = true;
    this.elements.hintButton.disabled = true;
    this.setFeedback('Clean copy. Every article is exactly where the writer intended.', 'success');
    this.showGlobalStatus('Draft complete — excellent proofreading.', 'success');
  }

  private addHint(): void {
    if (!this.passage || !this.exercise || this.hintsRemaining <= 0 || this.revealed) return;

    if (this.mode === 'guided') {
      const index = this.gaps.findIndex((state, gapIndex) => {
        const answer = this.exercise?.gaps[gapIndex]?.answer;
        return state.selection !== answer;
      });
      const state = this.gaps[index];
      const gap = this.exercise.gaps[index];
      if (!state || !gap) {
        this.setFeedback('There are no unresolved gaps left to annotate.', 'neutral');
        return;
      }
      state.selection = gap.answer;
      state.grade = 'hinted';
      this.hintsRemaining -= 1;
      this.updateHintButton();
      this.renderGuided(index);
      this.setFeedback(`Editor’s note: gap ${index + 1} has been restored for you.`, 'hint');
      return;
    }

    const hint = getEditorHint(this.passage.text, this.elements.textarea.value);
    if (!hint) {
      this.setFeedback(
        'The editor cannot place a note until the non-article wording matches the working copy.',
        'error',
      );
      return;
    }
    this.hintsRemaining -= 1;
    this.updateHintButton();
    this.setFeedback(`Editor’s note: ${hint}`, 'hint');
  }

  private resetDraft(): void {
    if (!this.passage) return;
    this.exercise = createGuidedExercise(this.passage);
    this.resetExerciseState();
    if (this.mode === 'guided') this.renderGuided();
    else this.elements.textarea.value = createEditorDraft(this.passage.text);
    this.updateReview(0);
    this.setFeedback('Fresh working copy loaded.', 'neutral');
  }

  private revealOriginal(): void {
    if (!this.passage || !this.exercise) return;
    this.revealed = true;
    this.hintsRemaining = 0;
    this.updateHintButton();
    this.elements.checkButton.disabled = true;
    this.elements.revealButton.disabled = true;

    if (this.mode === 'guided') {
      this.gaps = this.exercise.gaps.map((gap) => ({ selection: gap.answer, grade: 'hinted' }));
      this.renderGuided();
    } else {
      this.elements.textarea.value = this.passage.text;
      this.elements.textarea.readOnly = true;
    }
    this.updateReview(this.exercise.gaps.length);
    this.setFeedback('Original copy revealed. Reset the draft to practise it again.', 'hint');
  }

  private loadAnotherPassage(): void {
    const next = selectPassage(PASSAGES, this.genre, { previousId: this.passage?.id });
    if (!next || next.id === this.passage?.id) {
      this.showGlobalStatus('This desk has no other draft available yet.', 'error');
      return;
    }
    this.openPassage(next, true);
  }

  private closeDraft(): void {
    this.elements.practice.hidden = true;
    this.passage = null;
    this.exercise = null;
    this.hideGlobalStatus();
    const url = new URL(globalThis.location.href);
    url.search = '';
    globalThis.history.pushState({}, '', url);
    this.required('desks').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private updateReview(correct: number): void {
    const total = this.exercise?.gaps.length ?? 0;
    this.elements.scoreValue.textContent = String(correct);
    this.elements.scoreTotal.textContent = `/ ${total}`;
    const bucket = total > 0 ? Math.round((correct / total) * 10) : 0;
    this.elements.scoreRuleFill.className = `score-progress-${bucket}`;
  }

  private updateHintButton(): void {
    this.elements.hintCount.textContent = String(this.hintsRemaining);
    this.elements.hintButton.disabled = this.hintsRemaining <= 0 || this.revealed;
  }

  private updateDeskSummary(): void {
    const genre = this.selectedValue('genre');
    const mode = this.selectedValue('mode');
    if (!isGenre(genre) || !isExerciseMode(mode)) return;
    this.elements.deskSummary.textContent = `${GENRE_LABELS[genre]} desk · ${MODE_LABELS[mode]} brief`;
  }

  private updateProgressDisplay(): void {
    const completed = this.progress.completedPassages.length;
    const label = `${completed} ${completed === 1 ? 'draft' : 'drafts'} finished`;
    this.elements.sessionCount.textContent = String(completed);
    this.elements.headerProgress.textContent = label;
  }

  private setFeedback(
    message: string,
    tone: 'neutral' | 'review' | 'hint' | 'success' | 'error',
  ): void {
    this.elements.feedback.textContent = message;
    this.elements.feedback.dataset.tone = tone;
  }

  private showGlobalStatus(message: string, tone: 'success' | 'error'): void {
    this.elements.globalStatus.textContent = message;
    this.elements.globalStatus.dataset.tone = tone;
    this.elements.globalStatus.hidden = false;
  }

  private hideGlobalStatus(): void {
    this.elements.globalStatus.hidden = true;
    this.elements.globalStatus.textContent = '';
  }

  private updateUrl(): void {
    if (!this.passage) return;
    const url = new URL(globalThis.location.href);
    url.searchParams.set('genre', this.genre);
    url.searchParams.set('mode', this.mode);
    url.searchParams.set('draft', this.passage.id);
    globalThis.history.pushState({}, '', url);
  }

  private restoreUrlState(): void {
    const params = new URLSearchParams(globalThis.location.search);
    const genre = params.get('genre');
    const mode = params.get('mode');
    const draftId = params.get('draft');
    if (!isGenre(genre) || !isExerciseMode(mode) || !draftId) {
      if (this.passage) {
        this.elements.practice.hidden = true;
        this.passage = null;
        this.exercise = null;
        this.hideGlobalStatus();
      }
      return;
    }
    const passage = PASSAGES.find(
      (candidate) => candidate.id === draftId && candidate.genre === genre,
    );
    if (!passage) return;

    this.genre = genre;
    this.mode = mode;
    this.setRadio('genre', genre);
    this.setRadio('mode', mode);
    this.updateDeskSummary();
    this.openPassage(passage, false);
  }

  private selectedValue(name: string): string | null {
    return (
      this.elements.deskForm.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)
        ?.value ?? null
    );
  }

  private setRadio(name: string, value: string): void {
    const input = this.elements.deskForm.querySelector<HTMLInputElement>(
      `input[name="${name}"][value="${value}"]`,
    );
    if (input) input.checked = true;
  }

  private toArticle(value: string): Article | null {
    return ARTICLES.find((article) => article === value) ?? null;
  }

  private required<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = this.document.getElementById(id);
    if (!element) throw new Error(`Missing required element #${id}.`);
    return element as T;
  }
}
