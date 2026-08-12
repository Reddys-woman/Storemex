const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ Warning: GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

/**
 * Asks Gemini for realistic, simple recipe ideas that can ACTUALLY be
 * made using only what's currently in the pantry (plus basic staples
 * like salt/oil/water/sugar/spices, which are assumed available).
 *
 * Deliberately steers away from "impressive"/complex restaurant-style
 * results — a pantry with just potatoes should get something like
 * "Fried Potato", not a multi-ingredient gourmet dish that needs
 * things the person doesn't have.
 *
 * @param {Array<{name: string, category?: string}>} pantryItems
 * @returns {Promise<Array<{title, time, difficulty, tag, ingredients, steps}>>}
 */
async function suggestRecipes(pantryItems) {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set on the server — recipe suggestions are unavailable.");
    }
    if (!Array.isArray(pantryItems) || pantryItems.length === 0) {
        return [];
    }

    const itemList = pantryItems
        .map((i) => (i.category ? `${i.name} (${i.category})` : i.name))
        .join(", ");

    const prompt = `
You are a practical home-cooking assistant, not a professional chef. A person's kitchen pantry currently contains ONLY these ingredients (plus common staples — salt, cooking oil, water, sugar, black pepper, and basic ground spices — which you may always assume are available even if not listed):

${itemList}

Suggest realistic, SIMPLE, everyday recipes a busy home cook could actually make right now with just these ingredients. Follow these rules strictly:

1. Every recipe must use ONLY the pantry ingredients listed above, plus the assumed staples. Never invent or require an ingredient that isn't in the list or a basic staple.
2. Prioritize SIMPLE, quick, realistic home recipes over fancy, complex, or restaurant-style dishes. Example: if only potato is available, suggest something like "Fried Potato" or "Simple Aloo Bhuna" — not an elaborate multi-step gourmet potato dish.
3. If very few ingredients are available (1-3 items), still suggest at least one very simple recipe using just those — don't skip suggesting anything.
4. Never suggest a recipe that needs an ingredient not present in the pantry list or the assumed staples.
5. Prefer realistic, popular, well-known combinations over invented ones — e.g. rice + milk → kheer, tomato + rice → tomato rice, bread + egg → French toast, potato alone → fried/roasted potato.
6. Return between 3 and 6 recipes if the ingredients genuinely allow for that much variety — otherwise return fewer, genuinely realistic recipes rather than padding with unrealistic ones.
7. Do not repeat near-identical recipes (e.g. two different "fried rice" variants).

Return ONLY valid JSON — an array of recipe objects, in exactly this format, with no markdown fences and no extra commentary:

[
  {
    "title": "Recipe Name",
    "time": "15 min",
    "difficulty": "Easy",
    "tag": "Quick & Easy",
    "ingredients": ["ingredient1", "ingredient2"],
    "steps": ["Step 1 text", "Step 2 text", "Step 3 text"]
  }
]

Field rules:
- "time": a realistic short cook time, e.g. "10 min", "20 min", "30 min".
- "difficulty": one of "Easy" or "Medium" only — nothing here should ever be "Hard", since these are meant to be simple.
- "tag": a short 2-3 word highlight, e.g. "Quick & Easy", "Best Match", "Comfort Food", "Kid Friendly", "High Protein" — pick whichever fits best.
- "ingredients": list only the pantry items (using the name as given) that are actually used in this recipe — do not include assumed staples like salt/oil/water here.
- "steps": 3-6 short, clear, beginner-friendly steps.
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ text: prompt }]
    });

    let rawText = response.text ? response.text.trim() : "";
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    let recipes;
    try {
        recipes = JSON.parse(rawText);
    } catch (e) {
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            recipes = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("Failed to parse recipe suggestions as JSON: " + rawText);
        }
    }

    if (!Array.isArray(recipes)) {
        throw new Error("Unexpected AI response shape for recipe suggestions.");
    }

    // Defensive defaults so a slightly malformed entry never breaks the UI.
    return recipes.map((r) => ({
        title: r.title || "Untitled Recipe",
        time: r.time || "",
        difficulty: r.difficulty || "Easy",
        tag: r.tag || "Recipe",
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        steps: Array.isArray(r.steps) ? r.steps : []
    }));
}

module.exports = { suggestRecipes };

if (require.main === module) {
    console.log("Testing suggestRecipes with a sample pantry...");
    suggestRecipes([{ name: "Potato", category: "Vegetables" }])
        .then((result) => {
            console.log("\nRecipe Suggestions:\n", JSON.stringify(result, null, 2));
        })
        .catch(console.error);
}
