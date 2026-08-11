const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ Warning: GEMINI_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    if (ext === ".gif") return "image/gif";
    return "image/jpeg";
}

async function scanImage(imageInput) {
    let imageData;
    let mimeType = "image/jpeg";

    if (typeof imageInput === "string") {
        if (imageInput.startsWith("data:image/")) {
            const parts = imageInput.split(";base64,");
            if (parts.length === 2) {
                mimeType = parts[0].replace("data:", "").trim();
                imageData = parts[1].trim();
            } else {
                imageData = imageInput;
            }
        } else {
            mimeType = getMimeType(imageInput);
            imageData = fs.readFileSync(imageInput).toString("base64");
        }
    } else if (Buffer.isBuffer(imageInput)) {
        imageData = imageInput.toString("base64");
    } else {
        throw new Error("Invalid image input provided to scanImage");
    }

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
            {
                inlineData: {
                    mimeType: mimeType,
                    data: imageData
                }
            },
            {
                text: `
Analyze this food/product package.

Return ONLY valid JSON in this exact format:

{
    "name": "Product Name",
    "brand": "Brand Name",
    "quantity": null,
    "unit": "g/ml/oz/count",
    "expiry_date": null,
    "category": "Category",
    "confidence": 0.95,
    "needs_review": false
}

Rules:
- quantity should be a number when visible (e.g. 250).
- unit should be unit of measurement (e.g. g, ml, oz, items).
- expiry_date MUST use YYYY-MM-DD format if clearly visible on package.
- DO NOT guess or invent an expiry date. If not clearly visible, set expiry_date to null.
- confidence should be a number between 0.0 and 1.0 based on visual clarity.
- set needs_review to true if confidence < 0.8, or if key information like product name/brand is unclear.
`
            }
        ]
    });

    let rawText = response.text ? response.text.trim() : "";
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    let result;
    try {
        result = JSON.parse(rawText);
    } catch (e) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("Failed to parse Gemini response as JSON: " + rawText);
        }
    }

    // Default missing fields safely
    result.name = result.name || "Unknown Item";
    result.brand = result.brand || "Unknown Brand";
    result.quantity = typeof result.quantity === "number" ? result.quantity : null;
    result.unit = result.unit || "";
    result.expiry_date = result.expiry_date || null;
    result.category = result.category || "General Pantry";
    result.confidence = typeof result.confidence === "number" ? result.confidence : 0.5;
    result.needs_review = result.confidence < 0.8 || Boolean(result.needs_review);

    return result;
}

module.exports = { scanImage };

if (require.main === module) {
    const testPath = path.join(__dirname, "test.jpg");
    if (fs.existsSync(testPath)) {
        console.log("Testing scanner with local test image...");
        scanImage(testPath)
            .then((result) => {
                console.log("\nScan Result:\n", JSON.stringify(result, null, 2));
            })
            .catch((error) => {
                console.error("Scanner error:", error);
            });
    } else {
        console.log("scanner.js ready. (No test.jpg found in backend/ai directory)");
    }
}

