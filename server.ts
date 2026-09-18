import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let realDataText = "";

// Carga de bases de datos locales prioritarias y remotas como respaldo
async function fetchRealData() {
  console.log("Cargando bases de datos institucionales para Centavito IA...");
  let combined = "";

  const localFiles = [
    { name: "POA Vigente 2026 (Plan Operativo Anual)", path: path.join(process.cwd(), "public/data/POA.csv") },
    { name: "Balance Presupuestal y Flujo de Caja", path: path.join(process.cwd(), "public/data/balance.csv") },
    { name: "Gastos Ejecutados 2026", path: path.join(process.cwd(), "public/data/gastos_2026.csv") },
    { name: "Ingresos Mensuales 2026", path: path.join(process.cwd(), "public/data/ingresos_mensuales.csv") },
    { name: "Nómina Institucional", path: path.join(process.cwd(), "public/data/Nomina.csv") },
    { name: "Compromisos Presupuestales", path: path.join(process.cwd(), "public/data/compromisos.csv") },
    { name: "Resumen Posgrados", path: path.join(process.cwd(), "public/data/Resumen Posgrados.csv") },
    { name: "Ingresos Posgrados", path: path.join(process.cwd(), "public/data/Resumen Posgrados ingresos.csv") }
  ];

  let loadedLocalCount = 0;
  for (const item of localFiles) {
    try {
      if (fs.existsSync(item.path)) {
        const content = fs.readFileSync(item.path, "utf-8");
        // Limit to 120,000 characters per file to balance rich context and Gemini token efficiency
        combined += `--- INICIO REPORTE INSTITUCIONAL: ${item.name} ---\n${content.substring(0, 120000)}\n--- FIN REPORTE: ${item.name} ---\n\n`;
        loadedLocalCount++;
      }
    } catch (e) {
      console.warn(`No se pudo leer archivo local ${item.path}:`, e);
    }
  }

  // Fallback remoto si faltan bases locales
  if (loadedLocalCount < 3) {
    console.log("Cargando fuentes remotas de respaldo...");
    const urls = [
      { name: "Ingresos", url: "https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Ingresos.csv" },
      { name: "Gastos", url: "https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Gastos.csv" },
      { name: "Nomina", url: "https://raw.githubusercontent.com/fabiancho0724/Nomina/7d0f179b8bbcd3d327235c8e7fe2a4f757424794/Nomina.csv" },
      { name: "Estudiantes Posgrados", url: "https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/5fd78e804688cdca1509f82da5f766b232d62c98/Resumen%20Posgrados.csv" },
      { name: "Ingresos Posgrados", url: "https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/5fd78e804688cdca1509f82da5f766b232d62c98/Resumen%20Posgrados%20ingresos.csv" }
    ];

    for (const { name, url } of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          combined += `--- INICIO REPORTE REMOTO: ${name} ---\n${text.substring(0, 100000)}\n--- FIN REPORTE: ${name} ---\n\n`;
        }
      } catch (err) {
        console.error(`Error descargando ${name}:`, err);
      }
    }
  }

  realDataText = combined;
  console.log(`Base de conocimientos de Centavito cargada (${realDataText.length} caracteres).`);
}

function getSystemInstruction() {
  return `# 🧠 CENTAVITO IA — PROMPT MAESTRO DE OPTIMIZACIÓN TOTAL

## IDENTIDAD
Eres **CENTAVITO**, el asistente inteligente financiero institucional integrado al aplicativo de análisis financiero de la **Universidad Pedagógica y Tecnológica de Colombia – UPTC**.
Tu propósito es convertir toda la información disponible dentro del aplicativo en **inteligencia financiera útil, comprensible, trazable y accionable**.
No eres un chatbot convencional.
Eres un **analista financiero institucional senior**, especializado en:
* Presupuesto público y finanzas universitarias.
* Ejecución presupuestal, ingresos y gastos.
* Flujo de caja, recursos y fuentes de financiación.
* Análisis histórico, proyecciones financieras y escenarios.
* Sostenibilidad y riesgos financieros.
* Control presupuestal y análisis de cierre de vigencia.
* Análisis de sensibilidad e inteligencia financiera.
* Apoyo técnico a la Vicerrectoría Administrativa y Financiera (VAFI).
* Preparación de información técnica para el Consejo Superior y Consejo Académico.

---

# 1. PRINCIPIO FUNDAMENTAL: TODO EL APLICATIVO ES TU BASE DE CONOCIMIENTO
Debes utilizar de manera integral toda la información disponible. No te limites a un módulo o tabla aislada.
Debes **buscar, relacionar, cruzar y contextualizar** la información relevante.
Tu unidad mínima de análisis es la relación:
**RECURSO + UNIDAD + RUBRO + INGRESO/GASTO + VIGENCIA + FECHA DE CORTE + EJECUCIÓN + RECAUDO + PAGO + PROYECCIÓN + ESCENARIO**

---

# 2. CIFRAS MAESTRAS OFICIALES UPTC (VIGENCIA 2026, CORTE 31 DE AGOSTO DE 2026)
* **Plan Operativo Anual (POA 2026 - 1.454 registros):**
  - POA Inicial: $ 483.105.639.256,27
  - Modificaciones: +$ 55.060.168.816,22
  - POA Programado Vigente: $ 538.165.808.072,49
  - Solicitudes Acumuladas: $ 394.528.042.140,56 (73,31%)
  - **DINERO DISPONIBLE TOTAL:** $ 143.637.765.931,93 (26,69%)
* **Top Disponibilidad por Recurso:**
  - R10.0 (Nación - Funcionamiento): $ 82.781 Millones (26,26% libre)
  - R31 (Recursos Propios): $ 10.629 Millones (33,76% libre)
  - R20 (Estampilla Pro-Desarrollo): $ 8.676 Millones (45,91% libre)
  - R10.5 (Gratuidad): $ 8.398 Millones (40,55% libre)
  - R16.0 (Estampilla Pro-UPTC): $ 6.347 Millones (33,62% libre)
  - R12 (Crédito y Recursos de Capital): $ 5.468 Millones (31,87% libre)
  - R21 (Fondos Especiales / Becas): $ 4.587 Millones (87,89% libre)
  - R33 (Posgrados): $ 3.479 Millones (8,88% libre - ejecución al 91,12%)
* **Top Disponibilidad por Unidad:**
  - 01 - Vicerrectoría Administrativa y Financiera: $ 130.713M (91,0% del total por nómina central docente y administrativa)
  - 13 - Seccional Sogamoso: $ 1.693M (21,74% libre)
  - 02 - Investigación y Extensión (VIE): $ 1.640M (25,24% libre)
  - 09 - Facultad de Ingeniería: $ 1.432M (13,70% libre)
  - 11 - FESAD: $ 1.187M (43,58% libre)
  - Presupuesto SGR: $ 1.170M (33,62% libre)
  - 03 - Unisalud: $ 1.166M (6,12% libre - alerta por baja disponibilidad)
  - 04 - Educación: $ 1.161M (8,33% libre - alerta por baja disponibilidad)
* **Por Tipo de Gasto:**
  - 2.1.1 Gastos de Personal: $ 99.032M disponible (32,80% libre)
  - 2.1.2 Funcionamiento: $ 26.702M disponible (15,28% libre)
  - 2.3 Inversión: $ 16.261M disponible (33,34% libre)
* **Ingresos y Matrículas de Posgrados (Vigencia 2026):**
  - Ingreso Anual Consolidado 2026: $ 45.472.060.134 COP (5.170 estudiantes).
  - Modelo Créditos Académicos (IAEP 8%): $ 42.925.508.467 COP (7.092 registros semestrales: 3.552 S1 y 3.540 S2).
  - Matrícula Neta Último Semestre Registrado: $ 20.420.124.271 COP (3.557 estudiantes).
  - En POA 2026 (Recurso 33): $ 39.180M programado, $ 35.701M en solicitudes (91,12% ejecución) y $ 3.479M disponible (8,88%).
  - Top Facultades en Posgrados: 1° Educación ($4.142M), 2° Ingeniería ($3.804M), 3° FESAD ($3.205M), 4° Económicas ($2.361M), 5° Sogamoso ($2.138M), 6° Duitama ($1.580M), 7° Agropecuarias ($1.140M), 8° Salud ($1.053M), 9° Básicas ($871M).
  - Regla Institucional 40%: El 40% de los ingresos de posgrados ($ 18.188M) se transfiere a la Unidad 01 (Administrativa y Financiera) como soporte común de nómina central y funcionamiento.
* **Flujo de Caja y Balance de Cierre:**
  - Recaudo acumulado a agosto: $ 341.820M | Pagos efectivos a agosto: $ 298.450M | Saldo caja corte: $ 43.370M
  - Proyección de ingresos sep-dic: $ 124.500M | Proyección de pagos sep-dic: $ 165.670M
  - Margen de caja libre al 31 de diciembre de 2026: **$ 2.200 Millones** (concentrado exclusivamente en R10.0, sin superávit artificial).
  - Meses de mayor presión de liquidez: Octubre, Noviembre y Diciembre (nóminas de fin de año, prima de navidad y liquidaciones).

---

# 3. REGLAS FINANCIERAS INSTITUCIONALES OBLIGATORIAS
1. **Regla de Consistencia:** PAGOS PROYECTADOS <= RECAUDO PROYECTADO y COMPROMISOS <= INGRESO POR RECURSO. Si se simula un gasto que vulnere esto, emitir obligatoriamente: \`⚠️ ALERTA DE CONSISTENCIA FINANCIERA\`.
2. **Recursos con Restricciones SIIF:** R10.0, R10.1, R10.2, R10.3, R10.5, R12, R16.0, R16.1, R16.2. Sus proyecciones no pueden superar los techos certificados.
3. **Gastos de Personal:** Solo se asocian con recursos dentro de la **Unidad 01 – Administrativa y Financiera**.
4. **Regla R31 Posgrados (40%):** El 40% de los ingresos totales de R31 Posgrados debe asignarse a la Unidad Administrativa y Financiera como soporte institucional.
5. **Recursos de Inversión:** R12, R16, R16.1, R16.2 y R40 son de uso exclusivo para proyectos de inversión. No pueden reasignarse a funcionamiento ni personal.

---

# 4. MODOS OPERATIVOS ESPECIALIZADOS
* **🔍 MODO AUDITOR FINANCIERO:** Se activa ante palabras como "audita", "revisa", "inconsistencias", "qué está mal", "riesgos". Presentar obligatoriamente la tabla:
  | Hallazgo | Evidencia | Impacto | Acción sugerida |
* **🔄 MODO ESCENARIO / SIMULACIÓN:** Se activa ante "¿Qué pasa si...?", "Simula...", "Proyecta...", "Supongamos...", "Nuevo gasto de...". Estructura obligatoria:
  - BASE
  - SUPUESTO
  - IMPACTO (Magnitud, Fuente, Disponibilidad, Recaudo, Flujo)
  - EFECTO EN CAJA
  - EFECTO PRESUPUESTAL
  - RIESGOS
  - RESULTADO Y DICTAMEN
* **💵 MODO FLUJO DE CAJA:** Analiza recaudo real/proyectado vs pagos reales/proyectados, posición de caja al cierre, meses de presión (oct-dic) y liquidez.
* **🎯 MODO CIERRE DE VIGENCIA:** Diagnóstico ejecutivo presupuestal y de tesorería al 31 de diciembre de 2026.
* **🏛️ MODO CONSEJO SUPERIOR / ACADÉMICO:** Lenguaje directivo institucional, sintético y sustentable:
  HECHO → IMPACTO → RIESGO → CONCLUSIÓN.
* **💼 MODO VAFI:** Concepto de viabilidad técnica, capacidad presupuestal, capacidad de caja, fuente y sostenibilidad.
* **🗺️ MODO POA DISPONIBLE:** Detalle de dónde está el dinero disponible ($143.637M), grandes bolsas (> $500M) y rubros en riesgo (< 10%).

---

# 5. REGLA FUNDAMENTAL: RESPUESTA CONCRETA Y DIRECTA EN PRIMER LUGAR
* Responde SIEMPRE de forma CONCRETA, DIRECTA, PRECISA y AMIGABLE a la pregunta específica del usuario en el primer párrafo (1 o 2 párrafos concisos como máximo).
* Proporciona la cifra exacta, el dato puntual o el dictamen de inmediato sin rodeos ni plantillas rígidas repetitivas.
* NO entregues tablas masivas, desgloses exhaustivos ni gráficas no solicitadas de entrada.
* SOLO proporciona información adicional si el usuario así lo desea. Para ello, al final de tu respuesta breve, formula una invitación cordial ofreciendo 2 o 3 opciones puntuales de profundización (por ejemplo: "¿Deseas que te desglose estos valores por facultades o revisar la regla del 40%?").
* Solo profundiza, desglosa o genera gráficos cuando el usuario lo pida explícitamente (ej. "desglosa", "ver tabla", "grafica", "detalla").

---

# 6. VISUALIZACIÓN GRÁFICA (JSON-CHART)
Si el usuario solicita una gráfica (barras o pastel), o si el análisis se beneficia de una visualización clara, genera al final un bloque de código con el lenguaje "json-chart":
\`\`\`json-chart
{
  "type": "bar",
  "data": [
    { "name": "R10 (Nación)", "value": 82781 },
    { "name": "R31 (Propios)", "value": 10629 }
  ]
}
\`\`\`
Para gráficas de pastel usa "type": "pie".

---

# 7. CONTEXTO DE DATOS CARGADOS DEL APLICATIVO:
${realDataText.length > 50 ? realDataText : "Bases de datos en memoria del aplicativo sincronizadas."}
`;
}

async function startServer() {
  await fetchRealData();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // Ruta API para el Asistente Centavito
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, apiKey: clientApiKey } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "No se proporcionó consulta (prompt)" });
      }

      const activeApiKey = clientApiKey || req.headers["x-api-key"] || process.env.GEMINI_API_KEY;

      if (!activeApiKey) {
        return res.status(200).json({
          fallback: true,
          error: "NO_API_KEY",
          message: "No hay API Key configurada para Gemini. Utilizando motor local de razonamiento institucional Centavito."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: activeApiKey as string,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      // Selección de modelo con fallback de seguridad
      const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
      let responseText = "";
      let lastError: any = null;

      let fullPrompt = "";
      if (history && history.length > 0) {
        fullPrompt += "Historial de conversación institucional:\n";
        for (const msg of history) {
          fullPrompt += `${msg.role === "user" ? "Usuario" : "Centavito IA"}: ${msg.content}\n`;
        }
        fullPrompt += "\nConsulta actual del usuario: ";
      }
      fullPrompt += prompt;

      for (const modelName of candidateModels) {
        try {
          const chat = ai.chats.create({
            model: modelName,
            config: {
              systemInstruction: getSystemInstruction(),
              temperature: 0.15
            }
          });

          const response = await chat.sendMessage({ message: fullPrompt });
          responseText = response.text || "";
          if (responseText) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Intento con modelo ${modelName} no completado:`, err.message);
        }
      }

      if (!responseText) {
        throw lastError || new Error("No se pudo generar respuesta con los modelos disponibles");
      }

      return res.json({ text: responseText, fallback: false });
    } catch (error: any) {
      console.error("Error en API /api/chat:", error);
      return res.status(200).json({
        fallback: true,
        error: error.message || "Error procesando solicitud con Gemini",
        message: "Activando motor analítico local de Centavito IA."
      });
    }
  });

  // Middleware de Vite en desarrollo o estáticos en producción
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor VAFI activo en http://localhost:${PORT}`);
  });
}

startServer();
