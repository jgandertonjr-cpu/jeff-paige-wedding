// Netlify client: asks whether the rebuild for a given commit has finished.
// Collaborators (token, siteId, fetch) are passed in.

const BUILDING = new Set(["new", "enqueued", "building", "uploading", "processing", "preparing"]);

export function createNetlify({ token, siteId, fetch }) {
  async function deployFor(sha) {
    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys?per_page=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Netlify request failed (${res.status})`);
    const deploys = await res.json();
    const mine = deploys
      .filter((d) => d.commit_ref === sha)
      .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
    if (mine.length === 0) return { state: "waiting" };
    const d = mine[0];
    if (d.state === "ready") return { state: "ready", url: d.deploy_ssl_url };
    if (d.state === "error") return { state: "failed" };
    return { state: "building" };
  }
  return { deployFor };
}
