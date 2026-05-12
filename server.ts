import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI (Server-side)
  // We'll read the key inside the route to ensure we get the latest environment variable
  
  // API Routes
  app.post("/api/extract", async (req, res) => {
    try {
      const { base64Data, mimeType } = req.body;
      
      let apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "" || apiKey.includes("YOUR_")) {
        apiKey = "AIzaSyAHO5aHilzn6hRd3T7OK4EYZzJjrh4P8Qc";
      }
      
      if (!apiKey || apiKey.includes("YOUR_")) {
        console.error("GEMINI_API_KEY is missing or invalid.");
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      // Log masked key for debugging
      console.log(`Using Gemini API Key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);

      const genAI = new GoogleGenAI({ apiKey });
      
      console.log("Processing extraction with Gemini (gemini-1.5-flash)...");
      const response = await genAI.models.generateContent({
        model: "gemini-1.5-flash", 
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          { text: "Extract data from this receipt." }
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: "You are a professional receipt scanner. Extract: merchant name, category, date (YYYY-MM-DD), currency (ISO 4217), total amount, and line items. Use clues like symbols or addresses to resolve currency ambiguity. If unusable, return an error field.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              error: {
                type: Type.STRING,
                description: "If unusable, provide a reason. Otherwise, leave empty.",
              },
              merchantName: { type: Type.STRING },
              category: { type: Type.STRING },
              summary: { type: Type.STRING },
              merchantAddress: { type: Type.STRING },
              date: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              currencyConfidence: { type: Type.NUMBER },
              extractionReasoning: { type: Type.STRING },
              lineItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    price: { type: Type.NUMBER }
                  },
                  required: ["name", "quantity", "price"]
                }
              }
            },
            required: ["merchantName", "category", "summary", "date", "totalAmount", "currency", "currencyConfidence", "extractionReasoning", "lineItems"],
          }
        }
      });

      if (!response.text) {
        throw new Error("No text returned from Gemini");
      }

      const text = response.text.trim();
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Server AI Error:", error);
      res.status(500).json({ error: error.message || "Failed to extract data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
