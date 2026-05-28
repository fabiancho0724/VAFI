import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let realDataText = "";

async function fetchRealData() {
  console.log("Fetching real CSV data for knowledge base...");
  try {
    const urls = [
      { name: "Ingresos", url: "https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/25bab426e66c86cc3e877f13a848afe2fc93b019/Ingresos.csv" },
      { name: "Gastos", url: "https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/8ea7abfbc3d504ea4280d246aa5e02dcc82b59f9/Gastos.csv" },
      { name: "Nomina", url: "https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/main/Nomina.csv" },
      { name: "Estudiantes Posgrados", url: "https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/5fd78e804688cdca1509f82da5f766b232d62c98/Resumen%20Posgrados.csv" },
      { name: "Ingresos Posgrados", url: "https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/5fd78e804688cdca1509f82da5f766b232d62c98/Resumen%20Posgrados%20ingresos.csv" }
    ];

    let combined = "";
    for (const {name, url} of urls) {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        // Limit string to prevent out of memory or context if too huge (unlikely but safe)
        combined += `--- INICIO REPORTE: ${name} ---\n${text.substring(0, 150000)}\n--- FIN REPORTE: ${name} ---\n\n`;
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
3. Formatea el dinero de forma legible (ej. $1.540.000.000). Al leer datos del CSV ten cuenta que pueden venir con formato u otras estructuras, realiza las sumas y agrupaciones que sean necesarias para dar una respuesta correcta.
4. CREACIÓN DE GRÁFICAS: Si el usuario pide visualizar la información gráficamente (o pide una gráfica de pastel o barras), DEBES incluir un bloque de código JSON con el lenguaje "json-chart" al final de tu respuesta. Usa las claves "name" y "value" obligatoriamente en tu arreglo "data".
5. INTERPRETACIÓN ACTIVA Y OPCIONES: Reconoce los nombres de los recursos disponibles en los CSV reportados (por ejemplo, mira la columna 'RUBRO', 'CONCEPTO', 'FACULTAD', etc.). Si la consulta es ambigua, menciona qué puedes analizar y dale opciones relevantes al usuario.
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

CONTEXTO DE DATOS ACTUALES (en formato CSV):
${realDataText.length > 50 ? realDataText : "Aún cargando los datos en memoria o error de conexión..."}
`;
}

async function startServer() {
  await fetchRealData();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

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
          systemInstruction: getSystemInstruction(),
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
