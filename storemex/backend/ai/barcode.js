const javascriptBarcodeReader = require("javascript-barcode-reader");
const axios = require("axios");

/**
 * Fetch product details from Open Food Facts free API given a barcode number.
 */
async function lookupBarcode(barcode) {
    try {
        const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
        const response = await axios.get(url, {
            headers: { "User-Agent": "StoreMex-HackathonApp/1.0" },
            timeout: 4000
        });

        if (response.data && response.data.status === 1 && response.data.product) {
            const p = response.data.product;
            const name = p.product_name || p.product_name_en || "Unknown Product";
            const brand = p.brands || "Unknown Brand";
            const category = (p.categories_tags && p.categories_tags.length > 0)
                ? p.categories_tags[0].replace("en:", "").replace(/-/g, " ")
                : "General Pantry";
            
            let quantity = null;
            let unit = "";
            if (p.product_quantity) {
                quantity = Number(p.product_quantity);
            }
            if (p.product_quantity_unit) {
                unit = p.product_quantity_unit;
            }

            return {
                name: name,
                brand: brand,
                quantity: quantity,
                unit: unit,
                expiry_date: null,
                category: category,
                confidence: 0.95,
                needs_review: false,
                source: "barcode",
                barcode: barcode
            };
        }
    } catch (err) {
        console.warn(`[Barcode Lookup] Error fetching details for barcode ${barcode}:`, err.message);
    }
    return null;
}

/**
 * Reads an image file/buffer, attempts barcode detection, and looks it up on Open Food Facts.
 */
async function detectBarcodeAndLookup(imageInput) {
    try {
        const barcode = await javascriptBarcodeReader({
            image: imageInput,
            barcode: "code-128",
            options: {
                useWorker: false
            }
        }).catch(() => null);

        if (barcode) {
            console.log(`[Barcode Scanner] Found barcode: ${barcode}`);
            const product = await lookupBarcode(barcode);
            if (product) {
                return product;
            }
        }
    } catch (e) {
        // Barcode not detected or failed, safely fallback
    }
    return null;
}

module.exports = { lookupBarcode, detectBarcodeAndLookup };

if (require.main === module) {
    // Quick CLI test with sample barcode (Lay's Wavy Original UPC 028400043809)
    const testBarcode = "028400043809";
    console.log(`Testing barcode lookup for UPC: ${testBarcode}...`);
    lookupBarcode(testBarcode).then((res) => {
        console.log("Lookup result:", JSON.stringify(res, null, 2));
    });
}
