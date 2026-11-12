// RSVP responses for the admin dashboard (/admin/rsvps/).
//
// GET /api/rsvp-responses
//   Cookie: jp_admin=...   (set by the editor's sign-in at /admin/)
//
// Only someone signed in to the editor gets an answer. The
// submissions themselves are read from Netlify Forms with a Netlify personal
// access token kept in the NETLIFY_RSVP_TOKEN environment variable, so it never
// reaches the browser. See ADMIN-SETUP.md → "RSVP dashboard".
import * as sessionApi from "../editor/session.mjs";

const SITE_ID = process.env.SITE_ID || "00e11b72-2ff3-4cd7-8c17-2b328a543ef9";
const FORM_NAME = "rsvp";
const NETLIFY_API = "https://api.netlify.com/api/v1";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function netlify(path, token) {
  const res = await fetch(`${NETLIFY_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = new Error(`Netlify API ${path} → ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function fetchSubmissions(netlifyToken) {
  const forms = await netlify(`/sites/${SITE_ID}/forms`, netlifyToken);
  const form = forms.find((f) => f.name === FORM_NAME);
  if (!form) return { submissions: [], formId: null };

  const submissions = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await netlify(`/forms/${form.id}/submissions?per_page=100&page=${page}`, netlifyToken);
    submissions.push(...batch);
    if (batch.length < 100) break;
  }
  return {
    formId: form.id,
    // Only what the dashboard shows; Netlify's extra metadata (IP address,
    // user agent…) stays on the server.
    submissions: submissions.map((s) => ({
      id: s.id,
      number: s.number,
      created_at: s.created_at,
      data: Object.fromEntries(
        Object.entries(s.data || {}).filter(([k]) => !["ip", "user_agent", "referrer", "bot-field", "form-name"].includes(k)),
      ),
    })),
  };
}

const SAID = {
  notConnected: "The RSVP list isn't connected yet. Jeff can fix this — see the setup guide.",
  cantLoad: "I can't load the responses right now. Try again in a minute.",
};

// `log(event, fields)` records the cause by name only, never a message or a value.
export function createRsvpHandler({ sessionApi, env, now, fetchSubmissions: load, log = () => {} }) {
  return async (req) => {
    if (req.method !== "GET") return json(405, { error: "Method not allowed" });

    if (!sessionApi.hasSession(req.headers.get("cookie"), env, now())) {
      return json(401, { error: "Sign in to see RSVP responses.", signin: true });
    }

    const netlifyToken = env.NETLIFY_RSVP_TOKEN;
    if (!netlifyToken) {
      log("rsvp_setup", { missing: ["NETLIFY_RSVP_TOKEN"] });
      return json(500, { error: SAID.notConnected, setup: true });
    }

    try {
      const { submissions, formId } = await load(netlifyToken);
      return json(200, { formId, fetchedAt: new Date(now()).toISOString(), submissions });
    } catch (err) {
      const rejected = Boolean(err && err.status === 401); // the access key is wrong or has expired
      log("rsvp_error", { name: (err && err.name) || "Error", ...(Number.isInteger(err && err.status) ? { status: err.status } : {}) });
      return json(502, { error: rejected ? SAID.notConnected : SAID.cantLoad, setup: rejected });
    }
  };
}

export default async (req) =>
  createRsvpHandler({
    sessionApi, env: process.env, now: () => Date.now(), fetchSubmissions,
    log: (event, fields) => console.error(JSON.stringify({ event, ...fields })),
  })(req);

export const config = { path: "/api/rsvp-responses" };
