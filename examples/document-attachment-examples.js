/**
 * Document Attachment Utility - Usage Examples
 * 
 * @author Senthilkumar Sengottuvel
 * 
 * This example demonstrates how to use the new document attachment utility 
 * in your K6 performance tests for WebSAK API document uploads.
 */

import { group } from 'k6';
import {
  generateDocumentData,
  generateMultipleDocuments,
  guessMimeType,
  getDocumentStatistics,
  validateDocumentData,
  DEFAULT_TEST_DOCUMENTS,
  SUPPORTED_MIME_TYPES
} from '../src/utils/document-attachment.js';

export default function() {
  console.log('📚 Document Attachment Utility Examples\n');

  // Example 1: Generate synthetic documents
  group('Generate Synthetic Documents', () => {
    console.log('🔹 Example 1: Generate synthetic documents');
    
    const testMeta = { 
      vuId: 'VU1', 
      testId: 'example-' + Date.now() 
    };

    // Generate a single document
    const singleDoc = generateDocumentData('ExampleDoc', 0, {
      testMeta: testMeta,
      jpType: 'Incoming',
      extension: '.txt'
    });
    console.log(`   Generated document: ${singleDoc.name} (${singleDoc.size} bytes)`);

    // Generate multiple documents
    const multiDocs = generateMultipleDocuments('BatchDoc', 3, {
      testMeta: testMeta,
      jpType: 'Outgoing',
      baseSize: 1024,
      sizeStep: 256
    });
    console.log(`   Generated ${multiDocs.length} batch documents`);
    multiDocs.forEach((doc, i) => {
      console.log(`     ${i + 1}. ${doc.name} (${doc.size} bytes)`);
    });
  });

  // Example 2: MIME type detection
  group('MIME Type Detection', () => {
    console.log('\n🔹 Example 2: MIME type detection');
    
    const testFiles = [
      'document.pdf',
      'spreadsheet.xlsx', 
      'presentation.pptx',
      'data.csv',
      'image.jpg',
      'archive.zip',
      'unknown.xyz'
    ];

    testFiles.forEach(fileName => {
      const mimeType = guessMimeType(fileName);
      console.log(`   ${fileName} → ${mimeType}`);
    });

    console.log(`\n   Supported MIME types: ${Object.keys(SUPPORTED_MIME_TYPES).length}`);
  });

  // Example 3: Preload test documents (simulation)
  group('Preload Test Documents', () => {
    console.log('\n🔹 Example 3: Preload test documents');
    console.log('   Available test documents for preloading:');
    
    DEFAULT_TEST_DOCUMENTS.forEach((fileName, i) => {
      const mimeType = guessMimeType(fileName);
      console.log(`     ${i + 1}. ${fileName} (${mimeType})`);
    });

    // Note: Actual preloading requires files to exist:
    // const preloaded = preloadTestDocuments({
    //   fileList: ['1mb.pdf', '5mb.docx'],
    //   verbose: true
    // });
    console.log('\n   💡 Use preloadTestDocuments() to load real files from testDocuments folder');
  });

  // Example 4: Document validation
  group('Document Validation', () => {
    console.log('\n🔹 Example 4: Document validation');

    // Valid document
    const validDoc = {
      name: 'valid-doc.pdf',
      content: 'This is valid content',
      mimeType: 'application/pdf',
      size: 20,
      tittel: 'Valid Document'
    };

    const validation1 = validateDocumentData(validDoc);
    console.log(`   Valid document: ${validation1.isValid ? '✅' : '❌'}`);

    // Invalid document (missing required fields)
    const invalidDoc = {
      name: '',
      content: 'Content without name'
      // Missing mimeType and size
    };

    const validation2 = validateDocumentData(invalidDoc);
    console.log(`   Invalid document: ${validation2.isValid ? '✅' : '❌'}`);
    if (!validation2.isValid) {
      validation2.errors.forEach(error => {
        console.log(`     ❌ ${error}`);
      });
    }
  });

  // Example 5: Document statistics
  group('Document Statistics', () => {
    console.log('\n🔹 Example 5: Document statistics');

    const documents = generateMultipleDocuments('StatsDoc', 5, {
      testMeta: { vuId: 'VU1', testId: 'stats-test' },
      baseSize: 500,
      sizeStep: 200
    });

    const stats = getDocumentStatistics(documents);
    console.log(`   Document count: ${stats.count}`);
    console.log(`   Total size: ${stats.totalSize} bytes`);
    console.log(`   Average size: ${stats.averageSize} bytes`);
    console.log(`   Size range: ${stats.minSize} - ${stats.maxSize} bytes`);
    console.log(`   MIME types: ${stats.mimeTypes.join(', ')}`);
  });

  // Example 6: Usage in actual tests
  group('Usage in Real Tests', () => {
    console.log('\n🔹 Example 6: How to use in real tests');
    console.log('   💡 Simple attachment: attachSimpleDocuments(config, authHeaders, jpId, count, vuId)');
    console.log('   💡 Multiple documents: attachDocumentsToJournalPost(config, authHeaders, jpId, options)');
    console.log('   💡 Preload files: preloadTestDocuments() for real test documents');
    console.log('   💡 Generate synthetic: generateDocumentData(baseName, index, options)');
  });

  console.log('\n📖 For more details, see: src/utils/document-attachment.js');
  console.log('🔧 This utility is already integrated into:');
  console.log('   - tests/api/journalposts/create-jp-with-multiple-document.js');
  console.log('   - tests/api/journalposts/create-multiplejp-with-multiple-document.js');
}

export function setup() {
  console.log('🚀 Document Attachment Utility Examples\n');
  return {};
}

export function teardown() {
  console.log('\n✅ Examples completed successfully!');
}

export const options = {
  iterations: 1,
  vus: 1
};