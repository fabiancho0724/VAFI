import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let realDataText = "";

async function fetchRealData() {
  console.log("Fetching real CSV data for knowledge base...");
  try {
    const files = [
      { name: "Ingresos", filename: "Ingresos.csv", url: "https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv" },
      { name: "Gastos", filename: "Gastos.csv", url: "https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Gastos.csv" },
      { name: "Nomina", filename: "Nomina.csv", url: "https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Nomina.csv" },
      { name: "Estudiantes Posgrados", filename: "Resumen Posgrados.csv", url: "https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Resumen%20Posgrados.csv" },
      { name: "Ingresos Posgrados", filename: "Resumen Posgrados ingresos.csv", url: "https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Resumen%20Posgrados%20ingresos.csv" }
    ];

    let combined = "";
    for (const file of files) {
      let text = "";
      const localPath = path.join(process.cwd(), "..", "Bases de Datos", file.filename);
      if (fs.existsSync(localPath)) {
        console.log(`Loading local file for RAG: ${file.filename}`);
        text = fs.readFileSync(localPath, "utf8");
      } else {
        console.log(`Fetching remote file for RAG: ${file.filename}`);
        const res = await fetch(file.url);
        if (res.ok) {
          text = await res.text();
        }
      }
      if (text) {
        combined += `--- INICIO REPORTE: ${file.name} ---\n${text.substring(0, 150000)}\n--- FIN REPORTE: ${file.name} ---\n\n`;
      }
    }
    realDataText = combined;
    console.log("Real CSV data loaded successfully.");
  } catch (err) {
    console.error("Error fetching CSV knowledge base:", err);
  }
}

function getSystemInstruction() {
  return `Eres "Centavito Asistente VAFI", un asistente virtual especializado en análisis financiero e institucional de la Universidad Pedagógica y Tecnológica de Colombia (UPTC), basado en una arquitectura RAG. Tu responsabilidad es responder consultas sobre los ingresos, egresos (rubros) y datos académicos/poblacionales del proyecto utilizando ÚNICAMENTE la información en formato de reportes (CSV) que proveemos.

REGLAS DE ORO:
1. NO ALUCINAR. Si el usuario pregunta por un dato que no existe explícitamente en el contexto proporcionado, debes responder ESTRICTAMENTE con: "Lo siento, ese dato específico no se encuentra registrado en la información actual del proyecto. Por favor, verifica tu consulta."
2. Proporciona las respuestas de forma clara. Si te piden varios datos, utilizar listas y resaltar los valores numéricos usando **negritas**.
El contexto de datos está adjunto en las instrucciones del sistema y las preguntas del usuario.
`;
}

async function startServer() {
  await fetchRealData();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route for serving local CSVs or falling back to GitHub
  app.get("/api/data/:filename", async (req, res) => {
    const filename = req.params.filename;
    const decodedFilename = decodeURIComponent(filename);
    const safeFilename = path.basename(decodedFilename);
    const localPath = path.join(process.cwd(), "..", "Bases de Datos", safeFilename);
    
    if (fs.existsSync(localPath)) {
      console.log(`Serving local CSV file: ${safeFilename}`);
      return res.sendFile(localPath);
    }
    
    // Fallback to remote repository
    try {
      console.log(`Local file not found, falling back to GitHub for: ${safeFilename}`);
      const githubUrl = `https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/${encodeURIComponent(safeFilename)}`;
      const response = await fetch(githubUrl);
      if (response.ok) {
        const text = await response.text();
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        return res.send(text);
      }
    } catch (err) {
      console.error(`Error fetching fallback for ${safeFilename}:`, err);
    }
    
    res.status(404).send("File not found");
  });

  // API Route for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const model = "gemini-2.5-flash";
      const systemInstruction = getSystemInstruction();

      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction,
          temperature: 0.1
        }
      });

      let fullPrompt = `CONTEXTO DE DATOS ACTUALES (en formato CSV):
${realDataText.length > 50 ? realDataText : "Aún cargando los datos en memoria o error de conexión..."}
\n\n`;

      if (history && history.length > 0) {
        fullPrompt += "Historial de conversación:\n";
        for (const msg of history) {
          fullPrompt += `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}\n`;
        }
        fullPrompt += "\nConsulta actual del usuario: ";
      }
      fullPrompt += prompt;

      const response = await chat.sendMessage({ message: fullPrompt });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      res.status(500).json({ error: error.message || "Error processing request" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
