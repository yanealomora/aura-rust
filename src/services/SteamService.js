// Steam API сервис для анализа профилей
import https from 'https';

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

class SteamService {
  
  async resolveVanityUrl(vanityUrl) {
    if (!STEAM_API_KEY) return null;
    
    try {
      const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanityUrl)}`;
      const data = await this._fetch(url);
      
      if (data?.response?.success === 1) {
        return data.response.steamid;
      }
      return null;
    } catch {
      return null;
    }
  }
  
  async getPlayerSummary(steamId) {
    if (!STEAM_API_KEY) {
      return { error: 'STEAM_API_KEY не настроен' };
    }

    try {
      const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;
      const data = await this._fetch(url);
      
      if (!data?.response?.players?.length) {
        return { error: 'Игрок не найден' };
      }

      const player = data.response.players[0];
      return {
        steamId: player.steamid,
        name: player.personaname,
        profileUrl: player.profileurl,
        avatar: player.avatarfull,
        status: this._getStatus(player.personastate),
        visibility: player.communityvisibilitystate === 3 ? 'Публичный' : 'Приватный',
        created: player.timecreated ? new Date(player.timecreated * 1000) : null,
        lastLogoff: player.lastlogoff ? new Date(player.lastlogoff * 1000) : null,
        country: player.loccountrycode || null,
        realName: player.realname || null,
        gameId: player.gameid || null,
        gameInfo: player.gameextrainfo || null
      };
    } catch (e) {
      return { error: e.message };
    }
  }

  async getPlayerBans(steamId) {
    if (!STEAM_API_KEY) return null;

    try {
      const url = `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${STEAM_API_KEY}&steamids=${steamId}`;
      const data = await this._fetch(url);
      
      if (!data?.players?.length) return null;

      const bans = data.players[0];
      return {
        vacBanned: bans.VACBanned,
        vacBans: bans.NumberOfVACBans,
        daysSinceLastBan: bans.DaysSinceLastBan,
        gameBans: bans.NumberOfGameBans,
        communityBanned: bans.CommunityBanned,
        economyBan: bans.EconomyBan !== 'none'
      };
    } catch {
      return null;
    }
  }

  async getRustHours(steamId) {
    if (!STEAM_API_KEY) return null;

    try {
      const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`;
      const data = await this._fetch(url);
      
      if (!data?.response?.games) return null;

      const rust = data.response.games.find(g => g.appid === 252490);
      if (!rust) return { hours: 0, hasRust: false };

      return {
        hours: Math.round(rust.playtime_forever / 60),
        hours2weeks: Math.round((rust.playtime_2weeks || 0) / 60),
        hasRust: true
      };
    } catch {
      return null;
    }
  }

  async getFullProfile(steamId) {
    const [summary, bans, rustHours] = await Promise.all([
      this.getPlayerSummary(steamId),
      this.getPlayerBans(steamId),
      this.getRustHours(steamId)
    ]);

    if (summary.error) return summary;

    // Анализ профиля
    const analysis = this._analyzeProfile(summary, bans, rustHours);

    return {
      ...summary,
      bans,
      rustHours,
      analysis
    };
  }

  _analyzeProfile(summary, bans, rustHours) {
    const flags = [];
    let trustScore = 100;

    // Проверка возраста аккаунта
    if (summary.created) {
      const ageYears = (Date.now() - summary.created.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (ageYears < 0.5) {
        flags.push('Новый аккаунт (< 6 мес)');
        trustScore -= 30;
      } else if (ageYears < 1) {
        flags.push('Аккаунт < 1 года');
        trustScore -= 15;
      }
    }

    // Проверка банов (только для скора, не показываем в флагах)
    if (bans) {
      if (bans.vacBanned) {
        trustScore -= 40;
      }
      if (bans.gameBans > 0) {
        trustScore -= 30;
      }
      if (bans.communityBanned) {
        trustScore -= 20;
      }
    }

    // Проверка часов в Rust
    if (rustHours) {
      if (!rustHours.hasRust) {
        flags.push('Rust не куплен/скрыт');
        trustScore -= 20;
      } else if (rustHours.hours < 100) {
        flags.push(`Мало часов (${rustHours.hours}h)`);
        trustScore -= 10;
      } else if (rustHours.hours > 5000) {
        flags.push(`Ветеран (${rustHours.hours}h)`);
        trustScore += 10;
      }
    }

    // Приватность
    if (summary.visibility !== 'Публичный') {
      flags.push('Приватный профиль');
      trustScore -= 15;
    }

    trustScore = Math.max(0, Math.min(100, trustScore));

    return {
      trustScore,
      trustLevel: trustScore >= 70 ? 'Надёжный' : trustScore >= 40 ? 'Подозрительный' : 'Опасный',
      flags
    };
  }

  _getStatus(state) {
    const statuses = {
      0: 'Оффлайн',
      1: 'Онлайн',
      2: 'Занят',
      3: 'Отошёл',
      4: 'Спит',
      5: 'В поиске',
      6: 'В игре'
    };
    return statuses[state] || 'Неизвестно';
  }

  _fetch(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
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

  getProfileUrl(steamId) {
    return `https://steamcommunity.com/profiles/${steamId}`;
  }

  async getFriends(steamId) {
    if (!STEAM_API_KEY) return [];

    try {
      const url = `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&relationship=friend`;
      const data = await this._fetch(url);
      
      if (!data?.friendslist?.friends) return [];

      // Получаем инфу о друзьях (первые 20)
      const friendIds = data.friendslist.friends.slice(0, 20).map(f => f.steamid);
      if (!friendIds.length) return [];

      const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${friendIds.join(',')}`;
      const summaryData = await this._fetch(summaryUrl);
      
      if (!summaryData?.response?.players) return [];

      return summaryData.response.players.map(p => ({
        steamId: p.steamid,
        name: p.personaname,
        avatar: p.avatarmedium,
        status: this._getStatus(p.personastate),
        isOnline: p.personastate > 0,
        gameInfo: p.gameextrainfo || null
      }));
    } catch {
      return [];
    }
  }
}

export default new SteamService();
