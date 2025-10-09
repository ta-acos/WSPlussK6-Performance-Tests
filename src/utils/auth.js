/**
 * ===================================================================
 * AUTHENTICATION UTILITY MODULE
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS MODULE DOES:
 * This module provides authentication functions for API access using OAuth2
 * client credentials flow. It handles login, token management, and header
 * creation for authenticated API requests.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 🔐 USER AUTHENTICATION:
 *    - OAuth2 client credentials flow implementation
 *    - Automatic token retrieval and validation
 *    - Error handling for authentication failures
 *    - Support for different authentication endpoints
 *
 * 2. 📝 HEADER MANAGEMENT:
 *    - Creates properly formatted authorization headers
 *    - Includes necessary content-type and referer headers
 *    - Consistent header structure across all requests
 *    - Bearer token format for API access
 *
 * 3. ✅ AUTHENTICATION VALIDATION:
 *    - Verifies successful login responses
 *    - Checks for presence of access tokens
 *    - Provides detailed error messages for troubleshooting
 *    - Integration with K6's check system
 *
 * WHY THIS MODULE EXISTS:
 * Authentication is required for all API operations in the system.
 * This module provides a standardized way to handle authentication
 * across all tests, ensuring consistent behavior and error handling.
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { login, getAuthHeaders } from '../utils/auth.js';
 *
 * const token = login(user, config);
 * const headers = getAuthHeaders(token, config);
 * ```
 *
 * NOTE: This is a simpler version of authentication compared to the main
 * auth-module.js. Use this for basic scenarios or as a fallback.
 */

import http from 'k6/http';
import { check } from 'k6';

/**
 * Authenticate user and get access token using OAuth2 client credentials flow
 * @param {Object} user - User object with ClientID and ClientSecret properties
 * @param {Object} config - Configuration object with API and auth details
 * @param {string} config.api.protocol - API protocol (http/https)
 * @param {string} config.api.host - API host name
 * @param {string} config.auth.tokenEndpoint - Token endpoint path
 * @param {string} config.auth.grantType - OAuth2 grant type
 * @param {string} config.auth.scope - OAuth2 scope (optional)
 * @returns {string} Access token for API authentication
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
