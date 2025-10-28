// const axios = require('axios');
// const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// const Tesseract = require('tesseract.js');
// const fs = require('fs/promises');
// const path = require('path');
// const { exec } = require('child_process');
// const getAccessToken = require('./getAccessToken');
// console.log("getAccessToken:", getAccessToken);

// // 1. PDF to Image Conversion
// const convertPDFToImages = async (pdfPath, outputDir) => {
//   await fs.mkdir(outputDir, { recursive: true });
//   const outputPrefix = path.join(outputDir, 'page');
//   const command = `pdftocairo -png -r 300 "${pdfPath}" "${outputPrefix}"`;

//   console.log("⚙️ Running pdftocairo via CLI...");
//   return new Promise((resolve, reject) => {
//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error("❌ pdftocairo error:", stderr || error.message);
//         return reject(new Error(stderr || error.message));
//       }
//       console.log("✅ PDF converted to images.");
//       resolve();
//     });
//   });
// };

// // 2. OCR on Images
// const runOCR = async (imagePath) => {
//   const imageBuffer = await fs.readFile(imagePath);
//   console.log("🔍 Running OCR on:", imagePath);
//   const result = await Tesseract.recognize(imageBuffer, 'eng');
//   console.log(`✅ Extracted ${result.data.text.length} characters`);
//   return result.data.text;
// };

// // 3. OCR Fallback Logic
// const extractTextFromPDFImages = async (pdfPath, outputDir) => {
//   await convertPDFToImages(pdfPath, outputDir);
//   const imageFiles = await fs.readdir(outputDir);
//   const pngFiles = imageFiles.filter(f => f.endsWith('.png'));

//   if (pngFiles.length === 0) {
//     throw new Error("❌ No PNG files found after conversion.");
//   }

//   let fullText = '';
//   for (const file of pngFiles) {
//     const imagePath = path.join(outputDir, file);
//     const text = await runOCR(imagePath);
//     fullText += `\n\n--- Page ${file} ---\n\n${text}`;
//   }
//   return fullText.trim();
// };

// // 4. Main Function
// (async () => {
//   try {
//     console.log("🔐 Getting access token...");
//     const accessToken = await getAccessToken();

//     const fileId = 'bws47640cbfea3eaa4f4c911e108ebfdf4895';
//     const fileUrl = `https://www.zohoapis.eu/crm/v8/files?id=${fileId}`;

//     console.log("📥 Fetching PDF from Zoho CRM...");
//     const response = await axios.get(fileUrl, {
//       responseType: 'arraybuffer',
//       headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
//     });

//     const pdfBuffer = response.data;
//     const parsed = await pdfParse(pdfBuffer);

//     let fullText = parsed.text?.trim() || '';
//     console.log(`📄 Extracted ${fullText.length} characters via pdf-parse.`);

//     if (!fullText) {
//       const tempPath = path.join(__dirname, 'temp.pdf');
//       const imageDir = path.join(__dirname, 'images');
//       await fs.writeFile(tempPath, pdfBuffer);

//       console.log("⚠️ No text found. Using OCR fallback...");
//       fullText = await extractTextFromPDFImages(tempPath, imageDir);

//       await fs.unlink(tempPath);
//       await fs.rm(imageDir, { recursive: true, force: true });
//     }

//     console.log("✅ Extraction complete!");
//     console.log("🧾 Text preview:\n", fullText.slice(0, 500));

//     // Save output to file for review
//     await fs.writeFile("output.txt", fullText);
//     console.log("💾 Saved full extracted text to output.txt");

//   } catch (error) {
//     console.error("❌ Error:", error.message);
//   }
// })();


const axios = require('axios');
const pdfParse = require('pdf-parse');
const getAccessToken = require('./getAccessToken');

(async () => {
  try {
    const accessToken = await getAccessToken();
    const fileId = 'bws47640cbfea3eaa4f4c911e108ebfdf4895'; // replace with your actual File ID
    const fileUrl = `https://www.zohoapis.eu/crm/v8/files?id=${fileId}`;

    console.log("📥 Fetching PDF from Zoho...");
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    console.log("🧠 Parsing PDF...");
    const parsed = await pdfParse(response.data);

    console.log("✅ Text Extracted:\n", parsed.text.slice(0, 500));
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
})();
