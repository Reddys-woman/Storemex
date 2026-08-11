const path = require("path");
const { smartScan } = require("./index");

// Pass any image file path as a command line argument, or defaults to test.jpg
const imagePath = process.argv[2] || path.join(__dirname, "test.jpg");

console.log(`\n🔍 Scanning image: ${imagePath}...\n`);

smartScan(imagePath)
    .then((result) => {
        console.log("=========================================");
        console.log("               SCAN RESULT               ");
        console.log("=========================================");
        console.log(JSON.stringify(result, null, 2));
        console.log("=========================================\n");
    })
    .catch((err) => {
        console.error("❌ Error scanning image:", err.message);
    });
