import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const chapters = [
  { id: "intro", title: "Introduction" },
  { id: "ch1", title: "Chapter 1: Foundations: The Aegean and Persia" },
  { id: "ch2", title: "Chapter 2: A New Age: Alexander and the Diadochi" },
  { id: "ch3", title: "Chapter 3: The Seleucid Kingdom" },
  { id: "ch4", title: "Chapter 4: The Ptolemaic Kingdom" },
  { id: "ch5", title: "Chapter 5: Other Hellenistic Kingdoms and States" },
  { id: "ch6", title: "Chapter 6: Cities and Urbanism" },
  { id: "ch7", title: "Chapter 7: Art and Architecture" },
  { id: "ch8", title: "Chapter 8: Religion and Philosophy" },
  { id: "ch9", title: "Chapter 9: Economy and Society" },
  { id: "ch10", title: "Chapter 10: Interaction and Transformation: The Hellenistic Legacy" },
  { id: "conclusion", title: "Conclusion" }
];

app.use(express.json());

app.get("/api/chapters", (req, res) => {
  res.json(chapters);
});

app.get("/api/chapters/:id", async (req, res) => {
  const chapter = chapters.find((c) => c.id === req.params.id);
  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  try {
    const prompt = `Write a detailed, engaging audiobook-style narration for ${chapter.title} of the book 'From Delphi to the Oxus: Studies in the History and Archaeology of the Hellenistic Near East'. 
    Make it sound like a professional audiobook chapter, written in an engaging historical non-fiction tone. 
    It should be about 3-4 paragraphs long, providing a comprehensive overview of the topics that would be covered in this chapter. 
    Do not include any introductory or concluding remarks (like "Here is the summary"), just output the chapter content directly so it can be read by text-to-speech immediately.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ id: chapter.id, title: chapter.title, text: response.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate chapter content" });
  }
});

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
