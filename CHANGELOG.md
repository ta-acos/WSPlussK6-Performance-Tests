# Changelog

All notable changes to the WebSak Plus K6 Performance Tests project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2025-10-03

### Added ⭐
- **NEW TEST:** `create-multiplejp-with-multiple-document.js` - Create multiple incoming and outgoing Journal Posts with bulk document attachments
  - Support for dual JP types (incoming dokTypeId=1, outgoing dokTypeId=4)
  - Incoming JP payload with recipients, copy recipients, and due date
  - Outgoing JP payload with standard text templates
  - Binary document support with 10 large test files (1MB-10MB)
  - Synthetic document mode for fast functional testing
  - Batch upload using `dokuments[]` array structure
  - Environment variables: `INCOMING_COUNT`, `OUTGOING_COUNT`, `USE_TEST_DOCS`, `USE_BATCH_UPLOAD`
  
- **Test Documents:** 10 preloaded binary files in `utils/modules/data/testDocuments/`
  - 1mb.pdf, 1mb.docx, 3-mb.pdf, 5mb.docx, 6mb.pdf
  - 10mb.pdf, 10mb.docx
  - PerfTestingGuide.docx, PerfTestScenarios.xlsx, benchmarks.csv
  - Total: ~37MB for realistic performance testing

- **NPM Scripts:** Added comprehensive scripts for multiple JPs test
  - `test:create-multiplejp-with-multiple-document:smoke` - Large documents (2+2 JPs, 10 docs each)
  - `test:create-multiplejp-with-multiple-document:smoke:synthetic` - Synthetic documents (2+2 JPs, 3 docs each)
  - `test:create-multiplejp-with-multiple-document:load` - Load test with large documents
  - `test:create-multiplejp-with-multiple-document:stress` - Stress test with large documents

- **Documentation:**
  - `ARCHITECTURE.md` - Comprehensive system architecture with data flows and diagrams
  - `tests/README-create-multiplejp-with-multiple-document.md` - Detailed test documentation
  - `MULTIPLEJP_IMPLEMENTATION_SUMMARY.md` - Implementation overview
  - `TEST_DOCUMENTS_ENHANCEMENT.md` - Test documents feature details

### Enhanced 🔧
- **jp-module.js:** Enhanced to support binary data in document uploads
  - `buildMultipartFormData()` now prioritizes `binaryData` over text content
  - `buildBatchMultipartFormData()` supports binary files with proper MIME types
  - Content priority: `binaryData || content || base64Content || fallback`

- **package.json:** Improved NPM scripts organization
  - Added descriptive comments for all test sections
  - Improved spacing for better readability
  - Clear separation between test types and variants

- **README.md:** Completely rewritten with:
  - Table of contents with quick navigation
  - Comprehensive test suite overview
  - All environment variables documented
  - Usage examples for all tests
  - Troubleshooting guide
  - Performance metrics reference
  - Quick reference card

### Fixed 🐛
- Document attachment failures in `create-jp-with-multiple-document.js`
- Binary file handling in payload builders
- Document counting logic for different modes

---

## [1.1.1] - 2025-10-03

### Fixed
- Document attachment 404/405 errors
- Centralized payload builders in `jp-module.js`
- Simplified attachment logic (67% code reduction)
- Improved test execution time (87% improvement)

### Added
- `buildJpDocumentPayload()` function in jp-module
- `buildMultipartFormData()` for individual uploads
- `buildBatchMultipartFormData()` for batch uploads
- `FIX_SUMMARY.md` documentation
- `PAYLOAD_BUILDERS_GUIDE.md` documentation

### Changed
- Removed duplicate payload generation code from test files
- Updated `create-jp-with-multiple-document.js` to use centralized builders
- Enhanced error handling in document uploads

---

## [1.1.0] - 2025-10-02

### Removed
- Unused CSV loader (`csv-loader.js`)
- Legacy config directory references
- Outdated documentation sections

### Changed
- Updated README to reflect current project structure
- Consolidated configuration under `utils/modules/config/`

---

## [1.0.0] - 2025-09-30

### Added
- Initial release of modular K6 performance testing framework
- `create-sak.js` - Case creation performance test
- `create-jp.js` - Journal Post creation performance test
- `create-jp-with-multiple-document.js` - JP with multiple documents test
- Scenario-based configuration system (smoke, load, stress, spike, endurance)
- OAuth2 authentication with multi-user support (7 users)
- Centralized configuration management
- HTML report generation
- Pacing and think time utilities
- Error sampling and validation

### Configuration Files
- `autotest.json` - Scenarios and thresholds
- `users-config.json` - OAuth2 credentials
- `websak-api-config.json` - API endpoints

### Utility Modules
- `auth-module.js` - Authentication
- `case-module.js` - Case operations
- `jp-module.js` - Journal Post operations
- `config-manager.js` - Configuration orchestration
- `report-generator.js` - HTML reporting
- `pacing.js` - Think time
- `validation.js` - Response validation
- `error-sampler.js` - Error sampling

---

## Version History Summary

| Version | Date | Key Changes |
|---------|------|-------------|
| **2.0.0** | 2025-10-03 | Multiple JPs test, test documents, binary support, comprehensive docs |
| 1.1.1 | 2025-10-03 | Document attachment fixes, centralized builders |
| 1.1.0 | 2025-10-02 | Code cleanup, removed unused files |
| 1.0.0 | 2025-09-30 | Initial modular framework release |

---

## Migration Guide

### Upgrading from 1.x to 2.0

#### New Test Available
If you want to test multiple JPs with documents:

```powershell
# Old approach: Run single JP test multiple times
npm run test:create-jp-with-multiple-document:smoke

# New approach: Run multiple JPs test once
npm run test:create-multiplejp-with-multiple-document:smoke
```

#### Binary Document Support
If you're creating custom document tests:

```javascript
// Old: Only text content supported
const documentData = {
  name: 'test.pdf',
  content: 'text content',
  mimeType: 'application/pdf'
};

// New: Binary data prioritized
const documentData = {
  name: 'test.pdf',
  binaryData: open('../path/to/file.pdf', 'b'), // Binary mode
  mimeType: 'application/pdf'
};

// Builders automatically use binaryData if available
const formData = buildMultipartFormData(documentData, jpId, 0, true);
```

#### Configuration Changes
No breaking changes in configuration files. All existing tests continue to work.

---

## Future Roadmap

### Planned for 2.1.0
- [ ] Support for additional JP types (internal, reply)
- [ ] Document verification endpoint calls
- [ ] Custom test document selection
- [ ] CI/CD integration templates

### Planned for 2.2.0
- [ ] Parallel JP creation optimization
- [ ] Upload speed metrics per file type
- [ ] Real-time metrics dashboard
- [ ] Distributed load testing support

### Planned for 3.0.0
- [ ] Support for images and archives
- [ ] Document deletion/cleanup functions
- [ ] Advanced workflow scenarios
- [ ] Performance regression detection

---

## Contributing

### How to Contribute
1. Follow existing code patterns
2. Use centralized modules for reusable logic
3. Add tests for new features
4. Update documentation
5. Follow semantic versioning

### Reporting Issues
Include in bug reports:
- Version number
- Test name and scenario
- Environment variables
- Error messages
- Expected vs actual behavior

### Suggesting Features
Open an issue with:
- Use case description
- Expected behavior
- Benefits
- Impact on existing tests

---

## License

[Your License Here]

---

**Maintained by:** Performance Testing Team  
**Last Updated:** October 3, 2025
