import http from 'k6/http';
import { check } from 'k6';

/**
 * Authenticate user and get access token
 * @param {Object} user - User object with ClientID and ClientSecret
 * @param {Object} config - Configuration object with API details
 * @returns {string} Access token
 */
export function login(user, config) {
  const loginUrl = `${config.api.protocol}://${config.api.host}${config.auth.tokenEndpoint}`;

  const payload = {
    grant_type: config.auth.grantType,
    client_id: user.ClientID,
    client_secret: user.ClientSecret,
    scope: config.auth.scope || 'websak'
  };

  const params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: config.api.referer
    }
  };

  const response = http.post(loginUrl, payload, params);

  const loginSuccess = check(response, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('access_token') !== undefined
  });

  if (!loginSuccess) {
    throw new Error(`Login failed for user ${user.ClientID}: ${response.status} ${response.body}`);
  }

  return response.json('access_token');
}

/**
 * Get authorization headers with token
 * @param {string} token - Access token
 * @param {Object} config - Configuration object
 * @returns {Object} Headers object
 */
export function getAuthHeaders(token, config) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Referer: config.api.referer,
    'User-Agent': 'k6-load-test'
  };
}
