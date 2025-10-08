/**
 * WebSak Case Management Module
 *
 * Responsibilities:
 *  - Retrieve case templates (sakmaler)
 *  - Resolve supporting register data (sakstyper, avgjorelsekoder, etc.)
 *  - Generate a consistent case creation payload
 *  - Create new cases and return normalized response metadata
 *
 * Typical usage:
 *   import { getTemplates, createCase, generateCaseTestData } from '../utils/modules/case-module.js';
 *   const templates = getTemplates(config, authHeaders, vuId);
 *   const testData = generateCaseTestData('PerfCase', vuId);
 *   const caseInfo = createCase(config, authHeaders, templates, testData, vuId);
 */

import { check, group } from 'k6';
import http from 'k6/http';
import { recordError } from '../utils/error-tracker.js';
import { generateCasePayload } from './payload-module.js';

/**
 * Retrieve available case templates (Sakmaler)
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Array} Array of available templates
 */
export function getTemplates(config, authHeaders, vuId) {
  let availableTemplates = [];

  group('Get Case Templates', () => {
    console.log(`📋 ${vuId}: Retrieving available case templates`);

    const endpoint = `${config.baseUrl}${config.apiConfig.endpoints.sakmaler}`;
    const templatesResponse = http.get(endpoint, {
      headers: authHeaders,
      timeout: '30s',
      tags: { name: 'getTemplates', group: 'case' }
    });
    recordError(templatesResponse, {
      endpoint: 'templates:list',
      errorType: 'http_error',
      message: 'Get Templates failed'
    });

    // Validate templates response
    const templatesSuccess = check(templatesResponse, {
      'templates: status is 200': (r) => {
        if (r.status !== 200) {
          console.error(`🔥 ${vuId}: Templates request failed - Status: ${r.status}`);
          console.error(`📥 Response Body: ${r.body}`);
        }
        return r.status === 200;
      },
      'templates: response has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          const hasData = Array.isArray(body) || (body.data && Array.isArray(body.data));
          if (!hasData) {
            console.error(`🔥 ${vuId}: Templates response missing expected data structure`);
          }
          return hasData;
        } catch (e) {
          console.error(`🔥 ${vuId}: Templates response parse error:`, e.message);
          return false;
        }
      },
      'templates: response time < 1.5s': (r) => r.timings.duration < 1500
    });

    if (templatesSuccess && templatesResponse.status === 200) {
      try {
        const templatesBody = JSON.parse(templatesResponse.body);
        availableTemplates = Array.isArray(templatesBody) ? templatesBody : templatesBody.data || [];
        console.log(`✅ ${vuId}: Retrieved ${availableTemplates.length} case templates`);
      } catch (e) {
        console.error(`🔥 ${vuId}: Failed to parse templates response:`, e.message);
      }
    }
  });

  return availableTemplates;
}

/**
 * Create a new case (Sak)
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {Array} templates - Available templates
 * @param {Object} testData - Test data with case name and description
 * @param {string} vuId - Virtual User identifier for logging
 * @param {Array} sakstyper - Available case types (optional, for ID resolution)
 * @param {Array} avgjorelsekoder - Available decision codes (optional, for ID resolution)
 * @returns {Object|null} Created case data or null if creation failed
 */
export function createCase(
  config,
  authHeaders,
  templates,
  testData,
  vuId,
  sakstyper = [],
  avgjorelsekoder = []
) {
  let caseData = null;

  group('Create New Case', () => {
    console.log(`📝 ${vuId}: Creating new case "${testData.caseName}"`);

    // Skip case creation if no templates available
    if (templates.length === 0) {
      console.error(`❌ ${vuId}: No templates available - skipping case creation`);
      return null;
    }

    // Resolve a template based on multiple candidate names (malName, sakType, sakTypeName)
    const candidateNames = [
      config.apiConfig.standardTemplate.malName,
      config.apiConfig.standardTemplate.sakType,
      config.apiConfig.standardTemplate.sakTypeName
    ].filter(Boolean);

    let selectedTemplate = null;
    for (const candidate of candidateNames) {
      selectedTemplate = templates.find(
        (template) =>
          template.tittel === candidate || template.kode === candidate || template.beskrivelse === candidate
      );
      if (selectedTemplate) break;
    }

    // Explicit fallback: prefer a template whose title includes 'Ny sak' if not matched
    if (!selectedTemplate) {
      selectedTemplate = templates.find((t) => /ny sak/i.test(t.tittel || '')) || templates[0];
    }

    if (!selectedTemplate || !selectedTemplate.id) {
      console.error(
        `🔥 ${vuId}: Could not resolve a valid template from candidates: ${candidateNames.join(', ')}`
      );
      console.error(
        `📋 Available templates: ${templates
          .slice(0, 5)
          .map((t) => `"${t.tittel}"`)
          .join(', ')}`
      );
      return null;
    }

    console.log(`🎯 ${vuId}: Using template: "${selectedTemplate.tittel}" (ID: ${selectedTemplate.id})`);

    // Resolve IDs from names in config file configuration
    const resolvedIds = resolveIdsFromNames(config, selectedTemplate, sakstyper, avgjorelsekoder, vuId);

    // Generate case payload using centralized function with resolved IDs
    const casePayload = generateCasePayload(selectedTemplate, testData, config, resolvedIds);

    const endpoint = `${config.baseUrl}${config.apiConfig.endpoints.sak}`;
    const createResponse = http.post(endpoint, JSON.stringify(casePayload), {
      headers: authHeaders,
      timeout: '30s',
      tags: {
        name: '📝 Create New Case',
        template_id: selectedTemplate.id,
        url: endpoint
      }
    });
    recordError(createResponse, {
      endpoint: 'cases:create',
      errorType: 'http_error',
      message: 'Create Case failed'
    });

    // Validate case creation response
    check(createResponse, {
      'create: status is 200 or 201': (r) => {
        if (r.status !== 200 && r.status !== 201) {
          console.error(`🔥 ${vuId}: Case creation failed - Status: ${r.status}`);
          console.error(`📥 Response Body: ${r.body}`);
        }
        return r.status === 200 || r.status === 201;
      },
      'create: response has case ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          const hasId = body.id || body.caseId || body.sakId;
          return !!hasId;
        } catch (e) {
          return false;
        }
      },
      'create: response time < 3s': (r) => r.timings.duration < 3000
    });

    if (createResponse.status === 200 || createResponse.status === 201) {
      try {
        const createBody = JSON.parse(createResponse.body);
        const caseId = createBody.id || createBody.caseId || createBody.sakId;

        caseData = {
          id: caseId,
          name: testData.caseName,
          description: testData.caseDescription,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.tittel,
          response: createBody
        };

        console.log(`✅ ${vuId}: Case created successfully - ID: ${caseId}`);
      } catch (e) {
        console.log(`✅ ${vuId}: Case creation successful (response parse issue)`);
        // Still consider it successful if status is 200/201
        caseData = {
          id: null,
          name: testData.caseName,
          description: testData.caseDescription,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.tittel,
          response: null
        };
      }
    }
  });

  return caseData;
}

/**
 * Resolve IDs from names configured in Config file
 * @param {Object} config - Test configuration object
 * @param {Object} selectedTemplate - Selected template object
 * @param {Array} sakstyper - Available case types
 * @param {Array} avgjorelsekoder - Available decision codes
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Object} Object containing resolved IDs { malId, sakTypeId, avgjkodeid }
 */
export function resolveIdsFromNames(config, selectedTemplate, sakstyper, avgjorelsekoder, vuId) {
  // Track warnings so we don't spam the same unresolved avgjkode message endlessly
  if (!globalThis.__avgjkodeWarned) {
    globalThis.__avgjkodeWarned = new Set();
  }

  const resolved = {
    malId: selectedTemplate.id, // Use the selected template ID
    sakTypeId: null,
    avgjkodeid: null
  };

  // Resolve SakTypeId from SakTypeName
  const sakTypeName = config?.apiConfig?.standardTemplate?.sakTypeName;
  if (sakTypeName && sakstyper.length > 0) {
    const sakType = sakstyper.find(
      (st) =>
        st.tittel === sakTypeName ||
        st.navn === sakTypeName ||
        st.beskrivelse === sakTypeName ||
        st.kode === sakTypeName
    );
    if (sakType) {
      resolved.sakTypeId = sakType.id || sakType.sakTypeId;
      console.log(`✅ ${vuId}: Resolved SakType "${sakTypeName}" to ID: ${resolved.sakTypeId}`);
    } else {
      console.warn(`⚠️ ${vuId}: Could not resolve SakType "${sakTypeName}" - using default`);
    }
  }

  // Resolve avgjkodeid from AvgjkodeName
  // Allow environment override of decision code name
  const avgjkodeName =
    (__ENV.AVGJKODE_NAME || __ENV.AVGJCODE || __ENV.AVGJKODE || '').trim() ||
    config?.apiConfig?.standardTemplate?.avgjkodeName;
  if (avgjkodeName && avgjorelsekoder.length > 0) {
    const normTarget = avgjkodeName.trim().toLowerCase();
    let avgjkode = avgjorelsekoder.find(
      (ak) =>
        (ak.tittel && ak.tittel.toLowerCase() === normTarget) ||
        (ak.navn && ak.navn.toLowerCase() === normTarget) ||
        (ak.beskrivelse && ak.beskrivelse.toLowerCase() === normTarget) ||
        (ak.kode && ak.kode.toLowerCase() === normTarget)
    );
    if (!avgjkode) {
      avgjkode = avgjorelsekoder.find((ak) =>
        Object.values(ak).some((v) => typeof v === 'string' && v.toLowerCase() === normTarget)
      );
    }
    // Support composite patterns like "PV - På vent" (code + description) or "PV På vent"
    if (!avgjkode) {
      const compositeParts = avgjkodeName
        .split(/[-–]|\s{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      // If explicit dash form: take left side as code, right side as description
      if (avgjkodeName.includes('-')) {
        const [left, right] = avgjkodeName.split('-').map((p) => p.trim());
        if (left && right) {
          const leftNorm = left.toLowerCase();
          const rightNorm = right.toLowerCase();
          avgjkode = avgjorelsekoder.find(
            (ak) =>
              (ak.kode &&
                ak.kode.toLowerCase() === leftNorm &&
                ((ak.beskrivelse && ak.beskrivelse.toLowerCase() === rightNorm) ||
                  (ak.tittel && ak.tittel.toLowerCase() === rightNorm) ||
                  (ak.navn && ak.navn.toLowerCase() === rightNorm))) ||
              // Allow description partial contains match if exact not found
              (ak.kode &&
                ak.kode.toLowerCase() === leftNorm &&
                ((ak.beskrivelse && ak.beskrivelse.toLowerCase().includes(rightNorm)) ||
                  (ak.tittel && ak.tittel.toLowerCase().includes(rightNorm)) ||
                  (ak.navn && ak.navn.toLowerCase().includes(rightNorm))))
          );
        }
      }
      // Fallback: if we have at least 2 tokens, try first token as code and remainder as description
      if (!avgjkode && compositeParts.length >= 2) {
        const codeCandidate = compositeParts[0].toLowerCase();
        const descCandidate = compositeParts.slice(1).join(' ').toLowerCase();
        avgjkode = avgjorelsekoder.find(
          (ak) =>
            ak.kode &&
            ak.kode.toLowerCase() === codeCandidate &&
            ((ak.beskrivelse && ak.beskrivelse.toLowerCase() === descCandidate) ||
              (ak.beskrivelse && ak.beskrivelse.toLowerCase().includes(descCandidate)) ||
              (ak.tittel && ak.tittel.toLowerCase() === descCandidate) ||
              (ak.tittel && ak.tittel.toLowerCase().includes(descCandidate)) ||
              (ak.navn && ak.navn.toLowerCase() === descCandidate) ||
              (ak.navn && ak.navn.toLowerCase().includes(descCandidate)))
        );
      }
    }
    // Try partial (contains) match if still not found
    if (!avgjkode) {
      avgjkode = avgjorelsekoder.find((ak) =>
        ['tittel', 'navn', 'beskrivelse', 'kode'].some(
          (k) => typeof ak[k] === 'string' && ak[k].toLowerCase().includes(normTarget)
        )
      );
    }
    if (avgjkode) {
      resolved.avgjkodeid = avgjkode.id || avgjkode.avgjkodeId;
      console.log(`✅ ${vuId}: Resolved Avgjkode "${avgjkodeName}" to ID: ${resolved.avgjkodeid}`);
    } else {
      // Fallback: choose first selectable or first element to maintain deterministic behavior
      const fallback = avgjorelsekoder.find((a) => a.selectable) || avgjorelsekoder[0];
      if (fallback) {
        resolved.avgjkodeid = fallback.id || fallback.avgjkodeId || null;
      }
      const warnKey = `${avgjkodeName}`;
      if (!globalThis.__avgjkodeWarned.has(warnKey)) {
        globalThis.__avgjkodeWarned.add(warnKey);
        const sample = avgjorelsekoder
          .slice(0, 5)
          .map((ak) => JSON.stringify(ak))
          .join('; ');
        if (fallback) {
          console.warn(
            `⚠️ ${vuId}: Could not resolve Avgjkode "${avgjkodeName}" - falling back to "${fallback.kode || fallback.tittel || fallback.beskrivelse}" (ID: ${resolved.avgjkodeid}). Sample: ${sample}`
          );
        } else {
          console.warn(
            `⚠️ ${vuId}: Could not resolve Avgjkode "${avgjkodeName}" and no fallback available. Sample: ${sample}`
          );
        }
      }
    }
  }

  return resolved;
}

/**
 * Fetch sakstyper (case types) from API
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Array} Array of case types
 */
export function getSakstyper(config, authHeaders, vuId) {
  console.log(`📋 ${vuId}: Fetching sakstyper (case types)`);

  const response = http.get(`${config.baseUrl}${config.apiConfig.endpoints.sakstyper}`, {
    headers: authHeaders,
    timeout: '30s',
    tags: { name: '📑 Get Case Types (Sakstyper)' }
  });

  if (response.status === 200) {
    try {
      const data = JSON.parse(response.body);
      console.log(`✅ ${vuId}: Retrieved ${Array.isArray(data) ? data.length : 0} case types`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`🔥 ${vuId}: Failed to parse sakstyper response:`, e.message);
      return [];
    }
  } else {
    console.error(`🔥 ${vuId}: Failed to fetch sakstyper - Status: ${response.status}`);
    return [];
  }
}

/**
 * Fetch avgjorelsekoder (decision codes) from API
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Array} Array of decision codes
 */
export function getAvgjorelsekoder(config, authHeaders, vuId) {
  console.log(`📋 ${vuId}: Fetching avgjorelsekoder (decision codes)`);

  const endpoint = `${config.baseUrl}${config.apiConfig.endpoints.avgjorelsekoder}`;
  const response = http.get(endpoint, {
    headers: authHeaders,
    timeout: '30s',
    tags: { name: '⚖️ Get Decision Codes (Avgjorelsekoder)', url: endpoint }
  });

  if (response.status === 200) {
    try {
      const data = JSON.parse(response.body);
      console.log(`✅ ${vuId}: Retrieved ${Array.isArray(data) ? data.length : 0} decision codes`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`🔥 ${vuId}: Failed to parse avgjorelsekoder response:`, e.message);
      return [];
    }
  } else {
    console.error(`🔥 ${vuId}: Failed to fetch avgjorelsekoder - Status: ${response.status}`);
    return [];
  }
}

/**
 * Fetch ordningsprinsipper (classification principles) from API
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Array} Array of classification principles
 */
export function getOrdningsprinsipper(config, authHeaders, vuId) {
  console.log(`📋 ${vuId}: Fetching ordningsprinsipper (classification principles)`);

  const endpoint = `${config.baseUrl}${config.apiConfig.endpoints.ordningsprinsipper}`;
  const response = http.get(endpoint, {
    headers: authHeaders,
    timeout: '30s',
    tags: { name: '🏷️ Get Classification Principles', url: endpoint }
  });

  if (response.status === 200) {
    try {
      const data = JSON.parse(response.body);
      console.log(`✅ ${vuId}: Retrieved ${Array.isArray(data) ? data.length : 0} classification principles`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`🔥 ${vuId}: Failed to parse ordningsprinsipper response:`, e.message);
      return [];
    }
  } else {
    console.error(`🔥 ${vuId}: Failed to fetch ordningsprinsipper - Status: ${response.status}`);
    return [];
  }
}

/**
 * Fetch ordningsverdier (classification values) for a specific principle and case type
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} prinsipp - Classification principle (e.g., 'FE', 'FA', 'TI', 'FD')
 * @param {string} sakstype - Case type code (e.g., 'GS')
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Array} Array of classification values
 */
export function getOrdningsverdier(config, authHeaders, prinsipp, sakstype, vuId) {
  console.log(`📋 ${vuId}: Fetching ordningsverdier for ${prinsipp}/${sakstype}`);

  // Build ordningsverdier URL from pattern in config (replace placeholders)
  const ordningsverdierUrlPattern =
    config.apiConfig.endpoints.ordningsverdierPattern ||
    '/api/websak/api/register/ordningsprinsipper/{prinsipp}/sakstype/{sakstype}/ordningsverdier';
  const ordningsverdierPath = ordningsverdierUrlPattern
    .replace('{prinsipp}', prinsipp)
    .replace('{sakstype}', sakstype);
  const response = http.get(`${config.baseUrl}${ordningsverdierPath}`, {
    headers: authHeaders,
    timeout: '30s',
    tags: { name: `🔢 Get Classification Values (${prinsipp})` }
  });

  if (response.status === 200) {
    try {
      const data = JSON.parse(response.body);
      console.log(`✅ ${vuId}: Retrieved ordningsverdier for ${prinsipp}`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`🔥 ${vuId}: Failed to parse ordningsverdier response:`, e.message);
      return [];
    }
  } else {
    console.error(`🔥 ${vuId}: Failed to fetch ordningsverdier - Status: ${response.status}`);
    return [];
  }
}

/**
 * Fetch noekkelord (keywords) for case type
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Array} Array of keywords
 */
export function getNoekkelord(config, authHeaders, vuId) {
  console.log(`📋 ${vuId}: Fetching noekkelord (keywords)`);

  const response = http.get(`${config.baseUrl}${config.apiConfig.endpoints.noekkelord}`, {
    headers: authHeaders,
    timeout: '30s',
    tags: { name: '🔑 Get Keywords (Nøkkelord)' }
  });

  if (response.status === 200) {
    try {
      const data = JSON.parse(response.body);
      console.log(`✅ ${vuId}: Retrieved ${Array.isArray(data) ? data.length : 0} keywords`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`🔥 ${vuId}: Failed to parse noekkelord response:`, e.message);
      return [];
    }
  } else {
    console.error(`🔥 ${vuId}: Failed to fetch noekkelord - Status: ${response.status}`);
    return [];
  }
}

/**
 * Create a new case template (Mal Sak) by fetching it from API
 * This mimics the POST /api/websak/api/sak/nymalsak/ call
 * @param {Object} config - Test configuration object
 * @param {Object} authHeaders - Authenticated headers
 * @param {number} malId - Template ID to create from
 * @param {string} vuId - Virtual User identifier for logging
 * @returns {Object|null} Created template case or null if creation failed
 */
export function createMalSak(config, authHeaders, malId, vuId) {
  console.log(`📋 ${vuId}: Creating new case from template (malId: ${malId})`);

  const response = http.post(
    `${config.baseUrl}${config.apiConfig.endpoints.nymalsak}`,
    JSON.stringify({ malId: malId }),
    {
      headers: authHeaders,
      timeout: '30s',
      tags: { name: '📄 Create Template Case (Ny Mal Sak)' }
    }
  );

  if (response.status === 200 || response.status === 201) {
    try {
      const data = JSON.parse(response.body);
      console.log(`✅ ${vuId}: Created template case successfully`);
      return data;
    } catch (e) {
      console.error(`🔥 ${vuId}: Failed to parse nymalsak response:`, e.message);
      return null;
    }
  } else {
    console.error(`🔥 ${vuId}: Failed to create template case - Status: ${response.status}`);
    console.error(`📥 Response Body: ${response.body}`);
    return null;
  }
}
