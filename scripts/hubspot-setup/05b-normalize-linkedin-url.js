/**
 * 05b-normalize-linkedin-url.js
 * Pressure Test Item #3 — LinkedIn URL Normalization (HubSpot Custom Code)
 *
 * Drop this function into any HubSpot Operations Hub custom code action.
 * Must produce identical output to the Python version (05-normalize-linkedin-url.py).
 *
 * Usage in HubSpot custom code action:
 *   const linkedinUrl = event.inputFields['linkedin_company_url'];
 *   const normalized = normalizeLinkedInUrl(linkedinUrl);
 *   // Use `normalized` for dedup guard lookup
 *
 * Normalization rules (from pressure-test.md §3):
 *   1. Lowercase everything
 *   2. Strip protocol (http/https)
 *   3. Strip www.
 *   4. Strip trailing slash
 *   5. Strip path segments after company slug (/about, /jobs, etc.)
 *   6. Flag numeric IDs
 *   7. Trim whitespace
 */

function normalizeLinkedInUrl(url) {
  if (!url || typeof url !== 'string') return '';

  url = url.trim().toLowerCase();

  // Must contain linkedin.com/company/ to be valid
  if (!url.includes('linkedin.com/company/')) return '';

  // Add scheme if missing so URL parsing works
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  // Parse the URL
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return '';
  }

  // Extract path segments
  const path = parsed.pathname.replace(/^\/+|\/+$/g, '');
  const parts = path.split('/');

  // Find the slug — segment right after "company"
  const companyIdx = parts.indexOf('company');
  if (companyIdx === -1 || companyIdx + 1 >= parts.length) return '';

  const slug = parts[companyIdx + 1];
  if (!slug) return '';

  // Canonical form: linkedin.com/company/{slug}
  return `linkedin.com/company/${slug}`;
}

function isNumericId(url) {
  const normalized = normalizeLinkedInUrl(url);
  if (!normalized) return false;
  const slug = normalized.split('/').pop();
  return /^\d+$/.test(slug);
}

// ---- HubSpot Custom Code Action entry point ----
// Uncomment this block when pasting into a HubSpot custom code action:
//
// exports.main = async (event, callback) => {
//   const linkedinUrl = event.inputFields['linkedin_company_url'];
//   const normalized = normalizeLinkedInUrl(linkedinUrl);
//
//   callback({
//     outputFields: {
//       linkedin_url_normalized: normalized,
//       is_numeric_id: isNumericId(linkedinUrl) ? 'yes' : 'no',
//     }
//   });
// };

// ---- Self-test (run with: node 05b-normalize-linkedin-url.js) ----
if (typeof require !== 'undefined' && require.main === module) {
  const cases = [
    ['https://www.linkedin.com/company/nfl/', 'linkedin.com/company/nfl'],
    ['https://linkedin.com/company/nfl', 'linkedin.com/company/nfl'],
    ['http://www.linkedin.com/company/nfl', 'linkedin.com/company/nfl'],
    ['https://www.linkedin.com/company/nfl/about', 'linkedin.com/company/nfl'],
    ['https://www.linkedin.com/company/12345/', 'linkedin.com/company/12345'],
    ['https://www.linkedin.com/company/nfl-football', 'linkedin.com/company/nfl-football'],
    ['HTTPS://WWW.LINKEDIN.COM/COMPANY/NFL/', 'linkedin.com/company/nfl'],
    ['linkedin.com/company/nfl', 'linkedin.com/company/nfl'],
    ['www.linkedin.com/company/nfl/jobs', 'linkedin.com/company/nfl'],
    ['https://www.linkedin.com/company/nfl/posts?page=1', 'linkedin.com/company/nfl'],
    ['', ''],
    ['not-a-url', ''],
    ['https://linkedin.com/in/johndoe', ''],
    ['https://www.linkedin.com/company/', ''],
  ];

  let passed = 0;
  let failed = 0;
  for (const [input, expected] of cases) {
    const result = normalizeLinkedInUrl(input);
    if (result === expected) {
      passed++;
    } else {
      failed++;
      console.log(`  FAIL: normalize(${JSON.stringify(input)})`);
      console.log(`        expected: ${JSON.stringify(expected)}`);
      console.log(`        got:      ${JSON.stringify(result)}`);
    }
  }
  console.log(`\n  Self-test: ${passed}/${passed + failed} passed`);
  if (failed) process.exit(1);
  console.log('  All normalization rules verified.\n');
}
