import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { ExamInfo, PyqFilters, QuizQuestion, QuizResultData } from '../../types';
import { getExams, getPyqFilterMetadata, getPyqQuestions, submitQuizAttempt } from '../../services/quizService';
import { Button } from '../Button';

type PyqState = 'EXAM_SELECT' | 'PRACTICE_ACTIVE' | 'PRACTICE_RESULTS';

export function PyqZone() {
  const db = useStore((state) => state.db);

  const [pyqState, setPyqState] = useState<PyqState>('EXAM_SELECT');
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [filterMeta, setFilterMeta] = useState<{ years: number[]; subjects: string[]; topics: string[] }>({
    years: [],
    subjects: [],
    topics: [],
  });

  // Filter state
  const [filters, setFilters] = useState<PyqFilters>({
    examId: 'ALL',
    year: 'all',
    subject: 'all',
    topic: 'all',
    difficulty: 'all',
  });

  // Practice session state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const availableExams = getExams(db);
    setExams(availableExams);

    const meta = getPyqFilterMetadata(db);
    setFilterMeta(meta);
  }, [db]);

  const handleSelectExamCard = (examId: string) => {
    const updatedFilters: PyqFilters = {
      ...filters,
      examId,
      year: 'all',
      subject: 'all',
      topic: 'all',
    };
    setFilters(updatedFilters);
    startPracticeSession(updatedFilters);
  };

  const startPracticeSession = (activeFilters: PyqFilters) => {
    if (!db) {
      setError('Database is not initialized.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const qList = getPyqQuestions(db, activeFilters);
      if (qList.length === 0) {
        setError('No previous year questions match the selected filter criteria.');
        setIsLoading(false);
        return;
      }

      setQuestions(qList);
      setCurrentIndex(0);

      const initialAnswers: Record<number, number | null> = {};
      const initialMarked: Record<number, boolean> = {};
      qList.forEach((q) => {
        initialAnswers[q.id] = null;
        initialMarked[q.id] = false;
      });

      setUserAnswers(initialAnswers);
      setMarkedForReview(initialMarked);
      setPyqState('PRACTICE_ACTIVE');
    } catch (err) {
      console.error('Failed to start PYQ practice session:', err);
      setError('An error occurred while loading PYQ questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    startPracticeSession(filters);
  };

  const handleResetFilters = () => {
    const resetF: PyqFilters = {
      examId: 'ALL',
      year: 'all',
      subject: 'all',
      topic: 'all',
      difficulty: 'all',
    };
    setFilters(resetF);
    startPracticeSession(resetF);
  };

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const toggleMarkForReview = (questionId: number) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleSubmitPractice = () => {
    if (!db || questions.length === 0) return;

    const submissions = questions.map((q) => ({
      questionId: q.id,
      selectedOption: userAnswers[q.id] ?? null,
      isMarkedForReview: markedForReview[q.id] || false,
    }));

    const res = submitQuizAttempt(db, 'PYQ', submissions, { examId: filters.examId });
    setResult(res);
    setPyqState('PRACTICE_RESULTS');
  };

  const handleBackToExams = () => {
    setPyqState('EXAM_SELECT');
    setQuestions([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background text-foreground space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-wider uppercase mb-1">
            <span>Competitive Exam Prep</span>
            <span>•</span>
            <span>Official Papers</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
              📜
            </span>
            PYQ Practice Zone
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Practice authentic Previous Year Questions (PYQs) from GATE CS/IT, CTET, and major competitive exams separated by exam, subject, topic, and year.
          </p>
        </div>

        {pyqState === 'PRACTICE_ACTIVE' && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleBackToExams} className="text-sm">
              Change Exam
            </Button>
            <Button variant="primary" onClick={handleSubmitPractice} className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
              Submit Practice
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* STATE 1: EXAM SELECTION & FILTERS */}
      {pyqState === 'EXAM_SELECT' && (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Exam Cards Grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Select an Examination Target</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ALL EXAMS CARD */}
              <div
                onClick={() => handleSelectExamCard('ALL')}
                className="neo-surface p-6 rounded-2xl border border-border/60 hover:border-primary/50 cursor-pointer transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform">
                      📚
                    </span>
                    <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      All Exams
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">Combined Question Bank</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Practice questions across all competitive exams in the database using custom year, subject, and topic filters.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between text-xs text-primary font-bold">
                  <span>Browse All Papers →</span>
                </div>
              </div>

              {/* DYNAMIC EXAM CARDS */}
              {exams.map((exam) => (
                <div
                  key={exam.examId}
                  onClick={() => handleSelectExamCard(exam.examId)}
                  className="neo-surface p-6 rounded-2xl border border-border/60 hover:border-primary/50 cursor-pointer transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                        {exam.examId === 'GATE' ? '💻' : '🎓'}
                      </span>
                      <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/40">
                        {exam.availableYears?.length || 0} Years Available
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{exam.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{exam.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {exam.subjects?.slice(0, 3).map((sub) => (
                        <span key={sub} className="text-[10px] px-2 py-0.5 rounded bg-muted/80 text-muted-foreground font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between text-xs text-primary font-bold">
                    <span>Start {exam.examId} Practice →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Filter Bar */}
          <div className="neo-surface p-6 rounded-2xl border border-border/50 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Advanced Question Bank Filters</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Exam Filter */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Exam:</label>
                <select
                  value={filters.examId}
                  onChange={(e) => setFilters({ ...filters, examId: e.target.value })}
                  className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-medium focus:outline-none focus:border-primary"
                >
                  <option value="ALL">All Exams</option>
                  {exams.map((ex) => (
                    <option key={ex.examId} value={ex.examId}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Year:</label>
                <select
                  value={String(filters.year)}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
                  className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-medium focus:outline-none focus:border-primary"
                >
                  <option value="all">All Available Years</option>
                  {filterMeta.years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Subject:</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-medium focus:outline-none focus:border-primary"
                >
                  <option value="all">All Subjects</option>
                  {filterMeta.subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Difficulty:</label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-medium focus:outline-none focus:border-primary"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Filter Buttons & Active Badges */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Active:</span>
                {filters.examId !== 'ALL' && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                    Exam: {filters.examId}
                  </span>
                )}
                {filters.year !== 'all' && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                    Year: {filters.year}
                  </span>
                )}
                {filters.subject !== 'all' && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                    Subject: {filters.subject}
                  </span>
                )}
                {filters.difficulty !== 'all' && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold capitalize">
                    Diff: {filters.difficulty}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs">
                  Reset Filters
                </Button>
                <Button variant="primary" size="sm" loading={isLoading} onClick={handleApplyFilters} className="text-xs font-semibold">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: PRACTICE ACTIVE INTERFACE */}
      {pyqState === 'PRACTICE_ACTIVE' && questions.length > 0 && (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Column */}
          <div className="lg:col-span-3 space-y-6">
            {(() => {
              const currentQ = questions[currentIndex];
              const isMarked = markedForReview[currentQ.id] || false;

              return (
                <div className="neo-surface p-6 md:p-8 rounded-2xl border border-border/60 space-y-6 shadow-sm">
                  {/* Question Metadata & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/40">
                    <div className="flex flex-wrap items-center gap-2">
                      {currentQ.examId && (
                        <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                          {currentQ.examId} {currentQ.year ? `(${currentQ.year})` : ''}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-lg bg-muted text-muted-foreground font-semibold text-xs border border-border/40">
                        {currentQ.subject}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-muted/60 text-muted-foreground text-xs">
                        {currentQ.topic}
                      </span>
                    </div>

                    {/* Authenticity Badge */}
                    <div className="flex items-center gap-2">
                      {currentQ.isVerified ? (
                        <span
                          title={currentQ.sourceRef || 'Verified Previous Year Question'}
                          className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1"
                        >
                          <span>✓</span> Verified PYQ
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[11px] font-extrabold">
                          Practice Question – Not Verified PYQs
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Header & Mark for Review */}
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg md:text-xl font-bold text-foreground leading-relaxed flex-1">
                      <span className="text-primary mr-2 font-black">Q{currentIndex + 1}.</span>
                      {currentQ.questionText}
                    </h2>

                    <button
                      onClick={() => toggleMarkForReview(currentQ.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                        isMarked
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted border-border/40'
                      }`}
                    >
                      <span>🚩</span>
                      <span>{isMarked ? 'Marked' : 'Mark for Review'}</span>
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="space-y-3 pt-2">
                    {currentQ.options.map((optText, idx) => {
                      const selectedOpt = userAnswers[currentQ.id];
                      const isOptSelected = selectedOpt === idx;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(currentQ.id, idx)}
                          className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-start gap-3.5 ${
                            isOptSelected
                              ? 'bg-primary/10 border-primary text-primary font-semibold shadow-sm'
                              : 'bg-card border-border/60 text-foreground hover:bg-muted/50 hover:border-border'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isOptSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-muted-foreground/40 text-muted-foreground'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1 leading-normal">{optText}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom Navigation */}
                  <div className="flex items-center justify-between pt-6 border-t border-border/40">
                    <Button
                      variant="outline"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => prev - 1)}
                      className="text-sm font-semibold"
                    >
                      ← Previous
                    </Button>

                    <div className="flex items-center gap-3">
                      {currentIndex < questions.length - 1 ? (
                        <Button
                          variant="primary"
                          onClick={() => setCurrentIndex((prev) => prev + 1)}
                          className="text-sm font-semibold px-6"
                        >
                          Next →
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={handleSubmitPractice}
                          className="text-sm font-semibold px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Submit Practice ✓
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Column: Question Palette */}
          <div className="lg:col-span-1 space-y-4">
            <div className="neo-surface p-5 rounded-2xl border border-border/60 space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <h3 className="text-sm font-bold text-foreground">Question Palette</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {questions.length} Questions
                </span>
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  <span>Marked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted border border-border"></span>
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span>Current</span>
                </div>
              </div>

              {/* Palette Buttons Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isCurrent = currentIndex === idx;
                  const isAnswered = userAnswers[q.id] !== null && userAnswers[q.id] !== undefined;
                  const isMarked = markedForReview[q.id] || false;

                  let badgeStyle = 'bg-muted text-muted-foreground border-border/40';
                  if (isCurrent) {
                    badgeStyle = 'bg-primary text-primary-foreground font-bold ring-2 ring-primary/40';
                  } else if (isMarked) {
                    badgeStyle = 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold';
                  } else if (isAnswered) {
                    badgeStyle = 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 font-bold';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-9 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center relative ${badgeStyle}`}
                    >
                      {idx + 1}
                      {isMarked && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="primary"
                onClick={handleSubmitPractice}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl"
              >
                Submit Practice
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: PRACTICE RESULTS & REVIEW */}
      {pyqState === 'PRACTICE_RESULTS' && result && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Performance Summary Banner */}
          <div className="p-6 md:p-8 rounded-2xl border border-primary/30 bg-primary/5 space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary">Practice Session Complete</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mt-0.5">PYQ Performance Analysis</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Review your answers and accuracy across verified previous year questions.
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-4xl md:text-5xl font-black text-primary">{result.percentage}%</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                  Accuracy Score ({result.score} / {result.totalQuestions})
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/40">
              <div className="p-3.5 neo-surface rounded-xl text-center">
                <div className="text-xs text-muted-foreground font-semibold">Total Attempted</div>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  {result.correctCount + result.incorrectCount} / {result.totalQuestions}
                </div>
              </div>
              <div className="p-3.5 neo-surface rounded-xl text-center">
                <div className="text-xs text-emerald-500 font-semibold">Correct</div>
                <div className="text-xl font-bold text-emerald-500 mt-0.5">{result.correctCount}</div>
              </div>
              <div className="p-3.5 neo-surface rounded-xl text-center">
                <div className="text-xs text-rose-500 font-semibold">Incorrect</div>
                <div className="text-xl font-bold text-rose-500 mt-0.5">{result.incorrectCount}</div>
              </div>
              <div className="p-3.5 neo-surface rounded-xl text-center">
                <div className="text-xs text-muted-foreground font-semibold">Unanswered</div>
                <div className="text-xl font-bold text-muted-foreground mt-0.5">{result.unansweredCount}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleBackToExams} className="text-sm font-semibold">
                ← Select Another Exam
              </Button>
              <Button variant="primary" onClick={() => startPracticeSession(filters)} className="text-sm font-semibold">
                ↻ Retake Practice
              </Button>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <span>Verified PYQ Answer Keys & Explanations</span>
            </h3>

            <div className="space-y-4">
              {result.reviews.map((rev, idx) => (
                <div
                  key={rev.questionId}
                  className={`neo-surface p-6 rounded-2xl border transition-all ${
                    rev.isCorrect
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : rev.selectedOption === null
                      ? 'border-border/60'
                      : 'border-rose-500/40 bg-rose-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                        Q{idx + 1}
                      </span>
                      {rev.examId && (
                        <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                          {rev.examId} {rev.year ? `(${rev.year})` : ''}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground">
                        {rev.subject}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                        rev.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                          : rev.selectedOption === null
                          ? 'bg-muted text-muted-foreground border border-border/40'
                          : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                      }`}
                    >
                      {rev.isCorrect ? 'Correct ✓' : rev.selectedOption === null ? 'Unanswered' : 'Incorrect ✗'}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-foreground mb-4">{rev.questionText}</h4>

                  {/* Options Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {rev.options.map((optText, optIdx) => {
                      const isCorrectOpt = rev.correctOption === optIdx;
                      const isSelectedOpt = rev.selectedOption === optIdx;

                      let optStyle = 'bg-card border-border/50 text-foreground';
                      if (isCorrectOpt) {
                        optStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-500 font-bold';
                      } else if (isSelectedOpt && !isCorrectOpt) {
                        optStyle = 'bg-rose-500/15 border-rose-500 text-rose-500 font-bold';
                      }

                      return (
                        <div key={optIdx} className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${optStyle}`}>
                          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{optText}</span>
                          {isCorrectOpt && <span className="text-xs font-bold text-emerald-500">Correct</span>}
                          {isSelectedOpt && !isCorrectOpt && <span className="text-xs font-bold text-rose-500">Your Choice</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Source Reference & Explanation */}
                  <div className="p-4 rounded-xl bg-muted/60 border border-border/40 text-xs space-y-2">
                    {rev.sourceRef && (
                      <div className="text-[11px] font-semibold text-primary flex items-center gap-1">
                        <span>Source / Reference:</span>
                        <span>{rev.sourceRef}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-foreground block mb-0.5">Official Solution Explanation:</span>
                      <p className="text-muted-foreground leading-relaxed">{rev.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
