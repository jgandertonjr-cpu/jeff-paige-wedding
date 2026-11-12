// The Netlify site's id, for the API calls that name the site. Netlify sets
// SITE_ID for functions; when it does not, this site's own id is used.
export const DEFAULT_SITE_ID = "00e11b72-2ff3-4cd7-8c17-2b328a543ef9";
export const siteIdFrom = (env) => env.SITE_ID || DEFAULT_SITE_ID;
