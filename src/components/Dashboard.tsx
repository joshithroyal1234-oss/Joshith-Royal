import { UserProfile, LearningPath } from "../types";
import { 
  Award, 
  BookOpen, 
  BrainCircuit, 
  Compass, 
  FileText, 
  GraduationCap, 
  Settings, 
  ChevronRight 
} from "lucide-react";

interface DashboardProps {
  profile: UserProfile;
  learningPath: LearningPath | null;
  savedNotesCount: number;
  completedQuizzesCount: number;
  onNavigate: (tab: string) => void;
  onUpdateDifficulty: (level: "Beginner" | "Intermediate" | "Advanced") => void;
}

export default function Dashboard({
  profile,
  learningPath,
  savedNotesCount,
  completedQuizzesCount,
  onNavigate,
  onUpdateDifficulty
}: DashboardProps) {
  const subjects = [
    { name: "Mathematics", icon: GraduationCap, color: "from-blue-500 to-indigo-600", desc: "Algebra, Calculus & Geometry with step-by-step logic." },
    { name: "Science", icon: BrainCircuit, color: "from-emerald-500 to-teal-600", desc: "Physics, Chemistry & Biology explained with physical analogies." },
    { name: "Coding & Tech", icon: Compass, color: "from-amber-500 to-orange-600", desc: "Python, JavaScript, Data Structures & logical algorithms." },
    { name: "English Grammar", icon: BookOpen, color: "from-rose-500 to-pink-600", desc: "Sentence structure, vocabulary & literary Socratic reviews." },
    { name: "History & Arts", icon: FileText, color: "from-purple-500 to-violet-600", desc: "Historical timelines, storytelling & critical social analysis." },
  ];

  return (
    <div className="space-y-8 animate-fade-in text-white">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/20 backdrop-blur-xl text-white relative overflow-hidden shadow-2xl border border-white/30">
        <div className="relative z-10 space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold bg-white/20 text-white border border-white/20 rounded-full">
            <GraduationCap className="w-3.5 h-3.5" />
            Adaptive Learning Companion
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Greetings, <span className="text-yellow-300">{profile.displayName || "Scholar"}</span>!
          </h1>
          <p className="text-white/95 text-sm md:text-base leading-relaxed">
            Welcome to your personalized Socratic school. Ask questions, challenge yourself with generative quizzes, and build custom learning pathways with Socrates AI.
          </p>
        </div>
        
        {/* Glow circles */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-5 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Statistics Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white/15 backdrop-blur-lg border border-white/25 rounded-[1.8rem] shadow-xl flex items-center gap-4 transition hover:bg-white/20 hover:shadow-2xl">
          <div className="p-3 bg-white/20 border border-white/20 text-yellow-300 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Tutor Points</p>
            <p className="text-2xl font-bold text-white">{profile.points || 0}</p>
          </div>
        </div>

        <div className="p-5 bg-white/15 backdrop-blur-lg border border-white/25 rounded-[1.8rem] shadow-xl flex items-center gap-4 transition hover:bg-white/20 hover:shadow-2xl cursor-pointer" onClick={() => onNavigate("notes")}>
          <div className="p-3 bg-white/20 border border-white/20 text-white rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Saved Notes</p>
            <p className="text-2xl font-bold text-white">{savedNotesCount}</p>
          </div>
        </div>

        <div className="p-5 bg-white/15 backdrop-blur-lg border border-white/25 rounded-[1.8rem] shadow-xl flex items-center gap-4 transition hover:bg-white/20 hover:shadow-2xl cursor-pointer" onClick={() => onNavigate("quiz")}>
          <div className="p-3 bg-white/20 border border-white/20 text-emerald-300 rounded-2xl">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Quizzes Complete</p>
            <p className="text-2xl font-bold text-white">{completedQuizzesCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Subjects & Quick Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core subjects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-white" />
              Socratic Core Subjects
            </h2>
            <span className="text-xs text-white/80 font-medium">Select to study</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((subj) => (
              <div 
                key={subj.name}
                onClick={() => onNavigate(`chat:${subj.name}`)}
                className="group relative p-5 bg-white/15 backdrop-blur-lg border border-white/20 hover:border-white/35 hover:bg-white/20 hover:shadow-2xl rounded-3xl cursor-pointer transition duration-200 overflow-hidden text-white"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${subj.color} text-white shadow-md`}>
                    <subj.icon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transform group-hover:translate-x-1 transition duration-200" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white">{subj.name}</h3>
                <p className="mt-1.5 text-xs text-white/85 leading-relaxed">{subj.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick settings sidebar */}
        <div className="space-y-6">
          <div className="p-6 bg-white/15 backdrop-blur-lg border border-white/20 rounded-3xl shadow-xl space-y-4 text-white">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-white/85" />
              Academic Preference
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/75">Target Learning Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Beginner", "Intermediate", "Advanced"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => onUpdateDifficulty(level)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition duration-200 ${
                      learningPath?.difficultyLevel === level
                        ? "bg-white text-indigo-900 shadow-md"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/65 mt-1">
                AI adjust quiz questions and tutor terminology complexity according to this setting.
              </p>
            </div>

            {learningPath && (
              <div className="pt-4 border-t border-white/15 space-y-2">
                <span className="text-xs font-semibold text-white/75 block">Personalized Goals</span>
                <div className="flex flex-wrap gap-1.5">
                  {learningPath.subjectPreferences.map(pref => (
                    <span key={pref} className="px-2 py-0.5 bg-white/20 border border-white/20 text-white text-[10px] font-bold rounded-lg uppercase">
                      {pref}
                    </span>
                  ))}
                  {learningPath.subjectPreferences.length === 0 && (
                    <span className="text-xs text-white/60 italic">No preferred tracks configured yet.</span>
                  )}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => onNavigate("planner")}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white transition duration-200"
            >
              Configure Study Fields
            </button>
          </div>

          {/* Quick study suggestion */}
          {learningPath?.recommendedPlan ? (
            <div className="p-5 bg-white/10 border border-white/15 rounded-3xl space-y-2 text-white">
              <h4 className="text-xs uppercase tracking-wider font-bold text-white/80">Active Study Plan</h4>
              <p className="text-xs text-white/95 leading-relaxed line-clamp-4">
                {learningPath.recommendedPlan.replace(/[#*`]/g, "")}
              </p>
              <button 
                onClick={() => onNavigate("planner")} 
                className="text-xs font-bold text-white hover:text-yellow-200 inline-flex items-center gap-1 mt-1 transition duration-200"
              >
                Go to plan details &rarr;
              </button>
            </div>
          ) : (
            <div className="p-5 bg-white/5 border border-dashed border-white/20 rounded-3xl text-center space-y-2">
              <p className="text-xs text-white/80">Need a clear study direction?</p>
              <button 
                onClick={() => onNavigate("planner")}
                className="px-4 py-1.5 bg-white hover:bg-white/95 text-indigo-900 font-bold text-xs rounded-xl transition duration-200 shadow-md"
              >
                Generate Study Roadmap
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
