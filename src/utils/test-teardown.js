/**
 * Reusable Test Teardown Utilities
 * Centralizes common teardown patterns used across K6 performance tests
 *
 * @author Senthilkumar Sengottuvel
 */

import { logValidationTroubleshootingGuide } from './test-validation.js';

/**
 * Generic teardown function for performance tests
 * @param {string} testName - Name of the test (e.g., 'Create-Sak', 'Create JP')
 * @param {Object} data - Setup data from K6 test
 * @param {Object} config - Test configuration object
 * @param {Object} options - Additional options
 * @param {boolean} options.USE_DATA_FILE_CONFIG - Whether data file config was used
 * @param {string} options.CONFIG_ENVIRONMENT - Environment configuration used
 * @param {string} options.SCENARIO_OVERRIDE - Scenario override if any
 * @param {boolean} options.showTroubleshootingGuide - Whether to show troubleshooting guide (default: true)
 */
export function performTestTeardown(testName, data, config, options = {}) {
  const {
    USE_DATA_FILE_CONFIG = true,
    CONFIG_ENVIRONMENT = 'autotest',
    SCENARIO_OVERRIDE = null,
    showTroubleshootingGuide = true
  } = options;

  console.log(`🏁 ${testName} LOAD TEST completed!`);

  const cfgEnv = data?.configEnvironment || CONFIG_ENVIRONMENT;
  const cfgSource =
    data?.configSource || (data?.useDataFileConfig ? 'Performance Test Data File' : 'inlineConfig');
  const totalUsers = data?.totalUsers ?? (Array.isArray(config?.users) ? config.users.length : 'n/a');
  const scenarioName = data?.scenario || SCENARIO_OVERRIDE || 'n/a';

  console.log(`📈 Configuration used: ${cfgSource} (${cfgEnv})`);
  console.log(`📈 Scenario: ${scenarioName}`);
  console.log(`📈 Total users tested: ${totalUsers}`);
  console.log('📊 Check the metrics above for performance results');

  if (!USE_DATA_FILE_CONFIG) {
    console.log('ℹ️  Each user ran with their own credentials from users-config.json');
  }

  if (showTroubleshootingGuide) {
    logValidationTroubleshootingGuide();
  }
}

/**
 * Simple teardown for basic tests
 * @param {string} testName - Name of the test
 */
export function performSimpleTeardown(testName) {
  console.log(`🏁 ${testName} Test complete`);
}
