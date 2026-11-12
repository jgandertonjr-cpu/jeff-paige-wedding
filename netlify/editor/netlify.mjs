// Netlify client: asks whether the rebuild for a given commit has finished.
// Collaborators (token, siteId, fetch) are passed in.

const BUILDING = new Set(["new", "enqueued", "building", "uploading", "processing", "preparing"]);

export function createNetlify({ token, siteId, fetch }) {
  async function page(n) {
    const suffix = n > 1 ? `&page=${n}` : "";
    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys?per_page=50${suffix}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Netlify request failed (${res.status})`);
    try {
      return await res.json();
    } catch {
      // The parser's message can quote response text; give only the status.
      throw new Error(`Netlify request failed (${res.status})`);
    }
  }

  async function deployFor(sha) {
    let mine = [];
    for (const n of [1, 2]) {
      mine = (await page(n)).filter((d) => d.commit_ref === sha);
      if (mine.length) break;
    }
    if (mine.length === 0) return { state: "waiting" };
    mine.sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
    const d = mine[0];
    if (d.state === "ready") return { state: "ready", url: d.deploy_ssl_url };
    if (d.state === "error") return { state: "failed" };
    return { state: "building" };
  }
  return { deployFor };
}
