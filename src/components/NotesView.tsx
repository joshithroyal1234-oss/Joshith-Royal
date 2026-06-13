import { useState } from "react";
import { Note } from "../types";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Bookmark, 
  Check, 
  X,
  GraduationCap
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

interface NotesViewProps {
  notes: Note[];
  onAddNote: () => void;
  onRefresh: () => void;
}

export default function NotesView({
  notes,
  onAddNote,
  onRefresh
}: NotesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  
  // Audio playback tracking
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);

  // Note editing mode
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const speakNote = (noteId: string, title: string, text: string) => {
    if (!window.speechSynthesis) {
      alert("TTS not supported in your current browser.");
      return;
    }

    if (isSpeakingId === noteId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`_-]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(`Note title: ${title}. Content: ${cleanText}`);
    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);

    setIsSpeakingId(noteId);
    window.speechSynthesis.speak(utterance);
  };

  // Toggle edit state
  const startEditing = (note: Note) => {
    setEditingNoteId(note.noteId);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
  };

  // Save edited note to Firestore
  const handleSaveEdit = async (noteId: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;

    try {
      const docRef = doc(db, "notes", noteId);
      await updateDoc(docRef, {
        title: editTitle.trim(),
        content: editContent.trim(),
        updatedAt: new Date().toISOString()
      });

      setEditingNoteId(null);
      onRefresh(); // trigger reload
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  // Delete note from Firestore
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to write-off this saved note? This action is irreversible.")) return;

    try {
      const docRef = doc(db, "notes", noteId);
      await deleteDoc(docRef);
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notes/${noteId}`);
    }
  };

  // Subject based filtering
  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === "All" || n.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const getSubjectColor = (subject: string) => {
    switch(subject) {
      case "Mathematics": return "bg-blue-500/30 text-blue-100 border-blue-400/30";
      case "Science": return "bg-emerald-500/30 text-emerald-100 border-emerald-400/30";
      case "Coding & Tech": return "bg-amber-500/30 text-amber-100 border-amber-400/30";
      case "English Grammar": return "bg-rose-500/30 text-rose-100 border-rose-400/30";
      case "History & Arts": return "bg-purple-500/30 text-purple-100 border-purple-400/30";
      default: return "bg-white/20 text-white border-white/20";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Header filter controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/15 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-white animate-pulse" />
            Study Notes Locker
          </h2>
          <p className="text-xs text-white/80">Record formulas, theories, code snippets, or Socratic advice.</p>
        </div>

        <button
          onClick={onAddNote}
          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-white/95 text-indigo-950 font-bold text-xs shadow-md transition duration-200 self-start"
        >
          <Plus className="w-4 h-4" />
          Add Manual Note
        </button>
      </div>

      {/* Search Input and Subject Tab filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search matching notes content or titles..."
            className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/25 rounded-xl text-sm font-medium text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/20 focus:border-white focus:outline-hidden"
          />
        </div>

        {/* Filter Selection */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="p-2 bg-white/10 border border-white/25 rounded-xl text-sm font-semibold text-white focus:outline-hidden"
        >
          <option className="bg-[#4F46E5] text-white" value="All">All Subjects</option>
          <option className="bg-[#4F46E5] text-white" value="Mathematics">Mathematics</option>
          <option className="bg-[#4F46E5] text-white" value="Science">Science</option>
          <option className="bg-[#4F46E5] text-white" value="Coding & Tech">Coding & Tech</option>
          <option className="bg-[#4F46E5] text-white" value="English Grammar">English Grammar</option>
          <option className="bg-[#4F46E5] text-white" value="History & Arts">History & Arts</option>
        </select>
      </div>

      {/* Notes Grid rendering */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const isEditing = editingNoteId === note.noteId;

            return (
              <div 
                key={note.noteId}
                className="p-5 bg-white/15 backdrop-blur-xl border border-white/20 hover:border-white/35 shadow-xl hover:shadow-2xl rounded-[1.8rem] transition duration-200 flex flex-col justify-between text-white"
              >
                {/* Note item */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getSubjectColor(note.subject)}`}>
                      {note.subject}
                    </span>
                    <span className="text-[10px] text-white/60 font-medium font-mono">
                      {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {isEditing ? (
                    /* Edit interface */
                    <div className="space-y-3 pt-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm font-bold text-white focus:outline-none focus:border-white"
                        placeholder="Note Title"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={5}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-xs leading-relaxed text-white focus:outline-none focus:border-white resize-none font-sans"
                        placeholder="Academic notes..."
                      />
                    </div>
                  ) : (
                    /* Read layout */
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-white tracking-tight">{note.title}</h4>
                      <div className="text-xs text-white/90 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans border-l-2 border-white/30 pl-2">
                        {note.content}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-white/15 pt-3 mt-4">
                  {isEditing ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={cancelEditing}
                        className="p-1 px-3 hover:bg-white/10 rounded-lg text-xs font-bold text-white flex items-center gap-1 transition duration-200"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(note.noteId)}
                        className="p-1 px-3 bg-white hover:bg-white/95 rounded-lg text-xs font-bold text-indigo-900 flex items-center gap-1 shadow-md transition duration-200"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save Changes
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => speakNote(note.noteId, note.title, note.content)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white transition duration-250 ${
                          isSpeakingId === note.noteId ? "text-yellow-300" : ""
                        }`}
                      >
                        {isSpeakingId === note.noteId ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
                            Stop Playback
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-white/80" />
                            Read Aloud
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(note)}
                          className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition"
                          title="Edit Note"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.noteId)}
                          className="p-1.5 hover:bg-white/10 text-white/60 hover:text-red-300 rounded-lg transition"
                          title="Delete Note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty screen */
        <div className="py-16 text-center border border-white/20 bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-6 max-w-sm mx-auto space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">No notes in search focus</h4>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              You can save key conceptual insights and step-by-step guidance directly from Socrates tutor chats or create manual ones here!
            </p>
          </div>
          <button
            onClick={onAddNote}
            className="inline-flex items-center gap-2 py-1.5 px-3 bg-white hover:bg-white/90 text-indigo-900 font-bold text-xs rounded-xl shadow-md transition duration-200"
          >
            Create First Note
          </button>
        </div>
      )}
    </div>
  );
}
