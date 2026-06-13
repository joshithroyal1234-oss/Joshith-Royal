import { useState, useEffect, FormEvent } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  updateDoc 
} from "firebase/firestore";
import { 
  auth, 
  signInWithGoogle, 
  logoutUser, 
  db, 
  handleFirestoreError, 
  OperationType 
} from "./firebase";
import { UserProfile, Note, LearningPath } from "./types";
import { 
  BookOpen, 
  GraduationCap, 
  LayoutDashboard, 
  LogOut, 
  Compass, 
  BrainCircuit, 
  FileText, 
  Award, 
  Plus, 
  Sparkles, 
  Lock,
  X,
  Loader2
} from "lucide-react";

import Dashboard from "./components/Dashboard";
import TutorChat from "./components/TutorChat";
import QuizView from "./components/QuizView";
import NotesView from "./components/NotesView";
import PathPlanner from "./components/PathPlanner";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  
  // Real-time fetched state
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzesCount, setQuizzesCount] = useState(0);

  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard", "chat", "quiz", "notes", "planner"
  const [selectedChatSubject, setSelectedChatSubject] = useState("General Study");
  
  // Modals state
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteSubject, setNewNoteSubject] = useState("Mathematics");

  const [authLoading, setAuthLoading] = useState(true);

  // 1. Authenticate user listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        setCurrentUser(user);
        await setupOrCreateUserProfile(user);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLearningPath(null);
        setNotes([]);
        setQuizzesCount(0);
        setActiveTab("dashboard");
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch/Create User Profile entry inside Firestore
  const setupOrCreateUserProfile = async (user: User) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let profileData: UserProfile;

      if (!userSnap.exists()) {
        const freshProfile: UserProfile = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "Scholar",
          role: "student",
          points: 100, // starting gift
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(userRef, {
          ...freshProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        profileData = freshProfile;
      } else {
        const data = userSnap.data();
        profileData = {
          uid: data.uid,
          email: data.email,
          displayName: data.displayName,
          role: data.role || "student",
          points: data.points ?? 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      }

      setUserProfile(profileData);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }
  };

  // 3. Real-time stream notes and scores when authenticator completes
  useEffect(() => {
    if (!currentUser) return;

    // Real-time Notes fetch
    const notesRef = collection(db, "notes");
    const notesQuery = query(notesRef, where("userId", "==", currentUser.uid));
    
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const fetchedNotes: Note[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        fetchedNotes.push({
          noteId: doc.id,
          userId: d.userId,
          title: d.title,
          content: d.content,
          subject: d.subject,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        });
      });
      // Sort notes by updatedAt or createdAt desc
      fetchedNotes.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setNotes(fetchedNotes);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "notes");
    });

    // Fetch quiz scores count
    const scoresRef = collection(db, "quiz_scores");
    const scoresQuery = query(scoresRef, where("userId", "==", currentUser.uid));
    const unsubscribeScores = onSnapshot(scoresQuery, (snapshot) => {
      setQuizzesCount(snapshot.size);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "quiz_scores");
    });

    // Fetch active learning path study plan
    const pathRef = doc(db, "learning_paths", currentUser.uid);
    const unsubscribePath = onSnapshot(pathRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setLearningPath({
          userId: currentUser.uid,
          weakAreas: d.weakAreas || [],
          strengths: d.strengths || [],
          recommendedPlan: d.recommendedPlan || "",
          subjectPreferences: d.subjectPreferences || [],
          difficultyLevel: d.difficultyLevel || "Intermediate",
          updatedAt: d.updatedAt || new Date().toISOString()
        });
      } else {
        setLearningPath(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `learning_paths/${currentUser.uid}`);
    });

    return () => {
      unsubscribeNotes();
      unsubscribeScores();
      unsubscribePath();
    };
  }, [currentUser]);

  // Adjust Student Difficulty preferences
  const handleUpdateDifficulty = async (level: "Beginner" | "Intermediate" | "Advanced") => {
    if (!currentUser || !learningPath) {
      // Create empty learning path config with selected level if none exists
      if (currentUser) {
        try {
          const freshPath: LearningPath = {
            userId: currentUser.uid,
            weakAreas: [],
            strengths: [],
            recommendedPlan: "",
            subjectPreferences: [],
            difficultyLevel: level,
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, "learning_paths", currentUser.uid), {
            ...freshPath,
            updatedAt: serverTimestamp()
          });
          setLearningPath(freshPath);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `learning_paths/${currentUser.uid}`);
        }
      }
      return;
    }

    try {
      const pathRef = doc(db, "learning_paths", currentUser.uid);
      await updateDoc(pathRef, {
        difficultyLevel: level,
        updatedAt: serverTimestamp()
      });
      setLearningPath((prev) => prev ? { ...prev, difficultyLevel: level } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `learning_paths/${currentUser.uid}`);
    }
  };

  // Add Points dynamically when completing learning challenges
  const handleAwardPoints = async (pts: number) => {
    if (!currentUser || !userProfile) return;
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const updatedPoints = (userProfile.points || 0) + pts;
      await updateDoc(userRef, {
        points: updatedPoints,
        updatedAt: serverTimestamp()
      });
      setUserProfile((prev) => prev ? { ...prev, points: updatedPoints } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  // Save specific AI Socratic explanation to Academic Notes
  const handleQuickSaveNote = (content: string, subject: string) => {
    setNewNoteContent(content);
    setNewNoteSubject(subject);
    setNewNoteTitle(`Insight on Socratic ${subject}`);
    setIsAddNoteOpen(true);
  };

  // Persists manual or quick-save notes
  const saveNoteToFirestore = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newNoteTitle.trim() || !newNoteContent.trim()) return;

    try {
      const freshNote = {
        userId: currentUser.uid,
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        subject: newNoteSubject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const notesCol = collection(db, "notes");
      await addDoc(notesCol, {
        ...freshNote,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Cleanup & Notify
      setNewNoteTitle("");
      setNewNoteContent("");
      setIsAddNoteOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "notes");
    }
  };

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      alert(`Login failed: ${e.message}`);
    }
  };

  const logout = async () => {
    if (confirm("Sign out of your Socratic Study workspace?")) {
      await logoutUser();
    }
  };

  // High-level navigation trigger
  const handleNavigate = (destination: string) => {
    if (destination.startsWith("chat:")) {
      const sub = destination.split(":")[1];
      setSelectedChatSubject(sub);
      setActiveTab("chat");
    } else {
      setActiveTab(destination);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4F46E5] via-[#A855F7] to-[#EC4899] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="p-8 bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
          <p className="mt-4 text-xs font-bold text-white uppercase tracking-widest">
            Securing Socratic Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4F46E5] via-[#A855F7] to-[#EC4899] flex flex-col font-sans selection:bg-indigo-500 selection:text-white text-white">
      {/* 1. Unauthorized Landing Page */}
      {!currentUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
          {/* Subtle gradient shapes */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Core Login Card */}
          <div className="w-full max-w-md bg-white/20 backdrop-blur-xl border border-white/30 p-8 rounded-[2.5rem] shadow-2xl space-y-8 text-center relative z-10 transition duration-300">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/30 border border-white/30 rounded-full text-xs font-semibold text-white">
                <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                Gemini AI Studio Powered
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">
                AI Study Companion
              </h1>
              <p className="text-xs text-white/80 font-medium font-mono uppercase tracking-widest">
                Socratic Personalized School
              </p>
              <p className="text-sm text-white/90 leading-relaxed max-w-sm mx-auto">
                Discover responsive step-by-step guidance, generative practice quizzes, speech interactions, and custom study plans generated uniquely for your curriculum.
              </p>
            </div>

            <button
              onClick={login}
              className="w-full group inline-flex items-center justify-center gap-3 py-3 px-5 bg-white hover:bg-white/90 text-indigo-900 rounded-2xl text-sm font-bold shadow-lg transition duration-150"
            >
              <Lock className="w-4 h-4 text-indigo-600" />
              Sign in with Google Account
            </button>

            <div className="text-[11px] text-white/60 font-medium">
              We leverage safe Attribute Access Control rules to partition and isolate all quiz results and custom logs securely.
            </div>
          </div>
        </div>
      ) : (
        /* 2. Authenticated Workspace Shell */
        <div className="flex-1 flex flex-col">
          {/* Main Top Navigation bar */}
          <header className="sticky top-0 z-50 bg-white/15 backdrop-blur-xl border-b border-white/25 px-6 py-4 flex items-center justify-between text-white shadow-lg">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
              <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-md">
                <GraduationCap className="w-5 h-5 animate-scale-up" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight leading-none">Socrates</h2>
                <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider">
                  Socratic Tutoring
                </span>
              </div>
            </div>

            {/* Middle Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { tab: "chat", label: "AI Tutor", icon: BookOpen },
                { tab: "quiz", label: "Quizzes", icon: BrainCircuit },
                { tab: "notes", label: "Notebook", icon: FileText },
                { tab: "planner", label: "Planner", icon: Compass },
              ].map((item) => {
                const isActive = activeTab === item.tab || (item.tab === "chat" && activeTab.startsWith("chat"));
                return (
                  <button
                    key={item.tab}
                    onClick={() => setActiveTab(item.tab)}
                    className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition duration-150 ${
                      isActive 
                        ? "bg-white/35 text-white border border-white/30 shadow-xs" 
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Profile Points & Sign Out trigger */}
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-white/20 border border-white/30 rounded-xl text-xs font-bold text-white shadow-sm">
                <Award className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>{userProfile?.points || 0} pts</span>
              </div>

              <button
                onClick={logout}
                className="p-2.5 hover:bg-white/15 text-white/80 hover:text-white rounded-xl transition"
                title="Sign out study workspace"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Main workspace container */}
          <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
            <div className="w-full">
              {activeTab === "dashboard" && (
                <Dashboard
                  profile={userProfile || { uid: "", email: "", displayName: "Scholar", role: "student", points: 0, createdAt: "", updatedAt: "" }}
                  learningPath={learningPath}
                  savedNotesCount={notes.length}
                  completedQuizzesCount={quizzesCount}
                  onNavigate={handleNavigate}
                  onUpdateDifficulty={handleUpdateDifficulty}
                />
              )}

              {activeTab === "chat" && (
                <TutorChat
                  userId={currentUser.uid}
                  initialSubject={selectedChatSubject}
                  difficulty={learningPath?.difficultyLevel || "Intermediate"}
                  onBack={() => setActiveTab("dashboard")}
                  onSaveNote={handleQuickSaveNote}
                />
              )}

              {activeTab === "quiz" && (
                <QuizView
                  userId={currentUser.uid}
                  difficulty={learningPath?.difficultyLevel || "Intermediate"}
                  onQuizFinished={handleAwardPoints}
                  onBack={() => setActiveTab("dashboard")}
                />
              )}

              {activeTab === "notes" && (
                <NotesView
                  notes={notes}
                  onAddNote={() => {
                    setNewNoteTitle("");
                    setNewNoteContent("");
                    setIsAddNoteOpen(true);
                  }}
                  onRefresh={() => {}} // snapshot takes care of real-time update
                />
              )}

              {activeTab === "planner" && (
                <PathPlanner
                  userId={currentUser.uid}
                  learningPath={learningPath}
                  difficultyLevel={learningPath?.difficultyLevel || "Intermediate"}
                  onPlanGenerated={(newPath) => setLearningPath(newPath)}
                />
              )}
            </div>
          </main>

          {/* 3. Global Modal for Creating academic manual notes */}
          {isAddNoteOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-indigo-950/40 backdrop-blur-2xl border border-white/30 rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-up text-left text-white">
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <h3 className="text-base font-bold text-white">Save Academic Insight</h3>
                  <button 
                    onClick={() => setIsAddNoteOpen(false)} 
                    className="p-1 hover:bg-white/10 rounded-full transition text-white/70 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={saveNoteToFirestore} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/85 uppercase tracking-wider">Subject Classification</label>
                    <select
                      value={newNoteSubject}
                      onChange={(e) => setNewNoteSubject(e.target.value)}
                      className="w-full p-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-xs font-semibold text-white focus:outline-none"
                    >
                      <option className="bg-[#4F46E5]" value="Mathematics">Mathematics</option>
                      <option className="bg-[#4F46E5]" value="Science">Science</option>
                      <option className="bg-[#4F46E5]" value="Coding & Tech">Coding & Tech</option>
                      <option className="bg-[#4F46E5]" value="English Grammar">English Grammar</option>
                      <option className="bg-[#4F46E5]" value="History & Arts">History & Arts</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/85 uppercase tracking-wider">Note Title</label>
                    <input
                      type="text"
                      required
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="e.g. Quadratic Formula, Cell Membrane..."
                      className="w-full p-2.5 bg-white/15 border border-white/30 text-xs rounded-xl focus:outline-none focus:border-white text-white font-semibold placeholder:text-white/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/85 uppercase tracking-wider">Core Notes Content</label>
                    <textarea
                      required
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={6}
                      placeholder="Input the key formulas, definitions, code blocks, or study outline..."
                      className="w-full p-2.5 bg-white/15 border border-white/30 text-xs rounded-xl focus:outline-none focus:border-white text-white resize-none font-sans placeholder:text-white/40"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddNoteOpen(false)}
                      className="py-2 px-4 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2 px-4 bg-white text-indigo-900 hover:bg-white/90 font-bold text-xs rounded-xl shadow-lg transition"
                    >
                      Save to Notebook
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Elegant sticky footer for mobile screen sizes */}
          <footer className="md:hidden sticky bottom-0 z-50 bg-white/15 backdrop-blur-xl border-t border-white/20 px-4 py-2 flex items-center justify-around text-white">
            {[
              { tab: "dashboard", icon: LayoutDashboard, label: "Home" },
              { tab: "chat", icon: BookOpen, label: "Tutor" },
              { tab: "quiz", icon: BrainCircuit, label: "Quizzing" },
              { tab: "notes", icon: FileText, label: "Notes" },
              { tab: "planner", icon: Compass, label: "Goals" },
            ].map((item) => {
              const isActive = activeTab === item.tab || (item.tab === "chat" && activeTab.startsWith("chat"));
              return (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition duration-150 ${
                    isActive ? "text-white bg-white/20 p-2" : "text-white/70 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[9px] font-bold">{item.label}</span>
                </button>
              );
            })}
          </footer>
        </div>
      )}
    </div>
  );
}
