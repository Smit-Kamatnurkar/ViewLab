import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase, Database } from '../database/sqlite';
import { getQuizQuestions, getPyqQuestions, getExams, submitQuizAttempt } from './quizService';

describe('Quiz & PYQ Service Layer', () => {
  let db: Database;

  beforeEach(async () => {
    db = await initializeDatabase();
  });

  it('initializes exams and questions in SQLite', () => {
    const exams = getExams(db);
    expect(exams.length).toBeGreaterThan(0);
    expect(exams.some((e) => e.examId === 'GATE')).toBe(true);
    expect(exams.some((e) => e.examId === 'DBMS_VIEWS_TOPIC')).toBe(true);
    expect(exams.some((e) => e.examId === 'SQL_VIEWS_SET')).toBe(true);
  });

  it('fetches Easy, Medium, and Hard quiz questions with 4 options per question', () => {
    const easyQ = getQuizQuestions(db, 'easy', 10);
    expect(easyQ.length).toBeGreaterThan(0);
    easyQ.forEach((q) => {
      expect(q.difficulty).toBe('easy');
      expect(q.options.length).toBe(4);
      expect(q.questionText).toBeTruthy();
    });

    const mediumQ = getQuizQuestions(db, 'medium', 10);
    expect(mediumQ.length).toBeGreaterThan(0);
    mediumQ.forEach((q) => {
      expect(q.difficulty).toBe('medium');
      expect(q.options.length).toBe(4);
    });

    const hardQ = getQuizQuestions(db, 'hard', 10);
    expect(hardQ.length).toBeGreaterThan(0);
    hardQ.forEach((q) => {
      expect(q.difficulty).toBe('hard');
      expect(q.options.length).toBe(4);
    });
  });

  it('filters PYQ questions by exam target', () => {
    const gateQuestions = getPyqQuestions(db, {
      examId: 'GATE',
      year: 'all',
      subject: 'all',
      topic: 'all',
      difficulty: 'all',
    });

    expect(gateQuestions.length).toBeGreaterThan(0);
    gateQuestions.forEach((q) => {
      expect(q.examId).toBe('GATE');
    });

    const topicQuestions = getPyqQuestions(db, {
      examId: 'DBMS_VIEWS_TOPIC',
      year: 'all',
      subject: 'all',
      topic: 'all',
      difficulty: 'all',
    });

    expect(topicQuestions.length).toBeGreaterThan(0);
    topicQuestions.forEach((q) => {
      expect(q.examId).toBe('DBMS_VIEWS_TOPIC');
    });
  });

  it('submits a quiz attempt, calculates score securely, and returns detailed reviews', () => {
    const easyQuestions = getQuizQuestions(db, 'easy', 5);
    expect(easyQuestions.length).toBe(5);

    // Create submission with first option selected for all
    const submissions = easyQuestions.map((q) => ({
      questionId: q.id,
      selectedOption: 0,
    }));

    const result = submitQuizAttempt(db, 'QUIZ', submissions, { difficulty: 'easy' });

    expect(result.totalQuestions).toBe(5);
    expect(result.attemptId).toBeTruthy();
    expect(result.reviews.length).toBe(5);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(5);

    // Verify database persistence in QUIZ_ATTEMPTS
    const attemptRow = db.exec(`SELECT * FROM QUIZ_ATTEMPTS WHERE id = '${result.attemptId}'`);
    expect(attemptRow.length).toBe(1);
    expect(attemptRow[0].values.length).toBe(1);
  });
});
