/**
 * ===================================================================
 * DOCUMENT ATTACHMENT UTILITY MODULE
 * ===================================================================
 *
 * WHAT THIS MODULE DOES:
 * This is a utility module that handles all document-related operations for performance tests.
 * It can create fake documents for testing, load real documents from files, and attach
 * documents to journal posts in the case management system.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 📄 DOCUMENT GENERATION: Creates fake documents with various file types and sizes
 *    - Generates realistic test content (text, JSON, XML, CSV, etc.)
 *    - Can create documents of specific sizes (1MB, 5MB, 10MB, etc.)
 *    - Automatically detects and sets correct MIME types
 *
 * 2. 📁 FILE LOADING: Loads real documents from the testDocuments folder
 *    - Supports PDF, DOCX, XLSX, CSV files
 *    - Handles Base64 encoding for binary files
 *    - Caches files to avoid reloading during tests
 *
 * 3. 📎 DOCUMENT ATTACHMENT: Attaches documents to journal posts
 *    - Individual attachment (one document at a time)
 *    - Batch attachment (multiple documents at once - faster)
 *    - Automatic retry logic for failed attachments
 *    - Verification that attachments were successful
 *
 * 4. ✅ VERIFICATION: Confirms documents were attached correctly
 *    - Checks that the right number of documents were attached
 *    - Validates document metadata
 *    - Provides detailed logging for troubleshooting
 *
 * WHEN TO USE THIS MODULE:
 * - Any test that needs to attach documents to cases or journal posts
 * - Performance testing with realistic document sizes and types
 * - Bulk document upload testing
 * - Testing document handling under load
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { attachDocumentsWithVerification } from '../utils/document-attachment.js';
 *
 * // Attach 5 documents and verify they were uploaded successfully
 * attachDocumentsWithVerification(config, authHeaders, journalPostId, {
 *   documentCount: 5,
 *   useBatchUpload: true,
 *   enableVerification: true
 * });
 * ```
 */

import { group, sleep, check } from 'k6';
import http from 'k6/http';
import { attachDocument, attachDocumentsBatch } from '../lib/jp-module.js';
import { getTestDataPaths } from '../lib/config-manager.js';
import encoding from 'k6/encoding';

// ========================================
// CONFIGURATION CONSTANTS
// ========================================

/**
 * Default document MIME types for synthetic documents
 */
export const DEFAULT_DOC_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/json',
  'text/csv',
  'application/xml',
  'text/html'
];

/**
 * Default document size configuration
 */
export const DEFAULT_DOC_SIZE = {
  BASE: 512, // Base size in bytes
  STEP: 128, // Size increment per document
  MIN: 256, // Minimum document size
  MAX: 10240 // Maximum document size (10KB)
};

/**
 * Supported test document formats and their MIME types
 */
export const SUPPORTED_MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed'
};

// ========================================
// MIME TYPE DETECTION
// ========================================

/**
 * Guess MIME type based on file extension
 * @param {string} fileName - File name with extension
 * @returns {string} - MIME type
 */
export function guessMimeType(fileName) {
  const lower = fileName.toLowerCase();
  const extension = lower.substring(lower.lastIndexOf('.'));

  return SUPPORTED_MIME_TYPES[extension] || 'application/octet-stream';
}

/**
 * Resolve MIME type from predefined list (cycling through)
 * @param {number} index - Document index
 * @param {string[]} mimeList - Optional custom MIME type list
 * @returns {string} - MIME type
 */
export function resolveMimeByIndex(index, mimeList = DEFAULT_DOC_MIME_TYPES) {
  return mimeList[index % mimeList.length];
}

// ========================================
// DOCUMENT DATA GENERATION
// ========================================

/**
 * Generate synthetic document data for performance testing
 * @param {string} baseName - Base name for the document
 * @param {number} index - Document index (0-based)
 * @param {Object} options - Configuration options
 * @param {Object} options.testMeta - Test metadata (vuId, testId, etc.)
 * @param {string} options.jpType - Journal post type (e.g., 'Incoming', 'Outgoing')
 * @param {string} options.mimeType - Specific MIME type (overrides auto-detection)
 * @param {number} options.baseSize - Base document size in bytes
 * @param {number} options.sizeStep - Size increment per document
 * @param {string} options.extension - File extension (default: .txt)
 * @returns {Object} - Document data object
 */
export function generateDocumentData(baseName, index, options = {}) {
  const {
    testMeta = {},
    jpType = '',
    mimeType = null,
    baseSize = DEFAULT_DOC_SIZE.BASE,
    sizeStep = DEFAULT_DOC_SIZE.STEP,
    extension = '.txt'
  } = options;

  const timestamp = new Date().toISOString();
  const typePrefix = jpType ? `${jpType}_` : '';
  const fileName = `${typePrefix}${baseName}_${index + 1}_${testMeta.testId || Date.now()}${extension}`;

  // Calculate document size
  const calculatedSize = Math.min(
    Math.max(baseSize + index * sizeStep, DEFAULT_DOC_SIZE.MIN),
    DEFAULT_DOC_SIZE.MAX
  );

  // Determine MIME type
  const finalMimeType = mimeType || (extension !== '.txt' ? guessMimeType(fileName) : 'text/plain');

  // Generate content based on MIME type
  let content;
  if (finalMimeType.startsWith('text/')) {
    content = `Performance test document #${index + 1}
Created at: ${timestamp}
Virtual User: ${testMeta.vuId || 'Unknown'}
Test ID: ${testMeta.testId || 'Unknown'}
Document Type: ${jpType || 'Generic'}
Base Name: ${baseName}
Target Size: ${calculatedSize} bytes

${'='.repeat(50)}
PERFORMANCE TEST DATA
${'='.repeat(50)}

This document is generated for performance testing purposes.
Document index: ${index}
MIME type: ${finalMimeType}
Generated content to reach target size of ${calculatedSize} bytes.

${'*'.repeat(Math.max(1, calculatedSize - 400))}`;

    // Trim or pad to reach target size
    if (content.length > calculatedSize) {
      content = content.substring(0, calculatedSize - 3) + '...';
    } else if (content.length < calculatedSize) {
      const padding = 'X'.repeat(calculatedSize - content.length);
      content += padding;
    }
  } else {
    // For binary types, create a placeholder content
    content = `[${finalMimeType.toUpperCase()}-BINARY-DATA-PLACEHOLDER-${calculatedSize}-BYTES]`;
  }

  return {
    name: fileName,
    content: content,
    mimeType: finalMimeType,
    size: calculatedSize,
    tittel: `${jpType ? jpType + ' ' : ''}Document ${index + 1}`, // Norwegian: title
    index: index,
    timestamp: timestamp
  };
}

/**
 * Generate multiple synthetic documents
 * @param {string} baseName - Base name for documents
 * @param {number} count - Number of documents to generate
 * @param {Object} options - Configuration options (same as generateDocumentData)
 * @returns {Object[]} - Array of document data objects
 */
export function generateMultipleDocuments(baseName, count, options = {}) {
  const documents = [];
  for (let i = 0; i < count; i++) {
    documents.push(generateDocumentData(baseName, i, options));
  }
  return documents;
}

// ========================================
// TEST DOCUMENT PRELOADING
// ========================================

/**
 * Default test document configuration
 */
export const DEFAULT_TEST_DOCUMENTS = [
  '1mb.pdf',
  '1mb.docx',
  '3-mb.pdf',
  '5mb.docx',
  '6mb.pdf',
  '10mb.pdf',
  '10mb.docx',
  'PerfTestingGuide.docx',
  'PerfTestScenarios.xlsx',
  'benchmarks.csv'
];

/**
 * Preload real test documents from the testDocuments folder
 * @param {Object} options - Configuration options
 * @param {string[]} options.fileList - List of files to preload (default: DEFAULT_TEST_DOCUMENTS)
 * @param {string} options.basePath - Base path to test documents folder
 * @param {string} options.mode - Loading mode: 'binary' or 'base64' (default: 'binary')
 * @param {boolean} options.verbose - Enable verbose logging (default: true)
 * @returns {Object[]} - Array of preloaded document objects
 */
export function preloadTestDocuments(options = {}) {
  const { fileList = DEFAULT_TEST_DOCUMENTS, basePath = null, mode = 'binary', verbose = true } = options;

  const preloadedDocuments = [];

  // Determine base path
  let documentBasePath = basePath;
  if (!documentBasePath) {
    try {
      const testDataPaths = getTestDataPaths();
      documentBasePath = testDataPaths.testDocuments;
    } catch (e) {
      console.error('🔥 Failed to get test data paths:', e.message);
      return preloadedDocuments;
    }
  }

  if (verbose) {
    console.log(`📂 Preloading ${fileList.length} test documents from ${documentBasePath}...`);
  }

  fileList.forEach((fileName) => {
    const filePath = `${documentBasePath}/${fileName}`;

    try {
      let fileData;
      let processedData;

      if (mode === 'base64') {
        // Load as binary and convert to base64
        const resolvedPath = import.meta.resolve ? import.meta.resolve(filePath) : filePath;
        fileData = open(resolvedPath, 'b');
        const base64Data = encoding.b64encode(fileData, { std: 'RFC4648' });
        processedData = {
          base64Content: base64Data,
          binaryData: fileData
        };
      } else {
        // Load as binary
        const resolvedPath = import.meta.resolve ? import.meta.resolve(filePath) : filePath;
        fileData = open(resolvedPath, 'b');
        processedData = {
          binaryData: fileData
        };
      }

      const mimeType = guessMimeType(fileName);
      const documentTitle = fileName.replace(/\.[^/.]+$/, ''); // Remove extension

      const document = {
        name: fileName,
        mimeType: mimeType,
        tittel: documentTitle,
        size: fileData.length || 0,
        originalPath: filePath,
        mode: mode,
        ...processedData
      };

      preloadedDocuments.push(document);

      if (verbose) {
        console.log(`   ✅ Loaded: ${fileName} (${mimeType}, ${document.size} bytes)`);
      }
    } catch (e) {
      if (verbose) {
        console.warn(`   ⚠️  Failed to load ${filePath}: ${e.message}`);
      }
    }
  });

  if (verbose) {
    console.log(`📦 Successfully preloaded ${preloadedDocuments.length}/${fileList.length} test documents`);
  }

  return preloadedDocuments;
}

/**
 * Get document data from preloaded documents (cycles through available documents)
 * @param {Object[]} preloadedDocuments - Array of preloaded documents
 * @param {number} index - Document index
 * @param {Object} options - Configuration options
 * @param {string} options.jpType - Journal post type for title customization
 * @returns {Object} - Document data object
 */
export function getPreloadedDocumentData(preloadedDocuments, index, options = {}) {
  if (!preloadedDocuments || preloadedDocuments.length === 0) {
    throw new Error('No preloaded documents available');
  }

  const { jpType = '' } = options;
  const docIndex = index % preloadedDocuments.length;
  const sourceDoc = preloadedDocuments[docIndex];

  return {
    name: sourceDoc.name,
    binaryData: sourceDoc.binaryData,
    base64Content: sourceDoc.base64Content,
    mimeType: sourceDoc.mimeType,
    tittel: jpType ? `${jpType}-${sourceDoc.tittel}` : sourceDoc.tittel,
    size: sourceDoc.size,
    mode: sourceDoc.mode,
    originalPath: sourceDoc.originalPath,
    index: docIndex
  };
}

/**
 * Preload external file attachments from specified file paths
 * Supports both binary and text modes with base64 encoding
 * @param {string[]} filePaths - Array of relative file paths to preload
 * @param {Object} options - Configuration options
 * @param {string} options.mode - 'base64' or 'text' mode for file processing
 * @param {boolean} options.allowRepeat - Whether to allow cycling through files
 * @returns {Object[]} - Array of preloaded file attachment objects
 */
export function preloadExternalFiles(filePaths, options = {}) {
  const { mode = 'base64', allowRepeat = true } = options;

  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return [];
  }

  const preloadedFiles = filePaths
    .map((relPath) => {
      try {
        // Try binary open first for base64, fallback to text
        let rawBinary = null;
        let binaryOk = false;
        try {
          const resolvedRelPath = import.meta.resolve ? import.meta.resolve(relPath) : relPath;
          rawBinary = open(resolvedRelPath, 'b');
          binaryOk = Array.isArray(rawBinary) || rawBinary instanceof Uint8Array;
        } catch (e) {
          // ignore, will fallback to text
        }

        let textContent = null;
        if (!binaryOk) {
          try {
            const resolvedRelPath = import.meta.resolve ? import.meta.resolve(relPath) : relPath;
            textContent = open(resolvedRelPath);
          } catch (e2) {
            console.error(`🔥 Failed to open external file '${relPath}': ${e2.message}`);
            return null;
          }
        }

        const fileName = relPath.split(/[/\\]/).pop();
        const mimeType = guessMimeType(fileName);

        if (mode === 'base64') {
          let bytes;
          if (binaryOk) {
            bytes = rawBinary;
          } else {
            // convert string to bytes
            bytes = new TextEncoder().encode(textContent);
          }
          const b64 = encoding.b64encode(bytes, { std: 'RFC4648' });
          return {
            name: fileName,
            mimeType: mimeType,
            size: bytes.length,
            base64Content: b64,
            originalPath: relPath,
            mode: 'base64'
          };
        } else {
          // text mode
          const content = binaryOk ? '[BINARY-DATA-NOT-CONVERTED]' : textContent;
          return {
            name: fileName,
            mimeType: mimeType,
            size: content.length,
            content,
            originalPath: relPath,
            mode: 'text'
          };
        }
      } catch (err) {
        console.error(`🔥 Unexpected error preloading external file '${relPath}': ${err.message}`);
        return null;
      }
    })
    .filter(Boolean);

  if (preloadedFiles.length > 0) {
    console.log(
      `📎 Preloaded ${preloadedFiles.length} external file(s) (mode=${mode}, repeat=${allowRepeat})`
    );
  }

  return preloadedFiles;
}

// ========================================
// DOCUMENT ATTACHMENT WORKFLOWS
// ========================================

/**
 * Attach documents to a journal post (supports both batch and individual modes)
 * @param {Object} config - Test configuration
 * @param {Object} authHeaders - Authentication headers
 * @param {string} jpId - Journal post ID
 * @param {Object} options - Attachment options
 * @param {number} options.documentCount - Number of documents to attach (default: 3)
 * @param {boolean} options.useBatchUpload - Use batch upload mode (default: true)
 * @param {Object[]} options.preloadedDocuments - Array of preloaded documents (optional)
 * @param {boolean} options.useRealDocuments - Use real preloaded documents vs synthetic (default: false)
 * @param {string} options.baseName - Base name for synthetic documents (default: 'PerfTest')
 * @param {string} options.jpType - Journal post type for document naming
 * @param {string} options.vuId - Virtual user ID for logging
 * @param {Object} options.testMeta - Test metadata
 * @returns {boolean} - Success status
 */
export function attachDocumentsToJournalPost(config, authHeaders, jpId, options = {}) {
  const {
    documentCount = 3,
    useBatchUpload = true,
    preloadedDocuments = [],
    useRealDocuments = false,
    baseName = 'PerfTest',
    jpType = '',
    vuId = 'VU-Unknown',
    testMeta = { testId: Date.now().toString(), vuId }
  } = options;

  let finalDocumentCount = documentCount;
  let documentsToAttach = [];

  // Determine document source and count
  if (useRealDocuments && preloadedDocuments.length > 0) {
    finalDocumentCount = Math.min(documentCount, preloadedDocuments.length);

    // Generate documents from preloaded files
    for (let i = 0; i < finalDocumentCount; i++) {
      documentsToAttach.push(getPreloadedDocumentData(preloadedDocuments, i, { jpType }));
    }
  } else {
    // Generate synthetic documents
    documentsToAttach = generateMultipleDocuments(baseName, finalDocumentCount, {
      testMeta,
      jpType
    });
  }

  let attachmentSuccess = false;

  group('Attach Documents to JP', () => {
    if (useBatchUpload && finalDocumentCount > 1) {
      // Batch upload mode
      console.log(
        `📦 ${vuId}: Preparing batch upload of ${finalDocumentCount} documents for ${jpType} JP ${jpId}`
      );

      attachmentSuccess = attachDocumentsBatch(config, authHeaders, jpId, documentsToAttach, vuId, 0);

      if (attachmentSuccess) {
        console.log(
          `✅ ${vuId}: ${finalDocumentCount} documents attached to ${jpType} JP ${jpId} via batch upload`
        );
      } else {
        console.error(`❌ ${vuId}: Failed to batch attach documents to ${jpType} JP ${jpId}`);
      }
    } else {
      // Individual upload mode
      console.log(
        `📎 ${vuId}: Attaching ${finalDocumentCount} documents individually to ${jpType} JP ${jpId}`
      );

      let attachedCount = 0;
      for (let i = 0; i < finalDocumentCount; i++) {
        const docData = documentsToAttach[i];
        const success = attachDocument(config, authHeaders, jpId, docData, vuId, i, i === 0);

        if (success) {
          attachedCount++;
        } else {
          console.error(`❌ ${vuId}: Failed to attach document ${i + 1}: ${docData.name}`);
        }
      }

      attachmentSuccess = attachedCount === finalDocumentCount;
      console.log(
        `✅ ${vuId}: ${attachedCount}/${finalDocumentCount} documents attached to ${jpType} JP ${jpId} individually`
      );
    }
  });

  return attachmentSuccess;
}

/**
 * Simplified document attachment for basic use cases
 * @param {Object} config - Test configuration
 * @param {Object} authHeaders - Authentication headers
 * @param {string} jpId - Journal post ID
 * @param {number} count - Number of documents to attach (default: 1)
 * @param {string} vuId - Virtual user ID for logging
 * @returns {boolean} - Success status
 */
export function attachSimpleDocuments(config, authHeaders, jpId, count = 1, vuId = 'VU-Unknown') {
  return attachDocumentsToJournalPost(config, authHeaders, jpId, {
    documentCount: count,
    useBatchUpload: count > 1,
    useRealDocuments: false,
    vuId: vuId,
    testMeta: { testId: Date.now().toString(), vuId }
  });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate total size of documents
 * @param {Object[]} documents - Array of document objects
 * @returns {number} - Total size in bytes
 */
export function calculateTotalDocumentSize(documents) {
  return documents.reduce((total, doc) => total + (doc.size || 0), 0);
}

/**
 * Get document statistics
 * @param {Object[]} documents - Array of document objects
 * @returns {Object} - Statistics object
 */
export function getDocumentStatistics(documents) {
  if (!documents || documents.length === 0) {
    return {
      count: 0,
      totalSize: 0,
      averageSize: 0,
      mimeTypes: [],
      largestDocument: null,
      smallestDocument: null
    };
  }

  const totalSize = calculateTotalDocumentSize(documents);
  const sizes = documents.map((doc) => doc.size || 0);
  const mimeTypes = [...new Set(documents.map((doc) => doc.mimeType))];

  return {
    count: documents.length,
    totalSize: totalSize,
    averageSize: Math.round(totalSize / documents.length),
    minSize: Math.min(...sizes),
    maxSize: Math.max(...sizes),
    mimeTypes: mimeTypes,
    largestDocument: documents.find((doc) => doc.size === Math.max(...sizes)),
    smallestDocument: documents.find((doc) => doc.size === Math.min(...sizes))
  };
}

/**
 * Validate document data object
 * @param {Object} documentData - Document data to validate
 * @returns {Object} - Validation result { isValid: boolean, errors: string[] }
 */
export function validateDocumentData(documentData) {
  const errors = [];

  if (!documentData) {
    errors.push('Document data is null or undefined');
    return { isValid: false, errors };
  }

  if (!documentData.name || typeof documentData.name !== 'string') {
    errors.push('Document name is required and must be a string');
  }

  if (!documentData.mimeType || typeof documentData.mimeType !== 'string') {
    errors.push('MIME type is required and must be a string');
  }

  if (!documentData.content && !documentData.binaryData && !documentData.base64Content) {
    errors.push('Document must have content, binaryData, or base64Content');
  }

  if (typeof documentData.size !== 'number' || documentData.size < 0) {
    errors.push('Document size must be a non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Complete document attachment workflow with verification
 * Combines document attachment and verification in a single reusable function
 *
 * @param {Object} testConfig - Test configuration object
 * @param {Object} authHeaders - Authentication headers
 * @param {string} jpId - Journal Post ID to attach documents to
 * @param {Object} options - Attachment and verification options
 * @param {number} options.documentCount - Number of documents to attach (default: 3)
 * @param {boolean} options.useBatchUpload - Use batch upload mode (default: true)
 * @param {Array} options.preloadedDocuments - Pre-loaded external documents (optional)
 * @param {boolean} options.useRealDocuments - Use real documents vs synthetic (default: false)
 * @param {string} options.baseName - Base name for synthetic documents (default: 'TestDoc')
 * @param {string} options.jpType - JP type for logging (default: 'JP')
 * @param {string} options.vuId - Virtual User ID for logging
 * @param {Object} options.testMeta - Additional test metadata (optional)
 * @param {boolean} options.enableAttachment - Whether to enable attachment (default: true)
 * @param {boolean} options.enableVerification - Whether to enable verification (default: true)
 * @param {number} options.verificationDelay - Delay before verification in seconds (default: 0.5)
 * @returns {Object} - Result object with success status and attachment count
 */
export function attachDocumentsWithVerification(testConfig, authHeaders, jpId, options = {}) {
  const {
    documentCount = 3,
    useBatchUpload = true,
    preloadedDocuments = [],
    useRealDocuments = false,
    baseName = 'TestDoc',
    jpType = 'JP',
    vuId = 'VU',
    testMeta = {},
    enableAttachment = true,
    enableVerification = true,
    verificationDelay = 0.5
  } = options;

  let attachedCount = 0;
  let success = false;

  if (!enableAttachment) {
    console.log(`ℹ️ ${vuId}: Attachment phase disabled`);
    return { success: true, attachedCount: 0, message: 'Attachment disabled' };
  }

  try {
    // Perform document attachment
    const attachmentSuccess = attachDocumentsToJournalPost(testConfig, authHeaders, jpId, {
      documentCount,
      useBatchUpload,
      preloadedDocuments,
      useRealDocuments: useRealDocuments && preloadedDocuments.length > 0,
      baseName: baseName.replace('.txt', ''),
      jpType,
      vuId,
      testMeta
    });

    attachedCount = attachmentSuccess ? documentCount : 0;
    success = attachmentSuccess;

    // Verification step only if attachment succeeded and verification is enabled
    if (enableVerification && attachedCount > 0) {
      // Small delay to allow backend to process attachments
      if (verificationDelay > 0) {
        sleep(verificationDelay);
      }

      group('Verify JP Documents', () => {
        const listTemplate =
          testConfig.apiConfig.endpoints.jpDocuments ||
          `${testConfig.apiConfig.endpoints.innholdJp}{jpId}/dokumenter`;
        const listPath = listTemplate.replace(/\{jpId\}/g, jpId);
        const listUrl = `${testConfig.baseUrl}${listPath}`;

        console.log(`🔍 ${vuId}: Verifying documents at: ${listUrl}`);

        const listResp = http.get(listUrl, {
          headers: authHeaders,
          timeout: '30s',
          tags: {
            name: '📄 List JP Documents',
            endpoint: 'jp:listDocuments',
            jp_id: jpId,
            url: listUrl
          }
        });

        // Log response details before check (check might suppress errors)
        if (listResp.status !== 200) {
          console.error(`🔥 ${vuId}: Document list request failed - Status: ${listResp.status}`);
          console.error(`📥 Response Body: ${listResp.body?.slice(0, 500)}`);
        }

        const ok = check(listResp, {
          'list_docs: status 200': (r) => r.status === 200,
          'list_docs: has parseable response': (r) => {
            try {
              const body = JSON.parse(r.body);
              // Accept various response structures: array, { data: [] }, { documents: [] }, { dokumenter: [] }, etc.
              const isValid =
                Array.isArray(body) ||
                Array.isArray(body?.data) ||
                Array.isArray(body?.documents) ||
                Array.isArray(body?.dokumenter) || // Norwegian: "documents"
                Array.isArray(body?.items) ||
                Array.isArray(body?.result);
              return isValid;
            } catch (e) {
              console.error(`🔥 ${vuId}: Document list parse error: ${e.message}`);
              return false;
            }
          }
        });

        if (ok) {
          try {
            const parsed = JSON.parse(listResp.body);
            // Try multiple possible array locations (including Norwegian "dokumenter")
            const docs = Array.isArray(parsed)
              ? parsed
              : parsed.data || parsed.documents || parsed.dokumenter || parsed.items || parsed.result || [];

            if (Array.isArray(docs)) {
              const expectedCount = attachedCount; // Expect the number of documents we uploaded
              if (docs.length === expectedCount) {
                console.log(
                  `✅ ${vuId}: Verified ${docs.length} document(s) (attached ${attachedCount}) - Perfect match!`
                );
              } else if (docs.length < expectedCount) {
                console.error(
                  `❌ ${vuId}: Document list (${docs.length}) less than expected (${expectedCount})`
                );
                console.error(`   Some documents may have failed to upload. Check API response and logs.`);
              } else if (docs.length > expectedCount) {
                console.log(
                  `ℹ️ ${vuId}: Found ${docs.length} documents (expected ${expectedCount}) - may include pre-existing documents`
                );
              }
            } else {
              console.warn(`⚠️ ${vuId}: Could not find document array in response`);
            }
          } catch (e) {
            console.warn(`⚠️ ${vuId}: Could not parse document listing response: ${e.message}`);
          }
        } else {
          console.warn(
            `⚠️ ${vuId}: Could not verify documents for JP ${jpId}. Check the endpoint configuration.`
          );
        }
      });
    }

    return { success, attachedCount, message: `Attached ${attachedCount} documents successfully` };
  } catch (error) {
    console.error(`🔥 ${vuId}: Document attachment workflow failed: ${error.message}`);
    return { success: false, attachedCount: 0, message: `Error: ${error.message}` };
  }
}

export default {
  generateDocumentData,
  generateMultipleDocuments,
  preloadTestDocuments,
  preloadExternalFiles,
  getPreloadedDocumentData,
  attachDocumentsToJournalPost,
  attachSimpleDocuments,
  guessMimeType,
  resolveMimeByIndex,
  calculateTotalDocumentSize,
  getDocumentStatistics,
  validateDocumentData,
  attachDocumentsWithVerification,
  DEFAULT_DOC_MIME_TYPES,
  DEFAULT_DOC_SIZE,
  SUPPORTED_MIME_TYPES,
  DEFAULT_TEST_DOCUMENTS
};
