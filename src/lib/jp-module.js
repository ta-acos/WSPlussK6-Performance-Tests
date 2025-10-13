/**
 * WebSak Journal Post (JP) Management Module
 * 
 * @author Senthilkumar Sengottuvel
 *
 * This module provides functions for creating and managing Journal Posts in WebSak cases.
 * Includes JP template retrieval, JP creation, and document attachment.
 *
 * Usage:
 * import { getJpTemplates, createJournalPost } from '../utils/modules/jp-module.js';
 * const jpTemplates = getJpTemplates(config, authHeaders, caseId, vuId);
 * const jpData = createJournalPost(config, authHeaders, caseId, jpTemplates, testData, vuId);
 *
 * Note: Document attachment endpoints are automatically detected.
 * Attachment performance limits are now dynamic (see ATTACH_DOCS_BATCH_LIMIT_MS below).
 * - multipart/form-data (for endpoints containing 'uploadfile' or 'upload')
 * - application/json (for other endpoints)
 */

import { check, group } from 'k6';
import http from 'k6/http';
import { recordError } from '../utils/error-tracker.js';
import { generateJpPayload } from './payload-module.js';
import { getPerformanceThresholds } from './config-manager.js';
// import { getPathsConfig } from './config-manager.js'; // TODO: Use when JP attachment endpoint is needed

// Centralized (override-able) attachment performance limit.
// Loads dynamically from performance-thresholds.json, with env var override support.
const ATTACH_DOCS_BATCH_LIMIT_MS = (() => {
  const v = parseInt(__ENV.ATTACH_DOCS_BATCH_LIMIT_MS || '', 10);
  if (Number.isFinite(v) && v > 0) return v;
  
  // Load from JSON configuration
  const perfCfg = getPerformanceThresholds();
  const configuredTimeout = perfCfg?.operations?.['Attach Document']?.maxResponseTimeMs || 
                            perfCfg?.operations?.['Upload Document']?.maxResponseTimeMs || 
                            perfCfg?.defaults?.maxResponseTimeMs;
  return configuredTimeout || 6000;
})();

// Load performance thresholds once (init context) for dynamic per-operation budgets
const __perfCfg = getPerformanceThresholds();
const __opMetricMap = {
  'Get JP Templates': 'group_duration{group:::Get JP Templates}',
  'Create Journal Post': 'group_duration{group:::Create Journal Post}',
  'Attach Document to JP': 'group_duration{group:::Attach Document to JP}'
};
function getOpP95(operationName) {
  try {
    const metricKey = __opMetricMap[operationName];
    const op = __perfCfg.operations?.[operationName]?.k6 || {};
    const val = op[metricKey]?.p95;
    return typeof val === 'number' ? val : __perfCfg.defaults?.k6?.http_req_duration?.p95 || 3000;
  } catch (e) {
    return 3000; // safe fallback
  }
}

const JP_TEMPLATES_P95 = getOpP95('Get JP Templates');
const CREATE_JP_P95 = getOpP95('Create Journal Post');
const ATTACH_DOC_P95 = getOpP95('Attach Document to JP');

// Get JP attachment endpoint from configuration
// function getJpAttachEndpoint() {  // TODO: Use when JP attachment endpoint is needed
//   const pathsConfig = getPathsConfig();
//   return pathsConfig.apiEndpoints?.websak?.endpoints?.jpAttach || '/api/websak/api/jp/uploadfiletodokument/';
// }

// generateJpPayload function moved to payload-module.js for centralized payload management

/**
 * Retrieve available JP templates (Jpmaler) for a specific case
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} caseId - Case ID to get templates for
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Array} Array of available JP templates
 */
export function getJpTemplates(config, authHeaders, caseId, vuId) {
  let availableTemplates = [];

  group('Get JP Templates', () => {
    console.log(`📋 ${vuId}: Retrieving JP templates for case ${caseId}`);

    const templatesUrl = `${config.baseUrl}${config.apiConfig.endpoints.jpmaler}/${caseId}/jpmaler`;
    const templatesResponse = http.get(templatesUrl, {
      headers: authHeaders,
      timeout: '30s',
      tags: {
        name: '📎 Get JP Templates',
        endpoint: 'jp:templates',
        group: 'jp',
        method: 'GET',
        case_id: caseId,
        url: templatesUrl
      }
    });
    recordError(templatesResponse, {
      endpoint: 'jp:templates',
      errorType: 'http_error',
      message: 'Get JP Templates failed'
    });

    // Validate JP templates response
    const templatesSuccess = check(templatesResponse, {
      'jp_templates: status is 200': (r) => {
        if (r.status !== 200) {
          console.error(`🔥 ${vuId}: JP templates request failed - Status: ${r.status}`);
          console.error(`📥 Response Body: ${r.body}`);
        }
        return r.status === 200;
      },
      'jp_templates: response has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          const hasData = Array.isArray(body) || (body.data && Array.isArray(body.data));
          return hasData;
        } catch (e) {
          console.error(`🔥 ${vuId}: JP templates response parse error:`, e.message);
          return false;
        }
      },
      [`jp_templates: response time < ${(JP_TEMPLATES_P95 / 1000).toFixed(2)}s`]: (r) =>
        r.timings.duration < JP_TEMPLATES_P95
    });

    if (templatesSuccess && templatesResponse.status === 200) {
      try {
        const templatesBody = JSON.parse(templatesResponse.body);
        availableTemplates = Array.isArray(templatesBody) ? templatesBody : templatesBody.data || [];
        console.log(`✅ ${vuId}: Retrieved ${availableTemplates.length} JP templates for case ${caseId}`);
      } catch (e) {
        console.error(`🔥 ${vuId}: Failed to parse JP templates response:`, e.message);
      }
    }
  });

  return availableTemplates;
}

/**
 * Create a new Journal Post in a case
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} caseId - Case ID to create JP in
 * @param {Array} jpTemplates - Available JP templates
 * @param {Object} testData - Test data with JP name and description
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Object|null} Created JP data or null if creation failed
 */
export function createJournalPost(config, authHeaders, caseId, jpTemplates, testData, vuId) {
  let jpData = null;

  group('Create Journal Post', () => {
    console.log(`📝 ${vuId}: Creating new Journal Post "${testData.jpName}" in case ${caseId}`);

    // Skip JP creation if no templates available
    if (jpTemplates.length === 0) {
      console.error(`❌ ${vuId}: No JP templates available for case ${caseId} - skipping JP creation`);
      return null;
    }

    // Select the first available template (or implement template selection logic)
    const selectedTemplate = jpTemplates[0];

    console.log(`🎯 ${vuId}: Using JP template: "${selectedTemplate.tittel}" (ID: ${selectedTemplate.id})`);

    // Generate JP payload using centralized function (with dokTypeId, dokStatusId, saksbehandlerId from CSV)
    const jpPayload = generateJpPayload(caseId, selectedTemplate, testData, config);

    const createUrl = `${config.baseUrl}${config.apiConfig.endpoints.jpny}`; // Centralized in config
    console.log(`🔗 ${vuId}: JP create URL: ${createUrl}`);

    const createResponse = http.post(createUrl, JSON.stringify(jpPayload), {
      headers: authHeaders,
      timeout: '30s',
      tags: {
        name: '✉️ Create Journal Post (JP)',
        endpoint: 'jp:create',
        group: 'jp',
        method: 'POST',
        case_id: caseId,
        template_id: selectedTemplate.id,
        jp_endpoint: config.apiConfig.endpoints.jpny,
        url: createUrl
      }
    });
    recordError(createResponse, {
      endpoint: 'jp:create',
      errorType: 'http_error',
      message: 'Create Journal Post failed'
    });

    // Validate JP creation response
    check(createResponse, {
      'create_jp: status is 200 or 201': (r) => {
        if (r.status !== 200 && r.status !== 201) {
          console.error(`🔥 ${vuId}: JP creation failed - Status: ${r.status}`);
          console.error(`📥 Response Body: ${r.body}`);
        }
        return r.status === 200 || r.status === 201;
      },
      // ID presence is desirable but not strictly mandatory for success (some endpoints may return 204 or minimal body)
      'create_jp: (optional) response has JP ID': (r) => {
        try {
          if (!r.body) return true; // allow empty body
          const body = JSON.parse(r.body);
          const jpIdCandidate =
            body.id ||
            body.jpId ||
            body.journalpostId ||
            (body.journalpost && (body.journalpost.id || body.journalpost.jpId)) ||
            (body.data && (body.data.id || body.data.jpId || body.data.journalpostId));
          return !!jpIdCandidate;
        } catch (e) {
          return true; // do not fail the check on parse error if status ok
        }
      },
      [`create_jp: response time < ${(CREATE_JP_P95 / 1000).toFixed(2)}s`]: (r) =>
        r.timings.duration < CREATE_JP_P95
    });

    if (createResponse.status === 200 || createResponse.status === 201) {
      try {
        const createBody = createResponse.body ? JSON.parse(createResponse.body) : {};

        // Enhanced JP ID extraction
        let jpId = createBody.id || createBody.jpId || createBody.journalpostId;
        if (!jpId && createBody.journalpost) {
          jpId =
            createBody.journalpost.id || createBody.journalpost.jpId || createBody.journalpost.journalpostId;
        }
        if (!jpId && createBody.data) {
          jpId =
            createBody.data.id ||
            createBody.data.jpId ||
            createBody.data.journalpostId ||
            (createBody.data.journalpost &&
              (createBody.data.journalpost.id || createBody.data.journalpost.jpId));
        }
        // Attempt extraction from Location header if still missing
        if (!jpId && createResponse.headers && createResponse.headers['Location']) {
          const loc = createResponse.headers['Location'];
          const match = loc.match(/(\d+)(?!.*\d)/); // last number sequence
          if (match) jpId = match[1];
        }

        jpData = {
          id: jpId,
          caseId: caseId,
          name: testData.jpName,
          description: testData.jpDescription,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.tittel,
          response: createBody
        };

        if (jpId) {
          console.log(`✅ ${vuId}: Journal Post created successfully - ID: ${jpId}`);
        } else {
          // Log body once in a while to avoid flooding (simple random sampling)
          if (Math.random() < 0.05) {
            console.warn(
              `⚠️ ${vuId}: JP creation response had no detectable ID. Raw body: ${createResponse.body}`
            );
          }
          console.log(`✅ ${vuId}: Journal Post created successfully - ID not returned (accepted)`);
        }
      } catch (e) {
        console.log(`✅ ${vuId}: JP creation successful (response parse issue)`);
        jpData = {
          id: null,
          caseId: caseId,
          name: testData.jpName,
          description: testData.jpDescription,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.tittel,
          response: null
        };
      }
    }
  });

  return jpData;
}

/**
 * Attach a document to a Journal Post
 *
 * NOTE: WebSak JP document attachment workflow:
 * - First document: Use /uploadfiletodokument/ to set the main JP document
 * - Additional documents: Use /jp/{jpId}/dokumenter or similar endpoints to add attachments
 *
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} jpId - Journal Post ID
 * @param {Object} documentData - Document data to attach
 * @param {string} vuId - Virtual User identifier for logging
 * @param {boolean} isFirstDocument - Whether this is the first document (uses different endpoint)
 * @returns {boolean} Success status of document attachment
 */
/**
 * CENTRALIZED DOCUMENT PAYLOAD BUILDER - Common function for all document operations
 * Use this function whenever you need to prepare document data for API requests
 *
 * @param {Object} documentData - Raw document data
 * @param {string} documentData.name - Document filename
 * @param {string} documentData.content - Document text content (for text files)
 * @param {string} documentData.base64Content - Base64 encoded content (for binary files)
 * @param {string} documentData.mimeType - MIME type (default: 'text/plain')
 * @param {number} documentData.size - Document size in bytes
 * @param {string} documentData.originalPath - Original file path (optional)
 * @param {string} jpId - Journal Post ID (optional, for payloads that need it embedded)
 * @returns {Object} Standardized document payload ready for API submission
 */
export function buildJpDocumentPayload(documentData, jpId = null) {
  const payload = {
    navn: documentData.name,
    innhold:
      documentData.content || (documentData.base64Content ? null : 'Performance test document content'),
    innholdBase64: documentData.base64Content || undefined,
    mimeType: documentData.mimeType || 'text/plain',
    storrelse: documentData.size || 1024,
    kilde: documentData.originalPath || undefined
  };

  // Add JP ID if provided (for endpoints that require it in payload)
  if (jpId) {
    payload.jpId = Number(jpId);
    payload.journalpostId = Number(jpId);
  }

  return payload;
}

/**
 * CENTRALIZED MULTIPART FORM DATA BUILDER - Common function for file uploads
 * Use this function for any endpoint that requires multipart/form-data file uploads
 *
 * Supports WebSak API structure:
 * - Single document: Legacy format with file + jpId
 * - Multiple documents: Array format with dokuments[index] fields
 *
 * @param {Object} documentData - Document data to upload
 * @param {string} jpId - Journal Post ID (required)
 * @param {number} documentIndex - Document index in array (0-based, optional, default 0)
 * @param {boolean} isMainDocument - Whether this is the main document (optional, default false)
 * @returns {Object} Multipart form data object ready for http.post/put
 */
export function buildMultipartFormData(documentData, jpId = null, documentIndex = 0, isMainDocument = false) {
  const formData = {};

  // Add JP ID (required)
  if (jpId) {
    formData.jpId = jpId;
  }

  // WebSak API requires array-based structure: dokuments[index].field
  const prefix = `dokuments[${documentIndex}]`;

  // Add document metadata
  formData[`${prefix}.isMainDocument`] = String(isMainDocument);
  formData[`${prefix}.orderIndex`] = String(documentIndex + 1); // 1-based order
  formData[`${prefix}.tittel`] =
    documentData.tittel || documentData.title || documentData.name?.replace(/\.[^/.]+$/, '') || 'Document';

  // Add the file - support both binary data and text content
  const fileContent =
    documentData.binaryData ||
    documentData.content ||
    documentData.base64Content ||
    'Performance test document content';
  formData[`${prefix}.file`] = http.file(
    fileContent,
    documentData.name || 'document.txt',
    documentData.mimeType || 'text/plain'
  );

  return formData;
}

/**
 * BATCH MULTIPART FORM DATA BUILDER - Upload multiple documents at once
 * Combines multiple documents into a single multipart form data payload
 *
 * @param {Array<Object>} documentsArray - Array of document data objects
 * @param {string} jpId - Journal Post ID (required)
 * @param {number} mainDocumentIndex - Index of main document (optional, default 0)
 * @returns {Object} Multipart form data with all documents
 */
export function buildBatchMultipartFormData(documentsArray, jpId, mainDocumentIndex = 0) {
  const formData = { jpId };

  documentsArray.forEach((docData, index) => {
    const prefix = `dokuments[${index}]`;
    const isMain = index === mainDocumentIndex;

    formData[`${prefix}.isMainDocument`] = String(isMain);
    formData[`${prefix}.orderIndex`] = String(index + 1);
    formData[`${prefix}.tittel`] =
      docData.tittel || docData.title || docData.name?.replace(/\.[^/.]+$/, '') || `Document ${index + 1}`;

    // Support both binary data and text content
    const fileContent =
      docData.binaryData ||
      docData.content ||
      docData.base64Content ||
      `Performance test document ${index + 1}`;
    formData[`${prefix}.file`] = http.file(
      fileContent,
      docData.name || `document${index + 1}.txt`,
      docData.mimeType || 'text/plain'
    );
  });

  return formData;
}

/**
 * Attach a document to a Journal Post
 *
 * UPDATED: Now supports WebSak API array structure for multiple documents
 * Uses dokuments[index] format with isMainDocument, orderIndex, tittel, and file fields
 *
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} jpId - Journal Post ID
 * @param {Object} documentData - Document data to attach
 * @param {string} vuId - Virtual User identifier for logging
 * @param {number} documentIndex - Document index (0-based, default 0)
 * @param {boolean} isMainDocument - Whether this is the main document (default false)
 * @returns {boolean} Success status of document attachment
 */
export function attachDocument(
  config,
  authHeaders,
  jpId,
  documentData,
  vuId,
  documentIndex = 0,
  isMainDocument = false,
  caseId = null
) {
  let success = false;

  group('Attach Document to JP', () => {
    const docType = isMainDocument ? 'main document' : `document #${documentIndex + 1}`;
    console.log(`📎 ${vuId}: Attaching ${docType} "${documentData.name}" to JP ${jpId}`);

    // WebSak API endpoint for document upload
    const uploadPath = config.apiConfig.endpoints.jpAttach || '/api/websak/api/jp/uploadfiletodokument/';
    const uploadUrl = `${config.baseUrl}${uploadPath}`;

    // Build multipart form data using correct WebSak API structure
    const formData = buildMultipartFormData(documentData, jpId, documentIndex, isMainDocument);

    // Prepare headers (remove Content-Type to let K6 set it with boundary)
    const multipartHeaders = { ...authHeaders };
    delete multipartHeaders['Content-Type'];

    console.log(`🔗 ${vuId}: Uploading to: ${uploadUrl}`);

    const silent = (__ENV.JP_ATTACH_SILENT || '').toLowerCase() === 'true';

    // Perform the upload
    const attachResponse = http.post(uploadUrl, formData, {
      headers: multipartHeaders,
      timeout: '30s',
      tags: {
        name: '📎 Attach Document to JP',
        endpoint: 'jp:attachDocument',
        group: 'jp',
        method: 'POST',
        jp_id: jpId,
        url: uploadUrl
      }
    });

    recordError(attachResponse, {
      endpoint: 'jp:attachDocument',
      errorType: 'http_error',
      message: 'Attach JP Document failed'
    });

    // Validate response
    const attemptOk = check(attachResponse, {
      'attach_doc: status is 200/201': (r) => {
        if (r.status !== 200 && r.status !== 201) {
          if (!silent) {
            console.error(`🔥 ${vuId}: Document attach failed - Status: ${r.status}`);
            console.error(`📥 Response Body: ${r.body?.slice(0, 500)}`);
          }
        }
        return r.status === 200 || r.status === 201;
      },
      [`attach_doc: resp time < ${(ATTACH_DOC_P95 / 1000).toFixed(2)}s`]: (r) =>
        r.timings.duration < ATTACH_DOC_P95
    });

    if (attemptOk && (attachResponse.status === 200 || attachResponse.status === 201)) {
      success = true;
      if (!silent) console.log(`✅ ${vuId}: Document attached successfully`);
    } else {
      if (!silent) {
        console.error(`❌ ${vuId}: Failed to attach document to JP ${jpId}`);
        console.error(`   Endpoint: ${uploadUrl}`);
        console.error(`   Status: ${attachResponse.status}`);
        console.error(`   Note: WebSak API only supports ONE document per JP via /uploadfiletodokument/`);
        console.error(`   For multiple documents, create separate JPs for each document.`);
      }
    }
  });

  return success;
}

/**
 * Attach multiple documents to a Journal Post in a single request
 *
 * Uses WebSak API batch upload with dokuments[] array structure
 *
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} jpId - Journal Post ID
 * @param {Array<Object>} documentsArray - Array of document data objects
 * @param {string} vuId - Virtual User identifier for logging
 * @param {number} mainDocumentIndex - Index of main document (default 0)
 * @returns {boolean} Success status of batch upload
 */
export function attachDocumentsBatch(
  config,
  authHeaders,
  jpId,
  documentsArray,
  vuId,
  mainDocumentIndex = 0,
  caseId = null
) {
  let success = false;

  group('Attach Multiple Documents to JP', () => {
    console.log(`📎 ${vuId}: Attaching ${documentsArray.length} documents to JP ${jpId}`);

    // WebSak API endpoint for document upload
    const uploadPath = config.apiConfig.endpoints.jpAttach || '/api/websak/api/jp/uploadfiletodokument/';
    const uploadUrl = `${config.baseUrl}${uploadPath}`;

    // Build batch multipart form data
    const formData = buildBatchMultipartFormData(documentsArray, jpId, mainDocumentIndex);

    // Prepare headers
    const multipartHeaders = { ...authHeaders };
    delete multipartHeaders['Content-Type'];

    console.log(`🔗 ${vuId}: Batch uploading to: ${uploadUrl}`);

    // Perform the batch upload
    const attachResponse = http.post(uploadUrl, formData, {
      headers: multipartHeaders,
      timeout: '60s', // Longer timeout for multiple files
      tags: {
        name: '📎 Attach Multiple Documents to JP',
        endpoint: 'jp:attachDocumentsBatch',
        group: 'jp',
        method: 'POST',
        jp_id: jpId,
        document_count: documentsArray.length,
        url: uploadUrl
      }
    });

    // Validate response
    const attemptOk = check(attachResponse, {
      'attach_docs_batch: status is 200/201': (r) => {
        if (r.status !== 200 && r.status !== 201) {
          console.error(`🔥 ${vuId}: Batch document attach failed - Status: ${r.status}`);
          console.error(`📥 Response Body: ${r.body?.slice(0, 500)}`);
        }
        return r.status === 200 || r.status === 201;
      },
  [`attach_docs_batch: resp time < ${(ATTACH_DOCS_BATCH_LIMIT_MS/1000).toFixed(1)}s`]: (r) => r.timings.duration < ATTACH_DOCS_BATCH_LIMIT_MS
    });

    if (attemptOk && (attachResponse.status === 200 || attachResponse.status === 201)) {
      success = true;
      console.log(`✅ ${vuId}: ${documentsArray.length} documents attached successfully`);
    } else {
      console.error(`❌ ${vuId}: Failed to attach documents to JP ${jpId}`);
      console.error(`   Status: ${attachResponse.status}`);

      // Record error using NEW k6 metrics-based tracker (will appear in report!)
      recordError(attachResponse, {
        endpoint: `/api/websak/api/jp/uploadfiletodokument/`,
        errorType: 'document_attach_timeout',
        message: `Got ${attachResponse.status} from /api/websak/api/jp/uploadfiletodokument/ but this is failed due to the error: Document attachment timeout: ${attachResponse.timings.duration.toFixed(2)}ms > ${ATTACH_DOCS_BATCH_LIMIT_MS}ms threshold. JP ID is: ${jpId} and Case ID is: ${caseId || 'unknown'}. sak/${caseId || 'unknown'}/jp/${jpId}`,
        failed: true,
        jpId: jpId,
        caseId: caseId || 'unknown',
        duration: attachResponse.timings.duration.toFixed(2),
        responseBody: attachResponse.body ? attachResponse.body.slice(0, 200) : 'No response body'
      });
    }
  });

  return success;
}
