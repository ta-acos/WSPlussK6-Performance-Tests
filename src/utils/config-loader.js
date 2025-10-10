/**
 * ===================================================================
 * CONFIGURATION LOADER UTILITY MODULE
 * ===================================================================
 * 
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS MODULE DOES:
 * This module handles loading configuration settings from JSON files based on
 * the target environment (dev, test, prod). It provides a fallback system
 * and standardizes how configuration is loaded across all tests.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 📁 ENVIRONMENT-BASED CONFIG LOADING:
 *    - Loads configuration from JSON files in src/config/ directory
 *    - Supports multiple environments (dev, test, prod)
 *    - Automatic environment detection from command line parameters
 *    - Graceful fallback to default configuration if files are missing
 *
 * 2. 🔧 CONFIGURATION STRUCTURE:
 *    - API connection settings (protocol, host, port)
 *    - Authentication configuration (endpoints, grant types, scopes)
 *    - Performance thresholds and test parameters
 *    - Load testing settings (VUs, duration, ramp patterns)
 *
 * 3. 🛡️ ERROR HANDLING:
 *    - Handles missing configuration files gracefully
 *    - Provides sensible defaults when config loading fails
 *    - Detailed error logging for troubleshooting
 *    - Ensures tests can run even with configuration issues
 *
 * 4. 🌍 ENVIRONMENT DETECTION:
 *    - Reads environment from K6 environment variables
 *    - Supports command-line environment specification
 *    - Defaults to 'dev' environment for safe testing
 *    - Consistent environment handling across all tests
 *
 * WHY THIS MODULE EXISTS:
 * Different environments (development, testing, production) require different
 * configuration settings. This module provides a standardized way to load
 * the correct settings for each environment without hardcoding values in tests.
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { loadConfig, getEnvironment } from '../utils/config-loader.js';
 *
 * // Load config for current environment
 * const config = loadConfig(getEnvironment());
 *
 * // Load config for specific environment
 * const testConfig = loadConfig('test');
 * ```
 */

import { open } from 'k6';
import { SharedArray } from 'k6/data';

// Load environments configuration during INIT PHASE like config-manager.js
const environmentsData = new SharedArray('environmentsConfigJson', function () {
  const environmentsCandidates = [
    './src/config/environments.json', // Works: resolution relative to project root
    '../config/environments.json', // expected (./src/config/ relative to this file)
    'src/config/environments.json' // alternative project root resolution
  ];
  
  for (const p of environmentsCandidates) {
    try {
      const content = open(p);
      const parsed = JSON.parse(content);
      console.log(`✅ Loaded environments configuration from: ${p}`);
      console.log(`✅ Found environments: ${Object.keys(parsed.environments || {}).join(', ')}`);
      return [parsed]; // Keep array form for compatibility
    } catch (e) {
      console.log(`❌ Failed to load ${p}: ${e.message}`);
    }
  }
  
  console.warn(`⚠️ Warning: Could not load environments.json from any known path (tried: ${environmentsCandidates.join(', ')}). Using fallback configuration.`);
  return [{}];
});

/**
 * Load environment configuration from centralized environments.json
 * @param {string} environment - Environment name (dev, test, prod, autotest)
 * @returns {Object} Environment-specific configuration (api, auth)
 */
export function loadEnvironmentConfig(environment = 'dev') {
  // Use pre-loaded environments data from SharedArray
  const environments = environmentsData[0] || {};
  
  if (!environments.environments) {
    console.error('No environments configuration found, using fallback');
    // Return minimal fallback config
    return {
      name: 'Fallback Configuration',
      api: {
        protocol: 'https',
        host: 'autotest01.acoscloud.no',
        port: 443,
        baseUrl: 'https://autotest01.acoscloud.no',
        referer: 'https://autotest01.acoscloud.no/'
      },
      auth: {
        tokenEndpoint: '/identityserver/connect/token',
        grantType: 'client_credentials',
        scope: 'websak'
      }
    };
  }
  
  if (environments.environments[environment]) {
    return environments.environments[environment];
  } else {
    console.warn(`Environment '${environment}' not found, using 'dev' as fallback`);
    return environments.environments['dev'] || environments.environments['autotest'];
  }
}

/**
 * Load configuration based on environment - UPDATED to use centralized config
 * Loads environment config from environments.json and merges with test-specific config
 * 
 * @param {string} environment - Environment name (dev, test, prod, autotest)
 * @returns {Object} Complete configuration object with API, auth, thresholds, and load settings
 */
export function loadConfig(environment = 'dev') {
  // Load environment-specific config from centralized file
  const envConfig = loadEnvironmentConfig(environment);
  
  // Load test-specific configuration (thresholds, load settings, scenarios)
  const configFile = `./src/config/${environment}.json`;

  try {
    const configContent = open(configFile);
    const testConfig = JSON.parse(configContent);
    
    // Merge environment config with test config, prioritizing centralized env config
    return {
      ...testConfig,
      environment: envConfig.name,
      api: envConfig.api,
      auth: envConfig.auth
    };
  } catch (error) {
    console.error(`Failed to load test config file ${configFile}: ${error.message}`);
    // Return config with environment settings and minimal defaults
    return {
      ...envConfig,
      environment: envConfig.name,
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
 * Load shared API endpoints that are consistent across all environments
 * @returns {Object} Shared endpoint configuration
 */
export function loadSharedEndpoints() {
  // Use pre-loaded environments data from SharedArray
  const environments = environmentsData[0] || {};
  return environments.sharedEndpoints || {};
}

/**
 * Get environment from command line or default to 'dev'
 * Usage: k6 run -e ENVIRONMENT=test script.js
 * @returns {string} Environment name
 */
export function getEnvironment() {
  return __ENV.ENVIRONMENT || 'dev';
}
