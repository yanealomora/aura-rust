/**
 * AURA RUST - Admin Bot
 * Telegram бот для управления лицензиями
 */

import { Telegraf } from 'telegraf';
import licenseManager, { LICENSE_TYPES } from '../core/LicenseManager.js';

const ADMIN_TOKEN = process.env.ADMIN_BOT_TOKEN;

class AdminBot {
  constructor() {
    this.bot = null;
    this.pendingRequests = new Map(); // userId -> request data
  }

  init() {
    if (!ADMIN_TOKEN) {
      console.log('[AdminBot] ADMIN_BOT_TOKEN not set, skipping');
      return;
    }

    this.bot = new Telegraf(ADMIN_TOKEN);
    
    // Middleware - только владелец
    this.bot.use(async (ctx, next) => {
      if (!licenseManager.isOwner(ctx.from?.id)) {
        return ctx.reply('Нет доступа');
      }
      return next();
    });

    this.setupCommands();
    
    this.bot.launch({ dropPendingUpdates: true })
      .then(() => console.log('[AdminBot] Started'))
      .catch(e => console.error('[AdminBot] Error:', e.message));
  }

  setupCommands() {
    // Старт
    this.bot.command('start', ctx => {
      ctx.reply(`AURA RUST Admin Panel

/stats - Статистика
/users - Все пользователи
/add ID тип - Выдать лицензию
/revoke ID - Отозвать
/check ID - Проверить

Типы: FREE, WEEK, MONTH, LIFETIME`);
    });

    // Статистика
    this.bot.command('stats', ctx => {
      const stats = licenseManager.getStats();
      ctx.reply(`Статистика

Всего: ${stats.total}
Активных: ${stats.active}
Истекших: ${stats.expired}
Заблокированных: ${stats.blocked}
Lifetime: ${stats.lifetime}`);
    });

    // Список пользователей
    this.bot.command('users', ctx => {
      const users = licenseManager.getAll();
      if (!users.length) return ctx.reply('Нет пользователей');

      let text = `Пользователи (${users.length})\n\n`;
      users.slice(0, 20).forEach(u => {
        const status = u.status.valid ? 'OK' : 'X';
        const days = u.status.daysLeft === -1 ? 'forever' : `${u.status.daysLeft}d`;
        text += `[${status}] ${u.userId} - ${u.type} (${days})\n`;
      });
      if (users.length > 20) text += `\n...и ещё ${users.length - 20}`;
      
      ctx.reply(text);
    });

    // Выдать лицензию
    this.bot.command('add', ctx => {
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length < 1) return ctx.reply('Использование: /add ID [тип]\nТипы: FREE, WEEK, MONTH, LIFETIME');

      const userId = args[0];
      const type = (args[1] || 'MONTH').toUpperCase();

      if (!LICENSE_TYPES[type]) {
        return ctx.reply(`Неверный тип. Доступные: ${Object.keys(LICENSE_TYPES).join(', ')}`);
      }

      const result = licenseManager.grant(userId, type, ctx.from.id.toString());
      
      if (result.success) {
        const days = result.daysLeft === -1 ? 'навсегда' : `${result.daysLeft} дней`;
        ctx.reply(`Лицензия выдана\n\nID: ${userId}\nТип: ${type}\nСрок: ${days}`);
      } else {
        ctx.reply(`Ошибка: ${result.error}`);
      }
    });

    // Отозвать
    this.bot.command('revoke', ctx => {
      const userId = ctx.message.text.split(' ')[1];
      if (!userId) return ctx.reply('Использование: /revoke ID');

      const result = licenseManager.revoke(userId, ctx.from.id.toString());
      ctx.reply(result.success ? `Лицензия ${userId} отозвана` : `Ошибка: ${result.error}`);
    });

    // Проверить
    this.bot.command('check', ctx => {
      const userId = ctx.message.text.split(' ')[1];
      if (!userId) return ctx.reply('Использование: /check ID');

      const status = licenseManager.check(userId);
      
      if (status.valid) {
        const days = status.daysLeft === -1 ? 'навсегда' : `${status.daysLeft} дней`;
        ctx.reply(`ID: ${userId}\nСтатус: Активна\nТип: ${status.type}\nОсталось: ${days}`);
      } else {
        ctx.reply(`ID: ${userId}\nСтатус: Неактивна\nПричина: ${status.reason}`);
      }
    });

    // Разблокировать
    this.bot.command('unblock', ctx => {
      const userId = ctx.message.text.split(' ')[1];
      if (!userId) return ctx.reply('Использование: /unblock ID');

      const result = licenseManager.unblock(userId);
      ctx.reply(result.success ? `${userId} разблокирован` : `Ошибка: ${result.error}`);
    });

    // Обработка запросов доступа (callback)
    this.bot.on('callback_query', async ctx => {
      const data = ctx.callbackQuery.data;
      
      if (data.startsWith('lic_approve_')) {
        const [, , userId, type] = data.split('_');
        const result = licenseManager.grant(userId, type, ctx.from.id.toString());
        
        if (result.success) {
          const days = result.daysLeft === -1 ? 'навсегда' : `${result.daysLeft} дней`;
          await ctx.editMessageText(`Одобрено\n\nID: ${userId}\nТип: ${type}\nСрок: ${days}`);
          
          // Уведомляем пользователя через основного бота
          this.notifyUser(userId, `Ваш запрос одобрен!\nТип: ${type}\nСрок: ${days}`);
        }
        return ctx.answerCbQuery('Одобрено');
      }
      
      if (data.startsWith('lic_reject_')) {
        const userId = data.replace('lic_reject_', '');
        await ctx.editMessageText(`Отклонено\n\nID: ${userId}`);
        this.notifyUser(userId, 'Ваш запрос отклонён');
        return ctx.answerCbQuery('Отклонено');
      }
      
      ctx.answerCbQuery();
    });
  }

  // Отправить запрос на одобрение владельцу
  async sendAccessRequest(userId, username, firstName, message = '') {
    if (!this.bot) return;
    
    const ownerId = process.env.OWNER_ID || process.env.TELEGRAM_ADMIN_ID;
    if (!ownerId) return;

    const text = `Новый запрос доступа

ID: ${userId}
Username: @${username || 'нет'}
Имя: ${firstName || 'нет'}
${message ? `Сообщение: ${message}` : ''}`;

    const buttons = {
      inline_keyboard: [
        [
          { text: 'FREE (3 дня)', callback_data: `lic_approve_${userId}_FREE` },
          { text: 'WEEK', callback_data: `lic_approve_${userId}_WEEK` }
        ],
        [
          { text: 'MONTH', callback_data: `lic_approve_${userId}_MONTH` },
          { text: 'LIFETIME', callback_data: `lic_approve_${userId}_LIFETIME` }
        ],
        [
          { text: 'Отклонить', callback_data: `lic_reject_${userId}` }
        ]
      ]
    };

    try {
      await this.bot.telegram.sendMessage(ownerId, text, { reply_markup: buttons });
    } catch (e) {
      console.error('[AdminBot] Send request error:', e.message);
    }
  }

  // Уведомить пользователя (через основного бота)
  notifyUser(_userId, _message) {
    // Это будет вызываться из основного бота
    // Здесь просто заглушка, реальная отправка в TelegramNotifier
  }
}

export default new AdminBot();
