// RSVP responses for the admin dashboard (/admin/rsvps/).
//
// GET /api/rsvp-responses
//   Authorization: Bearer <GitHub token>   (the same sign-in as the editor)
//
// Only people who can edit the website's GitHub repo get an answer. The
// submissions themselves are read from Netlify Forms with a Netlify personal
// access token kept in the NETLIFY_RSVP_TOKEN environment variable, so it never
// reaches the browser. See ADMIN-SETUP.md → "RSVP dashboard".

const REPO = process.env.RSVP_DASHBOARD_REPO || "jgandertonjr-cpu/jeff-paige-wedding";
const SITE_ID = process.env.SITE_ID || "00e11b72-2ff3-4cd7-8c17-2b328a543ef9";
const FORM_NAME = "rsvp";
const NETLIFY_API = "https://api.netlify.com/api/v1";

// Remember tokens that already passed the GitHub check for a few minutes, so a
// refresh doesn't call GitHub every time. Lives only as long as the function
// instance stays warm.
const verified = new Map(); // token → { login, until }
const VERIFY_TTL_MS = 5 * 60 * 1000;

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

async function checkGitHubAccess(token) {
  const hit = verified.get(token);
  if (hit && hit.until > Date.now()) return { ok: true, login: hit.login };

  const res = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "jeffandpaige-rsvp-dashboard",
    },
  });
  if (res.status === 401) return { ok: false, status: 401, error: "Your GitHub sign-in has expired. Sign in again." };
  // 404 is what GitHub returns for a private repo the account can't see.
  if (res.status === 403 || res.status === 404) return { ok: false, status: 403, error: "This GitHub account doesn't have access to the website." };
  if (!res.ok) return { ok: false, status: 502, error: `GitHub check failed (${res.status}). Try again in a minute.` };

  const repo = await res.json();
  const p = repo.permissions || {};
  if (!(p.push || p.maintain || p.admin)) {
    return { ok: false, status: 403, error: "This GitHub account can view the repo but can't edit the website." };
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "jeffandpaige-rsvp-dashboard" },
  });
  const login = userRes.ok ? (await userRes.json()).login : "";
  verified.set(token, { login, until: Date.now() + VERIFY_TTL_MS });
  return { ok: true, login };
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

export default async (req) => {
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json(401, { error: "Sign in with GitHub to see RSVP responses." });

  let access;
  try {
    access = await checkGitHubAccess(token);
  } catch {
    return json(502, { error: "Couldn't reach GitHub to check your sign-in. Try again in a minute." });
  }
  if (!access.ok) return json(access.status, { error: access.error });

  const netlifyToken = process.env.NETLIFY_RSVP_TOKEN;
  if (!netlifyToken) {
    return json(500, {
      error: "The dashboard isn't connected to Netlify yet: add the NETLIFY_RSVP_TOKEN environment variable (see ADMIN-SETUP.md → RSVP dashboard).",
      setup: true,
    });
  }

  try {
    const { submissions, formId } = await fetchSubmissions(netlifyToken);
    return json(200, {
      viewer: access.login,
      formId,
      fetchedAt: new Date().toISOString(),
      submissions,
    });
  } catch (err) {
    const hint = err.status === 401
      ? "The Netlify access token in NETLIFY_RSVP_TOKEN is invalid or expired. Create a new one (see ADMIN-SETUP.md)."
      : "Couldn't load responses from Netlify. Try again in a minute.";
    return json(502, { error: hint, setup: err.status === 401 });
  }
};

export const config = { path: "/api/rsvp-responses" };
