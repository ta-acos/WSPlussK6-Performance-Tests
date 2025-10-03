/**
 * WebSak Authentication Module
 *
 * This module provides authentication functions for WebSak Plus API.
 * Handles OAuth2 client credentials flow with comprehensive error handling.
 *
 * Usage:
 * import { authenticate } from '../utils/modules/auth-module.js';
 * const token = authenticate(config, user, vuId);
 */

import { check, group } from 'k6';
import encoding from 'k6/encoding';
import http from 'k6/http';
import { recordErrorSample } from '../error-sampler.js';

/**
 * Authenticate user using OAuth2 client credentials flow
 * @param {Object} config - Test configuration object
 * @param {Object} user - User object with ClientID and ClientSecret
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {string|null} Access token or null if authentication failed
 */
export function authenticate(config, user, vuId) {
  let accessToken = null;

  group('Authentication', () => {
    console.log(`🔐 ${vuId}: Authenticating user ${user.UserName}`);

    const useBasic = !!config.apiConfig.oauth.useBasicAuth;
    // Base payload always includes grant_type; client credentials either in body (default) or header (Basic)
    const authPayload = {
      grant_type: config.apiConfig.oauth.grantType
    };

    if (useBasic) {
      // Basic auth header will carry credentials; some identity servers prefer NOT to repeat them in body
      // (RFC allows both but servers may reject duplicates).
    } else {
      authPayload.client_id = user.ClientID;
      authPayload.client_secret = user.ClientSecret;
    }

    // Only include scope if non-empty to avoid sending blank value that some IdPs reject
    if (config.apiConfig.oauth.scope) {
      authPayload.scope = config.apiConfig.oauth.scope;
    }

    const endpoint = `${config.baseUrl}${config.apiConfig.oauth.tokenUrl}`;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Referer: config.apiConfig.referer
    };

    if (useBasic) {
      const raw = `${user.ClientID}:${user.ClientSecret}`;
      const encoded = encoding.b64encode(raw);
      headers['Authorization'] = `Basic ${encoded}`;
      console.log(`🔐 ${vuId}: Using Basic Auth header for client ${user.ClientID}`);
    }

    const authResponse = http.post(endpoint, authPayload, {
      headers,
      timeout: '30s',
      tags: { name: '🔐 OAuth Token Request', endpoint: 'auth:token', group: 'auth', method: 'POST', url: endpoint }
    });
    recordErrorSample(authResponse, { endpoint: 'auth:token', name: 'OAuth Token Request' });

    // Validate authentication response
    const authSuccess = check(authResponse, {
      'auth: status is 200': (r) => {
        if (r.status !== 200) {
          console.error(`🔥 ${vuId}: Auth failed - Status: ${r.status}`);
          console.error(`🔍 Request URL: ${config.baseUrl}${config.apiConfig.oauth.tokenUrl}`);
          console.error(`📥 Response Body: ${r.body}`);
          if (/invalid_client/i.test(r.body)) {
            console.error(
              '💡 Hint: invalid_client usually means client_id / client_secret are wrong or not registered.'
            );
            console.error('   - Verify users-config.json contains REAL credentials (not placeholders).');
            console.error('   - Ensure the Identity Server allows client_credentials for this client.');
            console.error('   - Remove explicit :443 in host config if server expects host without port.');
          }
        }
        return r.status === 200;
      },
      'auth: response has access_token': (r) => {
        try {
          const body = JSON.parse(r.body);
          const hasToken = body.access_token && body.access_token.length > 0;
          if (!hasToken) {
            console.error(`🔥 ${vuId}: Missing access_token in response`);
            console.error(`📥 Response Body: ${r.body}`);
          }
          return hasToken;
        } catch (e) {
          console.error(`🔥 ${vuId}: Auth response parse error:`, e.message);
          console.error(`📥 Response Body: ${r.body}`);
          return false;
        }
      },
      'auth: response time < 3s': (r) => r.timings.duration < 3000
    });

    // Extract token if authentication was successful
    if (authResponse.status === 200) {
      try {
        const authBody = JSON.parse(authResponse.body);
        accessToken = authBody.access_token;

        if (accessToken) {
          console.log(`✅ ${vuId}: Authentication successful for ${user.UserName}`);
        } else {
          console.error(`🔥 ${vuId}: Missing access_token in successful response`);
        }
      } catch (e) {
        console.error(`🔥 ${vuId}: Failed to parse auth response:`, e.message);
      }
    } else {
      console.error(`🔥 ${vuId}: Authentication failed - Status: ${authResponse.status}`);
    }
  });

  return accessToken;
}

/**
 * Create authenticated headers for API requests
 * @param {string} accessToken - Bearer token
 * @returns {Object} Headers object with authentication and content type
 */
export function createAuthHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}
