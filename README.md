# AURA RUST

Бот для мониторинга Rust серверов через Rust+ API.

## Быстрый старт

```
start.bat
```

При первом запуске введите:
- Telegram username
- Telegram ID  
- Токены ботов
- API ключи (опционально)

## Возможности

- Уведомления о событиях (Cargo, Heli, Chinook, Crates)
- Отслеживание команды (онлайн/оффлайн, смерти)
- Магазины (новые, закрытые, в воде)
- Raid Alert
- Рейд калькулятор
- Чекер игроков (Steam + BattleMetrics)
- Управление устройствами
- CCTV камеры

## Команды

### Telegram
`/start` `/team` `/events` `/shops` `/raid` `/settings` `/check`

### Discord
`!start` `!team` `!events` `!shops` `!raid` `!settings` `!check`

## Лицензии

- FREE - 3 дня
- WEEK - 7 дней  
- MONTH - 30 дней
- LIFETIME - навсегда

Лицензия привязывается к Telegram ID и железу компьютера (HWID).

## Файлы

- `aura.config.json` - Конфиг пользователя (HWID, username)
- `licenses.json` - База лицензий (защищена подписью)
- `.env` - Токены и настройки
