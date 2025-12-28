import https from 'https';

const BATTLEMETRICS_TOKEN = process.env.BATTLEMETRICS_TOKEN || '';
const BASE_URL = 'https://api.battlemetrics.com';

/**
 * Сервис для работы с BattleMetrics API
 * Поиск игроков, серверов, статистика
 */
class BattleMetricsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 минут
  }

  // ═══════════════════ ИГРОКИ ═══════════════════

  /**
   * Поиск игрока по имени
   */
  async searchPlayer(name, limit = 10) {
    try {
      const url = `${BASE_URL}/players?filter[search]=${encodeURIComponent(name)}&page[size]=${limit}`;
      const data = await this._fetch(url);
      
      if (!data?.data?.length) {
        return [];
      }
      
      return data.data.map(p => ({
        id: p.id,
        name: p.attributes.name,
        lastSeen: p.attributes.lastSeen,
        positiveMatch: p.attributes.positiveMatch,
        private: p.attributes.private,
      }));
    } catch (e) {
      console.error('[BattleMetrics] searchPlayer error:', e.message);
      return { error: e.message };
    }
  }

  /**
   * Получить информацию об игроке по ID
   */
  async getPlayer(playerId) {
    try {
      const url = `${BASE_URL}/players/${playerId}?include=server`;
      const data = await this._fetch(url);
      
      if (!data?.data) {
        return { error: 'Игрок не найден' };
      }
      
      const p = data.data;
      const server = data.included?.find(i => i.type === 'server');
      
      // Проверяем онлайн — если lastSeen больше 5 минут назад, значит оффлайн
      const lastSeen = p.attributes.lastSeen ? new Date(p.attributes.lastSeen) : null;
      const isOnline = lastSeen && (Date.now() - lastSeen.getTime() < 5 * 60 * 1000);
      
      return {
        id: p.id,
        name: p.attributes.name,
        lastSeen: p.attributes.lastSeen,
        positiveMatch: p.attributes.positiveMatch,
        private: p.attributes.private,
        isOnline,
        currentServer: (isOnline && server) ? {
          id: server.id,
          name: server.attributes.name,
          ip: server.attributes.ip,
          port: server.attributes.port,
          players: server.attributes.players,
          maxPlayers: server.attributes.maxPlayers,
          rank: server.attributes.rank,
        } : null,
      };
    } catch (e) {
      console.error('[BattleMetrics] getPlayer error:', e.message);
      return { error: e.message };
    }
  }

  /**
   * Получить историю серверов игрока
   */
  async getPlayerServers(playerId, limit = 10) {
    try {
      const url = `${BASE_URL}/players/${playerId}/relationships/servers?page[size]=${limit}`;
      const data = await this._fetch(url);
      
      if (!data?.data?.length) {
        return [];
      }
      
      return data.data.map(s => ({
        id: s.id,
        firstSeen: s.meta?.firstSeen,
        lastSeen: s.meta?.lastSeen,
        timePlayed: s.meta?.timePlayed,
        online: s.meta?.online,
      }));
    } catch (e) {
      console.error('[BattleMetrics] getPlayerServers error:', e.message);
      return [];
    }
  }

  /**
   * Получить сессии игрока
   */
  async getPlayerSessions(playerId, limit = 10) {
    try {
      const url = `${BASE_URL}/players/${playerId}/relationships/sessions?page[size]=${limit}`;
      const data = await this._fetch(url);
      
      if (!data?.data?.length) {
        return [];
      }
      
      return data.data.map(s => ({
        id: s.id,
        start: s.attributes?.start,
        stop: s.attributes?.stop,
        firstTime: s.attributes?.firstTime,
        serverId: s.relationships?.server?.data?.id,
      }));
    } catch (e) {
      console.error('[BattleMetrics] getPlayerSessions error:', e.message);
      return [];
    }
  }

  // ═══════════════════ СЕРВЕРЫ ═══════════════════

  /**
   * Поиск сервера
   */
  async searchServer(query, limit = 10) {
    try {
      const url = `${BASE_URL}/servers?filter[search]=${encodeURIComponent(query)}&filter[game]=rust&page[size]=${limit}`;
      const data = await this._fetch(url);
      
      if (!data?.data?.length) {
        return [];
      }
      
      return data.data.map(s => ({
        id: s.id,
        name: s.attributes.name,
        ip: s.attributes.ip,
        port: s.attributes.port,
        players: s.attributes.players,
        maxPlayers: s.attributes.maxPlayers,
        rank: s.attributes.rank,
        status: s.attributes.status,
        country: s.attributes.country,
        details: s.attributes.details,
      }));
    } catch (e) {
      console.error('[BattleMetrics] searchServer error:', e.message);
      return { error: e.message };
    }
  }

  /**
   * Получить информацию о сервере
   */
  async getServer(serverId) {
    try {
      const url = `${BASE_URL}/servers/${serverId}`;
      const data = await this._fetch(url);
      
      if (!data?.data) {
        return { error: 'Сервер не найден' };
      }
      
      const s = data.data;
      return {
        id: s.id,
        name: s.attributes.name,
        ip: s.attributes.ip,
        port: s.attributes.port,
        players: s.attributes.players,
        maxPlayers: s.attributes.maxPlayers,
        rank: s.attributes.rank,
        status: s.attributes.status,
        country: s.attributes.country,
        details: s.attributes.details,
        createdAt: s.attributes.createdAt,
        updatedAt: s.attributes.updatedAt,
      };
    } catch (e) {
      console.error('[BattleMetrics] getServer error:', e.message);
      return { error: e.message };
    }
  }

  /**
   * Получить онлайн игроков сервера
   */
  async getServerPlayers(serverId, limit = 100) {
    try {
      const url = `${BASE_URL}/servers/${serverId}?include=player&page[size]=${limit}`;
      const data = await this._fetch(url);
      
      if (!data?.included) {
        return [];
      }
      
      return data.included
        .filter(i => i.type === 'player')
        .map(p => ({
          id: p.id,
          name: p.attributes.name,
        }));
    } catch (e) {
      console.error('[BattleMetrics] getServerPlayers error:', e.message);
      return [];
    }
  }

  /**
   * Получить историю онлайна сервера
   */
  async getServerHistory(serverId, start, end) {
    try {
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      const url = `${BASE_URL}/servers/${serverId}/player-count-history?start=${startStr}&stop=${endStr}`;
      const data = await this._fetch(url);
      
      return data?.data || [];
    } catch (e) {
      console.error('[BattleMetrics] getServerHistory error:', e.message);
      return [];
    }
  }

  // ═══════════════════ УТИЛИТЫ ═══════════════════

  /**
   * HTTP запрос с кешированием и таймаутом
   */
  _fetch(url) {
    // Проверяем кеш
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.time < this.cacheTimeout) {
      return Promise.resolve(cached.data);
    }

    return new Promise((resolve, reject) => {
      const options = {
        timeout: 10000, // 10 секунд таймаут
        headers: BATTLEMETRICS_TOKEN ? { 'Authorization': `Bearer ${BATTLEMETRICS_TOKEN}` } : {}
      };
      
      const req = https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            
            // Сохраняем в кеш
            this.cache.set(url, { data: parsed, time: Date.now() });
            
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Очистить кеш
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Форматировать время игры
   */
  formatPlaytime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  }

  /**
   * Получить URL профиля игрока
   */
  getPlayerUrl(playerId) {
    return `https://www.battlemetrics.com/players/${playerId}`;
  }

  /**
   * Получить URL сервера
   */
  getServerUrl(serverId) {
    return `https://www.battlemetrics.com/servers/rust/${serverId}`;
  }
}

export default new BattleMetricsService();
