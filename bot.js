const TelegramBot = require('node-telegram-bot-api');
const { OpenAI } = require('openai');

// Config dari environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN tidak di-set!');
  process.exit(1);
}

if (!openaiApiKey) {
  console.error('❌ OPENAI_API_KEY tidak di-set!');
  console.log('ℹ️ Dapatkan API key dari: https://platform.openai.com/api-keys');
  process.exit(1);
}

// Inisialisasi bot
const bot = new TelegramBot(token, { polling: true });
const openai = new OpenAI({ apiKey: openaiApiKey });

console.log('🤖 Telegram AI Bot started...');

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    'Halo! Saya asisten AI Anda. 👋\n' +
    'Ketik pesan apa saja untuk chat dengan AI.'
  );
});

// Handle /help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '🆘 **Perintah yang tersedia:**\n' +
    '/start - Memulai bot\n' +
    '/help - Menampilkan bantuan\n' +
    '/reset - Reset percakapan\n\n' +
    'Cukup ketik pesan untuk chat dengan AI!'
  );
});

// Handle semua pesan
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Skip command messages (sudah dihandle di atas)
  if (text && text.startsWith('/')) {
    return;
  }

  // Skip non-text messages
  if (!text) {
    bot.sendMessage(chatId, 'Maaf, saya hanya bisa memproses teks untuk saat ini.');
    return;
  }

  try {
    console.log(`📩 Pesan dari ${msg.from.username || msg.from.id}: ${text}`);

    // Typing indicator
    bot.sendChatAction(chatId, 'typing');

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Kamu adalah asisten AI yang ramah dan membantu di Telegram. Jawablah dengan singkat, jelas, dan berguna dalam Bahasa Indonesia."
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 800,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    
    // Send response
    bot.sendMessage(chatId, response);
    console.log(`📤 Respons ke ${msg.from.username || msg.from.id}: ${response.substring(0, 50)}...`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    let errorMessage = 'Maaf, terjadi kesalahan. ';
    
    if (error.response) {
      if (error.response.status === 429) {
        errorMessage += 'Quota API OpenAI habis.';
      } else if (error.response.status === 401) {
        errorMessage += 'API key OpenAI tidak valid.';
      } else {
        errorMessage += `Error: ${error.response.status}`;
      }
    } else {
      errorMessage += 'Coba lagi nanti.';
    }
    
    bot.sendMessage(chatId, errorMessage);
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error.message);
});

console.log('✅ Bot siap menerima pesan...');
