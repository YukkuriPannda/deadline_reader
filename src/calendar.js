const { google } = require('googleapis');

const TIMEZONE = 'Asia/Tokyo';

function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

/**
 * Claude が抽出したイベントデータを Google カレンダーに追加する。
 * @param {{ title, date, startTime, endTime, location, description }} eventData
 * @returns {Promise<object>} 作成されたカレンダーイベント（htmlLink を含む）
 */
async function addEventToCalendar(eventData) {
  const auth = createOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  let start, end;

  if (eventData.startTime) {
    start = { dateTime: `${eventData.date}T${eventData.startTime}:00`, timeZone: TIMEZONE };
    const endTime = eventData.endTime ?? addOneHour(eventData.startTime);
    end = { dateTime: `${eventData.date}T${endTime}:00`, timeZone: TIMEZONE };
  } else {
    // 時刻不明 → 終日イベント
    start = { date: eventData.date };
    end = { date: eventData.date };
  }

  const resource = {
    summary: eventData.title,
    start,
    end,
    ...(eventData.location && { location: eventData.location }),
    ...(eventData.description && { description: eventData.description }),
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    resource,
  });

  return response.data;
}

/** "HH:MM" に 1 時間を加算して返す */
function addOneHour(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

module.exports = { addEventToCalendar };
