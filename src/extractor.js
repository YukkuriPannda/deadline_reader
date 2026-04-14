const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const EXTRACTION_PROMPT = `この画像からイベント・予定の情報を抽出し、以下のJSON形式のみで回答してください（他のテキストは一切含めないこと）：

{
  "title": "イベントのタイトル",
  "date": "YYYY-MM-DD形式の日付（例：2026-04-15）",
  "startTime": "HH:MM形式の開始時刻（24時間制、例：14:30）、不明な場合はnull",
  "endTime": "HH:MM形式の終了時刻（24時間制、例：16:00）、不明な場合はnull",
  "location": "場所・会場名（不明な場合はnull）",
  "description": "その他の詳細情報（不明な場合はnull）"
}

予定情報が画像に含まれていない場合は以下のみを返してください：
{"error": "予定情報が見つかりません"}

注意：
- 日付は必ず YYYY-MM-DD 形式で返す
- 時刻は 24 時間制の HH:MM 形式で返す
- 年が明記されていない場合は現在の年を使用する`;

/**
 * Gemini Vision API を使って画像からイベント情報を抽出する。
 * @param {string} imageUrl - Discord CDN の画像 URL
 * @param {string} contentType - MIME タイプ（例: "image/png"）
 * @returns {Promise<object|null>} 抽出したイベントデータ。予定情報がなければ null。
 */
async function extractEventFromImage(imageUrl, contentType) {
  const mediaType = SUPPORTED_MEDIA_TYPES.includes(contentType) ? contentType : 'image/jpeg';

  const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
  const base64Data = Buffer.from(imageResponse.data).toString('base64');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent([
    { inlineData: { mimeType: mediaType, data: base64Data } },
    EXTRACTION_PROMPT,
  ]);

  const raw = result.response.text().trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Gemini から有効な JSON を受け取れませんでした: ${raw.slice(0, 200)}`);
  }

  const data = JSON.parse(jsonMatch[0]);
  if (data.error) {
    return null;
  }

  return data;
}

module.exports = { extractEventFromImage };
