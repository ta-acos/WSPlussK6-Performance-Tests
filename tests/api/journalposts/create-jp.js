/**
 * ===================================================================
 * PERFORMANCE TEST: Create Journal Posts (Basic Workflow)
 * ===================================================================
 *
 * WHAT THIS TEST DOES:
 * This test simulates users creating cases and then adding journal posts to them.
 * A journal post is like adding an email, phone call record, or document entry
 * to a case file. This is a simpler version that doesn't attach documents.
 *
 * TEST WORKFLOW STEPS:
 * 1. 🔐 Log in to the system (authenticate user)
 * 2. 📋 Get available case templates (what types of cases can be created)
 * 3. 📁 Create a new case using a template
 * 4. 📄 Get available journal post templates (types of journal entries)
 * 5. ✉️  Create a journal post in the case (like logging an email or call)
 *
 * WHY WE TEST THIS:
 * This tests the basic case + journal post workflow that users do frequently.
 * It's faster than the document attachment version, so good for testing
 * basic system performance under load.
 *
 * CONFIGURATION OPTIONS:
 *  - SCENARIO: Choose test intensity (smoke_test, load_test, stress_test)
 *
 * QUICK TEST COMMAND:
 *  k6 run tests/api/journalposts/create-jp.js --vus 1 --duration 10s
 */

import { randomSleep } from '../../../src/utils/pacing.js';
import {
  generateK6Options,
  performTestSetup,
  initializeTestExecution,
  executeAuthenticationFlow,
  executeCaseCreationFlow,
  selectTemplateByName
} from '../../../src/utils/test-workflow.js';
import { getJpTemplates, createJournalPost } from '../../../src/lib/jp-module.js';
import { generateJpTestData } from '../../../src/lib/payload-module.js';
import { validateTemplates } from '../../../src/utils/test-validation.js';
import { performSimpleTeardown } from '../../../src/utils/test-teardown.js';
import { performSimpleSummary } from '../../../src/utils/test-summary.js';

// ========================================
// CONFIGURATION SETTINGS
// ========================================
// Whether to load test settings from config files (autotest.json) or use built-in defaults
const USE_DATA_FILE_CONFIG = true;

// Which environment to test against (autotest, development, production, etc.)
const CONFIG_ENVIRONMENT = 'autotest';

// Override the test scenario if specified (smoke_test, load_test, stress_test, etc.)
// Usage: k6 run -e SCENARIO=load_test tests/create-jp.js
const SCENARIO_OVERRIDE = __ENV.SCENARIO || null;

// ========================================
// PERFORMANCE THRESHOLDS & TEST SETTINGS
// ========================================
// Backup settings used when config files are not available
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

// Configuration is handled by workflow utilities

// Export k6 options - use workflow utility for configuration
export const options = generateK6Options(
  'create-jp',
  ORIGINAL_TEST_CONFIG,
  USE_DATA_FILE_CONFIG,
  CONFIG_ENVIRONMENT,
  SCENARIO_OVERRIDE
);

export function setup() {
  return performTestSetup('🚀 Starting Create JP Modular Test');
}

export default function createJournalPostTest(data) {
  const vuId = __VU;

  // Initialize test execution
  const { testConfig, user } = initializeTestExecution(
    'create-jp',
    ORIGINAL_TEST_CONFIG,
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT,
    vuId
  );
  if (!testConfig || !user) return;

  // Execute authentication flow
  const authHeaders = executeAuthenticationFlow(testConfig, user, vuId);
  if (!authHeaders) return;

  // Execute case creation flow
  const caseData = executeCaseCreationFlow(testConfig, authHeaders, vuId);
  if (!caseData) return;

  // Get JP templates for the created case
  const jpTemplates = getJpTemplates(testConfig, authHeaders, caseData.id, vuId);
  if (!validateTemplates(jpTemplates, 'JP', vuId)) {
    return;
  }

  // Select preferred template (prioritize by config or use first available)
  const selectedTemplate = selectTemplateByName(jpTemplates, testConfig.templates?.jp) || jpTemplates[0];
  console.log(`🎯 ${vuId}: Using JP template: "${selectedTemplate.tittel}" (ID: ${selectedTemplate.id})`);

  // Generate JP test data and create journal post
  const jpTestData = generateJpTestData('PerfTestJP', vuId);
  const jpData = createJournalPost(testConfig, authHeaders, caseData.id, jpTemplates, jpTestData, vuId);

  if (jpData && jpData.id) {
    console.log(`✅ ${vuId}: Successfully created JP "${jpTestData.jpName}" with ID: ${jpData.id}`);
  } else {
    console.warn(`⚠️ ${vuId}: JP creation completed but no ID returned`);
  }

  // Optional pacing between iterations
  randomSleep(testConfig);
}

export function teardown() {
  performSimpleTeardown('Create JP Modular');
}

/**
 * Rich summary artifacts (HTML, JSON, Markdown) produced for distribution.
 */
export function handleSummary(data) {
  return performSimpleSummary('create-jp', data, ORIGINAL_TEST_CONFIG, {
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT
  });
}
