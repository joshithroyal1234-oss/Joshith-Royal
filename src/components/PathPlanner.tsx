import { useState, FormEvent } from "react";
import { LearningPath } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  Sparkles, 
  Map, 
  Plus, 
  Trash2, 
  Loader2, 
  FileText, 
  TrendingUp, 
  BookOpen,
  ArrowRight,
  TrendingDown
} from "lucide-react";

interface PathPlannerProps {
  userId: string;
  learningPath: LearningPath | null;
  onPlanGenerated: (newPath: LearningPath) => void;
  difficultyLevel: "Beginner" | "Intermediate" | "Advanced";
}

export default function PathPlanner({
  userId,
  learningPath,
  onPlanGenerated,
  difficultyLevel
}: PathPlannerProps) {
  // Input tracking
  const [weakAreasInput, setWeakAreasInput] = useState("");
  const [weakAreasList, setWeakAreasList] = useState<string[]>(learningPath?.weakAreas || []);
  
  const [strengthsInput, setStrengthsInput] = useState("");
  const [strengthsList, setStrengthsList] = useState<string[]>(learningPath?.strengths || []);

  const [subjectPreferences, setSubjectPreferences] = useState<string[]>(learningPath?.subjectPreferences || []);
  const [loading, setLoading] = useState(false);

  // Add Weakness Areas tag
  const handleAddWeakArea = (e: FormEvent) => {
    e.preventDefault();
    if (!weakAreasInput.trim()) return;
    if (weakAreasList.includes(weakAreasInput.trim())) return;
    setWeakAreasList((prev) => [...prev, weakAreasInput.trim()]);
    setWeakAreasInput("");
  };

  const handleRemoveWeakArea = (idx: number) => {
    setWeakAreasList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Add strengths
  const handleAddStrength = (e: FormEvent) => {
    e.preventDefault();
    if (!strengthsInput.trim()) return;
    if (strengthsList.includes(strengthsInput.trim())) return;
    setStrengthsList((prev) => [...prev, strengthsInput.trim()]);
    setStrengthsInput("");
  };

  const handleRemoveStrength = (idx: number) => {
    setStrengthsList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Toggle subject preferences
  const handleToggleSubject = (sub: string) => {
    if (subjectPreferences.includes(sub)) {
      setSubjectPreferences((prev) => prev.filter((item) => item !== sub));
    } else {
      setSubjectPreferences((prev) => [...prev, sub]);
    }
  };

  // Compile, generate Socratic advice, and save to Firestore
  const generateRoadmap = async () => {
    if (weakAreasList.length === 0 && strengthsList.length === 0) {
      alert("Please supply at least one strength or weak area to guide the AI!");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/tutor/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weakAreas: weakAreasList,
          strengths: strengthsList,
          difficultyLevel,
          subjectPreferences
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get plan timeline from tutor endpoints.");
      }

      const resData = await response.json();
      const planMarkdown = resData.recommendedPlan || "A stellar study setup is undergoing compilation. Check back!";

      const compiledPath: LearningPath = {
        userId,
        weakAreas: weakAreasList,
        strengths: strengthsList,
        recommendedPlan: planMarkdown,
        subjectPreferences,
        difficultyLevel,
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore under documents /learning_paths/{userId}
      const pathRef = doc(db, "learning_paths", userId);
      await setDoc(pathRef, {
        ...compiledPath,
        updatedAt: serverTimestamp()
      });

      onPlanGenerated(compiledPath);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `learning_paths/${userId}`);
    } finally {
      setLoading(false);
    }
  };

  // Convert simple markdown elements for viewing safety
  const renderPlanMarkdown = (md: string) => {
    if (!md) return null;
    return md.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith("###")) {
        return <h4 key={idx} className="text-sm font-bold text-white mt-4 mb-2">{trimmed.replace("###", "")}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={idx} className="text-base font-bold text-indigo-200 mt-5 border-b border-white/20 pb-1 mb-2">{trimmed.replace("##", "")}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={idx} className="text-lg font-bold text-white mt-6 mb-3">{trimmed.replace("#", "")}</h2>;
      }

      // Check bullet point List
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const bulletText = trimmed.substring(1).trim();
        // bold sub-items inside bullet
        return (
          <li key={idx} className="text-xs text-white/90 ml-4 list-disc marker:text-white/80 py-1 font-sans leading-relaxed">
            {bulletText.split("**").map((part, pIdx) => {
              if (pIdx % 2 === 1) return <b key={pIdx} className="text-yellow-200 font-semibold">{part}</b>;
              return part;
            })}
          </li>
        );
      }

      // Standalone paragraph line
      if (!trimmed) return <div key={idx} className="h-2" />;

      return (
        <p key={idx} className="text-xs text-white/90 leading-relaxed py-1 font-sans">
          {trimmed.split("**").map((part, pIdx) => {
            if (pIdx % 2 === 1) return <b key={pIdx} className="text-yellow-200 font-semibold">{part}</b>;
            return part;
          })}
        </p>
      );
    });
  };

  const subjectOptions = ["Mathematics", "Science", "Coding & Tech", "English Grammar", "History & Arts"];

  return (
    <div className="space-y-8 animate-fade-in text-left text-white">
      {/* Visual Header */}
      <div className="flex items-center gap-3 border-b border-white/15 pb-4">
        <div className="p-2.5 bg-white/20 border border-white/20 text-white rounded-xl">
          <Map className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Socratic Schedulers</h2>
          <p className="text-xs text-white/80">Formulate custom weakness mappings and receive AI-guided study blueprints.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Core Input Configuration panel */}
        <div className="p-6 bg-white/15 backdrop-blur-lg border border-white/20 rounded-3xl shadow-xl space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure Scholar Profile</h3>

          {/* Strengths input */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-white/85 block flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              Identify Your Strengths
            </span>
            <form onSubmit={handleAddStrength} className="flex gap-2">
              <input
                type="text"
                value={strengthsInput}
                onChange={(e) => setStrengthsInput(e.target.value)}
                placeholder="e.g. Linear fractions, spelling, story writing"
                className="flex-1 p-2 bg-white/10 border border-white/20 text-xs rounded-xl focus:outline-none focus:border-white text-white placeholder-white/40 font-semibold text-white"
              />
              <button 
                type="submit"
                className="p-2 px-3 bg-white hover:bg-white/95 text-indigo-955 rounded-xl text-xs font-bold transition"
              >
                Add
              </button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {strengthsList.map((str, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-2 bg-emerald-500/30 text-white text-[11px] font-bold py-1 border border-emerald-400/20 rounded-lg">
                  {str}
                  <button type="button" onClick={() => handleRemoveStrength(idx)} className="hover:text-red-300 transition">
                    &times;
                  </button>
                </span>
              ))}
              {strengthsList.length === 0 && <span className="text-xs italic text-white/50">No strengths logged.</span>}
            </div>
          </div>

          {/* Weak areas inputs */}
          <div className="space-y-3 pt-3 border-t border-white/15">
            <span className="text-xs font-semibold text-white/85 block flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-orange-300" />
              Academic Weaknesses (Areas to bolster)
            </span>
            <form onSubmit={handleAddWeakArea} className="flex gap-2">
              <input
                type="text"
                value={weakAreasInput}
                onChange={(e) => setWeakAreasInput(e.target.value)}
                placeholder="e.g. Division, Photosynthesis, Coding loops"
                className="flex-1 p-2 bg-white/10 border border-white/20 text-xs rounded-xl focus:outline-none focus:border-white text-white placeholder-white/40 font-semibold text-white"
              />
              <button 
                type="submit"
                className="p-2 px-3 bg-white hover:bg-white/95 text-indigo-955 rounded-xl text-xs font-bold transition"
              >
                Add
              </button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {weakAreasList.map((weak, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-2 bg-amber-500/30 text-white text-[11px] font-bold py-1 border border-amber-400/20 rounded-lg">
                  {weak}
                  <button type="button" onClick={() => handleRemoveWeakArea(idx)} className="hover:text-red-300 transition">
                    &times;
                  </button>
                </span>
              ))}
              {weakAreasList.length === 0 && <span className="text-xs italic text-white/50">No weaknesses logs.</span>}
            </div>
          </div>

          {/* Target subjects of intent */}
          <div className="space-y-3 pt-3 border-t border-white/15">
            <span className="text-xs font-semibold text-white/80 block">Select Target Tutoring Fields</span>
            <div className="flex flex-wrap gap-2">
              {subjectOptions.map((sub) => {
                const isActive = subjectPreferences.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => handleToggleSubject(sub)}
                    className={`py-1.5 px-3 rounded-xl text-[11px] font-bold transition duration-150 ${
                      isActive 
                        ? "bg-white text-indigo-955 border-white border" 
                        : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={generateRoadmap}
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white hover:bg-white/95 text-indigo-950 font-bold text-xs rounded-xl shadow-md transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Socrates is thinking...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Generate Study Roadmap
              </>
            )}
          </button>
        </div>

        {/* Display Output Recommended Plan */}
        <div className="space-y-4">
          {learningPath?.recommendedPlan ? (
            <div className="p-6 bg-white/15 backdrop-blur-lg border border-white/20 rounded-3xl shadow-xl space-y-4 max-h-[500px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-200" />
                  Your Active Study Plan Roadmap
                </span>
                <span className="text-[10px] text-white/60 font-mono">
                  Updated {new Date(learningPath.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="font-sans leading-relaxed text-white space-y-2">
                {renderPlanMarkdown(learningPath.recommendedPlan)}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-white/20 bg-white/10 backdrop-blur-xl rounded-3xl space-y-4 shadow-xl">
              <div className="w-12 h-12 bg-white/20 text-white flex items-center justify-center mx-auto rounded-full">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">No active plan recorded</h4>
                <p className="text-xs text-white/80 mt-1 max-w-xs mx-auto leading-relaxed">
                  Fill out your strengths and weakness profile details, then tap generate to allow Socrates to construct a full study roadmap.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
