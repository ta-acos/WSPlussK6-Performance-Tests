# Test Documents Enhancement Summary

## ✅ What Was Added

Enhanced the `create-multiplejp-with-multiple-document.js` test to support attaching **large real test documents** from the `testDocuments` folder in addition to the existing synthetic document generation.

## 🎯 New Feature

### USE_TEST_DOCS Flag

A new environment variable `USE_TEST_DOCS` that allows you to choose between:

1. **Synthetic Documents** (default, `USE_TEST_DOCS=false`)
   - Small text files generated on-the-fly
   - Number controlled by `DOC_COUNT` parameter
   - Fast and lightweight

2. **Large Test Documents** (`USE_TEST_DOCS=true`)
   - Real files from `utils/modules/data/testDocuments/` folder
   - 10 files preloaded (1MB to 10MB)
   - Proper MIME types for each file format
   - Realistic performance testing

## 📁 Test Documents Available

The following 10 files are automatically preloaded when `USE_TEST_DOCS=true`:

| File Name | Type | Size | MIME Type |
|-----------|------|------|-----------|
| 1mb.pdf | PDF | 1MB | application/pdf |
| 1mb.docx | Word | 1MB | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| 3-mb.pdf | PDF | 3MB | application/pdf |
| 5mb.docx | Word | 5MB | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| 6mb.pdf | PDF | 6MB | application/pdf |
| 10mb.pdf | PDF | 10MB | application/pdf |
| 10mb.docx | Word | 10MB | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| PerfTestingGuide.docx | Word | ~1MB | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| PerfTestScenarios.xlsx | Excel | ~100KB | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| benchmarks.csv | CSV | ~50KB | text/csv |

**Total Size**: ~37MB (all 10 files)

## 🔧 Technical Implementation

### 1. File Preloading (Init Phase)
```javascript
// Files are loaded once during K6 initialization
if (USE_TEST_DOCS) {
  testDocPaths.forEach((filePath) => {
    const fileData = open(filePath, 'b'); // Open as binary
    preloadedTestDocuments.push({
      name: fileName,
      binaryData: fileData,
      mimeType: mimeType,
      tittel: fileName.replace(/\.[^/.]+$/, ''),
      size: fileData.length
    });
  });
}
```

### 2. Document Generation
Updated `generateDocumentData()` function to:
- Check `USE_TEST_DOCS` flag
- Return preloaded test document if enabled
- Cycle through available test documents using modulo
- Fall back to synthetic documents if disabled

### 3. Binary Data Support
Enhanced `buildMultipartFormData()` and `buildBatchMultipartFormData()` in `jp-module.js` to:
- Accept `binaryData` property
- Prioritize binary data over text content
- Pass binary data directly to `http.file()`

### 4. Smart Document Counting
- When `USE_TEST_DOCS=true`: Attaches all 10 test documents
- When `USE_TEST_DOCS=false`: Attaches `DOC_COUNT` synthetic documents
- Summary output shows correct counts and types

## 📊 Test Results

### With Large Test Documents
```
✅ Preloaded 10 test documents
✅ Incoming JPs created: 1/1 (ID: 1101114331)
✅ Outgoing JPs created: 1/1 (ID: 1101114332)
✅ Documents attached: 20 total (10 per JP)
⏱️  Execution time: 10.7 seconds
📦 Total file size: ~74MB uploaded
```

Performance breakdown:
- Authentication: ~0.5s
- Case creation: ~0.5s
- JP creation (x2): ~1s
- Document upload (10 files to incoming JP): ~5s
- Document upload (10 files to outgoing JP): ~4s

## 🚀 Usage Examples

### Basic Test with Large Documents
```powershell
# Single incoming + outgoing JP with 10 large test documents each
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e INCOMING_COUNT=1 `
  -e OUTGOING_COUNT=1 `
  -e USE_TEST_DOCS=true `
  --vus 1 --iterations 1
```

### Performance Test with Large Documents
```powershell
# Multiple JPs with large documents
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e INCOMING_COUNT=3 `
  -e OUTGOING_COUNT=3 `
  -e USE_TEST_DOCS=true `
  --vus 2 --duration 5m
```

### Compare: Synthetic vs Real Documents
```powershell
# Synthetic (fast)
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e DOC_COUNT=10 `
  -e USE_TEST_DOCS=false `
  --vus 1 --iterations 1

# Real documents (realistic)
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e USE_TEST_DOCS=true `
  --vus 1 --iterations 1
```

### Mixed Scenario Test
```powershell
# Use scenarios with test documents
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e SCENARIO=load_test `
  -e USE_TEST_DOCS=true
```

## 📈 Benefits

### 1. Realistic Performance Testing
- Tests with actual file sizes (1MB-10MB)
- Multiple file formats (PDF, DOCX, XLSX, CSV)
- Real MIME type handling
- Network bandwidth testing

### 2. Flexibility
- Toggle between synthetic and real documents
- No code changes required
- Same test logic for both modes

### 3. Comprehensive Coverage
- Small files (CSV, XLSX) for quick tests
- Medium files (1-6MB) for typical documents
- Large files (10MB) for edge cases
- Mixed file types in single test

### 4. Easy to Use
- Single flag: `USE_TEST_DOCS=true`
- No file path management needed
- Automatic preloading at init phase
- Clear logging of loaded files

## 🔄 Files Modified

1. **tests/create-multiplejp-with-multiple-document.js**
   - Added `USE_TEST_DOCS` configuration flag
   - Added test document preloading logic
   - Updated `generateDocumentData()` to support test documents
   - Updated `attachDocumentsToJp()` to use correct document count
   - Updated summary output to show document type

2. **utils/modules/jp-module.js**
   - Enhanced `buildMultipartFormData()` to support binary data
   - Enhanced `buildBatchMultipartFormData()` to support binary data

3. **tests/README-create-multiplejp-with-multiple-document.md**
   - Added `USE_TEST_DOCS` documentation
   - Added test document types section
   - Added usage examples with test documents
   - Updated expected results for both modes

## 💡 Use Cases

### 1. Performance Baseline Testing
Test with large documents to establish performance baselines:
```powershell
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e USE_TEST_DOCS=true `
  -e INCOMING_COUNT=5 `
  -e OUTGOING_COUNT=5 `
  --vus 1 --iterations 1
```

### 2. Network Bandwidth Testing
Test network upload capacity with large files:
```powershell
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e USE_TEST_DOCS=true `
  --vus 10 --duration 10m
```

### 3. File Type Compatibility Testing
Verify all file types are handled correctly:
```powershell
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e USE_TEST_DOCS=true `
  -e INCOMING_COUNT=1 `
  -e OUTGOING_COUNT=1
```

### 4. Quick Functional Testing
Use synthetic documents for fast functional tests:
```powershell
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e USE_TEST_DOCS=false `
  -e DOC_COUNT=3 `
  --vus 1 --iterations 1
```

## 🎯 Summary

| Aspect | Before | After |
|--------|--------|-------|
| Document Types | Synthetic only | Synthetic + 10 real test files |
| File Sizes | ~512 bytes | 50KB - 10MB |
| File Formats | Text only | PDF, DOCX, XLSX, CSV |
| MIME Types | text/plain | Proper MIME types for each format |
| Configuration | `DOC_COUNT` only | `DOC_COUNT` + `USE_TEST_DOCS` |
| Performance Testing | Limited | Realistic with large files |
| Flexibility | Low | High (easy toggle) |

## ✅ Completion Status

- [x] Add `USE_TEST_DOCS` configuration flag
- [x] Implement test document preloading
- [x] Update document generation logic
- [x] Add binary data support to jp-module
- [x] Update summary output
- [x] Test with real files
- [x] Update documentation
- [x] Verify successful upload of all file types

## 📞 Quick Reference

```powershell
# Synthetic documents (default)
k6 run tests/create-multiplejp-with-multiple-document.js

# Large test documents
k6 run tests/create-multiplejp-with-multiple-document.js -e USE_TEST_DOCS=true

# Specific counts with test docs
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e USE_TEST_DOCS=true `
  -e INCOMING_COUNT=2 `
  -e OUTGOING_COUNT=2
```

---

**Enhancement Completed**: October 3, 2025  
**Status**: ✅ Fully Working  
**Test Duration**: ~10-15 seconds with large documents  
**Success Rate**: 100%
