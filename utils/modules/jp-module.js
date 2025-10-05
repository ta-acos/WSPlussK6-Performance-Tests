/**
 * WebSak Journal Post (JP) Management Module
 *
 * This module provides functions for creating and managing Journal Posts in WebSak cases.
 * Includes JP template retrieval, JP creation, and document attachment.
 *
 * Usage:
 * import { getJpTemplates, createJournalPost } from '../utils/modules/jp-module.js';
 * const jpTemplates = getJpTemplates(config, authHeaders, caseId, vuId);
 * const jpData = createJournalPost(config, authHeaders, caseId, jpTemplates, testData, vuId);
 *
 * Note: Document attachment endpoints are automatically detected     } else {
      console.error(`❌ ${vuId}: Failed to attach documents to JP ${jpId}`);
      console.error(`   Status: ${attachResponse.status}`);
      
      // Record error using NEW k6 metrics-based tracker (will appear in report!)
      recordError(attachResponse, {
        endpoint: `/api/websak/api/jp/uploadfiletodokument/`,
        errorType: 'document_attach_timeout',
        message: `Got ${attachResponse.status} from /api/websak/api/jp/uploadfiletodokument/ but this is failed due to the error: Document attachment timeout: ${attachResponse.timings.duration.toFixed(2)}ms > 5000ms threshold. JP ID: ${jpId}`,
        failed: true,
        jpId: jpId,
        duration: attachResponse.timings.duration.toFixed(2),
        responseBody: attachResponse.body ? attachResponse.body.slice(0, 200) : 'No response body'
      });
    } * - multipart/form-data (for endpoints containing 'uploadfile' or 'upload')
 * - application/json (for other endpoints)
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { recordErrorSample } from '../error-sampler.js';
import { recordError } from '../error-tracker.js';
import { generateRandomString } from '../validation.js';

/**
 * Generate Journal Post creation payload
 * CENTRALIZED PAYLOAD CONFIGURATION - Update this function to modify the JP creation structure
 *
 * @param {string} caseId - The case ID where JP will be created
 * @param {Object} selectedTemplate - The selected JP template
 * @param {Object} testData - Test data containing jpName, jpDescription, timestamp
 * @param {Object} config - Test configuration object (contains JP IDs from CSV)
 * @returns {Object} JP creation payload ready for API submission
 */
export function generateJpPayload(caseId, selectedTemplate, testData, config) {
  // Get configuration values from CSV with fallbacks
  const jpConfig = config?.apiConfig?.jpConfig || {};

  // Get current date in ISO format with timezone for brevDato
  const currentDate = new Date();
  const brevDato = currentDate.toISOString().split('T')[0] + 'T00:00:00+02:00';

  return {
    sakId: Number(caseId),
    malId: selectedTemplate.id,
    tekstMalId: selectedTemplate.id, // Use same as malId (from real payload)
    journalpost: {
      id: -1,
      tittel1: testData.jpName,
      tittel2: testData.jpDescription,
      dokTypeId: jpConfig.dokTypeId || 4, // Loaded from CSV
      dokStatusId: jpConfig.dokStatusId || 6, // Loaded from CSV
      brevDato: brevDato, // Current date with timezone
      forfallsDato: null,
      mottakere: [],
      kopiMottakere: [],
      nyeKopiMottakere: [],
      nyeMottakere: [],
      aktivtTilleggsdataSett: null,
      noekkelord: [],
      admEnhet: jpConfig.admEnhet || 4, // Loaded from CSV
      saksbehandlerId: jpConfig.saksbehandlerId || 31, // Loaded from CSV
      kategori: -1,
      setJournaldato: false,
      setBrevdato: false // Added from real payload
    },
    standardTekster: [
      {
        key: 'Start',
        id: jpConfig.standardTexterId || 42 // Loaded from CSV
      }
    ]
  };
}

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
    recordErrorSample(templatesResponse, { endpoint: 'jp:templates', name: 'Get JP Templates' });

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
      'jp_templates: response time < 1.5s': (r) => r.timings.duration < 1500
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
    recordErrorSample(createResponse, { endpoint: 'jp:create', name: 'Create Journal Post' });

    // Validate JP creation response
    const createSuccess = check(createResponse, {
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
      'create_jp: response time < 3s': (r) => r.timings.duration < 3000
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
  isMainDocument = false
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

    recordErrorSample(attachResponse, { endpoint: 'jp:attachDocument', name: 'Attach JP Document' });

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
      'attach_doc: resp time < 3s': (r) => r.timings.duration < 3000
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
export function attachDocumentsBatch(config, authHeaders, jpId, documentsArray, vuId, mainDocumentIndex = 0) {
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
      'attach_docs_batch: resp time < 5s': (r) => r.timings.duration < 5000
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
        message: `Got ${attachResponse.status} from /api/websak/api/jp/uploadfiletodokument/ but this is failed due to the error: Document attachment timeout: ${attachResponse.timings.duration.toFixed(2)}ms > 5000ms threshold. JP ID: ${jpId}`,
        failed: true,
        jpId: jpId,
        duration: attachResponse.timings.duration.toFixed(2),
        responseBody: attachResponse.body ? attachResponse.body.slice(0, 200) : 'No response body'
      });
      
      // Also keep old method for backward compatibility
      recordErrorSample(attachResponse, {
        endpoint: 'jp:attachDocumentsBatch',
        name: 'Attach JP Documents Batch',
        failed: true,
        error: `Check failed: attemptOk=${attemptOk}, status=${attachResponse.status}`
      });
    }
  });

  return success;
}

/**
 * Generate test data for JP creation
 * @param {string} prefix - Prefix for the JP name
 * @param {string} vuId - Virtual User identifier
 * @returns {Object} Test data object for JP
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
