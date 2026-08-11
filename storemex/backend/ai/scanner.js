require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function scanImage(imagePath) {
  const imageData = fs.readFileSync(imagePath).toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData
        }
      },
      {
        text: `
Analyze this food/product package.

Return ONLY valid JSON in this exact format:

{
  "name": "",
  "brand": "",
  "quantity": null,
  "unit": "",
  "expiry_date": "",
  "category": "",
  "confidence": 0
}

Rules:
- quantity should be a number when visible.
- expiry_date should use YYYY-MM-DD when confidently readable.
- If something cannot be determined, use null.
- confidence should be between 0 and 1.
- Do not guess an expiry date.
`
      }
    ]
  });

  console.log(response.text);
}

// Temporary test
scanImage("./test.jpg");