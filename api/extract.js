import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { execSync } from "child_process";
import Tesseract from "tesseract.js";

export default async function handler(req, res) {
  try {
    const { fileId } = req.query;
    if (!fileId) {
      return res.status(400).json({ error: "Missing 'fileId' parameter" });
    }

    console.log("🔐 Getting Zoho Access Token...");
    const accessToken = await getAccessToken();

    console.log(`📥 Fetching PDF from Zoho CRM (fileId: ${fileId})...`);
    const pdfBuffer = await downloadZohoFile(accessToken, fileId);

    console.log("📄 Trying pdf-parse...");
    let text = "";
    try {
      const parsed = await pdf(pdfBuffer);
      text = parsed.text.trim();
      console.log(`📄 Extracted ${text.length} characters via pdf-parse.`);
    } catch (e) {
      console.warn("⚠️ pdf-parse failed, using OCR fallback:", e.message);
    }

    if (!text) {
      console.log("⚙️ Running OCR fallback...");
      const ocrText = await extractTextViaOCR(pdfBuffer);
      text = ocrText.trim();
      console.log(`✅ Extracted ${text.length} characters via OCR.`);
    }

    // ✅ Return text result only
    return res.status(200).json({
      success: true,
      fileId,
      textLength: text.length,
      text,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message || "Internal error" });
  }
}

// === Helper Functions === //

async function getAccessToken() {
  const data = new FormData();
  data.append("client_id", process.env.ZOHO_CLIENT_ID);
  data.append("client_secret", process.env.ZOHO_CLIENT_SECRET);
  data.append("refresh_token", process.env.ZOHO_REFRESH_TOKEN);
  data.append("grant_type", "refresh_token");

  const response = await axios.post("https://accounts.zoho.eu/oauth/v2/token", data, {
    headers: data.getHeaders(),
  });

  return response.data.access_token;
}

async function downloadZohoFile(accessToken, fileId) {
  const response = await axios.get(`https://www.zohoapis.eu/crm/v2/files/${fileId}`, {
    responseType: "arraybuffer",
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  return Buffer.from(response.data);
}

async function extractTextViaOCR(pdfBuffer) {
  const tmpDir = "/tmp";
  const pdfPath = path.join(tmpDir, "temp.pdf");
  fs.writeFileSync(pdfPath, pdfBuffer);

  const outputPrefix = path.join(tmpDir, "page");
  execSync(`pdftocairo -png "${pdfPath}" "${outputPrefix}"`);

  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith(".png"));
  let fullText = "";

  for (const file of files) {
    const imgPath = path.join(tmpDir, file);
    const { data: { text } } = await Tesseract.recognize(imgPath, "eng");
    fullText += `\n--- Page ${file} ---\n${text}`;
  }

  return fullText;
}
