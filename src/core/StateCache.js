class StateCache {
  constructor() {
    this.players = new Map();
    this.markers = new Map();
    this.events = new Map();
    this.deaths = [];
    this.connections = [];
    this.sales = [];
    this.maxHistory = 100;
  }

  setPlayer(steamId, data) { this.players.set(steamId, { ...data, updatedAt: Date.now() }); }
  getPlayer(steamId) { return this.players.get(steamId); }
  getAllPlayers() { return this.players; }

  setMarker(id, data) { this.markers.set(id, { ...data, updatedAt: Date.now() }); }
  getMarker(id) { return this.markers.get(id); }
  removeMarker(id) { this.markers.delete(id); }
  getAllMarkers() { return this.markers; }

  setEvent(key, data) { this.events.set(key, { ...data, updatedAt: Date.now() }); }
  getEvent(key) { return this.events.get(key); }

  addDeath(data) {
    this.deaths.unshift({ ...data, timestamp: Date.now() });
    if (this.deaths.length > this.maxHistory) this.deaths.pop();
  }
  getDeathHistory(limit = 10) { return this.deaths.slice(0, limit); }

  addConnection(data) {
    this.connections.unshift({ ...data, timestamp: Date.now() });
    if (this.connections.length > this.maxHistory) this.connections.pop();
  }
  getConnectionHistory(limit = 10) { return this.connections.slice(0, limit); }

  addSale(data) {
    this.sales.unshift({ ...data, timestamp: Date.now() });
    if (this.sales.length > this.maxHistory) this.sales.pop();
  }

  getAfkPlayers() {
    return Array.from(this.players.values()).filter(p => p.isAfk && p.isOnline);
  }

  getStats() {
    const players = Array.from(this.players.values());
    return {
      players: {
        total: players.length,
        online: players.filter(p => p.isOnline).length,
        dead: players.filter(p => !p.isAlive && p.isOnline).length,
      },
      markers: this.markers.size,
      history: { deaths: this.deaths.length, connections: this.connections.length }
    };
  }

  clear() {
    this.players.clear();
    this.markers.clear();
    this.events.clear();
  }
}

export default new StateCache();
