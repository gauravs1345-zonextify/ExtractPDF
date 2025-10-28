import axios from "axios";
import fs from "fs/promises";
import path from "path";
import FormData from "form-data";
import getAccessToken from "../getAccessToken.js";

export default async function handler(req, res) {
  try {
    const { fileId } = req.query;
    if (!fileId) throw new Error("Missing fileId parameter.");

    console.log("🔐 Getting access token...");
    const accessToken = await getAccessToken();

    // Step 1: Download PDF from Zoho CRM
    const fileUrl = `https://www.zohoapis.eu/crm/v8/files?id=${fileId}`;
    console.log("📥 Fetching PDF from Zoho CRM...");

    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const pdfBuffer = response.data;

    // Step 2: Save to /tmp folder (Vercel writable temp dir)
    const tempPath = path.join("/tmp", `${fileId}.pdf`);
    await fs.writeFile(tempPath, pdfBuffer);

    // Step 3: Send PDF to OCR.space API
    console.log("🧠 Sending to OCR.space...");
    const form = new FormData();
    form.append("file", await fs.readFile(tempPath), `${fileId}.pdf`);
    form.append("language", "eng");
    form.append("isOverlayRequired", "false");

    const ocrResponse = await axios.post(
      "https://api.ocr.space/parse/image",
      form,
      {
        headers: {
          ...form.getHeaders(),
          apikey: "K84125996088957", // your OCR.space key
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const ocrResult = ocrResponse.data;
    console.log("✅ OCR.space response received");

    let extractedText = "";
    if (
      ocrResult.ParsedResults &&
      ocrResult.ParsedResults.length > 0 &&
      ocrResult.ParsedResults[0].ParsedText
    ) {
      extractedText = ocrResult.ParsedResults[0].ParsedText.trim();
    } else {
      throw new Error("No text extracted from OCR.space");
    }

    res.status(200).json({
      status: "success",
      extractedText,
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}
