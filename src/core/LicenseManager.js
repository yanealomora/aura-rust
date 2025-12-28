/**
 * AURA RUST - License Manager
 * Система лицензий с привязкой к HWID
 */

import fs from 'fs';
import crypto from 'crypto';

const LICENSE_FILE = 'licenses.json';
const SECRET_KEY = process.env.LICENSE_SECRET || 'aura-rust-2024-secret';

// Типы лицензий
export const LICENSE_TYPES = {
  FREE: { name: 'Free', days: 3, maxServers: 1 },
  WEEK: { name: 'Week', days: 7, maxServers: 2 },
  MONTH: { name: 'Month', days: 30, maxServers: 5 },
  LIFETIME: { name: 'Lifetime', days: -1, maxServers: 999 }
};

class LicenseManager {
  constructor() {
    this.licenses = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(LICENSE_FILE)) {
        const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
        if (this._verifyData(data)) {
          this.licenses = new Map(Object.entries(data.licenses || {}));
        } else {
          console.log('[License] Invalid signature');
          this.licenses = new Map();
        }
      }
    } catch (e) {
      console.error('[License] Load error:', e.message);
    }
  }

  save() {
    try {
      const licenses = Object.fromEntries(this.licenses);
      const data = {
        licenses,
        signature: this._sign(licenses),
        updated: Date.now()
      };
      fs.writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[License] Save error:', e.message);
    }
  }

  _sign(data) {
    const str = JSON.stringify(data) + SECRET_KEY;
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  _verifyData(data) {
    if (!data.signature || !data.licenses) return false;
    return data.signature === this._sign(data.licenses);
  }

  // Проверка лицензии по HWID или userId
  check(identifier) {
    const id = identifier.toString();
    const license = this.licenses.get(id);
    
    if (!license) return { valid: false, reason: 'not_found' };
    if (license.blocked) return { valid: false, reason: 'blocked' };
    
    // Lifetime
    if (license.type === 'LIFETIME' || license.expiresAt === -1) {
      return { valid: true, type: 'LIFETIME', expiresAt: -1, daysLeft: -1, hwid: license.hwid };
    }
    
    // Проверка срока
    const now = Date.now();
    if (license.expiresAt < now) {
      return { valid: false, reason: 'expired', expiredAt: license.expiresAt };
    }
    
    const daysLeft = Math.ceil((license.expiresAt - now) / (24 * 60 * 60 * 1000));
    return { 
      valid: true, 
      type: license.type, 
      expiresAt: license.expiresAt,
      daysLeft,
      hwid: license.hwid
    };
  }

  // Проверка по HWID
  checkByHwid(hwid) {
    for (const [id, license] of this.licenses) {
      if (license.hwid === hwid) {
        return this.check(id);
      }
    }
    return { valid: false, reason: 'not_found' };
  }

  // Выдать лицензию
  grant(userId, type = 'MONTH', grantedBy = 'system', hwid = null) {
    const id = userId.toString();
    const licenseType = LICENSE_TYPES[type];
    if (!licenseType) return { success: false, error: 'Invalid type' };

    const existing = this.licenses.get(id);
    const now = Date.now();
    
    let expiresAt;
    if (type === 'LIFETIME') {
      expiresAt = -1;
    } else {
      const baseTime = (existing && existing.expiresAt > now) ? existing.expiresAt : now;
      expiresAt = baseTime + (licenseType.days * 24 * 60 * 60 * 1000);
    }

    const license = {
      userId: id,
      type,
      expiresAt,
      maxServers: licenseType.maxServers,
      hwid: hwid || existing?.hwid || null,
      grantedBy,
      grantedAt: now,
      key: this._generateKey(id, type),
      history: existing?.history || []
    };
    
    license.history.push({
      action: 'grant',
      type,
      by: grantedBy,
      at: now
    });

    this.licenses.set(id, license);
    
    // Также сохраняем по HWID если есть
    if (license.hwid) {
      this.licenses.set(license.hwid, license);
    }
    
    this.save();

    return { 
      success: true, 
      key: license.key,
      expiresAt,
      daysLeft: type === 'LIFETIME' ? -1 : Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))
    };
  }

  // Привязка HWID
  bindHwid(userId, hwid) {
    const id = userId.toString();
    const license = this.licenses.get(id);
    
    if (!license) return { success: false, error: 'License not found' };
    
    // Проверяем не привязан ли уже к другому
    if (license.hwid && license.hwid !== hwid) {
      return { success: false, error: 'Already bound to another device' };
    }
    
    license.hwid = hwid;
    license.boundAt = Date.now();
    
    this.licenses.set(id, license);
    this.licenses.set(hwid, license);
    this.save();
    
    return { success: true };
  }

  // Сброс HWID (только владелец)
  resetHwid(userId) {
    const id = userId.toString();
    const license = this.licenses.get(id);
    
    if (!license) return { success: false, error: 'Not found' };
    
    const oldHwid = license.hwid;
    license.hwid = null;
    
    if (oldHwid) {
      this.licenses.delete(oldHwid);
    }
    
    this.licenses.set(id, license);
    this.save();
    
    return { success: true };
  }

  // Генерация ключа
  _generateKey(userId, type) {
    const data = `${userId}|${type}|${Date.now()}|${crypto.randomBytes(8).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(data + SECRET_KEY).digest('hex');
    return `AURA-${type.substring(0, 1)}${hash.substring(0, 6).toUpperCase()}-${hash.substring(6, 12).toUpperCase()}-${hash.substring(12, 18).toUpperCase()}`;
  }

  // Активация по ключу
  activateKey(key, hwid) {
    for (const [id, license] of this.licenses) {
      if (license.key === key) {
        if (license.hwid && license.hwid !== hwid) {
          return { success: false, error: 'Key bound to another device' };
        }
        
        license.hwid = hwid;
        license.activatedAt = Date.now();
        
        this.licenses.set(id, license);
        this.licenses.set(hwid, license);
        this.save();
        
        const status = this.check(id);
        return { success: true, userId: id, ...status };
      }
    }
    
    return { success: false, error: 'Key not found' };
  }

  // Отозвать лицензию
  revoke(userId, revokedBy = 'system') {
    const id = userId.toString();
    const license = this.licenses.get(id);
    
    if (!license) return { success: false, error: 'Not found' };
    
    license.blocked = true;
    license.blockedBy = revokedBy;
    license.blockedAt = Date.now();
    license.history.push({
      action: 'revoke',
      by: revokedBy,
      at: Date.now()
    });
    
    this.licenses.set(id, license);
    this.save();
    
    return { success: true };
  }

  // Разблокировать лицензию
  unblock(userId) {
    const id = userId.toString();
    const license = this.licenses.get(id);
    
    if (!license) return { success: false, error: 'Not found' };
    
    license.blocked = false;
    delete license.blockedBy;
    delete license.blockedAt;
    license.history.push({
      action: 'unblock',
      at: Date.now()
    });
    
    this.licenses.set(id, license);
    this.save();
    
    return { success: true };
  }

  // Получить все лицензии
  getAll() {
    const seen = new Set();
    const result = [];
    
    for (const [, lic] of this.licenses) {
      if (!seen.has(lic.userId)) {
        seen.add(lic.userId);
        result.push({
          oderId: lic.userId,
          ...lic,
          status: this.check(lic.userId)
        });
      }
    }
    
    return result;
  }

  // Статистика
  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      active: all.filter(l => l.status.valid).length,
      expired: all.filter(l => l.status.reason === 'expired').length,
      blocked: all.filter(l => l.status.reason === 'blocked').length,
      lifetime: all.filter(l => l.type === 'LIFETIME').length
    };
  }

  // Проверка владельца
  isOwner(userId) {
    const ownerId = process.env.OWNER_ID;
    return ownerId && userId.toString() === ownerId;
  }
}

export default new LicenseManager();
