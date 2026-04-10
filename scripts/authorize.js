/**
 * Google Calendar OAuth2 の初回認証スクリプト。
 * セットアップ時に一度だけ実行し、取得した GOOGLE_REFRESH_TOKEN を .env に追記してください。
 *
 * 使い方:
 *   node scripts/authorize.js
 */
require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

async function authorize() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // refresh_token を必ず取得するために consent を強制
  });

  console.log('以下の URL をブラウザで開いて Google アカウントを認証してください：\n');
  console.log(authUrl);
  console.log('\nローカルサーバー（ポート 3000）で認証コードを待機しています...\n');

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const { query } = url.parse(req.url, true);

      if (query.code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>✅ 認証成功！このタブを閉じてターミナルを確認してください。</h1>');
        server.close();
        resolve(query.code);
      } else if (query.error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>❌ エラー: ${query.error}</h1>`);
        server.close();
        reject(new Error(`OAuth error: ${query.error}`));
      }
    });

    server.listen(PORT, () => {
      console.log(`ローカルサーバー起動中: http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      reject(new Error(`サーバー起動失敗: ${err.message}`));
    });
  });

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      '\n⚠️  refresh_token が取得できませんでした。\n' +
      'Google アカウントの「アクセス権を持つアプリ」からこのアプリを一度削除してから再実行してください。\n' +
      '（https://myaccount.google.com/permissions）'
    );
    process.exit(1);
  }

  console.log('\n✅ 認証成功！以下の行を .env ファイルに追加してください：\n');
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
}

authorize().catch((err) => {
  console.error('認証に失敗しました:', err.message);
  process.exit(1);
});
