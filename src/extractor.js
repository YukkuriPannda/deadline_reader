const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_RETRIES = 5;

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
 * 429 / 503 エラー時に待機してリトライする汎用ラッパー。
 * - 429: レスポンスの retryDelay を使用（なければ 60 秒）
 * - 503: 10 秒スタートで最大 30 秒まで線形増加（10, 20, 30, 30, 30…）
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function callWithRetry(fn) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status ?? 0;
      const msg = err.message ?? '';

      const is429 =
        status === 429 ||
        status === 'RESOURCE_EXHAUSTED' ||
        msg.includes('429');

      const is503 =
        status === 503 ||
        status === 'UNAVAILABLE' ||
        msg.includes('503');

      if ((!is429 && !is503) || attempt === MAX_RETRIES) throw err;

      let waitMs;
      if (is429) {
        // retryDelay フィールドがあればそれを使用、なければ 60 秒
        waitMs = 60000;
        for (const detail of err.errorDetails ?? []) {
          if (detail.retryDelay) {
            const seconds = parseInt(detail.retryDelay, 10);
            if (!isNaN(seconds) && seconds > 0) waitMs = seconds * 1000;
            break;
          }
        }
        console.warn(
          `[Gemini] 429 Too Many Requests — ${waitMs / 1000}秒後にリトライ (${attempt + 1}/${MAX_RETRIES})`
        );
      } else {
        // 503: 10s → 20s → 30s → 30s… （上限 30 秒）
        waitMs = Math.min(10000 * (attempt + 1), 30000);
        console.warn(
          `[Gemini] 503 Service Unavailable — ${waitMs / 1000}秒後にリトライ (${attempt + 1}/${MAX_RETRIES})`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

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

  const result = await callWithRetry(() =>
    model.generateContent([
      { inlineData: { mimeType: mediaType, data: base64Data } },
      EXTRACTION_PROMPT,
    ])
  );

  const raw = result.response.text().trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Gemini から有効な JSON を受け取れませんでした: ${raw.slice(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`JSON のパースに失敗しました: ${jsonMatch[0].slice(0, 200)}`);
  }

  if (data.error) {
    return null;
  }

  return data;
}

module.exports = { extractEventFromImage };
