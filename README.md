# Rust Event Bot

Headless 24/7 event relay: Rust+ → Telegram + Team Chat

## Установка

```bash
cd rust-event-bot
npm install
cp .env.example .env
# Заполни .env своими данными
npm start
```

## Получение токенов

### Rust+ Token
1. Установи Rust+ Companion app
2. Используй [rustplus.js auth](https://github.com/liamcottle/rustplus.js#pairing) для получения токена

### Telegram Bot
1. Создай бота через @BotFather
2. Получи chat_id через @userinfobot

## Архитектура

```
Core
├─ PollingService    (TeamInfo 30s, Markers 60s)
├─ StateCache        (отслеживание изменений)
├─ AntiSpam          (30s cooldown)
└─ EventBus          (центральная шина событий)

Notifiers
├─ TelegramNotifier
└─ RustTeamChatNotifier
```

## События

| Событие | Telegram | Team Chat |
|---------|----------|-----------|
| 💀 Смерть | ✅ | ✅ |
| 🟢🔴 Online/Offline | ✅ | ✅ |
| 🏪 Магазины | ✅ | ✅ |
| 💥 Рейд | ✅ | ✅ |
| 🚢 Cargo | ✅ | ✅ |
| 🚁 Heli | ✅ | ✅ |
| 📦 Crate | ✅ | ✅ |
