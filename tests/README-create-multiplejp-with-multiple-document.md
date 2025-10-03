# Create Multiple JPs with Multiple Documents Test

## Overview

This test creates multiple Journal Posts (both incoming and outgoing types) in a WebSak case and attaches multiple documents to each JP using the batch upload capability.

## Test Flow

1. **Authentication** - Authenticate using OAuth2 client credentials
2. **Create Case** - Create a new case using available templates
3. **Get JP Templates** - Retrieve available Journal Post templates for the case
4. **Create Incoming JPs** - Create N incoming Journal Posts with user-specified payload
5. **Create Outgoing JPs** - Create N outgoing Journal Posts with standard payload
6. **Attach Documents** - Attach M documents to each JP (both incoming and outgoing)

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INCOMING_COUNT` | 2 | Number of incoming JPs to create |
| `OUTGOING_COUNT` | 2 | Number of outgoing JPs to create |
| `DOC_COUNT` | 3 | Number of synthetic documents to attach per JP (ignored if USE_TEST_DOCS=true) |
| `USE_BATCH_UPLOAD` | true | Use batch upload (all docs in one request) vs individual uploads |
| `USE_TEST_DOCS` | false | Attach large test documents from testDocuments folder instead of synthetic docs |
| `SCENARIO` | smoke_test | Test scenario (smoke_test, load_test, stress_test, etc.) |
| `APDEX_T` | 500 | Apdex threshold in milliseconds for report |

## Usage Examples

### Quick Test (Smoke Test)
```powershell
# Create 2 incoming + 2 outgoing JPs with 3 documents each
k6 run tests/create-multiplejp-with-multiple-document.js -e INCOMING_COUNT=2 -e OUTGOING_COUNT=2 -e DOC_COUNT=3 --vus 1 --iterations 1
```

### Custom Counts
```powershell
# Create 5 incoming + 3 outgoing JPs with 5 documents each
k6 run tests/create-multiplejp-with-multiple-document.js -e INCOMING_COUNT=5 -e OUTGOING_COUNT=3 -e DOC_COUNT=5 --vus 1 --iterations 1
```

### Individual Upload Mode
```powershell
# Use individual upload instead of batch
k6 run tests/create-multiplejp-with-multiple-document.js -e USE_BATCH_UPLOAD=false -e DOC_COUNT=3 --vus 1 --iterations 1
```

### With Large Test Documents
```powershell
# Attach real large test documents (10 files: 1MB-10MB PDFs, DOCX, XLSX, CSV)
k6 run tests/create-multiplejp-with-multiple-document.js -e INCOMING_COUNT=1 -e OUTGOING_COUNT=1 -e USE_TEST_DOCS=true --vus 1 --iterations 1
```

### Load Test
```powershell
# Run with multiple virtual users
k6 run tests/create-multiplejp-with-multiple-document.js -e INCOMING_COUNT=2 -e OUTGOING_COUNT=2 -e DOC_COUNT=3 --vus 5 --iterations 10
```

### Using Test Scenarios
```powershell
# Use predefined smoke_test scenario
k6 run tests/create-multiplejp-with-multiple-document.js -e SCENARIO=smoke_test -e INCOMING_COUNT=1 -e OUTGOING_COUNT=1 -e DOC_COUNT=2

# Use load_test scenario (from autotest.json config)
k6 run tests/create-multiplejp-with-multiple-document.js -e SCENARIO=load_test -e INCOMING_COUNT=3 -e OUTGOING_COUNT=3 -e DOC_COUNT=5
```

## JP Payload Structures

### Incoming JP Payload
The incoming JP uses `dokTypeId: 1` and `dokStatusId: 7` with recipient configuration:
- **nyeMottakere**: New recipients (e.g., "TestAutomation - Arkivar")
- **nyeKopiMottakere**: New copy recipients (e.g., "TestAutomation - Saksbehandler")
- **forfallsDato**: Due date (21 days from creation)

### Outgoing JP Payload
The outgoing JP uses `dokTypeId: 4` and `dokStatusId: 6` with standard text templates.

## Document Attachment

### Test Document Types

#### Synthetic Documents (Default)
When `USE_TEST_DOCS=false`:
- Small text files generated on-the-fly
- Number controlled by `DOC_COUNT` environment variable
- Fast to generate and upload
- Ideal for functional testing and high-volume scenarios

#### Large Test Documents
When `USE_TEST_DOCS=true`:
- Real files from `utils/modules/data/testDocuments/` folder
- 10 files preloaded: 1MB-10MB PDFs, DOCX, XLSX, CSV
- Proper MIME types for each file format
- Ideal for performance testing with realistic file sizes
- Files included:
  - **PDFs**: 1mb.pdf, 3-mb.pdf, 6mb.pdf, 10mb.pdf
  - **DOCX**: 1mb.docx, 5mb.docx, 10mb.docx, PerfTestingGuide.docx
  - **XLSX**: PerfTestScenarios.xlsx
  - **CSV**: benchmarks.csv

### Batch Upload (Default)
When `USE_BATCH_UPLOAD=true`:
- All documents are uploaded in a single HTTP request
- Uses `dokuments[i]` array structure
- Faster performance (recommended)
- Example: 3 documents = 1 API call, 10 test docs = 1 API call

### Individual Upload
When `USE_BATCH_UPLOAD=false`:
- Each document is uploaded separately
- Uses `dokuments[i]` array structure with sequential indices
- Useful for debugging or when batch fails
- Example: 3 documents = 3 API calls, 10 test docs = 10 API calls

## Expected Results

### Synthetic Documents (Default)
For the default configuration (2 incoming + 2 outgoing, 3 synthetic docs each):
- **Total JPs created**: 4
- **Total documents attached**: 12 (3 per JP)
- **Execution time**: ~5-7 seconds (single VU)

### Large Test Documents
For test document configuration (1 incoming + 1 outgoing, 10 large test docs each):
- **Total JPs created**: 2
- **Total documents attached**: 20 (10 per JP)
- **Total file size**: ~70MB (35MB per JP)
- **Execution time**: ~10-15 seconds (single VU)

## Test Metrics

The test tracks:
- Authentication success rate
- Case creation success rate
- JP creation success rate (by type)
- Document attachment success rate
- HTTP request durations
- Error rates

## Output Files

After running the test, two report files are generated:
1. `reports/create-multiplejp-with-multiple-document-report.html` - HTML report with charts
2. `reports/create-multiplejp-with-multiple-document-summary.json` - JSON summary data

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/identityserver/connect/token` | POST | OAuth2 authentication |
| `/api/websak/api/sak/{caseId}/maler` | GET | Get case templates |
| `/api/websak/api/sak/ny` | POST | Create new case |
| `/api/websak/api/jp/{caseId}/jpmaler` | GET | Get JP templates |
| `/api/websak/api/jp/ny` | POST | Create new JP |
| `/api/websak/api/jp/uploadfiletodokument/` | POST | Upload documents to JP |

## Customization

### Modify Incoming JP Payload
Edit the `generateIncomingJpPayload()` function in the test file to change:
- Document type ID (`dokTypeId`)
- Document status ID (`dokStatusId`)
- Recipients (`nyeMottakere`, `nyeKopiMottakere`)
- Due date calculation (`forfallsDato`)

### Modify Outgoing JP Payload
Edit the `generateOutgoingJpPayload()` function to change:
- Document type ID (`dokTypeId`)
- Document status ID (`dokStatusId`)
- Standard text templates (`standardTekster`)

### Document Content
Edit the `generateDocumentData()` function to customize:
- File names
- File content
- MIME types
- Document titles

## Troubleshooting

### Authentication Fails
- Verify users are configured in `utils/modules/data/users-config.json`
- Check that credentials are valid (not placeholders)
- Ensure OAuth2 client credentials flow is enabled

### JP Creation Fails
- Check that JP templates are available for the case
- Verify `dokTypeId` and `dokStatusId` are valid
- Ensure recipients have valid IDs

### Document Attachment Fails
- Verify the JP ID exists
- Check document format (array structure with `dokuments[i]`)
- Try individual upload mode if batch fails

### Performance Issues
- Reduce `DOC_COUNT` if uploads are slow
- Increase timeouts if network is slow
- Use batch upload mode for better performance

## Notes

- The test uses the **correct WebSak API array structure** (`dokuments[i]`) discovered through browser DevTools
- Batch upload is recommended for performance (single API call for all documents)
- Each JP type (incoming/outgoing) has different payload requirements
- The test automatically selects the first available JP template
- Random sleep delays are applied between operations (configurable in config)

## Related Documentation

- [BREAKTHROUGH.md](../BREAKTHROUGH.md) - Details about the document upload API discovery
- [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - Quick reference for common operations
- [jp-module.js](../utils/modules/jp-module.js) - JP and document attachment functions
