/**
 * ===================================================================
 * CONFIGURATION MANAGER MODULE
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS MODULE DOES:
 * This module is the "control center" for all test configuration. It loads
 * settings from configuration files, manages test user accounts, and provides
 * standardized configuration to all performance tests.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 📋 CONFIGURATION LOADING:
 *    - Loads test settings from JSON configuration files
 *    - Manages different environments (autotest, dev, production)
 *    - Provides fallback defaults when config files are missing
 *
 * 2. 👥 USER MANAGEMENT:
 *    - Loads test user accounts from users-config.json
 *    - Validates user credentials and client information
 *    - Provides user rotation for tests with multiple virtual users
 *
 * 3. 🌐 API CONFIGURATION:
 *    - Loads API endpoint URLs and paths from websak-api-config.json
 *    - Manages different API versions and environments
 *    - Provides consistent API endpoint access across tests
 *
 * 4. 🎯 TEST SCENARIOS:
 *    - Defines different test intensities (smoke, load, stress, spike, endurance)
 *    - Sets appropriate user counts, durations, and thresholds for each scenario
 *    - Allows easy switching between test types via environment variables
 *
 * 5. 📊 PERFORMANCE THRESHOLDS:
 *    - Defines what response times are considered acceptable
 *    - Sets error rate limits for different operations
 *    - Provides consistent performance criteria across all tests
 *
 * WHY THIS MODULE IS IMPORTANT:
 * Without centralized configuration, each test would have its own settings,
 * making it difficult to maintain consistency and change settings across
 * multiple tests. This module ensures all tests use the same standards.
 *
 * TECHNICAL NOTE:
 * K6 requires all file loading to happen during initialization (before tests run).
 * This module handles all file loading upfront and provides access functions
 * for tests to use during execution.
 */

import { SharedArray } from 'k6/data';
// Note: External URL import must be resolved at init time, so we use the configured URL
// This could be made dynamic in the future by loading the config in a separate init phase
// import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js'; // TODO: Use when CSV parsing needed

// Load Environment Configuration from JSON - INIT PHASE
let environmentsConfig;
const envCandidates = [
  '../config/environments.json', // expected (./src/config/ relative to this file)
  './src/config/environments.json', // if resolution is relative to project root
  'src/config/environments.json' // alternative project root resolution
];

for (const p of envCandidates) {
  try {
    environmentsConfig = JSON.parse(open(p));
    console.log(`✅ Loaded environments configuration from: ${p}`);
    break;
  } catch (e) {
    // try next
  }
}
if (!environmentsConfig) {
  console.error('No environments configuration found, using fallback');
  // Fallback environment configuration
  environmentsConfig = {
    environments: {
      autotest: {
        api: {
          protocol: 'https',
          host: 'autotest01.acoscloud.no',
          port: 443,
          baseUrl: 'https://autotest01.acoscloud.no',
          referer: 'https://autotest01.acoscloud.no'
        },
        auth: {
          tokenEndpoint: '/identityserver/connect/token',
          grantType: 'client_credentials',
          scope: 'acos.websak.api'
        }
      }
    }
  };
}

/**
 * Get current environment name from environment variable or default
 * @returns {string} Environment name
 */
function getEnvironment() {
  return __ENV.ENVIRONMENT || 'autotest';
}

/**
 * Load environment-specific configuration
 * @param {string} envName - Environment name
 * @returns {Object} Environment configuration
 */
function loadEnvironmentConfig(envName = 'autotest') {
  const env = environmentsConfig?.environments?.[envName];
  if (!env) {
    console.warn(`⚠️ Environment '${envName}' not found, using autotest`);
    return environmentsConfig?.environments?.autotest || {};
  }
  return env;
}

// Load API Configuration from JSON (simpler maintenance) - INIT PHASE
const apiConfigData = new SharedArray('apiConfigJson', function () {
  try {
    const jsonRaw = open('../data/websak-api-config.json');
    const parsed = JSON.parse(jsonRaw);
    return [parsed]; // keep array form for compatibility
  } catch (e) {
    console.error('🔥 ERROR loading websak-api-config.json:', e.message);
    return [{}];
  }
});

// Load Users from JSON - INIT PHASE
const usersData = new SharedArray('usersJson', function () {
  try {
    const jsonRaw = open('../data/users-config.json');
    const parsed = JSON.parse(jsonRaw);
    const list = Array.isArray(parsed) ? parsed : parsed.users || [];
    const normalized = list.filter((u) => (u.userName || u.UserName) && (u.clientId || u.ClientID));
    console.log(`📋 Loaded ${normalized.length} users from JSON`);
    return normalized.map((u) => ({
      UserName: u.userName || u.UserName,
      ClientID: u.clientId || u.ClientID,
      ClientSecret: u.clientSecret || u.ClientSecret
    }));
  } catch (error) {
    console.error('🔥 ERROR loading users JSON:', error);
    return [];
  }
});

// Load JSON configurations during INIT PHASE
let autoTestConfig;
// Support multiple candidate paths in case k6 resolves open() relative to the entry script
// (expected behavior: relative to this file's directory). We'll try a small ordered list.
const autotestCandidates = [
  '../config/autotest.json', // expected (./src/config/ relative to this file)
  './src/config/autotest.json', // if resolution is relative to project root
  'src/config/autotest.json' // alternative project root resolution
];

for (const p of autotestCandidates) {
  try {
    autoTestConfig = JSON.parse(open(p));
    console.log(`✅ Loaded autotest configuration from: ${p}`);
    break;
  } catch (e) {
    // try next
  }
}
if (!autoTestConfig) {
  console.warn(
    '⚠️ Warning: Could not load autotest.json config from any known path (tried: ' +
      autotestCandidates.join(', ') +
      '). Tests will continue with minimal defaults; verify config file location.'
  );
}

// Only load dev.json if it exists (optional)
const devConfig = {}; // Initialize as empty object since dev.json doesn't exist

// Load paths configuration
let pathsConfig;
const pathsCandidates = [
  '../config/paths-config.json', // expected (./src/config/ relative to this file)
  './src/config/paths-config.json', // if resolution is relative to project root
  'src/config/paths-config.json' // alternative project root resolution
];

for (const p of pathsCandidates) {
  try {
    pathsConfig = JSON.parse(open(p));
    console.log(`✅ Loaded paths configuration from: ${p}`);
    break;
  } catch (e) {
    // try next
  }
}
if (!pathsConfig) {
  console.warn(
    '⚠️ Warning: Could not load paths-config.json from any known path (tried: ' +
      pathsCandidates.join(', ') +
      '). Using fallback default paths.'
  );
  // Fallback default paths
  pathsConfig = {
    paths: {
      reports: { baseDir: 'src/reports', htmlSuffix: '-report.html', jsonSuffix: '-summary.json' },
      testData: { baseDir: 'src/data', testDocuments: 'src/data/testDocuments' }
    }
  };
}

/**
 * Get configuration data for specified config file
 * @param {string} configFile - Configuration file name (without .json extension)
 * @returns {Object} Configuration object
 */
function getConfigData(configFile = 'autotest') {
  if (configFile === 'autotest' && autoTestConfig) {
    return autoTestConfig;
  }
  if (configFile === 'dev' && devConfig && Object.keys(devConfig).length > 0) {
    return devConfig;
  }
  // Fallback to autotest if dev config is requested but not available
  return autoTestConfig || {};
}

/**
 * Build API configuration - UPDATED to use centralized environment config
 * @param {string} environment - Environment name (defaults to current environment)
 * @returns {Object} API configuration object
 */
function buildApiConfig(environment = null) {
  // Get environment-specific configuration from centralized config
  const currentEnv = environment || getEnvironment();
  const envConfig = loadEnvironmentConfig(currentEnv);

  // Get WebSak-specific configuration (templates, defaults, endpoints)
  const root = apiConfigData[0] || {};
  const api = root.api || {};
  const standardTemplate = root.standardTemplate || {};
  const jpDefaults = root.jpDefaults || {};

  return {
    // Use environment-specific settings from centralized config
    host: envConfig.api.host,
    protocol: envConfig.api.protocol,
    port: envConfig.api.port,
    referer: envConfig.api.referer,
    oauth: {
      tokenUrl: envConfig.auth.tokenEndpoint,
      grantType: envConfig.auth.grantType,
      scope: envConfig.auth.scope || ''
    },
    // Keep WebSak-specific endpoints and configuration
    endpoints: {
      ...api.endpoints
    },
    standardTemplate: {
      sakType: standardTemplate.sakType,
      sakTypeName: standardTemplate.sakTypeName,
      malName: standardTemplate.malName,
      avgjkodeName: standardTemplate.avgjkodeName
    },
    jpConfig: {
      dokTypeId: jpDefaults.dokTypeId,
      dokStatusId: jpDefaults.dokStatusId,
      saksbehandlerId: jpDefaults.saksbehandlerId,
      admEnhet: jpDefaults.admEnhet,
      standardTexterId: jpDefaults.standardTexterId
    }
  };
}

/**
 * Load complete test configuration with flag-based control
 * @param {string} testName - Name of the test
 * @param {Object} testSpecificConfig - Test-specific configuration (used when flag is disabled)
 * @param {boolean} useDataFileConfig - Flag to control config source
 * @param {string} configEnvironment - Environment config file to use (autotest, dev, test, prod)
 * @returns {Object} Complete configuration object
 */
export function loadTestConfig(
  testName,
  testSpecificConfig = {},
  useDataFileConfig = true,
  configEnvironment = 'autotest'
) {
  const apiConfig = buildApiConfig(configEnvironment);
  const users = usersData;

  let testConfig;

  if (useDataFileConfig) {
    // Load configuration from data files - uses pre-loaded config data
    const dataFileConfig = getConfigData(configEnvironment);
    testConfig = {
      ...dataFileConfig,
      apiConfig,
      users, // Explicitly set users after spread to ensure it doesn't get overridden
      baseUrl: `${apiConfig.protocol}://${apiConfig.host}${apiConfig.port && ![80, 443].includes(apiConfig.port) ? ':' + apiConfig.port : ''}`,
      testName,
      configSource: 'dataFile',
      environment: configEnvironment
    };

    console.log(`📋 Configuration loaded from data files (${configEnvironment}.json)`);

    // Wrap legacy root-level scenarios into loadTest structure if not present
    if (!testConfig.loadTest && testConfig.scenarios) {
      testConfig.loadTest = {
        scenarios: testConfig.scenarios,
        descriptions: testConfig.descriptions || testConfig.scenarioDescriptions || {},
        activeScenario: testConfig.activeScenario || 'smoke_test'
      };
    }

    // Scenario override via env variable SCENARIO or LOAD_SCENARIO
    const scenarioOverride = __ENV.SCENARIO || __ENV.LOAD_SCENARIO;
    if (scenarioOverride && testConfig.loadTest?.scenarios?.[scenarioOverride]) {
      testConfig.loadTest.activeScenario = scenarioOverride;
      console.log(`🔁 Scenario override applied: ${scenarioOverride}`);
    } else if (
      scenarioOverride &&
      testConfig.loadTest?.scenarios &&
      !testConfig.loadTest.scenarios[scenarioOverride]
    ) {
      console.warn(
        `⚠️  Scenario override '${scenarioOverride}' not found. Available: ${Object.keys(testConfig.loadTest.scenarios).join(', ')}`
      );
    }
  } else {
    // Use test-specific configuration
    testConfig = {
      ...testSpecificConfig,
      apiConfig,
      users,
      baseUrl: `${apiConfig.protocol}://${apiConfig.host}${apiConfig.port && ![80, 443].includes(apiConfig.port) ? ':' + apiConfig.port : ''}`,
      testName,
      configSource: 'testSpecific',
      environment: 'custom'
    };

    console.log(`📋 Configuration loaded from test-specific settings`);
  }

  // Lightweight validation / guidance (does not throw)
  try {
    if (!testConfig.apiConfig?.oauth?.tokenUrl) {
      console.warn(
        '⚠️  OAuth token URL missing from apiConfig (websak-api-config.json -> api.oauth.tokenPath)'
      );
    }
    const placeholderIds = testConfig.users.filter(
      (u) => /^(client-id|secret)-\d+$/i.test(u.ClientID) || /^(secret)-\d+$/i.test(u.ClientSecret)
    );
    if (placeholderIds.length > 0) {
      console.warn(
        '⚠️  Placeholder OAuth client credentials detected. Update users-config.json with real client_id / client_secret values.'
      );
    }
    const emptyScope = testConfig.apiConfig?.oauth && testConfig.apiConfig.oauth.scope === '';
    if (emptyScope) {
      console.log(
        'ℹ️  OAuth scope is empty; scope parameter will be omitted from token request. Set api.oauth.scope if required by Identity Server.'
      );
    }

    // Environment override support for OAuth scope (OAUTH_SCOPE or SCOPE)
    const scopeOverride = __ENV.OAUTH_SCOPE || __ENV.SCOPE;
    if (scopeOverride) {
      testConfig.apiConfig.oauth.scope = scopeOverride;
      console.log(`🔧 OAuth scope overridden via env to '${scopeOverride}'`);
    }
  } catch (e) {
    // Non-fatal
  }

  return testConfig;
}

/**
 * Get available load test scenarios from config
 * @param {Object} config - Configuration object
 * @returns {Array} Array of scenario names
 */
export function getAvailableScenarios(config) {
  if (config.loadTest && config.loadTest.scenarios) {
    return Object.keys(config.loadTest.scenarios);
  }
  return [];
}

/**
 * Get K6 options with scenario support
 * @param {Object} config - Configuration object from loadTestConfig
 * @param {string} scenarioName - Name of scenario to use (optional)
 * @returns {Object} K6 options object with scenarios or traditional options
 */
export function getK6OptionsWithScenarios(config, scenarioName = null) {
  const options = {};

  if (config.loadTest && config.loadTest.scenarios) {
    const activeScenario = scenarioName || config.loadTest.activeScenario || 'load_test';
    const scenario = config.loadTest.scenarios[activeScenario];

    if (scenario) {
      // Use scenario-based configuration
      options.scenarios = {};
      options.scenarios[activeScenario] = { ...scenario };

      const description = config.loadTest.descriptions?.[activeScenario] || 'No description';
      console.log(`🎯 Using scenario: ${activeScenario} - ${description}`);
    } else {
      console.warn(`⚠️  Scenario '${activeScenario}' not found, falling back to default options`);
      return getK6Options(config);
    }
  } else {
    // Fallback to traditional options
    return getK6Options(config);
  }

  // Add thresholds if defined
  if (config.thresholds) {
    options.thresholds = config.thresholds;
  }

  // Add other options
  if (config.options) {
    Object.assign(options, config.options);
  }

  // Add systemTags to include URL and method in metrics for better reporting
  options.systemTags = [
    'name',
    'method',
    'url',
    'status',
    'error',
    'error_code',
    'tls_version',
    'expected_response'
  ];

  return options;
}

/**
 * Get K6 options from configuration (traditional method)
 * @param {Object} config - Configuration object from loadTestConfig
 * @returns {Object} K6 options object
 */
export function getK6Options(config) {
  const options = {};

  if (config.configSource === 'dataFile') {
    // Use configuration from data file
    options.vus = config.load?.vus || config.users.length;

    if (config.load?.stages) {
      options.stages = config.load.stages;
    } else {
      options.duration = config.load?.duration || '2m';
    }

    if (config.thresholds) {
      options.thresholds = config.thresholds;
    }
  } else {
    // Use test-specific configuration
    if (config.vus) options.vus = config.vus;
    if (config.duration) options.duration = config.duration;
    if (config.stages) options.stages = config.stages;
    if (config.thresholds) options.thresholds = config.thresholds;
  }

  // Add systemTags to include URL and method in metrics for better reporting
  options.systemTags = [
    'name',
    'method',
    'url',
    'status',
    'error',
    'error_code',
    'tls_version',
    'expected_response'
  ];

  return options;
}

/**
 * Print configuration summary
 * @param {Object} config - Configuration object
 */
export function printConfigSummary(config) {
  console.log('🚀 Test Configuration Summary:');
  console.log(`📍 Test Name: ${config.testName}`);
  console.log(`🔧 Config Source: ${config.configSource} (${config.environment})`);
  console.log(`📍 API Host: ${config.baseUrl}`);
  console.log(`👥 Total Users: ${config.users.length}`);

  if (config.loadTest && config.loadTest.scenarios) {
    const activeScenario = config.loadTest.activeScenario;
    const scenario = config.loadTest.scenarios[activeScenario];
    const description = config.loadTest.descriptions?.[activeScenario] || 'No description';
    console.log(`🎯 Active Scenario: ${activeScenario}`);
    console.log(`📝 Description: ${description}`);
    console.log(`⚙️  Executor: ${scenario.executor}`);

    // Show scenario-specific details
    if (scenario.vus) console.log(`⚡ VUs: ${scenario.vus}`);
    if (scenario.duration) console.log(`⏱️  Duration: ${scenario.duration}`);
    if (scenario.iterations) console.log(`🔄 Iterations: ${scenario.iterations}`);
    if (scenario.stages) console.log(`📈 Stages: ${scenario.stages.length} stages defined`);

    // Show available scenarios
    const availableScenarios = Object.keys(config.loadTest.scenarios);
    console.log(`📋 Available Scenarios: ${availableScenarios.join(', ')}`);
  } else if (config.configSource === 'dataFile') {
    console.log(`⚡ VUs: ${config.load?.vus || config.users.length}`);
    console.log(`⏱️  Duration: ${config.load?.duration || '2m'}`);
  } else {
    console.log(`⚡ VUs: ${config.vus || 'default'}`);
    console.log(`⏱️  Duration: ${config.duration || 'default'}`);
  }
}

/**
 * Get paths configuration
 * @returns {Object} Paths configuration object
 */
export function getPathsConfig() {
  return pathsConfig;
}

/**
 * Get report file paths for a test
 * @param {string} testName - Name of the test
 * @param {string} scenarioName - Optional scenario name (e.g., 'smoke', 'load', 'stress')
 * @returns {Object} Object with html and json file paths
 */
export function getReportPaths(testName, scenarioName = null) {
  const paths = pathsConfig.paths.reports;

  // If scenario is provided, include it in the filename
  const baseFileName = scenarioName ? `${testName}-${scenarioName}` : testName;

  return {
    html: `${paths.baseDir}/${baseFileName}${paths.htmlSuffix}`,
    json: `${paths.baseDir}/${baseFileName}${paths.jsonSuffix}`
  };
}

/**
 * Get test data paths with proper resolution from any test file location
 * @returns {Object} Test data paths resolved relative to project root
 */
export function getTestDataPaths() {
  const testDataPaths = pathsConfig.paths.testData;
  
  // Note: K6's open() resolves paths relative to the CURRENT WORKING DIRECTORY (CWD),
  // NOT relative to the script file location. So we always use paths as-is from config.
  // The paths in paths-config.json are already relative to project root.
  
  return {
    ...testDataPaths,
    baseDir: testDataPaths.baseDir,
    testDocuments: testDataPaths.testDocuments,
    usersConfig: testDataPaths.usersConfig || 'src/data/users-config.json',
    apiConfig: testDataPaths.apiConfig || 'src/data/websak-api-config.json'
  };
}

/**
 * Get API endpoint paths with fallback to defaults
 * @param {Object} apiConfig - API configuration from websak-api-config.json
 * @returns {Object} Complete API endpoint paths
 */
export function getApiEndpoints(apiConfig = null) {
  const defaultEndpoints = pathsConfig.apiEndpoints.websak.endpoints;
  const configEndpoints = apiConfig?.endpoints || {};

  // Merge default endpoints with configuration overrides
  const endpoints = { ...defaultEndpoints };

  // Override with configuration values if provided
  Object.keys(configEndpoints).forEach((key) => {
    if (configEndpoints[key]) {
      endpoints[key] = configEndpoints[key];
    }
  });

  // Prefix websak endpoints with base path if not already absolute
  Object.keys(endpoints).forEach((key) => {
    if (endpoints[key] && !endpoints[key].startsWith('/api/')) {
      endpoints[key] = pathsConfig.apiEndpoints.websak.base + '/' + endpoints[key].replace(/^\//, '');
    }
  });

  return endpoints;
}

/**
 * Get external library URLs
 * @returns {Object} External URLs
 */
export function getExternalUrls() {
  return pathsConfig.paths.external;
}

/**
 * Get environment and metadata information for reporting
 * @param {Object} testConfig - The test configuration object from loadTestConfig
 * @returns {Object} Environment and metadata object
 */
export function getEnvironmentMetadata(testConfig = null) {
  // Determine environment for API config
  const configEnv = testConfig?.configEnvironment || getEnvironment();
  const apiConfig = buildApiConfig(configEnv);

  // If no testConfig provided, try to determine environment from available data
  let environment = 'Unknown';
  let useDataFileConfig = 'No';
  let configFile = 'autotest';

  if (testConfig) {
    useDataFileConfig = testConfig.configSource === 'dataFile' ? 'Yes' : 'No';
    configFile = testConfig.environment || testConfig.configFile || 'autotest';

    if (testConfig.configSource === 'dataFile') {
      environment = configFile === 'dev' ? 'Development' : 'Auto Test';
    }
  }

  // Check API host to refine environment detection
  if (apiConfig.host) {
    if (apiConfig.host.includes('autotest')) {
      environment = 'Auto Test';
    } else if (apiConfig.host.includes('dev')) {
      environment = 'Development';
    } else if (apiConfig.host.includes('test')) {
      environment = 'Test';
    } else if (apiConfig.host.includes('prod')) {
      environment = 'Production';
    }
  }

  return {
    configEnvironment: environment,
    useDataFileConfig: useDataFileConfig,
    configFile: configFile,
    apiHost: apiConfig.host || 'Not configured',
    totalUsers: usersData?.length || 0,
    scenarioOverride: __ENV.SCENARIO || 'None',
    testExecutionTime: new Date().toISOString()
  };
}
