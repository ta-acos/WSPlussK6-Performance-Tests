import { open } from 'k6';

/**
 * Load configuration based on environment
 * @param {string} environment - Environment name (dev, test, prod)
 * @returns {Object} Configuration object
 */
export function loadConfig(environment = 'dev') {
  // Config JSON files reside at src/config relative to project root.
  // When executed from test scripts, K6 resolves open paths from the CWD (script root).
  // Use a relative path that works when imported from tests (./src/config/...)
  const configFile = `./src/config/${environment}.json`;

  try {
    const configContent = open(configFile);
    return JSON.parse(configContent);
  } catch (error) {
    console.error(`Failed to load config file ${configFile}: ${error.message}`);
    // Return default config as fallback
    return {
      environment: 'default',
      api: {
        protocol: 'https',
        host: 'autotest01.acoscloud.no',
        port: 443,
        referer: 'https://test01.acoscloud.no/'
      },
      auth: {
        tokenEndpoint: '/identityserver/connect/token',
        grantType: 'client_credentials',
        scope: 'websak'
      },
      thresholds: {
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.05']
      },
      load: {
        vus: 5,
        duration: '1m',
        rampUp: '30s',
        rampDown: '30s'
      }
    };
  }
}

/**
 * Get environment from command line or default to 'dev'
 * Usage: k6 run -e ENVIRONMENT=test script.js
 * @returns {string} Environment name
 */
export function getEnvironment() {
  return __ENV.ENVIRONMENT || 'dev';
}
