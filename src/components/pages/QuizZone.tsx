import { useState } from 'react';
import { useStore } from '../../store';
import { QuizDifficulty, QuizQuestion, QuizResultData } from '../../types';
import { checkAnswer, getQuizQuestions, submitQuizAttempt } from '../../services/quizService';
import { Button } from '../Button';

type QuizState = 'SELECT_DIFFICULTY' | 'QUIZ_ACTIVE' | 'QUIZ_RESULTS';

interface QuestionFeedback {
  type: 'correct' | 'incorrect' | null;
  message: string;
  explanation?: string;
  selectedIdx?: number;
}

export function QuizZone() {
  const db = useStore((state) => state.db);

  const [quizState, setQuizState] = useState<QuizState>('SELECT_DIFFICULTY');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty>('easy');
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Active Quiz State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Mastery & Interactive Feedback State per question
  // wrongAttempts: map of questionId -> Set of option indices tried and incorrect
  const [wrongAttempts, setWrongAttempts] = useState<Record<number, number[]>>({});
  // correctSelections: map of questionId -> correct option index selected
  const [correctSelections, setCorrectSelections] = useState<Record<number, number>>({});
  // totalTries: map of questionId -> count of attempts
  const [totalTries, setTotalTries] = useState<Record<number, number>>({});
  // current feedback banner
  const [feedback, setFeedback] = useState<Record<number, QuestionFeedback>>({});

  const [result, setResult] = useState<QuizResultData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartQuiz = (difficulty: QuizDifficulty) => {
    if (!db) {
      setError('Database is not initialized.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedDifficulty(difficulty);

    try {
      const qList = getQuizQuestions(db, difficulty, questionCount);
      if (qList.length === 0) {
        setError(`No questions available for ${difficulty} difficulty.`);
        setIsLoading(false);
        return;
      }

      setQuestions(qList);
      setCurrentIndex(0);
      setWrongAttempts({});
      setCorrectSelections({});
      setTotalTries({});
      setFeedback({});

      setQuizState('QUIZ_ACTIVE');
    } catch (err) {
      console.error('Failed to start quiz:', err);
      setError('An error occurred while loading DBMS view quiz questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (questionId: number, optionIndex: number) => {
    if (!db) return;

    // If question is already answered correctly, lock changes
    if (correctSelections[questionId] !== undefined) return;

    // Increment tries count
    setTotalTries((prev) => ({
      ...prev,
      [questionId]: (prev[questionId] || 0) + 1,
    }));

    const evalResult = checkAnswer(db, questionId, optionIndex);

    if (evalResult.isCorrect) {
      setCorrectSelections((prev) => ({
        ...prev,
        [questionId]: optionIndex,
      }));

      setFeedback((prev) => ({
        ...prev,
        [questionId]: {
          type: 'correct',
          message: 'Correct! Well done! 🎉',
          explanation: evalResult.explanation,
          selectedIdx: optionIndex,
        },
      }));
    } else {
      // Incorrect answer: record wrong attempt and keep user on current question
      setWrongAttempts((prev) => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), optionIndex],
      }));

      setFeedback((prev) => ({
        ...prev,
        [questionId]: {
          type: 'incorrect',
          message: 'Not quite! Try again. 💡',
          explanation: `Review the DBMS view concept: ${evalResult.explanation.split('.')[0]}. Try another answer!`,
          selectedIdx: optionIndex,
        },
      }));
    }
  };

  const handleSubmitQuiz = () => {
    if (!db || questions.length === 0) return;

    const submissions = questions.map((q) => ({
      questionId: q.id,
      selectedOption: correctSelections[q.id] ?? null,
    }));

    const res = submitQuizAttempt(db, 'QUIZ', submissions, { difficulty: selectedDifficulty });
    setResult(res);
    setQuizState('QUIZ_RESULTS');
  };

  const handleRetakeQuiz = () => {
    handleStartQuiz(selectedDifficulty);
  };

  const handleBackToZone = () => {
    setQuizState('SELECT_DIFFICULTY');
    setQuestions([]);
    setResult(null);
    setError(null);
  };

  // Calculate overall completed count
  const completedCount = Object.keys(correctSelections).length;
  const grandTotalTries = Object.values(totalTries).reduce((sum, val) => sum + val, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background text-foreground space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-wider uppercase mb-1">
            <span>DBMS Views Assessment</span>
            <span>•</span>
            <span>Mastery Learning Mode</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
              ?
            </span>
            Quiz Zone — DBMS Views
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Interactive DBMS Views laboratory quiz. Answer each question correctly to advance. Retry incorrect choices until you master every view concept.
          </p>
        </div>

        {quizState === 'QUIZ_ACTIVE' && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleBackToZone} className="text-sm">
              Exit Quiz
            </Button>
            <Button
              variant="primary"
              disabled={completedCount < questions.length}
              onClick={handleSubmitQuiz}
              className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              Finish & Review
            </Button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* STATE 1: DIFFICULTY SELECTION */}
      {quizState === 'SELECT_DIFFICULTY' && (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Configurable Quiz Settings */}
          <div className="p-4 neo-surface rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-border/50">
            <div>
              <h3 className="text-sm font-bold text-foreground">Quiz Configuration</h3>
              <p className="text-xs text-muted-foreground">Select total DBMS view questions for this practice session.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Questions:</span>
              {[5, 10, 15, 20].map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    questionCount === count
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {count} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* EASY CARD */}
            <div className="neo-surface p-6 rounded-2xl border border-border/60 hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                    🌱
                  </span>
                  <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Easy
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Easy Level</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Basic view definitions, simple `CREATE VIEW` & `SELECT` queries, view creation syntax, and dynamic view behavior.
                  </p>
                </div>
                <div className="pt-2 border-t border-border/30 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>View Definitions & Virtual Tables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>`CREATE VIEW` & `DROP VIEW`</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleStartQuiz('easy')}
                loading={isLoading}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-sm"
              >
                Start Easy Quiz
              </Button>
            </div>

            {/* MEDIUM CARD */}
            <div className="neo-surface p-6 rounded-2xl border border-border/60 hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                    ⚡
                  </span>
                  <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Medium
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Medium Level</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Views with joins, aggregates (`GROUP BY`), updatable vs read-only view restrictions, and materialized view `STALE` states.
                  </p>
                </div>
                <div className="pt-2 border-t border-border/30 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">•</span>
                    <span>Join Views & Aggregate Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">•</span>
                    <span>Materialized View Refresh Mechanics</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleStartQuiz('medium')}
                loading={isLoading}
                className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 rounded-xl shadow-sm"
              >
                Start Medium Quiz
              </Button>
            </div>

            {/* HARD CARD */}
            <div className="neo-surface p-6 rounded-2xl border border-border/60 hover:border-rose-500/50 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                    🔥
                  </span>
                  <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    Hard
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Hard Level</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Complex nested views, `WITH CHECK OPTION` rules, key-preserved join updates, query rewriting optimization, and IVM delta algebra.
                  </p>
                </div>
                <div className="pt-2 border-t border-border/30 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-500">•</span>
                    <span>`WITH CHECK OPTION` & Key-Preserved Rules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-500">•</span>
                    <span>Incremental Maintenance & Query Rewriting</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleStartQuiz('hard')}
                loading={isLoading}
                className="w-full mt-6 bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 rounded-xl shadow-sm"
              >
                Start Hard Quiz
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: ACTIVE INTERACTIVE QUIZ */}
      {quizState === 'QUIZ_ACTIVE' && questions.length > 0 && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Header */}
          <div className="neo-surface p-5 rounded-2xl border border-border/50 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="uppercase tracking-wider">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-500 font-bold">
                  Mastered: {completedCount} / {questions.length}
                </span>
                <span className="capitalize px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {selectedDifficulty} Level
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-muted/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${(completedCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Question Card */}
          {(() => {
            const currentQ = questions[currentIndex];
            const isCompleted = correctSelections[currentQ.id] !== undefined;
            const currentFeedback = feedback[currentQ.id];
            const wrongs = wrongAttempts[currentQ.id] || [];

            return (
              <div className="neo-surface p-6 md:p-8 rounded-2xl border border-border/60 space-y-6 shadow-sm">
                {/* Topic & Metadata Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      {currentQ.subject}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-muted text-muted-foreground border border-border/40">
                      {currentQ.topic}
                    </span>
                  </div>
                  {isCompleted && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold border border-emerald-500/30 flex items-center gap-1">
                      <span>✓</span> Question Mastered
                    </span>
                  )}
                </div>

                {/* Question Statement */}
                <h2 className="text-lg md:text-xl font-bold text-foreground leading-snug">
                  <span className="text-primary mr-2 font-black">Q{currentIndex + 1}.</span>
                  {currentQ.questionText}
                </h2>

                {/* Dynamic Feedback Message Banner */}
                {currentFeedback && (
                  <div
                    className={`p-4 rounded-xl border text-xs font-medium space-y-1 transition-all ${
                      currentFeedback.type === 'correct'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                    }`}
                  >
                    <div className="font-extrabold text-sm flex items-center gap-1.5">
                      <span>{currentFeedback.type === 'correct' ? '✅' : '❌'}</span>
                      <span>{currentFeedback.message}</span>
                    </div>
                    {currentFeedback.explanation && (
                      <p className="text-muted-foreground leading-relaxed pt-1">
                        {currentFeedback.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* MCQ Options List */}
                <div className="space-y-3 pt-1">
                  {currentQ.options.map((optionText, idx) => {
                    const isWrongTried = wrongs.includes(idx);
                    const isCorrectChosen = correctSelections[currentQ.id] === idx;

                    let optionStyle = 'bg-card border-border/60 text-foreground hover:bg-muted/50 hover:border-border';
                    if (isCorrectChosen) {
                      optionStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold shadow-sm';
                    } else if (isWrongTried) {
                      optionStyle = 'bg-rose-500/10 border-rose-500/50 text-rose-400 opacity-80 cursor-pointer';
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isCompleted}
                        onClick={() => handleOptionClick(currentQ.id, idx)}
                        className={`w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-start justify-between gap-3.5 ${optionStyle}`}
                      >
                        <div className="flex items-start gap-3.5 flex-1">
                          <span
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isCorrectChosen
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : isWrongTried
                                ? 'bg-rose-500 text-white border-rose-500'
                                : 'border-muted-foreground/40 text-muted-foreground'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="leading-normal">{optionText}</span>
                        </div>

                        {/* Status Badges */}
                        {isCorrectChosen && (
                          <span className="text-xs font-extrabold text-emerald-500 shrink-0">Correct ✓</span>
                        )}
                        {isWrongTried && !isCorrectChosen && (
                          <span className="text-xs font-bold text-rose-400 shrink-0">Tried - Incorrect ✗</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Question Navigation Bar */}
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
                        disabled={!isCompleted}
                        onClick={() => setCurrentIndex((prev) => prev + 1)}
                        className="text-sm font-semibold px-6 bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        Next Question →
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        disabled={completedCount < questions.length}
                        onClick={handleSubmitQuiz}
                        className="text-sm font-semibold px-6 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                      >
                        Complete Quiz ✓
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* STATE 3: QUIZ MASTERY RESULTS & REVIEWS */}
      {quizState === 'QUIZ_RESULTS' && result && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Performance Summary Banner */}
          <div className="p-6 md:p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500">100% Concepts Mastered</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mt-0.5">Quiz Mastery Accomplished! 🌟</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Great job! You successfully worked through every DBMS View question until finding the correct solution.
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-4xl md:text-5xl font-black text-emerald-500">100%</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">
                  Mastery Rate ({result.totalQuestions} / {result.totalQuestions} Solved)
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border/40">
              <div className="p-3.5 neo-surface rounded-xl text-center">
                <div className="text-xs text-muted-foreground font-semibold">Questions Solved</div>
                <div className="text-xl font-bold text-foreground mt-0.5">{result.totalQuestions}</div>
              </div>
              <div className="p-3.5 neo-surface rounded-xl text-center">
                <div className="text-xs text-emerald-500 font-semibold">Mastery Achieved</div>
                <div className="text-xl font-bold text-emerald-500 mt-0.5">{result.totalQuestions} / {result.totalQuestions}</div>
              </div>
              <div className="p-3.5 neo-surface rounded-xl text-center">
                <div className="text-xs text-primary font-semibold">Total Interactive Tries</div>
                <div className="text-xl font-bold text-primary mt-0.5">{grandTotalTries} Tries</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleBackToZone} className="text-sm font-semibold">
                ← Back to Quiz Zone
              </Button>
              <Button variant="primary" onClick={handleRetakeQuiz} className="text-sm font-semibold">
                ↻ Retake DBMS View Quiz
              </Button>
            </div>
          </div>

          {/* Detailed Solution Review */}
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <span>DBMS View Concept Summary & Explanations</span>
            </h3>

            <div className="space-y-4">
              {result.reviews.map((rev, idx) => (
                <div key={rev.questionId} className="neo-surface p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                        Q{idx + 1}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                        {rev.subject}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground">
                        {rev.topic}
                      </span>
                    </div>

                    <span className="text-xs font-extrabold px-3 py-1 rounded-full uppercase bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      Mastered ✓
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-foreground mb-4">{rev.questionText}</h4>

                  {/* Correct Option Highlight */}
                  <div className="p-3 rounded-xl border border-emerald-500 bg-emerald-500/15 text-emerald-400 text-xs font-bold mb-4 flex items-center gap-2">
                    <span>Correct Answer:</span>
                    <span>{rev.options[rev.correctOption]}</span>
                  </div>

                  {/* Concept Explanation */}
                  <div className="p-4 rounded-xl bg-muted/60 border border-border/40 text-xs space-y-1">
                    <span className="font-bold text-foreground block">DBMS View Concept Explanation:</span>
                    <p className="text-muted-foreground leading-relaxed">{rev.explanation}</p>
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
