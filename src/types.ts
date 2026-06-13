export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "student" | "teacher" | "parent";
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  noteId: string;
  userId: string;
  title: string;
  content: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPath {
  userId: string;
  weakAreas: string[];
  strengths: string[];
  recommendedPlan: string;
  subjectPreferences: string[];
  difficultyLevel: "Beginner" | "Intermediate" | "Advanced";
  updatedAt: string;
}

export interface ChatSession {
  chatId: string;
  userId: string;
  subject: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  messageId: string;
  role: "user" | "model";
  content: string;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface Quiz {
  quizId: string;
  userId: string;
  subject: string;
  topic: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizScore {
  scoreId: string;
  userId: string;
  quizId: string;
  subject: string;
  correctCount: number;
  totalCount: number;
  answers: number[];
  createdAt: string;
}
