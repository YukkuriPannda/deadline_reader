require('dotenv').config();
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const { extractEventFromImage } = require('./extractor');
const { addEventToCalendar } = require('./calendar');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TARGET_CHANNEL_IDS = process.env.DISCORD_CHANNEL_IDS
  ? process.env.DISCORD_CHANNEL_IDS.split(',').map((id) => id.trim()).filter(Boolean)
  : [];

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  if (TARGET_CHANNEL_IDS.length > 0) {
    console.log(`Watching channels: ${TARGET_CHANNEL_IDS.join(', ')}`);
  } else {
    console.log('Watching all channels (DISCORD_CHANNEL_IDS not set)');
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (TARGET_CHANNEL_IDS.length > 0 && !TARGET_CHANNEL_IDS.includes(message.channelId)) return;

  const imageAttachments = message.attachments.filter(
    (att) => att.contentType && att.contentType.startsWith('image/')
  );
  if (imageAttachments.size === 0) return;

  let processingReaction = null;
  try {
    processingReaction = await message.react('⏳');
  } catch {
    // リアクション権限がない場合は無視
  }

  for (const [, attachment] of imageAttachments) {
    try {
      console.log(`[${new Date().toISOString()}] Processing: ${attachment.url}`);

      const eventData = await extractEventFromImage(attachment.url, attachment.contentType);

      if (!eventData) {
        await message.reply('画像から予定情報を抽出できませんでした。予定が記載された画像を送信してください。');
        continue;
      }

      const calendarEvent = await addEventToCalendar(eventData);

      const embed = new EmbedBuilder()
        .setColor(0x00ae86)
        .setTitle('✅ Googleカレンダーに追加しました')
        .setURL(calendarEvent.htmlLink)
        .addFields(
          { name: 'タイトル', value: eventData.title || '(なし)' },
          { name: '日付', value: eventData.date || '(不明)', inline: true },
          { name: '開始', value: eventData.startTime || '終日', inline: true },
          { name: '終了', value: eventData.endTime || '—', inline: true }
        )
        .setTimestamp();

      if (eventData.location) {
        embed.addFields({ name: '場所', value: eventData.location });
      }
      if (eventData.description) {
        embed.addFields({ name: '詳細', value: eventData.description.slice(0, 1000) });
      }

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error processing image:', err);
      await message.reply(`エラーが発生しました: ${err.message}`);
    }
  }

  try {
    await processingReaction?.remove();
  } catch {
    // 削除失敗は無視
  }
});

client.login(process.env.DISCORD_TOKEN);
