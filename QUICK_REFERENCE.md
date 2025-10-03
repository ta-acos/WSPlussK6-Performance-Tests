# Multiple Document Upload - Quick Reference

## 🎯 Quick Start

### Upload 3 Documents (Batch Mode)
```bash
k6 run tests/create-jp-with-multiple-document.js -e DOC_COUNT=3 -e USE_BATCH_UPLOAD=true --vus 1 --iterations 1
```

**Expected Result:**
```
✅ VU1: 3 documents attached successfully
✅ Verified 3 documents
```

---

## 📋 API Payload Structure

### Correct Format (Multi-Document)
```javascript
{
  jpId: "1101114314",
  "dokuments[0].isMainDocument": "true",
  "dokuments[0].orderIndex": "1",
  "dokuments[0].tittel": "First Document",
  "dokuments[0].file": http.file(...),
  "dokuments[1].isMainDocument": "false",
  "dokuments[1].orderIndex": "2",
  "dokuments[1].tittel": "Second Document",
  "dokuments[1].file": http.file(...),
  "dokuments[2].isMainDocument": "false",
  "dokuments[2].orderIndex": "3",
  "dokuments[2].tittel": "Third Document",
  "dokuments[2].file": http.file(...)
}
```

---

## 🔧 Function Usage

### Batch Upload (Recommended)
```javascript
import { attachDocumentsBatch } from '../utils/modules/jp-module.js';

const docs = [doc1, doc2, doc3];
attachDocumentsBatch(config, authHeaders, jpId, docs, vuId, 0);
```

### Individual Upload
```javascript
import { attachDocument } from '../utils/modules/jp-module.js';

for (let i = 0; i < docs.length; i++) {
  attachDocument(config, authHeaders, jpId, docs[i], vuId, i, i === 0);
}
```

### Build Form Data
```javascript
import { buildMultipartFormData, buildBatchMultipartFormData } from '../utils/modules/jp-module.js';

// Single document
const formData = buildMultipartFormData(docData, jpId, 0, true);

// Multiple documents
const batchData = buildBatchMultipartFormData([doc1, doc2, doc3], jpId, 0);
```

---

## 🎛️ Environment Variables

| Variable | Default | Options |
|----------|---------|---------|
| `DOC_COUNT` | 3 | Any number (1-100+) |
| `USE_BATCH_UPLOAD` | true | true, false |
| `SCENARIO` | smoke_test | smoke_test, load_test, stress_test |

---

## ✅ Verification Checklist

- [x] Batch upload works (3 documents) ✅
- [x] Individual upload works ✅
- [x] Correct API structure implemented ✅
- [x] Main document flag working ✅
- [x] Order index correct ✅
- [ ] Test with PDF/DOCX files
- [ ] Test with 10+ documents
- [ ] Load test with multiple VUs

---

## 📊 Test Results Summary

```
Documents Uploaded: 3/3 ✅
Success Rate: 100% ✅
Test Duration: 3.4 seconds ⚡
API Response: 200 OK ✅
Documents Verified: 3+ ✅
```

---

## 🆘 Troubleshooting

### Issue: Only 1 document uploaded
**Solution:** Ensure you're using the new array structure with `dokuments[i]` fields

### Issue: Documents out of order
**Solution:** Check `orderIndex` values (should be 1, 2, 3, etc.)

### Issue: No main document
**Solution:** Set `isMainDocument: true` for first document (index 0)

---

**Status:** ✅ **WORKING**  
**Last Tested:** October 3, 2025  
**See:** [`BREAKTHROUGH.md`](./BREAKTHROUGH.md) for full details
