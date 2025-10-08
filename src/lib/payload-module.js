/**
 * ===================================================================
 * PAYLOAD GENERATION MODULE
 * ===================================================================
 *
 * WHAT THIS MODULE DOES:
 * This module creates the data structures (payloads) that are sent to the API
 * when creating cases, journal posts, and other items. Think of it as filling
 * out forms with realistic test data automatically.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 📝 TEST DATA GENERATION:
 *    - Creates realistic case titles, descriptions, and metadata
 *    - Generates journal post content with proper formatting
 *    - Produces document names and descriptions for attachments
 *    - Uses randomization to create varied, realistic data
 *
 * 2. 📋 CASE PAYLOADS:
 *    - Generates complete case creation requests with all required fields
 *    - Handles different case types and templates
 *    - Creates proper case metadata and classification data
 *    - Ensures data matches API requirements and validation rules
 *
 * 3. ✉️ JOURNAL POST PAYLOADS:
 *    - Creates both incoming and outgoing journal post structures
 *    - Handles recipient information and addressing
 *    - Generates proper timestamps and metadata
 *    - Supports different journal post types and templates
 *
 * 4. 📎 DOCUMENT PAYLOADS:
 *    - Creates document attachment metadata
 *    - Generates appropriate file names and MIME types
 *    - Handles document classification and categorization
 *    - Supports various document types and sizes
 *
 * 5. 🔄 WORKFLOW INTEGRATION:
 *    - Provides high-level functions that combine multiple operations
 *    - Handles the complete process from data generation to API calls
 *    - Includes error handling and validation
 *    - Ensures consistent data structures across all tests
 *
 * WHY THIS MODULE EXISTS:
 * Without standardized payload generation, each test would create its own
 * data structures, leading to inconsistencies and maintenance problems.
 * This module ensures all tests use realistic, properly formatted data
 * that matches what real users would create.
 *
 * EXAMPLE GENERATED DATA:
 * ```
 * Case Title: "PerfTestCase-VU3-20241008-14:23:45"
 * Case Description: "Performance test case created for load testing purposes..."
 * JP Subject: "Test Journal Post - Incoming Email Simulation"
 * Document Name: "TestDoc-VU3-001.pdf"
 * ```
 */

import http from 'k6/http';
import { check, group } from 'k6';

// Note: generateCaseTestData is available in case-module.js
// Note: generateJpTestData is available in jp-module.js

/**
 * Generate Incoming Journal Post creation payload
 * Based on the user-provided incoming JP structure with comprehensive recipient configuration
 * @param {string} caseId - Case ID to associate the JP with
 * @param {Object} selectedTemplate - Template object with id property
 * @param {Object} testData - Test data object containing jpName, jpDescription
 * @param {Object} config - Configuration object with apiConfig.jpConfig settings
 * @returns {Object} Incoming JP payload object
 */
export function generateIncomingJpPayload(caseId, selectedTemplate, testData, config) {
  const jpConfig = config?.apiConfig?.jpConfig || {};

  // Get current date in ISO format with timezone
  const currentDate = new Date();
  const brevDato = currentDate.toISOString().split('T')[0] + 'T00:00:00+02:00';

  // Calculate forfallsDato (21 days from now)
  const forfallsDate = new Date(currentDate);
  forfallsDate.setDate(forfallsDate.getDate() + 21);
  const forfallsDato = forfallsDate.toISOString().split('T')[0] + 'T00:00:00+02:00';

  return {
    sakId: Number(caseId),
    malId: selectedTemplate.id,
    tekstMalId: -1, // As per user's incoming payload
    journalpost: {
      id: -1,
      tittel1: testData.jpName || 'test incoming tit',
      tittel2: testData.jpDescription || 'incoming document test',
      dokTypeId: 1, // Incoming document type
      dokStatusId: 7, // Incoming status
      brevDato: brevDato,
      forfallsDato: forfallsDato,
      mottakere: [],
      kopiMottakere: [],
      nyeKopiMottakere: [
        {
          id: jpConfig.kopiMottakerId || 33,
          sdmId: -1,
          erIdentitet: true,
          navn: jpConfig.kopiMottakerNavn || 'TestAutomation - Saksbehandler',
          epost: jpConfig.kopiMottakerEpost || 'testautomation_u3@acosdemo.onmicrosoft.com',
          gidId: jpConfig.kopiMottakerId || 33,
          offentligNummer: '',
          telefon: '12345678',
          adresse: '',
          adresse2: '',
          adresse3: '',
          adresse4: '',
          postnr: '',
          poststed: '',
          landId: '',
          erPersonNavn: true,
          attention: null,
          referanse: null,
          digitaltReservert: null,
          krrStatus: null,
          gradert: false
        }
      ],
      nyeMottakere: [
        {
          id: jpConfig.mottakerId || 31,
          sdmId: -1,
          erIdentitet: true,
          navn: jpConfig.mottakerNavn || 'TestAutomation - Arkivar',
          epost: jpConfig.mottakerEpost || 'testcomplete4@acosdemo.onmicrosoft.com',
          gidId: jpConfig.mottakerId || 31,
          offentligNummer: '',
          telefon: '',
          adresse: '',
          adresse2: '',
          adresse3: '',
          adresse4: '',
          postnr: '',
          poststed: '',
          landId: '',
          erPersonNavn: true,
          attention: null,
          referanse: null,
          digitaltReservert: null,
          krrStatus: null,
          gradert: false
        }
      ],
      aktivtTilleggsdataSett: null,
      noekkelord: [],
      admEnhet: jpConfig.admEnhet || 4,
      saksbehandlerId: jpConfig.saksbehandlerId || 31,
      kategori: -1,
      setJournaldato: false,
      setBrevdato: false
    },
    standardTekster: []
  };
}

/**
 * Generate Outgoing Journal Post creation payload
 * Uses the standard outgoing JP structure with customizable configuration
 * @param {string} caseId - Case ID to associate the JP with
 * @param {Object} selectedTemplate - Template object with id property
 * @param {Object} testData - Test data object containing jpName, jpDescription
 * @param {Object} config - Configuration object with apiConfig.jpConfig settings
 * @returns {Object} Outgoing JP payload object
 */
export function generateOutgoingJpPayload(caseId, selectedTemplate, testData, config) {
  const jpConfig = config?.apiConfig?.jpConfig || {};

  const currentDate = new Date();
  const brevDato = currentDate.toISOString().split('T')[0] + 'T00:00:00+02:00';

  return {
    sakId: Number(caseId),
    malId: selectedTemplate.id,
    tekstMalId: selectedTemplate.id,
    journalpost: {
      id: -1,
      tittel1: testData.jpName,
      tittel2: testData.jpDescription,
      dokTypeId: jpConfig.dokTypeId || 4, // Outgoing document type
      dokStatusId: jpConfig.dokStatusId || 6, // Outgoing status
      brevDato: brevDato,
      forfallsDato: null,
      mottakere: [],
      kopiMottakere: [],
      nyeKopiMottakere: [],
      nyeMottakere: [],
      aktivtTilleggsdataSett: null,
      noekkelord: [],
      admEnhet: jpConfig.admEnhet || 4,
      saksbehandlerId: jpConfig.saksbehandlerId || 31,
      kategori: -1,
      setJournaldato: false,
      setBrevdato: false
    },
    standardTekster: [
      {
        key: 'Start',
        id: jpConfig.standardTexterId || 42
      }
    ]
  };
}

/**
 * Generate a generic Journal Post payload with customizable type
 * Provides a flexible base payload that can be customized for different JP types
 * @param {string} caseId - Case ID to associate the JP with
 * @param {Object} selectedTemplate - Template object with id property
 * @param {Object} testData - Test data object containing jpName, jpDescription
 * @param {Object} config - Configuration object with apiConfig.jpConfig settings
 * @param {Object} options - Additional options for payload customization
 * @param {number} options.dokTypeId - Document type ID (1=incoming, 4=outgoing)
 * @param {number} options.dokStatusId - Document status ID (7=incoming, 6=outgoing)
 * @param {boolean} options.includeForfallsDato - Whether to include forfalls date
 * @param {Array} options.recipients - Array of recipient objects
 * @param {Array} options.copyRecipients - Array of copy recipient objects
 * @returns {Object} Generic JP payload object
 */
export function generateJpPayload(caseId, selectedTemplate, testData, config, options = {}) {
  const jpConfig = config?.apiConfig?.jpConfig || {};
  const currentDate = new Date();
  const brevDato = currentDate.toISOString().split('T')[0] + 'T00:00:00+02:00';

  let forfallsDato = null;
  if (options.includeForfallsDato) {
    const forfallsDate = new Date(currentDate);
    forfallsDate.setDate(forfallsDate.getDate() + 21);
    forfallsDato = forfallsDate.toISOString().split('T')[0] + 'T00:00:00+02:00';
  }

  // Default standardTekster for backward compatibility (jp-module usage)
  const defaultStandardTekster =
    options.standardTekster !== undefined
      ? options.standardTekster
      : [{ key: 'Start', id: jpConfig.standardTexterId || 42 }];

  return {
    sakId: Number(caseId),
    malId: selectedTemplate.id,
    tekstMalId: options.dokTypeId === 1 ? -1 : selectedTemplate.id, // -1 for incoming, template.id for outgoing
    journalpost: {
      id: -1,
      tittel1: testData.jpName,
      tittel2: testData.jpDescription,
      dokTypeId: options.dokTypeId || jpConfig.dokTypeId || 4, // Use jpConfig as fallback
      dokStatusId: options.dokStatusId || jpConfig.dokStatusId || 6, // Use jpConfig as fallback
      brevDato: brevDato,
      forfallsDato: forfallsDato,
      mottakere: [],
      kopiMottakere: [],
      nyeKopiMottakere: options.copyRecipients || [],
      nyeMottakere: options.recipients || [],
      aktivtTilleggsdataSett: null,
      noekkelord: [],
      admEnhet: jpConfig.admEnhet || 4,
      saksbehandlerId: jpConfig.saksbehandlerId || 31,
      kategori: -1,
      setJournaldato: false,
      setBrevdato: false
    },
    standardTekster: defaultStandardTekster
  };
}

/**
 * Create a Journal Post with custom payload
 * Comprehensive function that handles the HTTP request, validation, and response processing
 * @param {Object} config - Configuration object with baseUrl and endpoints
 * @param {Object} authHeaders - Authentication headers for the request
 * @param {string} caseId - Case ID to create the JP in
 * @param {Object} jpPayload - The JP payload object
 * @param {string} jpType - Type of JP (e.g., 'Incoming', 'Outgoing')
 * @param {Object} testData - Test data object for naming and identification
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Object|null} JP data object with id, caseId, name, description, type, response
 */
export function createJournalPostWithPayload(config, authHeaders, caseId, jpPayload, jpType, testData, vuId) {
  let jpData = null;

  const groupName = `Create ${jpType} JP`;
  group(groupName, () => {
    console.log(`📝 ${vuId}: Creating new ${jpType} Journal Post "${testData.jpName}" in case ${caseId}`);

    const createUrl = `${config.baseUrl}${config.apiConfig.endpoints.jpny}`;
    console.log(`🔗 ${vuId}: JP create URL: ${createUrl}`);

    const createResponse = http.post(createUrl, JSON.stringify(jpPayload), {
      headers: authHeaders,
      timeout: '30s',
      tags: {
        name: `✉️ Create ${jpType} Journal Post`,
        endpoint: 'jp:create',
        group: 'jp',
        method: 'POST',
        case_id: caseId,
        jp_type: jpType,
        url: createUrl
      }
    });

    check(createResponse, {
      'create_jp: status is 200 or 201': (r) => {
        if (r.status !== 200 && r.status !== 201) {
          console.error(`🔥 ${vuId}: ${jpType} JP creation failed - Status: ${r.status}`);
          console.error(`📥 Response Body: ${r.body}`);
        }
        return r.status === 200 || r.status === 201;
      },
      'create_jp: response time < 3s': (r) => r.timings.duration < 3000
    });

    if (createResponse.status === 200 || createResponse.status === 201) {
      try {
        const createBody = createResponse.body ? JSON.parse(createResponse.body) : {};

        // Extract JP ID with comprehensive fallback strategies
        let jpId = createBody.id || createBody.jpId || createBody.journalpostId;
        if (!jpId && createBody.journalpost) {
          jpId = createBody.journalpost.id || createBody.journalpost.jpId;
        }
        if (!jpId && createBody.data) {
          jpId = createBody.data.id || createBody.data.jpId || createBody.data.journalpostId;
        }
        if (!jpId && createResponse.headers && createResponse.headers['Location']) {
          const loc = createResponse.headers['Location'];
          const match = loc.match(/(\d+)(?!.*\d)/);
          if (match) jpId = match[1];
        }

        jpData = {
          id: jpId,
          caseId: caseId,
          name: testData.jpName,
          description: testData.jpDescription,
          type: jpType,
          response: createBody
        };

        if (jpId) {
          console.log(`✅ ${vuId}: ${jpType} Journal Post created successfully - ID: ${jpId}`);
        } else {
          console.log(`✅ ${vuId}: ${jpType} Journal Post created successfully - ID not returned`);
        }
      } catch (e) {
        console.log(`✅ ${vuId}: ${jpType} JP creation successful (response parse issue)`);
        jpData = {
          id: null,
          caseId: caseId,
          name: testData.jpName,
          description: testData.jpDescription,
          type: jpType,
          response: null
        };
      }
    } else {
      console.error(`❌ ${vuId}: Failed to create ${jpType} Journal Post`);
    }
  });

  return jpData;
}

/**
 * Generate Case creation payload
 * CENTRALIZED PAYLOAD CONFIGURATION - Update this function to modify the case creation structure
 *
 * @param {Object} selectedTemplate - The selected case template
 * @param {Object} testData - Test data containing caseName, caseDescription, timestamp
 * @param {Object} config - Test configuration object (contains sakType names from Config file)
 * @param {Object} resolvedIds - Object containing resolved IDs (sakTypeId, malId, avgjkodeid)
 * @returns {Object} Case creation payload ready for API submission
 */
export function generateCasePayload(selectedTemplate, testData, config, resolvedIds = {}) {
  // Get the current date for obsDato (observation date)
  const currentDate = new Date();
  currentDate.setHours(22, 0, 0, 0); // Set to 22:00:00.000Z

  return {
    malId: resolvedIds.malId || selectedTemplate.id || 2, // Use resolved malId or template ID
    sak: {
      tittel1: testData.caseName || 'Title1 1',
      tittel2: testData.caseDescription || 'Title1 1',
      klasseringer: [],
      aktivtTilleggsdataSett: null,
      noekkelord: [],
      erSamleMappe: false,
      obsDato: currentDate.toISOString(),
      obsKommentar: `Performance test case created at ${testData.timestamp}`,
      saksparter: [],
      sakstypeid: resolvedIds.sakTypeId || 19, // Use resolved sakTypeId from name lookup
      avgjkodeid: resolvedIds.avgjkodeid || null // Use resolved avgjkodeid from name lookup (was previously ignored)
    }
  };
}

/**
 * Create standardized recipient object for Journal Posts
 * Generates a recipient object with default values and customizable properties
 * @param {Object} options - Configuration options for the recipient
 * @param {number} options.id - Recipient ID
 * @param {string} options.navn - Recipient name
 * @param {string} options.epost - Recipient email
 * @param {string} options.telefon - Phone number (optional)
 * @param {boolean} options.erIdentitet - Is identity flag (default: true)
 * @param {boolean} options.erPersonNavn - Is person name flag (default: true)
 * @returns {Object} Recipient object
 */
export function createRecipientObject(options = {}) {
  return {
    id: options.id || 31,
    sdmId: options.sdmId || -1,
    erIdentitet: options.erIdentitet !== undefined ? options.erIdentitet : true,
    navn: options.navn || 'TestAutomation - Default User',
    epost: options.epost || 'testautomation@acosdemo.onmicrosoft.com',
    gidId: options.gidId || options.id || 31,
    offentligNummer: options.offentligNummer || '',
    telefon: options.telefon || '',
    adresse: options.adresse || '',
    adresse2: options.adresse2 || '',
    adresse3: options.adresse3 || '',
    adresse4: options.adresse4 || '',
    postnr: options.postnr || '',
    poststed: options.poststed || '',
    landId: options.landId || '',
    erPersonNavn: options.erPersonNavn !== undefined ? options.erPersonNavn : true,
    attention: options.attention || null,
    referanse: options.referanse || null,
    digitaltReservert: options.digitaltReservert || null,
    krrStatus: options.krrStatus || null,
    gradert: options.gradert !== undefined ? options.gradert : false
  };
}

/**
 * Generate batch payload for multiple operations
 * Creates a batch payload structure for processing multiple items at once
 * @param {Array} items - Array of items to process in batch
 * @param {Object} config - Configuration for batch processing
 * @param {string} operationType - Type of operation (e.g., 'create', 'update', 'delete')
 * @returns {Object} Batch payload object
 */
export function generateBatchPayload(items, config, operationType = 'create') {
  return {
    operation: operationType,
    batchId: generateRandomString(12),
    timestamp: new Date().toISOString(),
    items: items,
    config: config,
    totalCount: items.length
  };
}

/**
 * Utility function to generate random string
 * Creates a random alphanumeric string of specified length
 * @param {number} length - Length of the random string (default: 8)
 * @returns {string} Random alphanumeric string
 */
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate test data for case creation
 * @param {string} prefix - Prefix for the test case name
 * @param {string} vuId - Virtual User ID
 * @returns {Object} Test data object with caseName, caseDescription, timestamp, testId
 */
export function generateCaseTestData(prefix = 'Test Case', vuId = '') {
  const randomString = generateRandomString(6);
  const timestamp = new Date().toISOString();

  return {
    testId: generateRandomString(8),
    timestamp: timestamp,
    caseName: `${prefix} ${randomString} ${vuId}`,
    caseDescription: `Performance test case created at ${timestamp}`
  };
}

/**
 * Generate test data for journal post creation
 * @param {string} prefix - Prefix for the test JP name
 * @param {string} vuId - Virtual User ID
 * @returns {Object} Test data object with jpName, jpDescription, documentName, documentContent, timestamp, testId
 */
export function generateJpTestData(prefix = 'Test JP', vuId = '') {
  const randomString = generateRandomString(6);
  const timestamp = new Date().toISOString();

  return {
    testId: generateRandomString(8),
    timestamp: timestamp,
    jpName: `${prefix} ${randomString} ${vuId}`,
    jpDescription: `Performance test JP created at ${timestamp}`,
    documentName: `TestDoc_${randomString}.txt`,
    documentContent: `Test document content created at ${timestamp}`
  };
}

// Export all functions for easy importing in test files
export { generateRandomString };
