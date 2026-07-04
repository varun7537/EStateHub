import { API_BASE_URL } from './api';
import { authTokenManager } from './authTokenManager';

/**
 * apiClient
 * ----------
 * A thin wrapper around fetch that:
 *  - Automatically attaches the Authorization header
 *  - Handles 401 Unauthorized responses (token expired/invalid)
 *  - Normalizes errors into a consistent shape
 *  - Avoids making requests when no token exists (for protected routes)
 */

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Wraps a fetch promise with a timeout using AbortController.
 */
function withTimeout(fetchFn, ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  return fetchFn(controller.signal)
    .then((res) => {
      clearTimeout(timeoutId);
      return res;
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    });
}

/**
 * Returns a human-readable message for network-level fetch errors.
 * ERR_INTERNET_DISCONNECTED / ERR_CONNECTION_REFUSED both surface as
 * TypeError with message "Failed to fetch" — we disambiguate using
 * navigator.onLine so the developer/user gets an actionable message.
 */
function getNetworkErrorMessage(err, url) {
  const isAbort = err.name === 'AbortError';
  if (isAbort) {
    return `Request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s. The server at ${url} did not respond in time.`;
  }

  // navigator.onLine is not 100% reliable but it is a useful first signal
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Your device appears to be offline. Please check your internet connection.';
  }

  // If online but still a fetch failure, the server is most likely not running
  return (
    `Cannot reach the API server at "${url}". ` +
    `Make sure your backend server is running (e.g. "node index.js" or "npm run server") ` +
    `and is listening on the correct port. Original error: ${err.message}`
  );
}

/**
 * Core request function.
 *
 * @param {string} endpoint - Path relative to API_BASE_URL, e.g. '/chats'
 * @param {object} options  - Standard fetch options (method, body, headers, etc.)
 * @param {object} config   - Extra config: { requiresAuth, onUnauthorized, timeoutMs }
 * @returns {Promise<any>}  - Parsed JSON response
 *
 * @throws {{ status: number, message: string, data?: any }} on HTTP errors
 * @throws {{ status: 0,      message: string }}             on network/timeout errors
 */
export async function apiRequest(
  endpoint,
  options = {},
  config = {}
) {
  const {
    requiresAuth = true,
    onUnauthorized = null,   // Callback for 401: pass resetApp or similar
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = config;

  // --- Build Headers ---
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (requiresAuth) {
    const token = authTokenManager.getToken();
    if (!token) {
      console.warn(`[apiClient] No auth token available for: ${endpoint}`);
      throw { status: 401, message: 'No authentication token found. Please log in.' };
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  // --- Build URL ---
  const url = `${API_BASE_URL}${endpoint}`;

  // --- Execute ---
  try {
    const response = await withTimeout(
      (signal) => fetch(url, { ...options, headers, signal }),
      timeoutMs
    );

    // Handle 401 - token expired or invalid
    if (response.status === 401) {
      console.warn('[apiClient] 401 Unauthorized — clearing token');
      await authTokenManager.clearToken();
      if (typeof onUnauthorized === 'function') {
        onUnauthorized(); // e.g., call resetApp() to log user out
      }
      throw { status: 401, message: 'Session expired. Please log in again.' };
    }

    // Parse response body
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.message || `Request failed with status ${response.status}`,
        data,
      };
    }

    return data;

  } catch (err) {
    // Re-throw structured errors (HTTP errors thrown above)
    if (err.status !== undefined) throw err;

    // Network / timeout / server-not-running errors
    const message = getNetworkErrorMessage(err, url);
    console.error(`[apiClient] Network-level error for ${url}:`, message);
    throw { status: 0, message };
  }
}

// --- Convenience Methods ---

export const apiGet = (endpoint, config) =>
  apiRequest(endpoint, { method: 'GET' }, config);

export const apiPost = (endpoint, body, config) =>
  apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }, config);

export const apiPut = (endpoint, body, config) =>
  apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }, config);

export const apiDelete = (endpoint, config) =>
  apiRequest(endpoint, { method: 'DELETE' }, config);