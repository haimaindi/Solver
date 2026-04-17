import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Supabase for server-side checks
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || "",
    process.env.VITE_SUPABASE_ANON_KEY || ""
  );

  // AI Problem Consultant Endpoint
  app.post("/api/consult-problem", async (req, res) => {
    const { userId, problemId, context, question } = req.body;

    if (!userId || !problemId || !question) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Fetch user's Gemini API Keys
      const { data: userData, error: userError } = await supabase
        .from("app_access")
        .select("gemini_api_keys")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        return res.status(404).json({ error: "User credentials not found" });
      }

      const apiKeys = userData.gemini_api_keys || [];
      if (apiKeys.length === 0) {
        return res.status(400).json({ error: "No Gemini API keys configured for this user. Please contact admin." });
      }

      // 2. Rolling API Key Strategy
      let lastError = null;
      let finalAnswer = "";

      for (const key of apiKeys) {
        try {
          const ai = new GoogleGenAI({ apiKey: key });
          
          const systemPrompt = `You are a Problem Solving Expert Consultant. 
Your goal is to provide professional, structured, and solution-oriented advice.
Use the provided context about the problem (Root Causes, Action Plans, etc.) to give a specific recommendation.
Format your response as a consultation document:
- Use **bold** and *italic* for key points.
- Use bullet points or numbered lists for steps.
- Start with a summary, then provide in-depth analysis and specific recommendations.
- Keep the tone professional but encouraging.`;

          const fullPrompt = `CONTEXT:
${JSON.stringify(context, null, 2)}

USER QUESTION:
${question}`;

          const result = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            config: {
              systemInstruction: systemPrompt
            }
          });

          finalAnswer = result.text || "I was unable to generate an answer.";
          
          if (finalAnswer) {
            // Successfully generated, break the loop
            break;
          }
        } catch (err: any) {
          console.error(`Gemini API Key failed: ${err.message}`);
          lastError = err;
          continue; // Try next key
        }
      }

      if (!finalAnswer && lastError) {
        throw lastError;
      }

      // 3. Store consultation history
      const { error: storeError } = await supabase
        .from("problem_consultations")
        .insert([{
          user_id: userId,
          problem_id: problemId,
          question,
          answer: finalAnswer
        }]);

      if (storeError) {
        console.warn("Consultation stored failed:", storeError.message);
      }

      res.json({ answer: finalAnswer });
    } catch (error: any) {
      console.error("Consultation Backend Error:", error);
      res.status(500).json({ error: error.message || "Something went wrong on the backend" });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
