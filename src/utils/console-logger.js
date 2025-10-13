/**
 * ===================================================================
 * VERBOSE LOG BUFFER FOR DETAILED REPORTING
 * ===================================================================
 *
 * This utility captures detailed test execution logs during K6 tests
 * so they can be included in verbose HTML reports. This provides the
 * actual VU details, error information, and step-by-step execution flow.
 */

// Global log buffer to collect verbose logs - using K6's execution context
let verboseLogBuffer = [];
let isCapturing = false;

/**
 * Initialize verbose log capture for detailed reporting
 * Returns the buffer reference to maintain consistency across K6 phases
 */
export function initConsoleCapture() {
  if (isCapturing) return verboseLogBuffer; // Already initialized
  isCapturing = true;

  // Clear any existing buffer
  verboseLogBuffer = [];

  console.log('🔍 Verbose logging initialized for detailed reporting');
  return verboseLogBuffer;
}

/**
 * Add a log entry directly to the buffer (for error tracking)
 */
export function addLogEntry(message, level = 'INFO') {
  if (!isCapturing) {
    console.log(`🔍 DEBUG: addLogEntry() called but isCapturing is false`);
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message,
    level: level
  };

  verboseLogBuffer.push(logEntry);
  console.log(`🔍 DEBUG: Added log entry (${level}): ${message}. Buffer size: ${verboseLogBuffer.length}`);
}

/**
 * Add detailed VU execution log entry
 */
export function logVUActivity(vuId, activity, details = '') {
  if (!isCapturing) return;

  const message = details ? `${vuId}: ${activity} - ${details}` : `${vuId}: ${activity}`;
  addLogEntry(message, 'VU_ACTIVITY');
}

/**
 * Add authentication flow log entry
 */
export function logAuth(vuId, username, success = true, details = '') {
  if (!isCapturing) return;

  const status = success ? '✅' : '❌';
  const message = `${status} ${vuId}: Authentication ${success ? 'successful' : 'failed'} for ${username}${details ? ' - ' + details : ''}`;
  addLogEntry(message, 'AUTH');
}

/**
 * Add API request log entry
 */
export function logAPIRequest(vuId, method, endpoint, status, duration, details = '') {
  if (!isCapturing) return;

  const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
  const message = `${statusIcon} ${vuId}: ${method} ${endpoint} - Status: ${status}, Duration: ${duration}ms${details ? ' - ' + details : ''}`;
  addLogEntry(message, 'API');
}

/**
 * Add JP creation log entry
 */
export function logJPCreation(vuId, jpType, jpName, jpId, success = true) {
  if (!isCapturing) return;

  const status = success ? '✅' : '❌';
  const message = `${status} ${vuId}: ${jpType} Journal Post "${jpName}" ${success ? 'created successfully' : 'creation failed'} - ID: ${jpId}`;
  addLogEntry(message, 'JP_CREATE');
}

/**
 * Add document attachment log entry
 */
export function logDocumentAttachment(vuId, jpId, documentCount, success = true, duration = null) {
  if (!isCapturing) return;

  const status = success ? '✅' : '❌';
  const durationText = duration ? ` (${duration}ms)` : '';
  const message = `${status} ${vuId}: ${documentCount} documents ${success ? 'attached successfully to' : 'failed to attach to'} JP ${jpId}${durationText}`;
  addLogEntry(message, 'DOC_ATTACH');
}

/**
 * Get all captured verbose logs (can pass buffer for K6 phase consistency)
 */
export function getConsoleLog(buffer = null) {
  const logBuffer = buffer || verboseLogBuffer;
  return [...logBuffer]; // Return a copy
}

/**
 * Get verbose logs formatted for HTML display (can pass buffer for K6 phase consistency)
 */
export function getFormattedConsoleLog(buffer = null) {
  const logBuffer = buffer || verboseLogBuffer;
  console.log(
    `🔍 DEBUG: getFormattedConsoleLog() called, buffer length: ${logBuffer.length}, using ${buffer ? 'passed buffer' : 'global buffer'}`
  );

  if (logBuffer.length === 0) {
    return '=== VERBOSE LOGS ===\nNo verbose logs captured during this test run.\n=== END ===';
  }

  let formatted = '=== CAPTURED VERBOSE EXECUTION LOGS ===\n';
  formatted += `Generated at: ${new Date().toISOString()}\n`;
  formatted += `Total log entries: ${logBuffer.length}\n\n`;

  // Group logs by type for better organization
  const logGroups = {
    VU_ACTIVITY: [],
    AUTH: [],
    JP_CREATE: [],
    DOC_ATTACH: [],
    INFO: [],
    OTHER: []
  };

  logBuffer.forEach((entry) => {
    const group = logGroups[entry.level] ? entry.level : 'OTHER';
    logGroups[group].push(entry);
  });

  // Display each group
  Object.keys(logGroups).forEach((level) => {
    const entries = logGroups[level];
    if (entries.length > 0) {
      formatted += `--- ${level.replace('_', ' ')} LOGS ---\n`;
      entries.forEach((entry) => {
        const time = entry.timestamp.substring(11, 23); // Extract time portion
        const levelIcon = getLevelIcon(entry.level);
        formatted += `[${time}] ${levelIcon} ${entry.message}\n`;
      });
      formatted += '\n';
    }
  });

  formatted += '� ADDITIONAL VERBOSE INFORMATION:\n';
  formatted += 'For complete K6 debug output including HTTP request/response details,\n';
  formatted += 'threshold crossings, and DEBU messages, run your test with --verbose flag:\n';
  formatted += 'npm run test:create-multiplejp-with-multiple-document:load:verbose:report\n\n';

  formatted += '=== END OF CAPTURED VERBOSE LOGS ===';
  return formatted;
}

/**
 * Get verbose log statistics (can pass buffer for K6 phase consistency)
 */
export function getConsoleLogStats(buffer = null) {
  const logBuffer = buffer || verboseLogBuffer;
  const stats = {
    totalEntries: logBuffer.length,
    levels: {}
  };

  logBuffer.forEach((entry) => {
    stats.levels[entry.level] = (stats.levels[entry.level] || 0) + 1;
  });

  return stats;
}

/**
 * Clear the verbose log buffer
 */
export function clearConsoleLog() {
  verboseLogBuffer = [];
}

/**
 * Stop console capturing
 */
export function stopConsoleCapture() {
  if (!isCapturing) return;

  isCapturing = false;
  console.log('🔍 Console capture stopped - logs ready for report');
}

/**
 * Get icon for log level
 */
function getLevelIcon(level) {
  switch (level) {
    case 'ERROR':
      return '❌';
    case 'WARN':
      return '⚠️';
    case 'INFO':
      return 'ℹ️';
    case 'DEBUG':
      return '🔍';
    case 'SUCCESS':
      return '✅';
    default:
      return '📝';
  }
}

/**
 * Check if console capture is active
 */
export function isCaptureActive() {
  return isCapturing;
}
