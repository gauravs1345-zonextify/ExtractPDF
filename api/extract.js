import axios from 'axios';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import getAccessToken from '../getAccessToken.js'; // import from parent folder

const convertPDFToImages = async (pdfPath, outputDir) => {
  await fs.mkdir(outputDir, { recursive: true });
  const outputPrefix = path.join(outputDir, 'page');
  const command = `pdftocairo -png -r 300 "${pdfPath}" "${outputPrefix}"`;

  console.log("⚙️ Running pdftocairo...");
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      console.log("✅ PDF converted to images.");
      resolve();
    });
  });
};

const runOCR = async (imagePath) => {
  const imageBuffer = await fs.readFile(imagePath);
  console.log("🔍 Running OCR on:", imagePath);
  const result = await Tesseract.recognize(imageBuffer, 'eng');
  return result.data.text;
};

const extractTextFromPDFImages = async (pdfPath, outputDir) => {
  await convertPDFToImages(pdfPath, outputDir);
  const imageFiles = await fs.readdir(outputDir);
  const pngFiles = imageFiles.filter(f => f.endsWith('.png'));

  if (pngFiles.length === 0) throw new Error("No PNG files found.");

  let fullText = '';
  for (const file of pngFiles) {
    const imagePath = path.join(outputDir, file);
    const text = await runOCR(imagePath);
    fullText += `\n\n--- Page ${file} ---\n\n${text}`;
  }

  return fullText.trim();
};

export default async function handler(req, res) {
  try {
    const { fileId } = req.query;
    if (!fileId) throw new Error("Missing fileId parameter.");

    console.log("🔐 Getting access token...");
    const accessToken = await getAccessToken();

    const fileUrl = `https://www.zohoapis.eu/crm/v8/files?id=${fileId}`;
    console.log("📥 Fetching PDF from Zoho CRM...");

    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const pdfBuffer = response.data;
    const parsed = await pdfParse(pdfBuffer);
    let fullText = parsed.text?.trim() || '';

    if (!fullText) {
      console.log("⚠️ No text found. Using OCR fallback...");
      const tempPath = path.join('/tmp', 'temp.pdf'); // ✅ use /tmp on Vercel
      const imageDir = path.join('/tmp', 'images');

      await fs.writeFile(tempPath, pdfBuffer);
      fullText = await extractTextFromPDFImages(tempPath, imageDir);
      await fs.unlink(tempPath);
      await fs.rm(imageDir, { recursive: true, force: true });
    }

    res.status(200).json({ status: 'success', fullText });

  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
}
