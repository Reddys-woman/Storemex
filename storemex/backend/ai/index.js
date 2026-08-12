const { scanImage } = require("./scanner");
const { lookupBarcode, detectBarcodeAndLookup } = require("./barcode");
const { smartScan } = require("./smartScan");
const { suggestRecipes } = require("./recipeSuggester");

module.exports = {
    scanImage,
    lookupBarcode,
    detectBarcodeAndLookup,
    smartScan,
    suggestRecipes
};
