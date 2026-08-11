const { detectBarcodeAndLookup } = require("./barcode");
const { scanImage } = require("./scanner");

/**
 * Smart scanner flow:
 * 1. Checks image for barcode -> looks up in Open Food Facts API (saves Gemini quota)
 * 2. If no barcode found -> falls back to Gemini 2.5 Flash visual AI scan
 */
async function smartScan(imageInput) {
    try {
        const barcodeProduct = await detectBarcodeAndLookup(imageInput);
        if (barcodeProduct) {
            console.log("⚡ Product identified via Barcode lookup (Saved Gemini API Quota!)");
            return barcodeProduct;
        }
    } catch (err) {
        console.warn("[SmartScan] Barcode check skipped:", err.message);
    }

    console.log("🤖 Fallback: Scanning image with Gemini AI...");
    const aiResult = await scanImage(imageInput);
    aiResult.source = "ai_gemini";
    return aiResult;
}

module.exports = { smartScan };

if (require.main === module) {
    const path = require("path");
    const testPath = path.join(__dirname, "test.jpg");
    console.log("Testing smartScan with test image...");
    smartScan(testPath)
        .then((result) => {
            console.log("\nSmart Scan Final Output:\n", JSON.stringify(result, null, 2));
        })
        .catch(console.error);
}
