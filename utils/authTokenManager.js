import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AuthTokenManager
 * -----------------
 * Caches the JWT token in memory after the first AsyncStorage read.
 * All modules share this single instance, avoiding repeated async reads.
 */
class AuthTokenManager {
  constructor() {
    this._token = null;
    this._initialized = false;
  }

  /** Call once on app mount to warm the cache */
  async initialize() {
    if (this._initialized) return;
    try {
      this._token = await AsyncStorage.getItem('authToken');
    } catch (e) {
      console.error('[AuthTokenManager] Init failed:', e);
    } finally {
      this._initialized = true;
    }
  }

  /** Returns the cached token synchronously after initialization */
  getToken() {
    return this._token;
  }

  /** Persists token to storage AND updates the in-memory cache */
  async setToken(token) {
    try {
      if (token) {
        await AsyncStorage.setItem('authToken', token);
      } else {
        await AsyncStorage.removeItem('authToken');
      }
      this._token = token;
    } catch (e) {
      console.error('[AuthTokenManager] setToken failed:', e);
    }
  }

  /** Clears token from both memory and storage */
  async clearToken() {
    await this.setToken(null);
  }

  /** Returns true if a token exists in memory */
  isAuthenticated() {
    return !!this._token;
  }
}

export const authTokenManager = new AuthTokenManager();