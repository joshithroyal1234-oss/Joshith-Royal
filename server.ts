import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Lazy helper for GoogleGenAI client with robust server-side security
let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// AI Tutor chat Q&A endpoint
app.post("/api/tutor/chat", async (req, res) => {
  try {
    const { message, history, subject, title, difficulty } = req.body;

    if (!message) {
       res.status(400).json({ error: "Message is required" });
       return;
    }

    const sysInstruction = `You are Socrates, a highly encouraging, student-friendly personal AI Tutor.
Your absolute mission is to promote critical thinking. Never give direct answers or write homework solutions immediately.
Instead, use Socratic questioning: explain concepts in very simple, structured terms with relatable analogies of everyday life, then ask a guiding question that helps the student take the next step.
If a student asks a direct math query (e.g. "what is 15 * 12"), guide them through the process step-by-step instead of just spitting out "180".
Ensure age-appropriate, safe content at all times.
Current tutoring topic context:
Subject: ${subject || "General Science & Arts"}
Topic / Title: ${title || "Introductory Q&A"}
Target Student Grade/Level: ${difficulty || "Intermediate"}

Reply in safe, clear markdown structure. Answer using the same language the student uses for their message.`;

    // Map history to the required format in the SDK (optionally) or use model.generateContent
    // Since we want to pass current message along with full context:
    const formattedContents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        formattedContents.push({
          role: h.role === "assistant" ? "model" : h.role,
          parts: [{ text: h.content }]
        });
      });
    }
    // Append the new query
    formattedContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: sysInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate tutor response" });
  }
});

// Dynamic quiz generation endpoint - returns structured JSON
app.post("/api/tutor/quiz", async (req, res) => {
  try {
    const { subject, topic, difficulty } = req.body;

    const quizPrompt = `Generate a 5-question multi-choice study quiz.
Subject: ${subject || "General Knowledge"}
Topic: ${topic || "Core principles"}
Selected Level: ${difficulty || "Medium"}

Create 5 engaging questions that assess comprehension. Avoid extremely simple or trick questions.
For each question, supply exactly 4 logical options, indicate the 0-indexed correct option, and write a helpful, educational 1-sentence explanation of why it is correct.
Ensure fields fit the JSON schema specified.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: quizPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: "Detailed title or subtopic of the quiz" },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING, description: "Explanatory review question statement" },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of 4 candidate options"
                  },
                  correctOptionIndex: { type: Type.INTEGER, description: "Correct choice standard 0-indexed integer (0-3)" },
                  explanation: { type: Type.STRING, description: "Step-by-step breakdown explaining why this is the right answer to aid student learning" }
                },
                required: ["question", "options", "correctOptionIndex", "explanation"]
              }
            }
          },
          required: ["topic", "questions"]
        }
      }
    });

    const text = response.text;
    res.json(JSON.parse(text || "{}"));
  } catch (error: any) {
    console.error("Gemini Quiz Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate practice quiz" });
  }
});

// Personalized AI Study Plan & Weak Area recommender
app.post("/api/tutor/plan", async (req, res) => {
  try {
    const { weakAreas, strengths, difficultyLevel, subjectPreferences } = req.body;

    const planPrompt = `Analyze the student's current learning profile:
- Areas where they need help / weak points: ${JSON.stringify(weakAreas || [])}
- Strengths / what they master: ${JSON.stringify(strengths || [])}
- Overall difficulty comfort level: ${difficultyLevel || "Intermediate"}
- Subject interests: ${JSON.stringify(subjectPreferences || [])}

Perform an educational assessment. In your response:
1. Provide encouragement.
2. Outline a highly practical, step-by-step study schedule or weekly roadmap (e.g. Phase 1, Phase 2) with action points.
3. Recommend specific study strategies or Socratic methods for their weak points.
4. Integrate their strengths to build momentum.

Write your response completely as clean, well-formatted markdown with headings, bold text, and lists. Avoid any meta-text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: planPrompt,
      config: {
        systemInstruction: "You are Socrates, a professional academic director and mentor. You speak with warm, inspirational wisdom.",
        temperature: 0.8,
      }
    });

    res.json({ recommendedPlan: response.text });
  } catch (error: any) {
    console.error("Gemini Plan Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate personalized study plan" });
  }
});

// Serve static build or Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
