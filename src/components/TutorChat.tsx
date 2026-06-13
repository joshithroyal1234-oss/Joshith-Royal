import { useState, useEffect, useRef, FormEvent } from "react";
import { ChatMessage, ChatSession, UserProfile } from "../types";
import { 
  Send, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Bookmark, 
  Plus, 
  ChevronLeft,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Loader2
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, serverTimestamp, getDocs, orderBy, query, limit } from "firebase/firestore";

interface TutorChatProps {
  userId: string;
  initialSubject?: string;
  onBack: () => void;
  onSaveNote: (content: string, subject: string) => void;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export default function TutorChat({
  userId,
  initialSubject = "General Study",
  onBack,
  onSaveNote,
  difficulty
}: TutorChatProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [topicInput, setTopicInput] = useState("");
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceRecognitionRef = useRef<any>(null);

  useEffect(() => {
    // Scroll to bottom whenever messages list grows
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Clean speech synthesis synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Web Speech STT (Speech to Text) API Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput((prev) => prev ? prev + " " + transcript : transcript);
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      voiceRecognitionRef.current = rec;
    }
  }, []);

  // Toggle voice input listening
  const toggleListening = () => {
    if (!voiceRecognitionRef.current) {
      alert("Speech Recognition is not natively supported by your browser. Try Chrome!");
      return;
    }

    if (isListening) {
      voiceRecognitionRef.current.stop();
    } else {
      setIsListening(true);
      window.speechSynthesis?.cancel(); // stop current audio when speaking
      setIsSpeakingId(null);
      voiceRecognitionRef.current.start();
    }
  };

  // Web Speech TTS (Text to Speech) TTS
  const speakText = (text: string, messageId: string) => {
    if (!window.speechSynthesis) {
      alert("Text to speech is not supported by your browser.");
      return;
    }

    if (isSpeakingId === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel(); // Stop playing anything else
    
    // Clean markdown before speaking
    const cleanText = text
      .replace(/[#*`_-]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
      setIsSpeakingId(null);
    };
    utterance.onerror = () => {
      setIsSpeakingId(null);
    };

    setIsSpeakingId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Fetch or setup Socratic session with AI
  const createNewSession = async (title: string) => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const sessionData: Omit<ChatSession, "chatId"> = {
        userId,
        subject,
        title: title.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const chatRef = collection(db, "chats");
      const docRef = await addDoc(chatRef, {
        ...sessionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const session: ChatSession = {
        ...sessionData,
        chatId: docRef.id
      };

      setActiveSession(session);

      // Welcome prompt Socratic intro
      const welcomeMsg: ChatMessage = {
        messageId: "welcome",
        role: "model",
        content: `Greetings! I am Socrates, your personal tutor for **${subject}**. 
I understand we want to explore **"${title.trim()}"** today. 

Let's begin. What is your current understanding of this topic, or do you have a specific question we should address first?`,
        createdAt: new Date().toISOString()
      };

      setMessages([welcomeMsg]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "chats");
    } finally {
      setLoading(false);
    }
  };

  // Sending message to Socratic tutor API
  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || !activeSession || loading) return;

    const userQuery = userInput.trim();
    setUserInput("");
    setLoading(true);

    const userMessage: ChatMessage = {
      messageId: `msg-${Date.now()}-user`,
      role: "user",
      content: userQuery,
      createdAt: new Date().toISOString()
    };

    // Add locally immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Save user message to Firestore
      const msgCol = collection(db, "chats", activeSession.chatId, "messages");
      await addDoc(msgCol, {
        role: "user",
        content: userQuery,
        createdAt: serverTimestamp()
      });

      // Call our secure server-side proxy
      const response = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userQuery,
          history: updatedMessages.slice(1, -1), // skip first welcome and last added
          subject: activeSession.subject,
          title: activeSession.title,
          difficulty: difficulty
        })
      });

      if (!response.ok) {
        throw new Error("Tutor API returned an execution error. Try again!");
      }

      const resData = await response.json();
      const modelReply = resData.text || "I apologize, but my wisdom encounters a cosmic blockage. Prompt me again!";

      const assistantMessage: ChatMessage = {
        messageId: `msg-${Date.now()}-model`,
        role: "model",
        content: modelReply,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save AI response to Firestore
      await addDoc(msgCol, {
        role: "model",
        content: modelReply,
        createdAt: serverTimestamp()
      });

    } catch (err: any) {
      console.error("Failed to send message:", err);
      const errMessage: ChatMessage = {
        messageId: `msg-${Date.now()}-error`,
        role: "model",
        content: `⚠️ *An error occurred: Let's retry! Message content:* ${err.message}`,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
      {/* Subject Initialization screen if no active session */}
      {!activeSession ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center space-y-8 animate-fade-in text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/25 text-white flex items-center justify-center animate-pulse">
            <BookOpen className="w-8 h-8" />
          </div>

          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-bold text-white">Launch Socratic Tutoring</h2>
            <p className="text-sm text-white/85 leading-relaxed">
              Define the topic you want to query or explore. Socrates will guide you using step-by-step reasoning rather than just handing you the final result.
            </p>
          </div>

          <div className="w-full max-w-sm space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Subject Field</label>
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
                <option className="bg-[#4F46E5] text-white" value="General Exploration">General Exploration</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider">Topic of Discussion</label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Newton's 3rd Law, Binary Search, Fractions..."
                className="w-full p-3 rounded-xl border border-white/20 bg-white/10 text-sm font-semibold text-white placeholder-white/35 focus:outline-none focus:border-white"
              />
            </div>

            <button
              onClick={() => createNewSession(topicInput || "Introductory Overview")}
              className="w-full py-3 px-6 bg-white hover:bg-white/95 text-indigo-950 rounded-xl text-sm font-bold shadow-lg transition duration-200 flex items-center justify-center gap-2"
            >
              Start Session
              <ArrowRight className="w-4 h-4" />
            </button>

            <button 
              onClick={onBack}
              className="w-full text-xs font-semibold text-white/70 hover:text-white transition duration-150"
            >
              Cancel & Return
            </button>
          </div>
        </div>
      ) : (
        /* Conversation Window */
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white/5">
          {/* Header */}
          <div className="p-4 border-b border-white/15 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setActiveSession(null);
                  setMessages([]);
                }}
                className="p-2 hover:bg-white/10 rounded-xl text-white transition"
                title="Change Topic"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <span className="px-2 py-0.5 bg-white/20 text-yellow-300 border border-white/10 rounded text-[10px] font-bold block w-max uppercase">
                  {activeSession.subject} ({difficulty})
                </span>
                <h3 className="text-sm font-bold text-white line-clamp-1">{activeSession.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-yellow-300 font-semibold">
              <Sparkles className="w-4 h-4 animate-pulse text-yellow-400" />
              Socratic Mode
            </div>
          </div>

          {/* Socratic Advice Banner */}
          <div className="px-4 py-2 bg-indigo-950/30 border-b border-white/10 flex items-center justify-between text-white/90 text-[11px] font-medium">
            <span>💡 Try to think step-by-step; Socrates will ask questions to help you!</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/10">
            {messages.map((msg) => (
              <div
                key={msg.messageId}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Profile Badge icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === "user" 
                    ? "bg-white/20 text-white border border-white/20" 
                    : "bg-yellow-400 text-indigo-950 border border-yellow-300"
                }`}>
                  {msg.role === "user" ? "👤" : "🪶"}
                </div>

                <div className="space-y-1.5 w-full">
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                      msg.role === "user"
                        ? "bg-white text-indigo-950 border border-white rounded-tr-none font-semibold text-indigo-950"
                        : "bg-white/15 text-white border border-white/20 rounded-tl-none text-white"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Actions for ai replies details */}
                  {msg.role === "model" && msg.messageId !== "welcome" && (
                    <div className="flex items-center gap-3 px-1 text-xs font-semibold text-white/80">
                      <button
                        onClick={() => speakText(msg.content, msg.messageId)}
                        className={`inline-flex items-center gap-1 hover:text-yellow-300 transition ${
                          isSpeakingId === msg.messageId ? "text-yellow-300" : ""
                        }`}
                        title="Listen to Explanation"
                      >
                        {isSpeakingId === msg.messageId ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            Stop Voice
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            Voice Assist
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onSaveNote(msg.content, activeSession.subject)}
                        className="inline-flex items-center gap-1 hover:text-yellow-300 text-white transition"
                        title="Save to Academic Notes"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        Save as Note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <p className="text-xs text-white/80 font-medium">Socrates is formulating a lead question...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat text & voice inputs bar */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/15 bg-white/10 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-xl transition ${
                isListening
                  ? "bg-rose-500/30 text-rose-200 border border-rose-400 animate-pulse"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              }`}
              title={isListening ? "Listening... click to Stop" : "Voice typing assistance"}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={isListening ? "Listening carefully..." : "Explain your thoughts or ask a question..."}
              disabled={loading || isListening}
              className="flex-1 p-3 text-sm bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white text-white placeholder-white/40 disabled:bg-white/5"
            />

            <button
              type="submit"
              disabled={!userInput.trim() || loading}
              className="p-3 bg-white hover:bg-white/95 disabled:opacity-40 text-indigo-900 rounded-xl transition font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
