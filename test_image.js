// node test_image.js <画像パス>
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { extractEventFromImage } = require('./src/extractor');

const imagePath = process.argv[2];
if (!imagePath) {
  console.error('使い方: node test_image.js <画像パス>');
  process.exit(1);
}

const absPath = path.resolve(imagePath);
if (!fs.existsSync(absPath)) {
  console.error(`ファイルが見つかりません: ${absPath}`);
  process.exit(1);
}

// extractor.js は URL + contentType を受け取るので、ローカルファイルを file:// URL として渡す
// ただし axios は file:// に対応していないため、base64 を直接渡せるよう adapter を使う
// → extractor を直接呼ばず、同等の処理をインラインで再現する
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SUPPORTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

async function main() {
  const ext = path.extname(absPath).toLowerCase();
  const mimeType = EXT_TO_MIME[ext] ?? 'image/jpeg';
  if (!SUPPORTED_MEDIA_TYPES.includes(mimeType)) {
    console.error(`非対応の拡張子: ${ext}`);
    process.exit(1);
  }

  const base64Data = fs.readFileSync(absPath).toString('base64');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

  console.log(`画像: ${absPath}`);
  console.log(`MIMEタイプ: ${mimeType}`);
  console.log('Gemini に送信中...\n');

  const result = await model.generateContent([
    { inlineData: { data: base64Data, mimeType } },
    EXTRACTION_PROMPT,
  ]);

  const raw = result.response.text().trim();
  console.log('--- Gemini 生レスポンス ---');
  console.log(raw);
  console.log('---------------------------\n');

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('有効な JSON が見つかりませんでした');
    process.exit(1);
  }

  const data = JSON.parse(jsonMatch[0]);
  if (data.error) {
    console.log('結果: 予定情報なし');
    console.log(`理由: ${data.error}`);
  } else {
    console.log('--- 抽出結果 ---');
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
