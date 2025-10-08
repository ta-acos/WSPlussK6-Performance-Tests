/**
 * ===================================================================
 * TEST SUMMARY & REPORT GENERATION MODULE
 * ===================================================================
 *
 * WHAT THIS MODULE DOES:
 * After a performance test finishes, this module processes all the collected
 * data and creates reports that show how well the system performed. It's like
 * creating a report card for the system's performance.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 📊 REPORT GENERATION:
 *    - Creates HTML reports with charts and graphs for easy viewing
 *    - Generates JSON files with raw performance data for detailed analysis
 *    - Includes performance summaries and trend analysis
 *
 * 2. 🔍 ERROR ANALYSIS:
 *    - Identifies and categorizes any errors that occurred during testing
 *    - Shows error rates and patterns to help identify issues
 *    - Provides detailed error logs for troubleshooting
 *
 * 3. 📈 PERFORMANCE METRICS:
 *    - Calculates key performance indicators (response times, throughput, etc.)
 *    - Compares results against performance thresholds
 *    - Identifies which operations were fastest/slowest
 *
 * 4. 💾 RESULT STORAGE:
 *    - Saves reports to the reports/ folder for later review
 *    - Creates timestamped files so you can track performance over time
 *    - Formats data for easy sharing with team members
 *
 * WHY THIS MODULE IS IMPORTANT:
 * Raw performance data is hard to understand. This module converts the data
 * into easy-to-read reports that help you understand if the system is
 * performing well and identify any problems that need attention.
 */

import { generateHtmlReport } from './report-generator.js';
import { injectErrorAnalytics } from './error-tracker.js';
import { loadTestConfig, getEnvironmentMetadata, getReportPaths } from '../lib/config-manager.js';

/**
 * Generic handleSummary function for performance tests
 * @param {Object} data - K6 summary data
 * @param {string} testName - Test name for report paths (e.g., 'create-sak', 'create-jp')
 * @param {Object} originalTestConfig - Original test configuration object
 * @param {Object} options - Configuration options
 * @param {boolean} options.USE_DATA_FILE_CONFIG - Whether data file config was used
 * @param {string} options.CONFIG_ENVIRONMENT - Environment configuration used
 * @param {boolean} options.includeErrorAnalytics - Whether to inject error analytics (default: true)
 * @param {boolean} options.includeBaseline - Whether to attempt baseline loading (default: true)
 * @returns {Object} - Report files object for K6
 */
export function performTestSummary(testName, data, originalTestConfig, options = {}) {
  const {
    USE_DATA_FILE_CONFIG = true,
    CONFIG_ENVIRONMENT = 'autotest',
    includeErrorAnalytics = true,
    includeBaseline = true
  } = options;

  // Attach error sampling data (if any)
  if (includeErrorAnalytics) {
    try {
      injectErrorAnalytics(data);
    } catch (e) {
      /* no-op */
    }
  }

  // Get APDex threshold from environment variables
  const apdexEnv = __ENV.APDex_T || __ENV.APDEX_T; // allow both spellings
  const apdexT = apdexEnv ? parseInt(apdexEnv, 10) : 500;

  // Auto-load baseline (best-effort): look for latest previous summary JSON in reports excluding current run
  let baseline = null;
  if (includeBaseline) {
    try {
      if (typeof __ENV !== 'undefined') {
        // k6 JS runtime does not provide fs, so baseline must be injected externally or via options.
        // Allow passing BASELINE_JSON (stringified) through env.
        if (__ENV.BASELINE_JSON) {
          baseline = JSON.parse(__ENV.BASELINE_JSON);
        }
      }
    } catch (e) {
      console.error('⚠️ Failed to parse baseline JSON from env BASELINE_JSON:', e.message);
    }

    if (baseline) {
      data.baseline = baseline; // attach for report generator
    }
  }

  // Add environment and metadata information for reporting
  const testConfig = loadTestConfig(testName, originalTestConfig, USE_DATA_FILE_CONFIG, CONFIG_ENVIRONMENT);
  const envMetadata = getEnvironmentMetadata(testConfig);
  data.setup_data = {
    ...envMetadata
  };

  const html = generateHtmlReport(data, { apdexT });

  const reportPaths = getReportPaths(testName);
  return {
    [reportPaths.json]: JSON.stringify(data, null, 2),
    [reportPaths.html]: html,
    stdout: '' // keep console summary clean (k6 still prints its default)
  };
}

/**
 * Simplified handleSummary for tests that don't need all the advanced features
 * @param {Object} data - K6 summary data
 * @param {string} testName - Test name for report paths
 * @param {Object} originalTestConfig - Original test configuration object
 * @param {Object} options - Configuration options
 * @returns {Object} - Report files object for K6
 */
export function performSimpleSummary(testName, data, originalTestConfig, options = {}) {
  return performTestSummary(testName, data, originalTestConfig, {
    ...options,
    includeErrorAnalytics: false,
    includeBaseline: false
  });
}
