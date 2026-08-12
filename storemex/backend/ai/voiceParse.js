/**
 * LLM voice-command parser (Gemini) — v2
 * Multi-action, navigation, shopping, absolute dates, queries
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY not set — /api/voice/parse unavailable.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const SYSTEM = `You are Storemex voice assistant for a kitchen pantry app.
Transcripts may have ASR errors (rise=rice, max=mex). Fix obvious mistakes.

Return ONLY JSON (no markdown):
{
  "actions": [ ... ],
  "reply": "short confirmation under 10 words"
}

Each action:
{
  "type": "update"|"add"|"remove"|"set_expiry"|"add_shopping"|"buy_later"|"open"|"query_pantry"|"query_expiring"|"query_restock"|"query_unavailable"|"query_alerts"|"help",
  "name": "item or page name",
  "qty": number|null,
  "unit": "kg"|"g"|"L"|"ml"|"pcs"|"pack"|"units"|null,
  "days": number|null,
  "expiry": "YYYY-MM-DD"|null,
  "category": "beverages"|"dairy"|"fruits"|"vegetables"|"grains"|"bakery"|"snacks"|"nonveg"|"pulses"|"others"|null
}

Rules:
- ALWAYS output EVERY item mentioned as its own action (multi-item sentences are common).
- "half dozen" => qty 6 unit pcs; "dozen" => 12 pcs
- "piece/pieces" => pcs; litre/liter => L
- "add X to shopping list" / "to buy" => add_shopping
- "add X to buy later" => buy_later
- "remove/delete X" => remove
- "open shopping list/pantry/dashboard/scan/recipes/alerts/history" => open (name=page)
- "what's in pantry" / "what do we have" => query_pantry
- "what's expiring" => query_expiring; "need restock" => query_restock; "out of stock" => query_unavailable
- Expiry: "expires in 5 days" => set_expiry days=5; "expiry to 26 november 2026" => set_expiry with expiry ISO date
- "cold drink" / soda / cola => category beverages
- Ignore wake words mex/max/storemex
- If user says help => type help
`;

async function parseVoiceCommand(transcript, context = {}) {
  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY is not set");
    err.code = "NO_KEY";
    throw err;
  }

  const pantryHint = (context.pantryNames || []).slice(0, 50).join(", ");
  const userMsg = `Known pantry items: ${pantryHint || "(none)"}\n\nUser said: """${transcript}"""`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: SYSTEM + "\n\n" + userMsg }] }],
    config: { temperature: 0.05, responseMimeType: "application/json" },
  });

  let text = "";
  try {
    text = response.text || "";
  } catch (_) {}
  if (!text && response.candidates && response.candidates[0]) {
    const parts = response.candidates[0].content?.parts || [];
    text = parts.map((p) => p.text || "").join("");
  }
  text = String(text).trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("LLM non-JSON: " + text.slice(0, 180));
    parsed = JSON.parse(m[0]);
  }

  if (!Array.isArray(parsed.actions)) parsed.actions = [];
  parsed.actions = parsed.actions
    .map((a) => ({
      type: a.type || "update",
      name: (a.name || "").toString().trim(),
      qty: a.qty == null || a.qty === "" ? null : Number(a.qty),
      unit: a.unit || null,
      days: a.days == null || a.days === "" ? null : Number(a.days),
      expiry: a.expiry || null,
      category: a.category || null,
    }))
    .filter((a) => a.name || String(a.type).startsWith("query") || a.type === "help");

  if (!parsed.reply) parsed.reply = parsed.actions.length ? "Okay." : "Sorry.";
  return parsed;
}

module.exports = { parseVoiceCommand };
