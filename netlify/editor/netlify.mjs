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

  // A stopped production build: the newest later production build of the same
  // branch decides, since it carries the edit. Ready → ready (with its
  // address); error or rejected → failed (the main copy now holds the edit in a
  // failing build, so it is put back); still under way, or none yet → building.
  // A later build that was itself stopped is passed over. Only builds of the
  // same kind count, so a stopped preview never takes the live site's result.
  function laterResult(seen, stopped) {
    if (stopped.context !== "production") return { state: "building" };
    const newest = seen
      .filter((x) => x.context === "production" && x.branch === stopped.branch && when(x) > when(stopped) && !STOPPED.has(x.state))
      .sort((a, b) => when(b) - when(a))[0];
    if (!newest) return { state: "building" };
    if (newest.state === "ready") return { state: "ready", url: newest.deploy_ssl_url };
    if (FAILED.has(newest.state)) return { state: "failed" };
    return { state: "building" };
  }
  return { deployFor };
}
