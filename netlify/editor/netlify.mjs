// Netlify client: asks whether the rebuild for a given commit has finished.
// Collaborators (token, siteId, fetch) are passed in.

// States that are over without the site being ready. Anything else not "ready"
// (new, enqueued, building, uploading, processing, preparing, or a state Netlify
// adds later) is still under way.
const FAILED = new Set(["error", "rejected"]);
// Netlify stopped this build, usually because newer edits arrived. The edit is
// then in the later build of the same site version (production builds each
// edit on top of the last), so that build's result is the answer.
const STOPPED = new Set(["canceled", "cancelled", "skipped"]);
const when = (d) => Date.parse(d.created_at || 0) || 0;

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
    const seen = [];
    let mine = [];
    for (const n of [1, 2]) {
      const list = await page(n);
      seen.push(...list);
      mine = list.filter((d) => d.commit_ref === sha);
      if (mine.length) break;
    }
    if (mine.length === 0) return { state: "waiting" };
    mine.sort((a, b) => when(b) - when(a));
    const d = mine[0];
    if (d.state === "ready") return { state: "ready", url: d.deploy_ssl_url };
    if (FAILED.has(d.state)) return { state: "failed" };
    if (STOPPED.has(d.state)) return laterResult(seen, d);
    return { state: "building" };
  }

  // A stopped production build: ready once a later production build is ready
  // (with that build's address); otherwise still under way, so nothing is put
  // back. Only builds of the same kind count, so a stopped preview never takes
  // the live site's result.
  function laterResult(seen, stopped) {
    if (stopped.context !== "production") return { state: "building" };
    const later = seen
      .filter((x) => x.context === "production" && x.branch === stopped.branch && when(x) > when(stopped))
      .sort((a, b) => when(b) - when(a));
    const ready = later.find((x) => x.state === "ready");
    if (ready) return { state: "ready", url: ready.deploy_ssl_url };
    return { state: "building" }; // one still under way, or none yet
  }
  return { deployFor };
}
