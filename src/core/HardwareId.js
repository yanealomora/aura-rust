/**
 * AURA RUST - Hardware ID
 * Генерация уникального ID привязанного к железу
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import os from 'os';
import fs from 'fs';

class HardwareId {
  constructor() {
    this._hwid = null;
  }

  // Получить HWID
  get() {
    if (this._hwid) return this._hwid;
    
    try {
      const data = [];
      
      // CPU ID
      if (process.platform === 'win32') {
        try {
          const cpu = execSync('wmic cpu get processorid', { encoding: 'utf8' });
          const cpuId = cpu.split('\n')[1]?.trim();
          if (cpuId) data.push(cpuId);
        } catch {}
        
        // Motherboard
        try {
          const mb = execSync('wmic baseboard get serialnumber', { encoding: 'utf8' });
          const mbId = mb.split('\n')[1]?.trim();
          if (mbId && mbId !== 'To be filled by O.E.M.') data.push(mbId);
        } catch {}
        
        // BIOS
        try {
          const bios = execSync('wmic bios get serialnumber', { encoding: 'utf8' });
          const biosId = bios.split('\n')[1]?.trim();
          if (biosId && biosId !== 'To be filled by O.E.M.') data.push(biosId);
        } catch {}
      } else {
        // Linux/Mac
        try {
          const machineId = execSync('cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null', { encoding: 'utf8' });
          if (machineId.trim()) data.push(machineId.trim());
        } catch {}
      }
      
      // Fallback - MAC + hostname
      if (data.length === 0) {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]) {
            if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
              data.push(iface.mac);
              break;
            }
          }
          if (data.length > 0) break;
        }
        data.push(os.hostname());
      }
      
      // Генерируем хеш
      const combined = data.join('|');
      this._hwid = crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32).toUpperCase();
      
      return this._hwid;
    } catch (e) {
      // Fallback на случайный ID (сохраняется в файл)
      return this._getFallbackId();
    }
  }

  _getFallbackId() {
    const idFile = '.hwid';
    
    try {
      if (fs.existsSync(idFile)) {
        return fs.readFileSync(idFile, 'utf8').trim();
      }
    } catch {}
    
    const id = crypto.randomBytes(16).toString('hex').toUpperCase();
    try {
      fs.writeFileSync(idFile, id);
    } catch {}
    
    return id;
  }

  // Короткий ID для отображения
  getShort() {
    const full = this.get();
    return `${full.substring(0, 4)}-${full.substring(4, 8)}-${full.substring(8, 12)}`;
  }
}

export default new HardwareId();
