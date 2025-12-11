const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Токен з environment variables
const token = process.env.TOKEN;
console.log('TOKEN:', token ? 'отримано' : 'НЕ знайдено!');

if (!token) {
  throw new Error('❌ Telegram Bot Token не надано! Перевір Variables у Railway.');
}

const bot = new TelegramBot(token, { polling: true });

// Завантаження/збереження користувачів
function loadUsers() {
  if (fs.existsSync('users.json')) {
    try {
      const data = fs.readFileSync('users.json');
      return JSON.parse(data.length ? data : "[]");
    } catch {
      return [];
    }
  }
  return [];
}
function saveUsers() {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}
let users = loadUsers();

// Завантаження/збереження статистики
function loadStats() {
  const defaultStats = {
    buy: { total: 0, monthly: {} },
    info: { total: 0, monthly: {} },
    doctors: { total: 0, monthly: {} }
  };
  if (fs.existsSync('stats.json')) {
    try {
      const data = fs.readFileSync('stats.json');
      return JSON.parse(data.length ? data : JSON.stringify(defaultStats));
    } catch {
      return defaultStats;
    }
  }
  return defaultStats;
}
function saveStats() {
  fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
}
let stats = loadStats();

// Список адмінів
const adminIds = [8128014321];

// Допоміжна функція для оновлення статистики
function updateStats(type) {
  const month = new Date().toISOString().slice(0,7); // YYYY-MM
  stats[type].total++;
  stats[type].monthly[month] = (stats[type].monthly[month] || 0) + 1;
  saveStats();
}

// Меню користувача
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🔥 Акції", callback_data: "promo" }],
      [{ text: "🎁 Отримати купон", callback_data: "coupon" }],
      [{ text: "📦 Каталог", callback_data: "catalog" }],
      [{ text: "ℹ️ Інформація", callback_data: "info" }],
      [{ text: "🌐 Інформація для лікарів", callback_data: "doctors" }],
      [{ text: "🛒 Купити", callback_data: "buy" }]
    ]
  }
};

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!users.includes(chatId)) {
    users.push(chatId);
    saveUsers();
  }
  bot.sendMessage(chatId, "Привіт 👋! Це бот швидкого тесту pH. Обери дію:", mainMenu);
});

// Команда /admin
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  if (!adminIds.includes(chatId)) {
    return bot.sendMessage(chatId, "⛔ У вас немає прав доступу.");
  }

  bot.sendMessage(chatId, "⚙️ Адмінпанель:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "👥 Users", callback_data: "admin_users" }],
        [{ text: "📢 Broadcast", callback_data: "admin_broadcast" }],
        [{ text: "📊 Statistics", callback_data: "admin_stats" }]
      ]
    }
  });
});

// Обробка callback кнопок
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  switch (query.data) {
    case "promo":
      bot.sendMessage(chatId, "🔥 Нова акція: -20% на тест pH!");
      break;
    case "coupon":
      bot.sendMessage(chatId, "🎁 Ваш купон: PH2026");
      break;
    case "catalog":
      bot.sendMessage(chatId, "📦 Каталог:\n1. Тест Citolab pH №1 — 100 грн\n2. Тест Citolab pH №25 — 300 грн");
      break;
    case "info":
      updateStats("info");
      bot.sendMessage(chatId, "ℹ️ Контроль pH — важливий для жіночого здоров’я. Детальніше: https://citolabph.com.ua");
      break;
    case "doctors":
      updateStats("doctors");
      bot.sendMessage(chatId, "🌐 Інформація для лікарів: https://pharmasco.com/products-services/ekspres-testi/ginekologichni-testi/citolab-ph");
      break;
    case "buy":
      updateStats("buy");
      bot.sendMessage(chatId, "🛒 Для покупки натисніть кнопку нижче:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Розетка", url: "https://apteka.rozetka.com.ua/ua/testy-farmasko-156632550/p560962914/" }],
            [{ text: "Citolab PH", url: "https://citolabph.com.ua" }],
            [{ text: "Онлайн-магазин", url: "https://pharmasco.com/online-store" }]
          ]
        }
      });
      break;

    // Адмінпанель
    case "admin_users":
      bot.sendMessage(chatId, `👥 У базі ${users.length} користувачів.`);
      break;
    case "admin_broadcast":
      bot.sendMessage(chatId, "📢 Для розсилки використовуйте команду:\n/broadcast Ваш текст");
      break;
    case "admin_stats":
      const month = new Date().toISOString().slice(0,7);
      bot.sendMessage(chatId,
        `📊 Статистика:\n\n` +
        `🛒 Купити: всього ${stats.buy.total}, цього місяця ${stats.buy.monthly[month] || 0}\n` +
        `ℹ️ Інформація: всього ${stats.info.total}, цього місяця ${stats.info.monthly[month] || 0}\n` +
        `🌐 Для лікарів: всього ${stats.doctors.total}, цього місяця ${stats.doctors.monthly[month] || 0}`
      );
      break;
  }
});

// Команда для розсилки
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  if (adminIds.includes(chatId)) {
    users.forEach(id => bot.sendMessage(id, "📢 Розсилка: " + text));
  } else {
    bot.sendMessage(chatId, "⛔ У вас немає прав для розсилки.");
  }
});

console.log('Бот запущений...');
