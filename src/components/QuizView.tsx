import { useState } from "react";
import { Quiz, QuizQuestion, QuizScore } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { 
  Sparkles, 
  BrainCircuit, 
  Award, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2, 
  XCircle, 
  Loader2,
  RefreshCw
} from "lucide-react";

interface QuizViewProps {
  userId: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  onQuizFinished: (pointsEarned: number) => void;
  onBack: () => void;
}

export default function QuizView({
  userId,
  difficulty,
  onQuizFinished,
  onBack
}: QuizViewProps) {
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Generate a quiz via the server-side API proxy
  const generateQuiz = async () => {
    setLoading(true);
    setQuizFinished(false);
    setQuiz(null);
    setSelectedOption(null);
    setHasSubmittedAnswer(false);
    setAnswers([]);
    setCorrectCount(0);
    setCurrentQuestionIndex(0);

    try {
      const response = await fetch("/api/tutor/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic: topic.trim() || "Core principles",
          difficulty
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate practice questions from server API.");
      }

      const data = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Malformed questions response. Try again!");
      }

      const generatedQuiz: Quiz = {
        quizId: `quiz-${Date.now()}`,
        userId,
        subject,
        topic: data.topic || topic || "Socratic practice",
        difficulty,
        questions: data.questions,
        createdAt: new Date().toISOString()
      };

      setQuiz(generatedQuiz);
    } catch (err) {
      console.error(err);
      alert("Error generating educational quiz. Please check internet and click generate again!");
    } finally {
      setLoading(false);
    }
  };

  // Process answering options
  const handleSelectOption = (idx: number) => {
    if (hasSubmittedAnswer) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !quiz) return;
    
    const currQ = quiz.questions[currentQuestionIndex];
    const isCorrect = selectedOption === currQ.correctOptionIndex;

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }

    setAnswers((prev) => [...prev, selectedOption]);
    setHasSubmittedAnswer(true);
  };

  const handleNext = () => {
    if (!quiz) return;

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasSubmittedAnswer(false);
    } else {
      finishQuiz();
    }
  };

  // Complete and save to Firestore
  const finishQuiz = async () => {
    if (!quiz) return;
    setLoading(true);
    
    // Earn points: +10 points per correct answer!
    const pointsGained = correctCount * 15 + 10; 

    try {
      const scoreData: Omit<QuizScore, "scoreId"> = {
        userId,
        quizId: quiz.quizId,
        subject: quiz.subject,
        correctCount,
        totalCount: quiz.questions.length,
        answers,
        createdAt: new Date().toISOString()
      };

      const scoreCol = collection(db, "quiz_scores");
      await addDoc(scoreCol, {
        ...scoreData,
        createdAt: serverTimestamp()
      });

      setQuizFinished(true);
      onQuizFinished(pointsGained);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "quiz_scores");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-6 md:p-8 shadow-2xl text-white">
      {/* Intro Form if zero active quiz */}
      {!quiz && !quizFinished && (
        <div className="space-y-6 max-w-sm mx-auto py-4 animate-fade-in text-white">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center mx-auto border border-white/20 shadow-md">
              <BrainCircuit className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white">Generative Quiz Studio</h2>
            <p className="text-sm text-white/85">
              Generate a personalized 5-question review test based on your progress level. You earn 15 study points for each correct answer!
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Target Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 rounded-xl border border-white/20 bg-white/10 text-sm font-semibold text-white focus:outline-none"
              >
                <option className="bg-[#4F46E5] text-white" value="Mathematics">Mathematics</option>
                <option className="bg-[#4F46E5] text-white" value="Science">Science</option>
                <option className="bg-[#4F46E5] text-white" value="Coding & Tech">Coding & Tech</option>
                <option className="bg-[#4F46E5] text-white" value="English Grammar">English Grammar</option>
                <option className="bg-[#4F46E5] text-white" value="History & Arts">History & Arts</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Sub-topic or Field</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Fractions, Cell mitosis, Loops, Prepositions"
                className="w-full p-3 rounded-xl border border-white/20 bg-white/10 text-sm font-semibold text-white placeholder-white/35 focus:outline-none focus:border-white"
              />
            </div>

            <button
              onClick={generateQuiz}
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-white/95 disabled:bg-white/40 text-indigo-900 font-bold text-sm rounded-xl transition duration-200 shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />
                  Generate {difficulty} Quiz
                </>
              )}
            </button>

            <button 
              onClick={onBack}
              className="w-full text-xs font-semibold text-white/60 hover:text-white transition duration-150"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay for quiz creation */}
      {loading && !quiz && (
        <div className="py-20 text-center space-y-4 max-w-sm mx-auto text-white">
          <Loader2 className="w-10 h-10 animate-spin text-white mx-auto" />
          <h3 className="text-lg font-bold text-white">Drafting study quiz...</h3>
          <p className="text-xs text-white/80 leading-relaxed">
            Socrates is framing options and Socratic explanations dynamically. This takes up to 10 seconds.
          </p>
        </div>
      )}

      {/* Active Quiz Question Screen */}
      {quiz && !quizFinished && (
        <div className="space-y-6 max-w-xl mx-auto animate-fade-in text-white">
          {/* Progress Tracker bar */}
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-yellow-300">{quiz.subject}</span>
              <h3 className="text-sm font-bold text-white">{quiz.topic}</h3>
            </div>
            <span className="text-xs font-semibold text-white/60">
              Q{currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
          </div>

          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div 
              style={{ width: `${((currentQuestionIndex + (hasSubmittedAnswer ? 1 : 0)) / quiz.questions.length) * 100}%` }}
              className="bg-white h-full transition-all duration-300"
            />
          </div>

          {/* Core Question */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-white">
              {quiz.questions[currentQuestionIndex].question}
            </h4>

            {/* Options selection layout */}
            <div className="grid grid-cols-1 gap-3">
              {quiz.questions[currentQuestionIndex].options.map((opt, oIdx) => {
                const isSelected = selectedOption === oIdx;
                const isCorrectIdx = oIdx === quiz.questions[currentQuestionIndex].correctOptionIndex;
                
                // Color formatting classes based on whether submitted (Frosted Glass!)
                let cardClass = "border-white/15 bg-white/5 hover:bg-white/10 text-white";
                if (isSelected) {
                  cardClass = "border-white bg-white/20 text-white shadow-md";
                }

                if (hasSubmittedAnswer) {
                  if (isSelected) {
                    cardClass = isCorrectIdx 
                      ? "border-emerald-400 bg-emerald-500/20 text-white" 
                      : "border-rose-400 bg-rose-500/20 text-white";
                  } else if (isCorrectIdx) {
                    cardClass = "border-emerald-400/80 bg-emerald-500/15 text-white";
                  } else {
                    cardClass = "opacity-40 border-white/10 bg-white/5 text-white/50";
                  }
                }

                return (
                  <div
                    key={oIdx}
                    onClick={() => handleSelectOption(oIdx)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-sm font-semibold transition duration-150 ${
                      !hasSubmittedAnswer ? "cursor-pointer" : "cursor-default"
                    } ${cardClass}`}
                  >
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0 text-xs font-bold">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span>{opt}</span>
                    
                    {hasSubmittedAnswer && isCorrectIdx && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto shrink-0 animate-scale-up" />
                    )}
                    {hasSubmittedAnswer && isSelected && !isCorrectIdx && (
                      <XCircle className="w-5 h-5 text-red-400 ml-auto shrink-0 animate-scale-up" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Socratic explanation box if evaluated */}
          {hasSubmittedAnswer && (
            <div className="p-4 rounded-xl bg-white/10 border border-white/15 space-y-2 animate-scale-up text-white">
              <span className="text-xs font-bold text-white/80 block uppercase tracking-wider">AI Socratic Assessment</span>
              <p className="text-xs text-white/95 leading-relaxed">
                {quiz.questions[currentQuestionIndex].explanation}
              </p>
            </div>
          )}

          {/* Action trigger button */}
          <div className="pt-4 flex items-center justify-between border-t border-white/15">
            <button
              onClick={() => {
                setQuiz(null);
                setQuizFinished(false);
              }}
              className="text-xs font-semibold text-white/60 hover:text-white transition"
            >
              Abandon Quiz
            </button>

            {!hasSubmittedAnswer ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="py-2.5 px-6 bg-white text-indigo-950 hover:bg-white/90 disabled:opacity-40 font-bold text-sm rounded-xl transition shadow-md"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="py-2.5 px-6 bg-white hover:bg-white/90 text-indigo-900 font-bold text-sm rounded-xl transition shadow-md flex items-center gap-1"
              >
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <>
                    Next Question
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Complete Quiz
                    <Award className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Complete Congratulations Summary */}
      {quizFinished && quiz && (
        <div className="space-y-8 max-w-sm mx-auto text-center py-6 animate-fade-in text-white">
          <div className="w-16 h-16 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto border-2 border-white/30">
            <Award className="w-8 h-8 text-yellow-300 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white font-sans tracking-tight">Quiz Completed!</h2>
            <p className="text-sm text-white/80">
              Splendid effort! Socratic reviews help wire overall conceptual understanding into long-term student wisdom.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/10 border border-white/20 space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
              <span className="text-white/80 font-medium">Scoring Correct:</span>
              <span className="font-bold text-white">{correctCount} / {quiz.questions.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/80 font-medium">Study points earned:</span>
              <span className="font-bold text-yellow-300">+{correctCount * 15 + 10} pts</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={generateQuiz}
              className="w-full py-3 bg-white text-indigo-950 hover:bg-white/90 rounded-xl text-sm font-bold shadow-lg transition"
            >
              Attempt Another Topic
            </button>
            
            <button
              onClick={onBack}
              className="w-full text-xs font-semibold text-white/60 hover:text-white transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
