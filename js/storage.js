/**
 * Storage Manager — Persists user preferences, favorites, and history in localStorage
 */

const STORAGE_KEYS = {
  PREFS: 'zameen_user_prefs',
  HISTORY: 'zameen_history',
  FAVORITES: 'zameen_favorites'
};

const DEFAULT_PREFS = {
  regionId: 'punjab',
  unitId: 'kanal',
  variant: 'standard',
  theme: 'light',
  lang: 'en',
  hideAdBanner: false
};

export class StorageManager {
  static getPrefs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFS);
      if (!stored) return { ...DEFAULT_PREFS };
      const parsed = JSON.parse(stored);
      if (!parsed.themeExplicitlySet) {
        parsed.theme = 'light';
      }
      return { ...DEFAULT_PREFS, ...parsed };
    } catch (e) {
      console.warn('LocalStorage error reading prefs', e);
      return { ...DEFAULT_PREFS };
    }
  }

  static savePrefs(updates) {
    try {
      const current = this.getPrefs();
      const updated = { ...current, ...updates };
      localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('LocalStorage error saving prefs', e);
    }
  }

  static getHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  static addHistory(item) {
    try {
      let history = this.getHistory();
      // Avoid duplicate consecutive entries with same value, unit, region
      if (history.length > 0) {
        const last = history[0];
        if (
          last.value === item.value &&
          last.unitId === item.unitId &&
          last.regionId === item.regionId &&
          last.variant === item.variant
        ) {
          return history;
        }
      }

      const newItem = {
        ...item,
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now()
      };

      // Keep maximum 20 items per spec Section 3.5
      history = [newItem, ...history].slice(0, 20);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      return history;
    } catch (e) {
      console.warn('LocalStorage error updating history', e);
      return [];
    }
  }

  static clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      return [];
    } catch (e) {
      return [];
    }
  }

  static getFavorites() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  static addFavorite(fav) {
    try {
      const favorites = this.getFavorites();
      const item = {
        ...fav,
        id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now()
      };
      favorites.unshift(item);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
      return favorites;
    } catch (e) {
      console.warn('LocalStorage error saving favorite', e);
      return [];
    }
  }

  static removeFavorite(id) {
    try {
      let favorites = this.getFavorites();
      favorites = favorites.filter(f => f.id !== id);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
      return favorites;
    } catch (e) {
      return [];
    }
  }

  static isFavorite(value, unitId, regionId) {
    const favorites = this.getFavorites();
    return favorites.some(f => f.value === value && f.unitId === unitId && f.regionId === regionId);
  }
}
