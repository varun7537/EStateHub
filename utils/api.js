// frontend/utils/api.js
/**
 * Returns the correct base URL depending on environment.
 *
 * For development on a physical device, replace the IP with your
 * computer's local network IP (e.g. 192.168.1.100).
 *
 * Known IPs:
 *   home        - 192.168.0.104
 *   hotspot     - 192.168.137.194
 *   network     - 10.56.70.107 / 10.56.70.244
 */
export const getApiUrl = () => {
  // return process.env.EXPO_PUBLIC_API_URL || 'http://10.56.70.244:5000/api';
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiUrl();

// Default fetch timeout in ms
const TIMEOUT_MS = 15_000;

/**
 * Resolves a profile/property image URL from the database value.
 * - If already a full URL (http://...), returns as-is (backwards compat).
 * - If a relative path (/images_rs/...), prepends the server base URL.
 * - Returns null if no value.
 */
export const getImageUrl = (dbPath) => {
  if (!dbPath) return null;
  if (dbPath.startsWith('http')) return dbPath;
  // Relative path like /images_rs/profiles/22_user_gmail.com/profile.jpg
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${dbPath}`;
};

/**
 * Thin wrapper around fetch that:
 *   - attaches the Bearer token automatically
 *   - enforces a timeout
 *   - normalises errors into { success: false, message }
 */