# WebSak K6 Performance Testing - Quick Start Guide

## 🚀 Quick Start

### Run Single Document Test (Recommended)
```bash
k6 run tests/create-jp-with-multiple-document.js -e SCENARIO=smoke_test -e DOC_COUNT=1 --vus 1 --iterations 1
```

### Run with Custom Settings
```bash
# Load test with 5 users
k6 run tests/create-jp-with-multiple-document.js -e SCENARIO=load_test --vus 5 --duration 30s

# Stress test
k6 run tests/create-jp-with-multiple-document.js -e SCENARIO=stress_test

# Single iteration for debugging
k6 run tests/create-jp-with-multiple-document.js --vus 1 --iterations 1 -e DOC_COUNT=1
```

---

## ✅ What Was Fixed

### Issue 1: Document Attachment Failures
**Problem:** Multiple document uploads were failing with 404/405 errors.

**Solution:** 
- Confirmed WebSak API limitation: Only 1 document per JP supported
- Simplified code to use only the working `/uploadfiletodokument/` endpoint
- Added clear warnings when DOC_COUNT > 1

### Issue 2: No Reusable Payload Logic
**Problem:** Payload preparation code was duplicated and inconsistent.

**Solution:** Created two centralized payload builders:
- `buildJpDocumentPayload(documentData, jpId)` - For JSON payloads
- `buildMultipartFormData(documentData, jpId)` - For file uploads

---

## 📦 Centralized Payload Builders

### 1. JSON Document Payload
Use when submitting document metadata as JSON:

```javascript
import { buildJpDocumentPayload } from '../utils/modules/jp-module.js';

const docData = {
  name: 'test-document.txt',
  content: 'Test content',
  mimeType: 'text/plain',
  size: 1024
};

// Without JP ID
const payload = buildJpDocumentPayload(docData);

// With JP ID (adds jpId and journalpostId fields)
const payloadWithJp = buildJpDocumentPayload(docData, '1101114312');

// Use in request
http.post(url, JSON.stringify(payload), { 
  headers: { 'Content-Type': 'application/json', ...authHeaders }
});
```

**Returns:**
```javascript
{
  navn: 'test-document.txt',
  innhold: 'Test content',
  innholdBase64: undefined,  // or base64 string if provided
  mimeType: 'text/plain',
  storrelse: 1024,
  kilde: undefined,          // or file path if provided
  jpId: 1101114312,          // if jpId provided
  journalpostId: 1101114312  // if jpId provided
}
```

### 2. Multipart Form Data
Use for file upload endpoints:

```javascript
import { buildMultipartFormData } from '../utils/modules/jp-module.js';

const docData = {
  name: 'test-file.pdf',
  content: fileContent,  // or base64Content
  mimeType: 'application/pdf'
};

// Build form data
const formData = buildMultipartFormData(docData, '1101114312');

// Prepare headers (remove Content-Type to let K6 set boundary)
const headers = { ...authHeaders };
delete headers['Content-Type'];

// Upload
http.post(uploadUrl, formData, { headers });
```

**Returns:**
```javascript
{
  file: http.file(content, filename, mimeType),
  jpId: '1101114312',          // if jpId provided
  journalpostId: '1101114312'  // if jpId provided
}
```

---

## 🎯 Function Parameters

### `buildJpDocumentPayload(documentData, jpId)`

**Parameters:**
- `documentData` (Object) - Document data
  - `name` (string) - Document filename
  - `content` (string, optional) - Text content
  - `base64Content` (string, optional) - Base64 encoded content
  - `mimeType` (string) - MIME type (default: 'text/plain')
  - `size` (number) - File size in bytes
  - `originalPath` (string, optional) - Original file path
- `jpId` (string, optional) - Journal Post ID to embed in payload

**Returns:** Object with standardized document payload structure

### `buildMultipartFormData(documentData, jpId)`

**Parameters:**
- `documentData` (Object) - Document data
  - `name` (string) - Document filename
  - `content` (string, optional) - Text content
  - `base64Content` (string, optional) - Base64 encoded content
  - `mimeType` (string) - MIME type
- `jpId` (string, optional) - Journal Post ID to include as form field

**Returns:** Object ready for multipart/form-data upload

---

## 🔧 Using in New Tests

### Example 1: Simple Document Upload
```javascript
import { buildMultipartFormData } from '../utils/modules/jp-module.js';
import http from 'k6/http';

export default function () {
  // Your auth logic here
  const authHeaders = createAuthHeaders(accessToken);
  
  // Create document data
  const docData = {
    name: 'performance-test.txt',
    content: 'Test content for performance testing',
    mimeType: 'text/plain',
    size: 35
  };
  
  // Build multipart form data with JP ID
  const formData = buildMultipartFormData(docData, jpId);
  
  // Remove Content-Type header (K6 will set it with boundary)
  const uploadHeaders = { ...authHeaders };
  delete uploadHeaders['Content-Type'];
  
  // Upload document
  const response = http.post(
    `${baseUrl}/api/websak/api/jp/uploadfiletodokument/?jpId=${jpId}`,
    formData,
    { headers: uploadHeaders }
  );
  
  console.log(`Upload status: ${response.status}`);
}
```

### Example 2: JSON Document Submission
```javascript
import { buildJpDocumentPayload } from '../utils/modules/jp-module.js';
import http from 'k6/http';

export default function () {
  const docData = {
    name: 'metadata-test.json',
    content: JSON.stringify({ test: 'data' }),
    mimeType: 'application/json',
    size: 16
  };
  
  // Build JSON payload with JP ID embedded
  const payload = buildJpDocumentPayload(docData, jpId);
  
  // Submit as JSON
  const response = http.post(
    `${baseUrl}/api/websak/api/some-json-endpoint`,
    JSON.stringify(payload),
    { 
      headers: { 
        'Content-Type': 'application/json',
        ...authHeaders 
      }
    }
  );
}
```

### Example 3: Base64 File Upload
```javascript
import { buildMultipartFormData } from '../utils/modules/jp-module.js';
import encoding from 'k6/encoding';

export default function () {
  // Load file and encode to base64
  const fileContent = open('./test-files/sample.pdf', 'b');
  const base64Content = encoding.b64encode(fileContent);
  
  const docData = {
    name: 'sample.pdf',
    base64Content: base64Content,
    mimeType: 'application/pdf'
  };
  
  // Use centralized builder
  const formData = buildMultipartFormData(docData, jpId);
  
  // Upload
  const headers = { ...authHeaders };
  delete headers['Content-Type'];
  
  http.post(uploadUrl, formData, { headers });
}
```

---

## 📊 WebSak API Endpoints

### Document Upload (Working)
```
POST /api/websak/api/jp/uploadfiletodokument/?jpId={id}
Content-Type: multipart/form-data

Limitation: Replaces existing document (only 1 document per JP)
```

### Document List (Working)
```
GET /api/websak/api/jp/{jpId}/dokumenter
Content-Type: application/json

Returns: { kanImportereDokument: true, dokumenter: [...] }
```

### Other Endpoints (Not Implemented)
All these return 404 or 405:
- `/api/websak/api/jp/{jpId}/dokumenter/ny`
- `/api/websak/api/jp/{jpId}/dokumenter`
- `/api/websak/api/jp/{jpId}/dokument/ny`
- `/api/websak/api/dokument/ny?jpId={jpId}`

---

## 🐛 Troubleshooting

### Test Hangs at Case Creation
**Symptom:** Test waits 30+ seconds at "Creating new case"

**Solution:** Check API availability and credentials:
```bash
# Verify credentials in utils/modules/data/users-config.json
# Check API endpoint in utils/modules/data/websak-api-config.json
# Ensure VPN/network access to autotest01.acoscloud.no
```

### Document Upload Returns 500
**Symptom:** "This request does not have a Content-Type header"

**Solution:** Ensure you're using `buildMultipartFormData()` and removing Content-Type header:
```javascript
const formData = buildMultipartFormData(docData, jpId);
const headers = { ...authHeaders };
delete headers['Content-Type'];  // Critical!
http.post(url, formData, { headers });
```

### Multiple Documents Not Working
**Symptom:** Warning about "WebSak API supports only 1 document per JP"

**Explanation:** This is correct behavior. WebSak API limitation.

**Solution:** 
- Use DOC_COUNT=1 (recommended)
- Or create multiple JPs if you need to test multiple documents

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `utils/modules/jp-module.js` | Core JP functions + payload builders |
| `utils/modules/case-module.js` | Case creation functions |
| `utils/modules/auth-module.js` | Authentication |
| `tests/create-jp-with-multiple-document.js` | Main test script |
| `utils/modules/data/websak-api-config.json` | API configuration |
| `CHANGES_SUMMARY.md` | Detailed change documentation |
| `DOCUMENT_ATTACHMENT_NOTES.md` | Investigation notes |

---

## ✨ Benefits of New Approach

1. **Consistency:** Same payload structure everywhere
2. **Maintainability:** Update logic in one place
3. **Reusability:** Import and use in any test
4. **Clarity:** Clear function names and documentation
5. **Flexibility:** Optional parameters for different scenarios
6. **Type Safety:** JSDoc provides IDE autocomplete

---

## 📖 Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 HTTP Module](https://k6.io/docs/javascript-api/k6-http/)
- [K6 File Uploads](https://k6.io/docs/javascript-api/k6-http/file/)

---

**Last Updated:** October 3, 2025  
**Status:** ✅ Production Ready  
**Maintainer:** Performance Testing Team
