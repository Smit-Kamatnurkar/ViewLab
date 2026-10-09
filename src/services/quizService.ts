import { Database } from 'sql.js';
import {
  ExamInfo,
  PyqFilters,
  QuestionReviewItem,
  QuizDifficulty,
  QuizQuestion,
  QuizResultData,
  QuizSubmissionItem,
} from '../types';

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getExams(db: Database): ExamInfo[] {
  try {
    const res = db.exec(`
      SELECT e.exam_id, e.name, e.description, e.icon, COUNT(q.id) as question_count
      FROM EXAMS e
      LEFT JOIN QUIZ_QUESTIONS q ON e.exam_id = q.exam_id
      GROUP BY e.exam_id
    `);

    if (res.length === 0 || res[0].values.length === 0) return [];

    const exams: ExamInfo[] = [];
    for (const row of res[0].values) {
      const examId = row[0] as string;
      const name = row[1] as string;
      const description = row[2] as string;
      const icon = row[3] as string;
      const totalQuestions = row[4] as number;

      // Get available years for this exam
      const yearsRes = db.exec(
        `SELECT DISTINCT year FROM QUIZ_QUESTIONS WHERE exam_id = ? AND year IS NOT NULL ORDER BY year DESC`,
        [examId]
      );
      const years = yearsRes.length > 0 ? yearsRes[0].values.map((v) => v[0] as number) : [];

      // Get available subjects for this exam
      const subjectsRes = db.exec(
        `SELECT DISTINCT subject FROM QUIZ_QUESTIONS WHERE exam_id = ? ORDER BY subject ASC`,
        [examId]
      );
      const subjects = subjectsRes.length > 0 ? subjectsRes[0].values.map((v) => v[0] as string) : [];

      exams.push({
        examId,
        name,
        description,
        icon,
        totalQuestions,
        availableYears: years,
        subjects,
      });
    }

    return exams;
  } catch (err) {
    console.error('Failed to get exams:', err);
    return [];
  }
}

export function getQuizQuestions(
  db: Database,
  difficulty: QuizDifficulty,
  limit: number = 10
): QuizQuestion[] {
  try {
    const stmt = db.prepare(
      `SELECT id, quiz_type, difficulty, exam_id, year, subject, topic, question_text, explanation, is_verified, source_ref
       FROM QUIZ_QUESTIONS 
       WHERE quiz_type = 'QUIZ' AND difficulty = ?`
    );
    stmt.bind([difficulty]);

    const questions: QuizQuestion[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      const questionId = row.id as number;

      // Fetch options without exposing is_correct
      const optStmt = db.prepare(
        `SELECT option_index, option_text FROM QUIZ_OPTIONS WHERE question_id = ? ORDER BY option_index ASC`
      );
      optStmt.bind([questionId]);

      const options: string[] = [];
      while (optStmt.step()) {
        const optRow = optStmt.getAsObject();
        options.push(optRow.option_text as string);
      }
      optStmt.free();

      questions.push({
        id: questionId,
        quizType: 'QUIZ',
        difficulty: row.difficulty as QuizDifficulty,
        examId: (row.exam_id as string) || undefined,
        year: (row.year as number) || undefined,
        subject: row.subject as string,
        topic: row.topic as string,
        questionText: row.question_text as string,
        options,
        explanation: row.explanation as string, // kept on server object, not shown in UI before submission
        isVerified: Boolean(row.is_verified),
        sourceRef: (row.source_ref as string) || undefined,
      });
    }
    stmt.free();

    const shuffled = shuffleArray(questions);
    return shuffled.slice(0, limit);
  } catch (err) {
    console.error('Failed to get quiz questions:', err);
    return [];
  }
}

export function getPyqFilterMetadata(db: Database) {
  try {
    const examsRes = db.exec("SELECT DISTINCT exam_id FROM QUIZ_QUESTIONS WHERE quiz_type = 'PYQ' AND exam_id IS NOT NULL");
    const exams = examsRes.length > 0 ? examsRes[0].values.map((v) => v[0] as string) : [];

    const yearsRes = db.exec("SELECT DISTINCT year FROM QUIZ_QUESTIONS WHERE quiz_type = 'PYQ' AND year IS NOT NULL ORDER BY year DESC");
    const years = yearsRes.length > 0 ? yearsRes[0].values.map((v) => v[0] as number) : [];

    const subjectsRes = db.exec("SELECT DISTINCT subject FROM QUIZ_QUESTIONS WHERE quiz_type = 'PYQ' ORDER BY subject ASC");
    const subjects = subjectsRes.length > 0 ? subjectsRes[0].values.map((v) => v[0] as string) : [];

    const topicsRes = db.exec("SELECT DISTINCT topic FROM QUIZ_QUESTIONS WHERE quiz_type = 'PYQ' ORDER BY topic ASC");
    const topics = topicsRes.length > 0 ? topicsRes[0].values.map((v) => v[0] as string) : [];

    return { exams, years, subjects, topics };
  } catch (err) {
    console.error('Failed to get PYQ filter metadata:', err);
    return { exams: [], years: [], subjects: [], topics: [] };
  }
}

export function getPyqQuestions(db: Database, filters: PyqFilters): QuizQuestion[] {
  try {
    let sql = `SELECT id, quiz_type, difficulty, exam_id, year, subject, topic, question_text, explanation, is_verified, source_ref
               FROM QUIZ_QUESTIONS 
               WHERE quiz_type = 'PYQ'`;
    const params: (string | number)[] = [];

    if (filters.examId && filters.examId !== 'ALL' && filters.examId !== 'all') {
      sql += ` AND exam_id = ?`;
      params.push(filters.examId);
    }

    if (filters.year && filters.year !== 'all') {
      sql += ` AND year = ?`;
      params.push(Number(filters.year));
    }

    if (filters.subject && filters.subject !== 'all') {
      sql += ` AND subject = ?`;
      params.push(filters.subject);
    }

    if (filters.topic && filters.topic !== 'all') {
      sql += ` AND topic = ?`;
      params.push(filters.topic);
    }

    if (filters.difficulty && filters.difficulty !== 'all') {
      sql += ` AND difficulty = ?`;
      params.push(filters.difficulty);
    }

    sql += ` ORDER BY year DESC, id ASC`;

    const stmt = db.prepare(sql);
    stmt.bind(params);

    const questions: QuizQuestion[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const questionId = row.id as number;

      const optStmt = db.prepare(
        `SELECT option_index, option_text FROM QUIZ_OPTIONS WHERE question_id = ? ORDER BY option_index ASC`
      );
      optStmt.bind([questionId]);

      const options: string[] = [];
      while (optStmt.step()) {
        const optRow = optStmt.getAsObject();
        options.push(optRow.option_text as string);
      }
      optStmt.free();

      questions.push({
        id: questionId,
        quizType: 'PYQ',
        difficulty: row.difficulty as QuizDifficulty,
        examId: (row.exam_id as string) || undefined,
        year: (row.year as number) || undefined,
        subject: row.subject as string,
        topic: row.topic as string,
        questionText: row.question_text as string,
        options,
        explanation: row.explanation as string,
        isVerified: Boolean(row.is_verified),
        sourceRef: (row.source_ref as string) || undefined,
      });
    }
    stmt.free();

    return questions;
  } catch (err) {
    console.error('Failed to get PYQ questions:', err);
    return [];
  }
}

export function submitQuizAttempt(
  db: Database,
  mode: 'QUIZ' | 'PYQ',
  submissions: QuizSubmissionItem[],
  meta?: { difficulty?: QuizDifficulty; examId?: string }
): QuizResultData {
  const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const reviews: QuestionReviewItem[] = [];

  for (const sub of submissions) {
    // Query true correct option and question details
    const qStmt = db.prepare(
      `SELECT id, question_text, explanation, is_verified, source_ref, subject, topic, year, exam_id
       FROM QUIZ_QUESTIONS WHERE id = ?`
    );
    qStmt.bind([sub.questionId]);
    
    if (!qStmt.step()) {
      qStmt.free();
      continue;
    }

    const qRow = qStmt.getAsObject();
    qStmt.free();

    // Fetch options and find correct index
    const optStmt = db.prepare(
      `SELECT option_index, option_text, is_correct FROM QUIZ_OPTIONS WHERE question_id = ? ORDER BY option_index ASC`
    );
    optStmt.bind([sub.questionId]);

    const options: string[] = [];
    let correctOption = 0;

    while (optStmt.step()) {
      const optRow = optStmt.getAsObject();
      const idx = optRow.option_index as number;
      options.push(optRow.option_text as string);
      if (optRow.is_correct === 1) {
        correctOption = idx;
      }
    }
    optStmt.free();

    const isAnswered = sub.selectedOption !== null && sub.selectedOption !== undefined;
    const isCorrect = isAnswered && sub.selectedOption === correctOption;

    if (!isAnswered) {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    reviews.push({
      questionId: sub.questionId,
      questionText: qRow.question_text as string,
      options,
      selectedOption: sub.selectedOption,
      correctOption,
      isCorrect,
      explanation: qRow.explanation as string,
      isVerified: Boolean(qRow.is_verified),
      sourceRef: (qRow.source_ref as string) || undefined,
      subject: qRow.subject as string,
      topic: qRow.topic as string,
      year: (qRow.year as number) || undefined,
      examId: (qRow.exam_id as string) || undefined,
      isMarkedForReview: sub.isMarkedForReview,
    });
  }

  const totalQuestions = submissions.length;
  const score = correctCount;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const completedAt = Date.now();

  // Save attempt to database
  try {
    db.run(
      `INSERT INTO QUIZ_ATTEMPTS (id, mode, difficulty, exam_id, total_questions, score, correct_count, incorrect_count, unanswered_count, percentage, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attemptId,
        mode,
        meta?.difficulty || null,
        meta?.examId || null,
        totalQuestions,
        score,
        correctCount,
        incorrectCount,
        unansweredCount,
        percentage,
        completedAt,
      ]
    );

    for (const r of reviews) {
      db.run(
        `INSERT INTO ATTEMPT_ANSWERS (attempt_id, question_id, selected_option, is_correct, is_marked_for_review)
         VALUES (?, ?, ?, ?, ?)`,
        [attemptId, r.questionId, r.selectedOption, r.isCorrect ? 1 : 0, r.isMarkedForReview ? 1 : 0]
      );
    }
  } catch (err) {
    console.error('Failed to store quiz attempt in DB:', err);
  }

  return {
    attemptId,
    totalQuestions,
    score,
    correctCount,
    incorrectCount,
    unansweredCount,
    percentage,
    reviews,
  };
}

export function checkAnswer(
  db: Database,
  questionId: number,
  selectedOption: number
): { isCorrect: boolean; correctOption: number; explanation: string } {
  try {
    const qStmt = db.prepare(`SELECT explanation FROM QUIZ_QUESTIONS WHERE id = ?`);
    qStmt.bind([questionId]);
    let explanation = '';
    if (qStmt.step()) {
      explanation = qStmt.getAsObject().explanation as string;
    }
    qStmt.free();

    const optStmt = db.prepare(`SELECT option_index, is_correct FROM QUIZ_OPTIONS WHERE question_id = ?`);
    optStmt.bind([questionId]);

    let correctOption = 0;
    let isCorrect = false;

    while (optStmt.step()) {
      const row = optStmt.getAsObject();
      const idx = row.option_index as number;
      if (row.is_correct === 1) {
        correctOption = idx;
        if (idx === selectedOption) {
          isCorrect = true;
        }
      }
    }
    optStmt.free();

    return {
      isCorrect,
      correctOption,
      explanation,
    };
  } catch (err) {
    console.error('Failed to check answer:', err);
    return { isCorrect: false, correctOption: 0, explanation: '' };
  }
}

