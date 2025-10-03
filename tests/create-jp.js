/**
 * Test: Create Journal Post workflow (Case + JP)
 * Steps: authenticate -> create case -> fetch JP templates -> create JP
 * Purpose: Validate combined workflow latency and success rate.
 *
 * Quick run:
 *  k6 run tests/create-jp.js --vus 1 --duration 10s
 */

import { sleep } from 'k6';
import { randomSleep } from '../utils/pacing.js';
import {
  loadTestConfig,
  getK6OptionsWithScenarios,
  getK6Options,
  printConfigSummary
} from '../utils/modules/config-manager.js';
import { authenticate, createAuthHeaders } from '../utils/modules/auth-module.js';
import {
  getTemplates as getCaseTemplates,
  createCase,
  generateCaseTestData
} from '../utils/modules/case-module.js';
import { getJpTemplates, createJournalPost, generateJpTestData } from '../utils/modules/jp-module.js';
import { generateHtmlReport } from '../utils/report-generator.js';

// ========================================
// CONFIGURATION FLAGS
// ========================================
const USE_DATA_FILE_CONFIG = true; // Use autotest.json + scenarios if true
const CONFIG_ENVIRONMENT = 'autotest'; // Environment config identifier

// Override scenario from environment variable if provided
// Usage: k6 run -e SCENARIO=load_test tests/create-jp.js
const SCENARIO_OVERRIDE = __ENV.SCENARIO || null;

// Fallback / inline test configuration when flag disabled
const ORIGINAL_TEST_CONFIG = {
  vus: 5,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
    'group_duration{group:::Authentication}': ['p(95)<2000'],
    'group_duration{group:::Get Case Templates}': ['p(95)<2500'],
    'group_duration{group:::Create New Case}': ['p(95)<3000'],
    'group_duration{group:::Get JP Templates}': ['p(95)<3000'],
    'group_duration{group:::Create Journal Post}': ['p(95)<3500']
  }
};

// Load configuration
const config = loadTestConfig('create-jp', ORIGINAL_TEST_CONFIG, USE_DATA_FILE_CONFIG, CONFIG_ENVIRONMENT);

// When using inline config ensure VUs match available users
if (!USE_DATA_FILE_CONFIG) {
  ORIGINAL_TEST_CONFIG.vus = config.users.length || ORIGINAL_TEST_CONFIG.vus;
  config.vus = ORIGINAL_TEST_CONFIG.vus;
}

// Export k6 options - use scenario-based configuration from autotest.json
export const options = USE_DATA_FILE_CONFIG
  ? getK6OptionsWithScenarios(config, SCENARIO_OVERRIDE)
  : getK6Options(config);

export function setup() {
  console.log('🚀 Starting Create JP Modular Test');
  printConfigSummary(config);
  return { started: true };
}

export default function () {
  const testConfig = loadTestConfig(
    'create-jp',
    ORIGINAL_TEST_CONFIG,
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT
  );
  const users = testConfig.users;

  if (!users || users.length === 0) {
    console.error('🔥 No users loaded for Create JP test');
    return;
  }

  const userIndex = (__VU - 1) % users.length;
  const user = users[userIndex];
  const vuId = `VU${__VU}`;

  // Basic field validation
  if (!user?.UserName || !user?.ClientID || !user?.ClientSecret) {
    console.error(`❌ ${vuId}: Invalid user record`, user);
    return;
  }

  // Authentication
  const accessToken = authenticate(testConfig, user, vuId);
  if (!accessToken) {
    console.error(`❌ ${vuId}: Token acquisition failed`);
    return;
  }
  const authHeaders = createAuthHeaders(accessToken);

  // Retrieve case templates
  const caseTemplates = getCaseTemplates(testConfig, authHeaders, vuId);
  if (caseTemplates.length === 0) {
    console.error(`❌ ${vuId}: No case templates retrieved`);
    return;
  }

  // Choose template titled "Ny sak" if present
  const nySakTemplate = caseTemplates.find((t) => (t.tittel || '').toLowerCase() === 'ny sak');
  const selectedCaseTemplate = nySakTemplate || caseTemplates[0];

  // Generate case test data
  const caseTestData = generateCaseTestData('PerfTestCase', vuId);

  // Create case
  const caseData = createCase(
    testConfig,
    authHeaders,
    caseTemplates,
    caseTestData,
    vuId,
    selectedCaseTemplate
  );
  if (!caseData || !caseData.id) {
    console.error(`❌ ${vuId}: Case creation failed`);
    return;
  }

  // Retrieve JP templates for created case
  const jpTemplates = getJpTemplates(testConfig, authHeaders, caseData.id, vuId);
  if (jpTemplates.length === 0) {
    console.error(`❌ ${vuId}: No JP templates available`);
    return;
  }

  // Select template containing "utgående" if present
  const outgoingTemplate = jpTemplates.find((t) => (t.tittel || '').toLowerCase().includes('utgående'));
  if (outgoingTemplate) {
    // Reorder so chosen template used first by createJournalPost() logic
    const idx = jpTemplates.indexOf(outgoingTemplate);
    if (idx > 0) {
      jpTemplates.unshift(jpTemplates.splice(idx, 1)[0]);
    }
  }

  // Generate JP test data
  const jpTestData = generateJpTestData('PerfTestJP', vuId);

  // Create Journal Post
  const jpData = createJournalPost(testConfig, authHeaders, caseData.id, jpTemplates, jpTestData, vuId);
  if (!jpData || !jpData.id) {
    console.warn(`⚠️ ${vuId}: JP creation returned no ID (may still be accepted)`);
  } else {
    console.log(`🎉 ${vuId}: Created Journal Post ID ${jpData.id} in Case ${caseData.id}`);
  }

  randomSleep(0.3, 1.1);
}

export function teardown() {
  console.log('🏁 Create JP Modular Test complete');
}

/**
 * Rich summary artifacts (HTML, JSON, Markdown) produced for distribution.
 */
export function handleSummary(data) {
  const m = data.metrics || {};
  const dur = m.http_req_duration?.values || {};
  const failedRate = m.http_req_failed?.values?.rate || 0;
  const totalReqs = m.http_reqs?.values?.count || 0;
  const runSecs = (data.state?.testRunDurationMs || 0) / 1000;
  // Markdown summary intentionally disabled (user request to avoid .md artifact)

  const apdexEnv = __ENV.APDex_T || __ENV.APDEX_T;
  const apdexT = apdexEnv ? parseInt(apdexEnv, 10) : 500;
  const html = generateHtmlReport(data, { apdexT });

  return {
    'reports/create-jp-summary.json': JSON.stringify(data, null, 2),
    'reports/create-jp-report.html': html,
    stdout: ''
  };
}
