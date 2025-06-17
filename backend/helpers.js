const db = require('./db'); // Ensure the database connection is imported

// Function to normalize URLs by removing the scheme, 'www.', trailing slashes, and spaces
function normalizeUrl(url) {
  if (!url) return url;
  // Remove the scheme (http, https)
  url = url.replace(/^https?:\/\//, '');
  // Optionally remove 'www.'
  url = url.replace(/^www\./, '');
  // Remove trailing slash
  url = url.replace(/\/$/, '');
  // Remove leading and trailing spaces
  url = url.trim();
  return url;
}

// Function to transform normalized URLs back to valid URLs
function transformToValidUrl(normalizedUrl) {
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    return `https://${normalizedUrl}`; // Prepend https:// if no scheme is present
  }
  return normalizedUrl;
}

// Function to fetch live open tabs data
async function fetchLiveTabs(userOpenTabs) {
  // Normalize the URLs from userOpenTabs
  const urls = Object.values(userOpenTabs).map(normalizeUrl);
  const query = 'SELECT url FROM "hr".aiurl WHERE url = ANY($1::text[])';

  try {
    console.log('Fetching live tabs, input URLs:', urls);

    // Query the database
    const result = await db.query(query, [urls]);
    console.log('Database query result:', result.rows);

    // Normalize database URLs for comparison
    const existingUrls = result.rows.map((row) => normalizeUrl(row.url));
    console.log('Normalized database URLs:', existingUrls);

    const filteredTabs = {};

    // Filter userOpenTabs to include only those URLs that exist in the database
    for (const [tabId, url] of Object.entries(userOpenTabs)) {
      const normalizedUrl = normalizeUrl(url);
      console.log(
        `Tab ID: ${tabId}, Original URL: ${url}, Normalized URL: ${normalizedUrl}`
      );
      if (existingUrls.includes(normalizedUrl)) {
        filteredTabs[tabId] = url;
      }
    }

    console.log('Filtered open tabs:', filteredTabs);
    return filteredTabs;
  } catch (err) {
    console.error('Error querying database:', err);
    throw err;
  }
}

// Example filter function based on certain criteria
function filterTabs(tabs) {
  // Apply your filtering logic here
  // For example, close tabs that contain 'example.com' in their URL
  const filtered = {};
  for (const [tabId, url] of Object.entries(tabs)) {
    if (url.includes('example.com')) {
      filtered[tabId] = url;
    }
  }
  return filtered;
}

module.exports = {
  normalizeUrl,
  transformToValidUrl,
  fetchLiveTabs,
  filterTabs, // Export the filterTabs function
};
