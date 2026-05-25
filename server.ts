import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Simulated Knowledge Base
const knowledgeBase = {
  ingresos: [
    { concepto: "Recursos propios", valor: 1540000000, periodo: "2024-Q1" },
    { concepto: "Transferencias Nacionales", valor: 8500000000, periodo: "2024-Q1" },
    { concepto: "Convenios Especiales", valor: 320000000, periodo: "2024-Q1" }
  ],
  egresos_rubros: [
    { rubro: "Nómina Docente", presupuesto: 5000000000, ejecutado: 4800000000, saldo: 200000000 },
    { rubro: "Nómina Administrativa", presupuesto: 2000000000, ejecutado: 1950000000, saldo: 50000000 },
    { rubro: "Mantenimiento Infraestructura", presupuesto: 800000000, ejecutado: 400000000, saldo: 400000000 },
    { rubro: "Investigación", presupuesto: 1200000000, ejecutado: 900000000, saldo: 300000000 }
  ],
  datos_academicos: [
    { programa: "Maestría en Educación", matriculados: 120, cohorte: "2024-I" },
    { programa: "Especialización en Finanzas", matriculados: 85, cohorte: "2024-I" },
    { programa: "Doctorado en Ingeniería", matriculados: 15, cohorte: "2024-I" }
  ]
};

const SYSTEM_INSTRUCTION = `Eres "Centavito Asistente VAFI", un asistente virtual especializado en análisis financiero e institucional de la Universidad Pedagógica y Tecnológica de Colombia (UPTC), basado en una arquitectura RAG. Tu responsabilidad es responder consultas sobre los ingresos, egresos (rubros) y datos académicos/poblacionales del proyecto utilizando ÚNICAMENTE la información interna proporcionada en formato estructurado (json) en el prompt.

REGLAS DE ORO:
1. NO ALUCINAR. Si el usuario pregunta por un dato (ingreso, rubro, o programa) que no existe explícitamente en el contexto proporcionado, debes responder ESTRICTAMENTE con: "Lo siento, ese dato específico no se encuentra registrado en la información actual del proyecto. Por favor, verifica el nombre del rubro o programa."
2. Proporciona las respuestas de forma clara. Si te piden varios datos, utilizar listas y resaltar los valores numéricos usando **negritas**.
3. Formatea el dinero de forma legible (ej. $1.540.000.000).
4. CREACIÓN DE GRÁFICAS: Si el usuario pide visualizar la información gráficamente (o pide una gráfica de pastel o barras), DEBES incluir un bloque de código JSON con el lenguaje "json-chart" al final de tu respuesta. Usa las claves "name" y "value" obligatoriamente en tu arreglo "data".
5. INTERPRETACIÓN ACTIVA Y OPCIONES: Reconoce los nombres de los recursos (Ingresos: Recursos propios, Transferencias Nacionales, Convenios Especiales. Egresos: Nómina Docente, Nómina Administrativa, Mantenimiento Infraestructura, Investigación). Si la consulta es ambigua, muy general, o le falta contexto, menciona los nombres de los recursos disponibles y dale opciones al usuario sobre qué puede consultar. Interpreta activamente el historial de conversación para entender a qué se refiere el usuario.
Ejemplo de gráfica de barras:
\`\`\`json-chart
{
  "type": "bar",
  "data": [
    { "name": "Nómina Docente", "value": 4800000000 },
    { "name": "Nómina Administrativa", "value": 1950000000 }
  ]
}
\`\`\`
Ejemplo de gráfica circular (pastel):
\`\`\`json-chart
{
  "type": "pie",
  "data": [
    { "name": "Maestría en Educación", "value": 120 },
    { "name": "Especialización en Finanzas", "value": 85 }
  ]
}
\`\`\`

CONTEXTO DE DATOS ACTUAL:
${JSON.stringify(knowledgeBase, null, 2)}
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      // Initialize Gemini. Make sure to set User-Agent for Google AI Studio
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct messages from history + systemic instruction
      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1, // low temperature for precise RAG responses
        }
      });

      // Load history into the chat context if necessary (to maintain conversation flow)
      // Since ai.chats.create doesn't take history in constructor the same way as old API, we can either
      // pass history when creating or reconstruct. For simple UI, we will just send the full history text.
      // A better way is:
      let fullPrompt = "";
      if (history && history.length > 0) {
        fullPrompt += "Historial de conversación:\\n";
        for (const msg of history) {
          fullPrompt += `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}\\n`;
        }
        fullPrompt += "\\nConsulta actual del usuario: ";
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
