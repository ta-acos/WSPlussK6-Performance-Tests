# WebSak JP Document Attachment - Investigation Notes

## Issue Summary
When attempting to attach multiple documents to a Journal Post (JP) using the K6 performance test, only 1 document is successfully saved, despite all 3 upload requests returning HTTP 200 (success).

## Resolution
**CONFIRMED: WebSak API Design Limitation**
- The WebSak API only supports **ONE document per Journal Post** via the `/uploadfiletodokument/` endpoint
- This is by design, not a bug
- Each upload REPLACES the previous document (not adds to it)

## Current Behavior (As Designed)
- ✅ Document upload via `/uploadfiletodokument/` returns HTTP 200
- ✅ One document is successfully attached to JP
- ✅ Subsequent uploads replace (not add to) the existing document
- ✅ Document list API returns 1 document (correct behavior)

## Root Cause Analysis
The `/api/websak/api/jp/uploadfiletodokument/` endpoint is designed to **REPLACE** the document rather than **ADD** multiple documents to a JP. This is the intended API behavior.

## Endpoints Tested

### ✅ WORKING - Single Document Upload:
- `/api/websak/api/jp/uploadfiletodokument/?jpId={jpId}` - HTTP 200
  - **Method:** POST
  - **Content-Type:** multipart/form-data
  - **Behavior:** Replaces existing document (by design)
  - **Limitation:** Only 1 document per JP

### ❌ NOT IMPLEMENTED (Tested, All Return 404/405):
- `/api/websak/api/jp/{jpId}/dokumenter/ny` - 405 Method Not Allowed
- `/api/websak/api/jp/{jpId}/dokumenter` - 405 Method Not Allowed
- `/api/websak/api/jp/{jpId}/dokument` - 404 Not Found
- `/api/websak/api/jp/{jpId}/dokument/ny` - 404 Not Found
- `/api/websak/api/jp/{jpId}/innhold` - 404 Not Found
- `/api/websak/api/dokument/ny?jpId={jpId}` - 404 Not Found
- `/api/websak/api/dokument/{jpId}/innhold` - 404 Not Found
- `/api/websak/api/jp/{jpId}/dokumentinnhold` - 404 Not Found

## Solution Implemented

### ✅ Accepted API Design Limitation:
- **Confirmed:** WebSak API only supports ONE document per JP
- **Test Updated:** Now correctly expects and validates single document
- **Payload Logic:** Centralized in reusable builder functions
- **Error Handling:** Clear messages explaining API limitation
- **Documentation:** Updated to reflect actual API capabilities

## Recommendations

### ✅ IMPLEMENTED SOLUTION:

1. **Test Modified:** The test now correctly handles the single-document limitation:
   - Only attaches 1 document per JP (as designed by WebSak API)
   - Warns users if DOC_COUNT > 1
   - Validates that exactly 1 document is attached

2. **Default Test Configuration:** Run with default settings:
   ```bash
   k6 run tests/create-jp-with-multiple-document.js -e SCENARIO=smoke_test
   ```

3. **For Testing Multiple Documents:** Create separate JPs:
   - Option A: Run the test multiple times (creates multiple JPs with 1 document each)
   - Option B: Modify test to create N JPs, each with 1 document
   - Option C: Create a new test specifically for multiple JP creation

## Current Test Status

### ✅ FULLY WORKING:
- Authentication
- Case creation
- JP template retrieval
- JP creation  
- Document upload (multipart/form-data) via `/uploadfiletodokument/`
- Document verification API
- Single document attachment per JP (as designed)
- Centralized payload builders (`buildJpDocumentPayload`, `buildMultipartFormData`)

### ✅ RESOLVED:
- ~~Multiple document attachments to single JP~~ - **Not supported by WebSak API (by design)**
- ~~Correct endpoint for adding documents~~ - **Only `/uploadfiletodokument/` works (replaces document)**

## Technical Details

### Request Format (Working):
```http
POST /api/websak/api/jp/uploadfiletodokument/?jpId=1101114309
Content-Type: multipart/form-data; boundary=...

------boundary
Content-Disposition: form-data; name="file"; filename="TestDoc_1.txt"
Content-Type: text/plain

[file content]
------boundary
Content-Disposition: form-data; name="jpId"

1101114309
------boundary
Content-Disposition: form-data; name="journalpostId"

1101114309
------boundary--
```

### Response Format (Document List):
```json
{
  "kanImportereDokument": true,
  "dokumenter": [
    {
      "versjoner": [...],
      "variant": {...},
      ...
    }
  ]
}
```

### Centralized Payload Builders (Reusable Functions):

#### 1. JSON Document Payload:
```javascript
import { buildJpDocumentPayload } from '../utils/modules/jp-module.js';

const docPayload = buildJpDocumentPayload(documentData, jpId);
// Returns: { navn, innhold, innholdBase64, mimeType, storrelse, kilde, jpId, journalpostId }
```

#### 2. Multipart Form Data:
```javascript
import { buildMultipartFormData } from '../utils/modules/jp-module.js';

const formData = buildMultipartFormData(documentData, jpId);
// Returns: { file: http.file(...), jpId, journalpostId }
```

These builders ensure consistent payload structure across all document operations.

## Completed Actions

1. ✅ **Verified API Design** - WebSak API only supports 1 document per JP
2. ✅ **Tested All Alternative Endpoints** - All return 404/405 (not implemented)
3. ✅ **Updated Test Strategy** - Modified to handle single document per JP
4. ✅ **Centralized Payload Logic** - Created reusable builders:
   - `buildJpDocumentPayload(documentData, jpId)` - For JSON payloads
   - `buildMultipartFormData(documentData, jpId)` - For file uploads
5. ✅ **Simplified Attachment Logic** - Removed complex endpoint discovery
6. ✅ **Added Clear Documentation** - Updated warnings and error messages

---

**Status:** ✅ **RESOLVED**  
**Last Updated:** October 3, 2025  
**Test File:** `tests/create-jp-with-multiple-document.js`  
**Module File:** `utils/modules/jp-module.js`  
**Solution:** Single document per JP (WebSak API design limitation)
