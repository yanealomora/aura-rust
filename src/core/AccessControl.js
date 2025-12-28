/**
 * Система контроля доступа к боту
 */

import fs from 'fs';
import path from 'path';

const ACCESS_FILE = 'access.json';
const LOG_FILE = 'usage.log';

// Список разрешённых username (без @)
const ALLOWED_USERNAMES = ['M0sya37', 'pupochek267', 'Qwingz_love', 'woalloa', 'NooBaKKa'];

class AccessControl {
  constructor() {
    this.users = new Map();
    this.pendingRequests = new Map();
    this.loadUsers();
  }

  loadUsers() {
    try {
      if (fs.existsSync(ACCESS_FILE)) {
        const data = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
        this.users = new Map(Object.entries(data.users || {}));
        this.pendingRequests = new Map(Object.entries(data.pending || {}));
      }
    } catch (e) {
      console.error('[Access] Load error:', e.message);
    }
  }

  saveUsers() {
    try {
      const data = {
        users: Object.fromEntries(this.users),
        pending: Object.fromEntries(this.pendingRequests)
      };
      fs.writeFileSync(ACCESS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[Access] Save error:', e.message);
    }
  }

  // Проверка доступа
  hasAccess(userId, username = null) {
    // Проверка по username из белого списка
    if (username && ALLOWED_USERNAMES.some(u => u.toLowerCase() === username.toLowerCase())) {
      return true;
    }
    
    const user = this.users.get(userId.toString());
    return user && user.approved;
  }

  // Проверка админа
  isAdmin(userId) {
    const adminId = process.env.TELEGRAM_ADMIN_ID;
    return adminId && userId.toString() === adminId;
  }

  // Запрос доступа
  requestAccess(userId, username, firstName, lastName) {
    const userIdStr = userId.toString();
    
    // Если уже есть доступ
    if (this.hasAccess(userIdStr)) return { status: 'already_approved' };
    
    // Если уже есть запрос
    if (this.pendingRequests.has(userIdStr)) return { status: 'pending' };
    
    // Создаём новый запрос
    const request = {
      userId: userIdStr,
      username: username || 'нет',
      firstName: firstName || 'нет',
      lastName: lastName || 'нет',
      requestTime: new Date().toISOString()
    };
    
    this.pendingRequests.set(userIdStr, request);
    this.saveUsers();
    
    return { status: 'requested', request };
  }

  // Одобрить пользователя
  approveUser(userId, adminId) {
    const userIdStr = userId.toString();
    const request = this.pendingRequests.get(userIdStr);
    
    if (!request) return { success: false, error: 'Запрос не найден' };
    
    this.users.set(userIdStr, {
      ...request,
      approved: true,
      approvedBy: adminId.toString(),
      approvedTime: new Date().toISOString()
    });
    
    this.pendingRequests.delete(userIdStr);
    this.saveUsers();
    
    return { success: true };
  }

  // Отклонить пользователя
  rejectUser(userId) {
    const userIdStr = userId.toString();
    this.pendingRequests.delete(userIdStr);
    this.saveUsers();
    return { success: true };
  }

  // Заблокировать пользователя
  blockUser(userId) {
    const userIdStr = userId.toString();
    const user = this.users.get(userIdStr);
    
    if (user) {
      user.approved = false;
      user.blocked = true;
      user.blockedTime = new Date().toISOString();
      this.users.set(userIdStr, user);
      this.saveUsers();
    }
    
    return { success: true };
  }

  // Получить ожидающие запросы
  getPendingRequests() {
    return Array.from(this.pendingRequests.values());
  }

  // Получить всех пользователей
  getAllUsers() {
    return Array.from(this.users.values());
  }

  // Логирование использования
  logUsage(userId, username, command, details = '') {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | ${userId} | ${username || 'unknown'} | ${command} | ${details}\n`;
    
    try {
      fs.appendFileSync(LOG_FILE, logEntry);
    } catch (e) {
      console.error('[Access] Log error:', e.message);
    }
  }

  // Получить статистику
  getStats() {
    const approved = Array.from(this.users.values()).filter(u => u.approved).length;
    const pending = this.pendingRequests.size;
    const blocked = Array.from(this.users.values()).filter(u => u.blocked).length;
    
    return { approved, pending, blocked, total: this.users.size };
  }
}

export default new AccessControl();