import axios from "axios";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import getAccessToken from "../getAccessToken.js"; // import from parent folder

// --- PDF to Image Conversion (Fallback-safe) ---
// const convertPDFToImages = async (pdfPath, outputDir) => {
//   try {
//     await fs.mkdir(outputDir, { recursive: true });
//     const outputPrefix = path.join(outputDir, "page");
//     const command = `pdftocairo -png -r 150 "${pdfPath}" "${outputPrefix}"`;

//     console.log("⚙️ Trying pdftocairo...");
//     return new Promise((resolve, reject) => {
//       exec(command, (error, stdout, stderr) => {
//         if (error) {
//           console.warn("⚠️ pdftocairo not available — skipping image conversion.");
//           return resolve(false); // graceful fallback
//         }
//         console.log("✅ PDF converted to images.");
//         resolve(true);
//       });
//     });
//   } catch (err) {
//     console.warn("⚠️ PDF to image conversion skipped:", err.message);
//     return false;
//   }
// };

// --- OCR on Image ---
// const runOCR = async (imagePath) => {
//   console.log("🔍 Running OCR on:", imagePath);
//   const imageBuffer = await fs.readFile(imagePath);
//   const result = await Tesseract.recognize(imageBuffer, "eng");
//   console.log(`✅ OCR done for ${imagePath}`);
//   return result.data.text;
// };

// --- OCR Extraction Fallback ---
// const extractTextFromPDFImages = async (pdfPath, outputDir) => {
//   const converted = await convertPDFToImages(pdfPath, outputDir);
//   if (!converted) throw new Error("Image conversion failed. pdftocairo unavailable.");

//   const files = await fs.readdir(outputDir);
//   const pngFiles = files.filter((f) => f.endsWith(".png"));
//   if (pngFiles.length === 0) throw new Error("No PNG files found.");

//   let fullText = "";
//   for (const file of pngFiles) {
//     const imagePath = path.join(outputDir, file);
//     const text = await runOCR(imagePath);
//     fullText += `\n\n--- Page ${file} ---\n\n${text}`;
//   }
//   return fullText.trim();
// };

// --- Main API Handler ---
export default async function handler(req, res) {
  try {
    const { fileId } = req.query;
    if (!fileId) throw new Error("Missing fileId parameter.");

    console.log("🔐 Fetching Zoho Access Token...");
    const accessToken = await getAccessToken();

    const fileUrl = `https://www.zohoapis.eu/crm/v8/files?id=${fileId}`;
    console.log("📥 Downloading PDF from Zoho CRM...");

    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const pdfBuffer = response.data;
    // const parsed = await pdfParse(pdfBuffer);
    // let fullText = parsed.text?.trim() || "";

    // --- Fallback to OCR if no text ---
    // if (!fullText) {
    //   console.log("⚠️ No text found — running OCR fallback...");
    //   const tempPath = path.join("/tmp", "temp.pdf");
    //   const imageDir = path.join("/tmp", "images");

    //   await fs.writeFile(tempPath, pdfBuffer);
    //   fullText = await extractTextFromPDFImages(tempPath, imageDir);

    //   await fs.unlink(tempPath);
    //   await fs.rm(imageDir, { recursive: true, force: true });
    // }

    console.log("✅ Text extraction complete.");
    return res.status(200).json({ status: "success", pdfBuffer });

  } catch (error) {
    console.error("❌ Error:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
}
