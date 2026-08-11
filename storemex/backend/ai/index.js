const { scanImage } = require("./scanner");
const { lookupBarcode, detectBarcodeAndLookup } = require("./barcode");
const { smartScan } = require("./smartScan");

module.exports = {
    scanImage,
    lookupBarcode,
    detectBarcodeAndLookup,
    smartScan
};
