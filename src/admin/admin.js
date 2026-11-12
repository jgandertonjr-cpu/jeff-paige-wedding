// The editor at /admin/. Paige finds what she wants to change (by searching or by
// browsing pages), changes it with an ordinary control, and each change collects
// in a tray. Review sends the tray to the server (/api/editor/propose), which
// answers with the summary card she publishes from. Nothing is sent before Review.
// Everything shown on screen is set with textContent, never as HTML.
import "./deadline.js";
import {
  fileOrder, buildIndex, search, locate, controlFor, describe, isShown, canAdd, itemName, isPhonePhoto, optionLabels,
  opFor, applyLocal, checkLocal, emptyItem, addChange, dropChange, pruneTray, numberPhotos, photoRefs, checkLabel,
  remark, removeEntries, toStorage, fromStorage, currentSpots, marksOf, relocate, trayLocked,
  MAX_REQUEST_CHARS, photoRoom, pollStep, discardAfterUndo,
} from "./find.js";

const API = "/api/editor/";
const POLL_MS = 4000;
const POLL_LIMIT_MS = 5 * 60 * 1000;
const STALE_MS = 5 * 60 * 1000; // hidden this long: fetch the site again when she comes back
const MAX_CHANGES = 50;
const MAX_PHONE_PHOTOS = 3;
const PHOTO_MAX_BYTES = 2.8 * 1024 * 1024;
const TRAY_KEY = "editor-tray";
const MORE_GROUPS = new Set(["seo", "labels"]);
const SHOW_MATCHES = 20;
const QUIET_MS = 400; // after a tap that redraws a list, taps are ignored this long

const SAY = {
  cantReach: "I can't reach the site right now. Try again in a minute.",
  wentWrong: "Something went wrong. Nothing changed. Try again in a minute.",
  publishFailed: "Something went wrong with that change. Please check the site.",
  loading: "Loading the site…",
  previewing: "Getting a preview ready. This takes about a minute.",
  publishing: "Publishing. Live in about a minute.",
  live: "It's live.",
  cancelled: "Nothing was changed. Your changes are still in the tray.",
  slow: "This is taking longer than usual. Check back in a few minutes.",
  restored: "Done. I put back:",
  skipped: "These had been changed again since, so I left them:",
  noUndo: "I can't find that change in the recent list, so I can't undo it.",
  badPhoto: "I couldn't read that photo. Try a different one.",
  photoTooBig: "That photo is too big to add with the others. Publish these first, then add it.",
  readyingPhoto: "Getting the photo ready.",
  noRecent: "Nothing has been changed here yet.",
  loadingRecent: "Getting the list.",
  checkPrefix: "Please check: ",
  noMatch: "I couldn't find that. Try different words, or pick a page below.",
  added: "Added to your changes.",
  same: "That's the same as before, so nothing was added.",
  tooMany: "That's a lot of changes at once. Review and publish these first.",
  photoLimit: "You can add three new photos at a time. Publish these first.",
  locked: "Finish or cancel the review first.",
  siteMovedScreen: "The site changed, so what you had open isn't there any more.",
  photosTooBig: "Those photos are too big to send together. Remove one and try again.",
  stillInTray: "Your changes are still in the tray.",
  reviewAgain: "The site changed, so please review your changes again.",
  moreMatches: `Showing the first ${SHOW_MATCHES}. Add a word to narrow it down.`,
  gettingReady: "Getting your changes ready.",
  fixFirst: "A few things need fixing first.",
  noChanges: "There are no changes to review yet.",
  gone: "That isn't on the site any more.",
  markdownHelp: "To make a link, write [words](https://address). For bold, put ** around the words.",
};
const siteChanged = (n) =>
  n === 1 ? "The site changed, so I removed one change that no longer fits." : `The site changed, so I removed ${n} changes that no longer fit.`;
const changesReady = (n) => (n === 1 ? "1 change ready" : `${n} changes ready`);
const photosLost = (n) =>
  `New photos aren't kept when the page reloads, so I removed ${n === 1 ? "one change" : `${n} changes`} that used them. Please add them again.`;

const $ = (id) => document.getElementById(id);
const ui = {
  starting: $("starting"),
  links: $("links"),
  recentToggle: $("recent-toggle"),
  signOut: $("sign-out"),
  signin: $("signin"),
  signinForm: $("signin-form"),
  password: $("password"),
  passwordShow: $("password-show"),
  signinError: $("signin-error"),
  signinButton: $("signin-button"),
  recent: $("recent"),
  recentStatus: $("recent-status"),
  recentList: $("recent-list"),
  loading: $("loading"),
  loadingText: $("loading-text"),
  loadingRetry: $("loading-retry"),
  screen: $("screen"),
  trayBar: $("tray-bar"),
  trayOpen: $("tray-open"),
  trayCount: $("tray-count"),
  trayReview: $("tray-review"),
  announce: $("announce"),
  scroller: $("scroller"),
  app: $("app"),
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const touchFirst = window.matchMedia("(pointer: coarse)");

// ---- talking to the server ------------------------------------------------

class SignedOut extends Error {}
class Unreachable extends Error {}
class TimedOut extends Unreachable {} // no answer in time; the request may still have arrived

// Resolves to the response body (which may carry { error }). Throws SignedOut on
// a 401 from a signed-in route, TimedOut when no answer comes before the
// deadline, and Unreachable when the server can't be reached.
async function api(route, method, body) {
  const { deadlineFor, withDeadline } = window.editorDeadline;
  let answer;
  try {
    answer = await withDeadline(deadlineFor(route), async (signal) => {
      const res = await fetch(API + route, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "same-origin",
        signal,
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        if (signal.aborted) throw new Error("stopped");
        data = null;
      }
      return { status: res.status, data };
    });
  } catch (err) {
    throw err && err.timedOut ? new TimedOut() : new Unreachable();
  }
  const { status, data } = answer;
  if (status === 401 && route !== "login") throw new SignedOut();
  if (!data || typeof data !== "object") throw new Unreachable();
  return data;
}

// ---- small DOM helpers ----------------------------------------------------

function el(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "className") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "onClick") node.addEventListener("click", v);
    else if (k === "onInput") node.addEventListener("input", v);
    else if (k === "onChange") node.addEventListener("change", v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c) node.append(c);
  return node;
}
const button = (label, kind, onClick, props) =>
  el("button", { type: "button", className: kind === "text" ? "btn-text" : `btn btn-${kind}`, text: label, onClick, ...props });

const SVG = "http://www.w3.org/2000/svg";
function icon(d) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", "icon");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}
const chevronRight = () => icon("M9 5l7 7-7 7");
const chevronLeft = () => icon("M15 5l-7 7 7 7");
const chevronDown = () => icon("M5 9l7 7 7-7");

function reveal(node) {
  requestAnimationFrame(() => node.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" }));
}

// A sentence for screen readers, without moving focus.
function announce(text) {
  ui.announce.textContent = "";
  requestAnimationFrame(() => {
    ui.announce.textContent = text;
  });
}

let uid = 0;
const newId = (prefix) => `${prefix}-${++uid}`;

// ---- state ----------------------------------------------------------------

let signedIn = false;
let site = null; // { schema, content, images } from the server
let view = null; // site.content with the tray applied: what every screen shows
let index = null; // search entries over `view`, built when first needed
let tray = []; // { id, op, entryLabel, marks, photoRef? }[]
let spots = []; // where each tray change is in `view` (currentSpots)
// Changes each time fresh content arrives; a screen drawn for another generation
// checks its place again. Unique to this page load, so a screen restored from
// the browser's history after a reload is always checked.
const LOAD_ID = Math.random().toString(36).slice(2, 10);
let genCount = 0;
let gen = `${LOAD_ID}-0`;
let liveDraft = null; // the Change screen's value as typed: { key, value }
const photos = new Map(); // phone photos by ref: { base64, thumbUrl, bytes }
const drafts = new Map(); // item forms in progress, by route key
let flashText = ""; // a sentence shown at the top of the current screen
let leaving = false; // signing out: don't ask about unpublished changes

const trayOps = () => tray.map((t) => t.op);
const traySig = () => JSON.stringify(trayOps());

function refreshView() {
  view = site ? applyLocal(site.content, trayOps()) : null;
  spots = site ? currentSpots(site.content, tray) : [];
  index = null;
}
const searchIndex = () => (index ||= buildIndex(site.schema, view));

function saveTray() {
  try {
    if (tray.length) sessionStorage.setItem(TRAY_KEY, JSON.stringify(toStorage(tray)));
    else sessionStorage.removeItem(TRAY_KEY);
  } catch {
    /* private browsing: the tray just isn't kept across a reload */
  }
}

// After a reload: the changes from before, minus any that used a phone photo
// (and the ones that relied on those). Says so once.
function restoreTray() {
  let saved = [];
  try {
    sessionStorage.removeItem("editor-draft"); // left by the old page
    saved = JSON.parse(sessionStorage.getItem(TRAY_KEY) || "[]");
  } catch {
    saved = [];
  }
  const restored = fromStorage(saved);
  tray = restored.tray;
  if (restored.lost) flashText = photosLost(restored.lost);
}

function setTray(next) {
  tray = site ? remark(site.content, next) : next;
  saveTray();
  refreshView();
  forgetUnusedPhotos();
  updateTrayBar();
}

// While a reviewed set of changes is on its way (from tapping Review until the
// card is live, cancelled or has failed), the tray stays as it was reviewed.
const locked = () => trayLocked(review);
// Every editing screen has this line; it shows only while the tray is locked.
const lockLine = () => el("p", { className: "flash lock-line", role: "status", text: SAY.locked, hidden: !locked() });
let wasLocked = false;
// A card changed state: when that unlocks (or locks) the tray, the open screen is
// brought up to date (without rebuilding a form she may be typing in).
function lockMaybeChanged() {
  const now = locked();
  if (now === wasLocked) return;
  wasLocked = now;
  if (signedIn && site && route.name !== "review" && !refreshInPlace()) render({ scroll: ui.scroller.scrollTop });
}

// The Change and item screens are not rebuilt when their item is still where it
// was: only the lock line and the controls the lock disables change, so the
// keyboard and the caret stay put. Returns false when the screen must be redrawn.
function refreshInPlace() {
  if (!["change", "item"].includes(route.name) || ui.screen.hidden || !renderedSig) return false;
  const was = `${route.name}:${route.path}:${route.at}`;
  followRoute();
  if (`${route.name}:${route.path}:${route.at}` !== was) return false;
  const spot = routeSpot(route);
  const here = spot && locate(site.schema, view, route.file, spot);
  if (!here || (route.name === "change" && (here.item || controlFor(here) === null))) return false;
  const frozen = locked();
  for (const line of ui.screen.querySelectorAll(".lock-line")) line.hidden = !frozen;
  for (const b of ui.screen.querySelectorAll("[data-lockable]")) b.disabled = frozen;
  route = { ...route, gen, marks: marksOf(view, route.file, spot) };
  history.replaceState({ ...route, app: "editor" }, "");
  renderedSig = JSON.stringify(route);
  updateTrayBar();
  return true;
}

// After a tap that redraws a list, the next control can land under the same
// finger: taps are ignored for a moment.
let quietUntil = 0;
const hush = () => {
  quietUntil = Date.now() + QUIET_MS;
};
const hushed = () => Date.now() < quietUntil;

// Adds a change. Returns "added", "same" (nothing would change), "full" or "locked".
function addToTray(op, extra) {
  if (locked()) return "locked";
  const result = addChange(site.schema, site.content, tray, op, extra);
  if (result.unchanged) return "same";
  if (result.tray.length > MAX_CHANGES) return "full";
  setTray(result.tray);
  return "added";
}

function photoRefsInUse() {
  const refs = new Set();
  for (const t of tray) for (const r of photoRefs(t.op.value)) refs.add(r);
  for (const d of drafts.values()) for (const r of photoRefs(d)) refs.add(r);
  if (liveDraft) for (const r of photoRefs(liveDraft.value)) refs.add(r);
  return refs;
}
function forgetUnusedPhotos() {
  const used = photoRefsInUse();
  for (const [ref, p] of photos) {
    if (used.has(ref)) continue;
    URL.revokeObjectURL(p.thumbUrl);
    photos.delete(ref);
  }
}
const photoSrc = (value) => (isPhonePhoto(value) ? photos.get(value.slice("@photo:".length))?.thumbUrl || "" : String(value || ""));

window.addEventListener("beforeunload", (e) => {
  if (!tray.length || leaving) return;
  e.preventDefault();
  e.returnValue = "";
});

// ---- the tray bar ---------------------------------------------------------

function updateTrayBar() {
  const show = signedIn && !!site && tray.length > 0 && !["review", "tray"].includes(route.name);
  ui.trayBar.hidden = !show;
  if (tray.length) ui.trayCount.textContent = changesReady(tray.length);
}
const goOnce = (name) => () => {
  if (hushed() || route.name === name) return;
  hush();
  navigate({ name });
};
ui.trayOpen.addEventListener("click", goOnce("tray"));
ui.trayReview.addEventListener("click", goOnce("review"));

// While she types on a phone, the bar makes way for the keyboard.
ui.screen.addEventListener("focusin", (e) => {
  if (touchFirst.matches && e.target.matches("input:not([type=checkbox]):not([type=radio]):not([type=color]), textarea")) ui.app.classList.add("typing");
});
ui.screen.addEventListener("focusout", () => ui.app.classList.remove("typing"));

// ---- screens and the Back button ------------------------------------------
// One screen at a time. Each is a history entry ({ name, …, depth }), so the
// browser's Back button moves between them.

let route = { name: "find", depth: 0 };
let renderedSig = ""; // which route and data the screen was last drawn for

history.scrollRestoration = "manual";

function validRoute(r) {
  return r && typeof r === "object" && r.app === "editor" && typeof r.name === "string";
}

function navigate(next, { replace = false } = {}) {
  flashText = "";
  liveDraft = null;
  if (next.name === "review") review.fresh = true;
  const state = { ...next, app: "editor", depth: replace ? route.depth : route.depth + 1 };
  if (!replace) history.replaceState({ ...route, app: "editor", scroll: ui.scroller.scrollTop }, "");
  if (replace) history.replaceState(state, "");
  else history.pushState(state, "");
  route = state;
  render({ scroll: 0 });
}

// The screen's own back control: the previous screen, or the one above it when
// this page was opened here directly.
function back() {
  if (route.depth > 0) history.back();
  else navigate(parentRoute(route), { replace: true });
}

function parentRoute(r) {
  switch (r.name) {
    case "page": case "review": case "tray": return { name: "find" };
    case "list": case "change": case "photo": return r.file ? { name: "page", file: r.file } : { name: "find" };
    case "item": return { name: "list", file: r.file, path: r.path };
    default: return { name: "find" };
  }
}

window.addEventListener("popstate", (e) => {
  route = validRoute(e.state) ? e.state : { name: "find", depth: 0, app: "editor" };
  flashText = "";
  if (signedIn && site) render({ scroll: route.scroll || 0 });
});

function remember(changes) {
  route = { ...route, ...changes };
  history.replaceState({ ...route, app: "editor" }, "");
}

const SCREENS = {
  find: findScreen,
  page: pageScreen,
  change: changeScreen,
  list: listScreen,
  item: itemScreen,
  photo: photoScreen,
  review: reviewScreen,
  tray: trayScreen,
};

// The spot a screen shows, which is checked again when fresh content arrives.
function routeSpot(r) {
  if (!r.file || typeof r.path !== "string") return null;
  if (r.name === "item" || (r.name === "photo" && r.draft)) return r.at >= 0 ? `${r.path}/${r.at}` : r.path;
  return r.path;
}

// After fresh content: the screen follows its item to where it is now, or, when
// it is gone, Find says so. Returns nothing; updates `route`.
function followRoute() {
  const spot = routeSpot(route);
  if (!spot || route.gen === gen || !Array.isArray(route.marks)) return;
  const now = relocate(view, route.file, spot, route.marks);
  if (now === null) {
    flashText = SAY.siteMovedScreen;
    route = { name: "find", q: "", depth: route.depth, app: "editor" };
    return;
  }
  if (now === spot) return;
  const next = { ...route };
  if (route.name === "item" || (route.name === "photo" && route.draft)) {
    if (route.at >= 0) {
      next.path = now.slice(0, now.lastIndexOf("/"));
      next.at = Number(now.slice(now.lastIndexOf("/") + 1));
    } else next.path = now;
    const oldKey = itemKey(route.file, route.path, route.at);
    const newKey = itemKey(next.file, next.path, next.at);
    if (drafts.has(oldKey) && oldKey !== newKey) {
      drafts.set(newKey, drafts.get(oldKey));
      drafts.delete(oldKey);
    }
    if (route.draft) next.draft = newKey;
  } else {
    if (liveDraft && liveDraft.key === changeKey(route)) liveDraft = { ...liveDraft, key: changeKey({ ...route, path: now }) };
    next.path = now;
  }
  route = next;
}

// Draws the current screen. `keepFocus` is a node to focus instead of the heading.
function render({ scroll = 0, keepFocus = null } = {}) {
  if (!site) return;
  followRoute();
  const draw = SCREENS[route.name] || findScreen;
  const parts = draw(route);
  ui.screen.replaceChildren(...parts);
  ui.screen.hidden = false;
  // Remember what this screen shows, as of now, so it can be found again.
  const spot = routeSpot(route);
  route = { ...route, gen, marks: spot ? marksOf(view, route.file, spot) : undefined };
  history.replaceState({ ...route, app: "editor" }, "");
  renderedSig = JSON.stringify(route);
  updateTrayBar();
  requestAnimationFrame(() => {
    ui.scroller.scrollTop = scroll;
  });
  const target = keepFocus && keepFocus.isConnected ? keepFocus : ui.screen.querySelector(".screen-title");
  if (target) target.focus({ preventScroll: true });
}

const changeKey = (r) => `${r.file}:${r.path}`;

// The top of every screen: a back control, where it is, and its title.
function head(title, { eyebrow = "", backLabel = "Back", noBack = false } = {}) {
  const parts = [];
  if (!noBack) {
    parts.push(el("button", { type: "button", className: "back", onClick: back }, chevronLeft(), el("span", { text: backLabel })));
  }
  if (eyebrow) parts.push(el("p", { className: "label eyebrow", text: eyebrow }));
  parts.push(el("h2", { className: "screen-title", tabindex: "-1", text: title }));
  const out = [el("div", { className: "screen-head" }, parts)];
  if (flashText) out.push(el("p", { className: "flash", role: "status", text: flashText }));
  return out;
}

function flash(text) {
  flashText = text;
  const old = ui.screen.querySelector(".flash");
  const node = el("p", { className: "flash", role: "status", text });
  if (old) old.replaceWith(node);
  else ui.screen.querySelector(".screen-head")?.after(node);
}

const trailText = (trail) => trail.join(" › ");

// A row that opens something: label, its current value, a chevron.
function rowButton({ eyebrow, label, value, pending, onClick }) {
  return el("li", {},
    el("button", { type: "button", className: "row", onClick },
      el("span", { className: "row-main" },
        eyebrow ? el("span", { className: "row-eyebrow", text: eyebrow }) : null,
        el("span", { className: "row-label", text: label }),
        value || null,
        pending ? el("span", { className: "pending", text: "Changed" }) : null),
      el("span", { className: "row-go" }, chevronRight())));
}

function thumb(value, alt = "") {
  const src = photoSrc(value);
  if (!src) return null;
  return el("img", { className: "thumb", src, alt, width: "48", height: "48", loading: "lazy", decoding: "async" });
}

// How a value looks in a row.
function valueView(entry) {
  const kind = controlFor(entry);
  if (kind === "photo") {
    const t = thumb(entry.value);
    return t ? el("span", { className: "row-value row-photo" }, t) : el("span", { className: "row-value", text: "Not set" });
  }
  if (kind === "colour") {
    const swatch = el("span", { className: "swatch", "aria-hidden": "true" });
    swatch.style.backgroundColor = /^#[0-9A-Fa-f]{6}$/.test(entry.value || "") ? entry.value : "transparent";
    return el("span", { className: "row-value row-colour" }, swatch, el("span", { text: describe(entry) }));
  }
  return el("span", { className: "row-value", text: describe(entry) });
}

// Is anything at or under this spot waiting in the tray? Spots follow each
// change through the later ones, so the tag stays on the right row.
const pendingAt = (file, path) =>
  tray.some((t, i) => t.op.file === file && spots[i] && (spots[i] === path || spots[i].startsWith(`${path}/`)));

function openEntry(entry) {
  const kind = controlFor(entry);
  const where = { file: entry.file, path: entry.path };
  if (kind === "list") navigate({ name: "list", ...where });
  else if (kind === "photo") navigate({ name: "photo", ...where });
  else navigate({ name: "change", ...where });
}

function goneScreen(title) {
  return [...head(title), el("p", { className: "lead", text: SAY.gone })];
}

// ---- Find -------------------------------------------------------------------

function findScreen(r) {
  const titleId = newId("find-title");
  const status = el("p", { className: "vh", role: "status" });
  const input = el("input", {
    className: "input search", id: "find-input", type: "search", autocomplete: "off", autocapitalize: "off",
    spellcheck: "false", enterkeyhint: "search", placeholder: "For example: hotel deadline", "aria-labelledby": titleId,
  });
  input.value = r.q || "";
  const results = el("div", { className: "results" });
  let timer = 0;

  const show = () => {
    const q = input.value.trim();
    remember({ q: input.value });
    if (!q) {
      results.replaceChildren();
      status.textContent = "";
      return;
    }
    const all = search(searchIndex(), q, SHOW_MATCHES + 1);
    const found = all.slice(0, SHOW_MATCHES);
    if (!found.length) {
      results.replaceChildren(el("p", { className: "lead no-match", text: SAY.noMatch }));
    } else {
      results.replaceChildren(el("ol", { className: "rows", "aria-label": "Matches" },
        found.map((e) => rowButton({
          eyebrow: e.trail[0],
          label: trailText(e.trail.slice(1)),
          value: valueView(e),
          pending: pendingAt(e.file, e.path),
          onClick: () => openEntry(e),
        }))),
        all.length > SHOW_MATCHES ? el("p", { className: "hint more-matches", text: SAY.moreMatches }) : null);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      status.textContent = !found.length ? SAY.noMatch
        : all.length > SHOW_MATCHES ? SAY.moreMatches : `${found.length} ${found.length === 1 ? "match" : "matches"}`;
    }, 500);
  };
  input.addEventListener("input", show);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur(); // closes the phone keyboard so the matches show
  });
  show();

  const pages = el("ul", { className: "rows" },
    fileOrder(site.schema).map((k) => rowButton({
      label: site.schema.files[k].label,
      pending: tray.some((t) => t.op.file === k),
      onClick: () => navigate({ name: "page", file: k }),
    })));

  return [
    el("div", { className: "screen-head" },
      el("h2", { className: "screen-title", id: titleId, tabindex: "-1", text: "What would you like to change?" })),
    flashText ? el("p", { className: "flash", role: "status", text: flashText }) : null,
    el("div", { className: "search-box" }, input),
    status,
    results,
    el("h3", { className: "group-title", text: "Or pick a page" }),
    pages,
  ].filter(Boolean);
}

// ---- Page -------------------------------------------------------------------

function pageScreen(r) {
  const def = site.schema.files[r.file];
  if (!def) return goneScreen("Page");
  const more = [];
  const build = (fields, path, depth, inList) => {
    const out = [];
    let rows = null;
    for (const f of fields || []) {
      if (!isShown(f, inList)) continue;
      const p = `${path}/${f.name}`;
      if (f.type === "object") {
        rows = null;
        const group = el("section", { className: depth ? "group sub" : "group" },
          el(depth ? "h4" : "h3", { className: depth ? "sub-title" : "group-title", text: f.label }),
          build(f.fields, p, depth + 1, false));
        if (depth === 0 && MORE_GROUPS.has(f.name)) more.push(group);
        else out.push(group);
        continue;
      }
      const entry = locate(site.schema, view, r.file, p);
      if (!entry) continue;
      if (!rows) {
        rows = el("ul", { className: "rows" });
        out.push(rows);
      }
      rows.append(rowButton({ label: f.label, value: valueView(entry), pending: pendingAt(r.file, p), onClick: () => openEntry(entry) }));
    }
    return out;
  };
  const parts = [...head(def.label), ...build(def.fields, "", 0, false)];
  if (more.length) {
    const boxId = newId("more");
    const box = el("div", { id: boxId, className: "more-box", hidden: !r.more }, more);
    const toggle = el("button", { type: "button", className: "more-toggle", "aria-expanded": String(!!r.more), "aria-controls": boxId },
      el("span", { className: "row-main" },
        el("span", { className: "row-label", text: "More" }),
        el("span", { className: "row-value", text: more.map((g) => g.firstChild.textContent).join(" · ") })),
      el("span", { className: "row-go" }, chevronDown()));
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      box.hidden = !open;
      remember({ more: open });
    });
    parts.push(el("div", { className: "more" }, toggle, box));
  }
  return parts;
}

// ---- controls -----------------------------------------------------------------
// One control per kind of field, shared by the Change screen and the item form.
// control({ entry, id, labelId, describedBy, onEdit }) → { node, get(), focus(), invalid(bool) }

const HEX = /^#?[0-9A-Fa-f]{6}$/;

function control({ entry, id, labelId, describedBy, onEdit = () => {}, onPhoto }) {
  const kind = controlFor(entry);
  const f = entry.field;
  const value = entry.value;
  const common = { id, "aria-labelledby": labelId, "aria-describedby": describedBy || null };
  let focusNode;
  let node;
  let get;

  const grow = (box) => {
    box.style.height = "auto";
    box.style.height = `${Math.max(box.scrollHeight + 2, 96)}px`;
  };

  switch (kind) {
    case "text":
    case "markdown": {
      const box = el("textarea", { className: "input grow", rows: "4", ...common });
      box.value = typeof value === "string" ? value : "";
      box.addEventListener("input", () => {
        grow(box);
        onEdit(get());
      });
      requestAnimationFrame(() => grow(box));
      node = focusNode = box;
      get = () => box.value.trim();
      break;
    }
    case "switch": {
      const input = el("input", { type: "checkbox", role: "switch", className: "switch-input", ...common });
      input.checked = value === true;
      const words = el("span", { className: "switch-text", "aria-hidden": "true", text: input.checked ? "On" : "Off" });
      input.addEventListener("change", () => {
        words.textContent = input.checked ? "On" : "Off";
        onEdit(get());
      });
      node = el("label", { className: "switch", for: id }, input, el("span", { className: "switch-track", "aria-hidden": "true" }), words);
      focusNode = input;
      get = () => input.checked;
      break;
    }
    case "date":
    case "time": {
      const input = el("input", { className: "input when", type: kind, ...common });
      input.value = typeof value === "string" ? value : "";
      input.addEventListener("input", () => onEdit(get()));
      input.addEventListener("change", () => onEdit(get()));
      const parts = [input];
      if (!f.required) {
        parts.push(button("Clear", "line", () => {
          input.value = "";
          onEdit(get());
          input.focus();
        }, { "aria-label": `Clear ${f.label}` }));
      }
      node = el("div", { className: "when-row" }, parts);
      focusNode = input;
      get = () => input.value;
      break;
    }
    case "choice": {
      const names = entry.choices || {};
      const radios = (f.options || []).map((o) => {
        const radio = el("input", { type: "radio", name: id, value: o });
        radio.checked = value === o;
        radio.addEventListener("change", () => onEdit(get()));
        return el("label", { className: "choice" }, radio, el("span", { text: names[o] ?? o }));
      });
      node = el("div", { className: "choices", role: "radiogroup", id, "aria-labelledby": labelId, "aria-describedby": describedBy || null }, radios);
      focusNode = { focus: () => (node.querySelector("input:checked") || node.querySelector("input"))?.focus() };
      get = () => node.querySelector("input:checked")?.value ?? "";
      break;
    }
    case "order": {
      const names = entry.choices || {};
      const order = Array.isArray(value) ? [...value] : [];
      const list = el("ol", { className: "order", id, "aria-labelledby": labelId, "aria-describedby": describedBy || null });
      const draw = (focusName, dir) => {
        list.replaceChildren(...order.map((o, i) => {
          const name = names[o] ?? o;
          const up = button("Move up", "text", () => move(i, -1), { "aria-label": `Move ${name} up`, disabled: i === 0 });
          const down = button("Move down", "text", () => move(i, 1), { "aria-label": `Move ${name} down`, disabled: i === order.length - 1 });
          up.dataset.name = o;
          down.dataset.name = o;
          return el("li", { className: "order-item" },
            el("span", { className: "order-pos", "aria-hidden": "true", text: String(i + 1) }),
            el("span", { className: "order-name", text: name }),
            el("span", { className: "order-moves" }, up, down));
        }));
        if (focusName) {
          const btns = [...list.querySelectorAll("button")].filter((b) => b.dataset.name === focusName);
          const want = btns[dir < 0 ? 0 : 1];
          (want && !want.disabled ? want : btns.find((b) => !b.disabled))?.focus();
        }
      };
      const move = (i, d) => {
        const j = i + d;
        if (j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        draw(order[j], d);
        announce(`${names[order[j]] ?? order[j]} is now number ${j + 1}.`);
        onEdit(get());
      };
      draw();
      node = list;
      focusNode = { focus: () => list.querySelector("button:not(:disabled)")?.focus() };
      get = () => [...order];
      break;
    }
    case "colour": {
      const start = typeof value === "string" && HEX.test(value) ? value : "#000000";
      const picker = el("input", { type: "color", className: "colour-picker", ...common });
      picker.value = (start.startsWith("#") ? start : `#${start}`).toLowerCase();
      const hexId = `${id}-hex`;
      const hex = el("input", {
        type: "text", className: "input hex", id: hexId, autocomplete: "off", autocapitalize: "characters", spellcheck: "false",
        "aria-label": "Colour code", "aria-describedby": describedBy || null,
      });
      hex.value = typeof value === "string" ? value : "";
      picker.addEventListener("input", () => {
        hex.value = picker.value.toUpperCase();
        onEdit(get());
      });
      hex.addEventListener("input", () => {
        if (HEX.test(hex.value.trim())) picker.value = `#${hex.value.trim().replace("#", "")}`.toLowerCase();
        onEdit(get());
      });
      node = el("div", { className: "colour-row" }, picker, hex);
      focusNode = picker;
      get = () => {
        const v = hex.value.trim();
        return HEX.test(v) ? `#${v.replace("#", "").toUpperCase()}` : v;
      };
      break;
    }
    case "photo": {
      const preview = el("div", { className: "photo-now" });
      let current = typeof value === "string" ? value : "";
      const drawPhoto = () => {
        const t = thumb(current, "The photo chosen now");
        preview.replaceChildren(t || el("span", { className: "row-value", text: "No photo yet" }));
      };
      drawPhoto();
      const choose = button(current ? "Choose a different photo" : "Choose a photo", "line", () => onPhoto && onPhoto(), {
        id, "aria-describedby": [labelId, describedBy].filter(Boolean).join(" "),
      });
      node = el("div", { className: "photo-row" }, preview, choose);
      focusNode = choose;
      get = () => current;
      break;
    }
    default: { // a line of words
      const isEmail = f.name === "email";
      const isLink = f.name === "url" || f.name.endsWith("_url") || /https\?/.test(f.pattern || "");
      const input = el("input", {
        className: "input", type: isEmail ? "email" : isLink ? "url" : "text", autocomplete: "off",
        autocapitalize: isEmail || isLink ? "off" : null, spellcheck: isEmail || isLink ? "false" : null,
        inputmode: isLink ? "url" : null, ...common,
      });
      input.value = value === undefined || value === null ? "" : String(value);
      input.addEventListener("input", () => onEdit(get()));
      node = focusNode = input;
      get = () => input.value.trim();
    }
  }

  const invalidNode = kind === "colour" ? node.querySelector(".hex") : focusNode instanceof Element ? focusNode : node;
  return {
    node,
    get,
    focus: () => focusNode.focus(),
    invalid: (on) => {
      if (on) invalidNode.setAttribute("aria-invalid", "true");
      else invalidNode.removeAttribute("aria-invalid");
    },
  };
}

// A short help line under some controls, and a character count where there is a limit.
function hintsFor(entry, id) {
  const kind = controlFor(entry);
  const out = [];
  if (kind === "markdown") out.push(el("p", { className: "hint", id: `${id}-help`, text: SAY.markdownHelp }));
  if (kind === "colour") out.push(el("p", { className: "hint", id: `${id}-help`, text: "Pick a colour, or type its code (like #BCCAB3)." }));
  if (kind === "order") out.push(el("p", { className: "hint", id: `${id}-help`, text: "The first one shows at the top of the page." }));
  return out;
}

function counterFor(entry, id) {
  const max = entry.field.maxlength;
  if (!max) return null;
  const node = el("p", { className: "hint counter", id: `${id}-count` });
  const set = (v) => {
    node.textContent = `${String(v || "").length} of ${max} characters`;
  };
  set(entry.value);
  return { node, set };
}

// ---- Change (one thing) ------------------------------------------------------

function changeScreen(r) {
  const found = locate(site.schema, view, r.file, r.path);
  if (!found || found.item || controlFor(found) === null) return goneScreen("Change");
  // A redraw (fresh content, signing in again) keeps what she has typed.
  const key = changeKey(r);
  const entry = liveDraft && liveDraft.key === key ? { ...found, value: liveDraft.value } : found;
  const title = entry.field.label;
  const id = newId("field");
  const titleId = newId("title");
  const errorId = `${id}-error`;
  const hints = hintsFor(entry, id);
  const counter = counterFor(entry, id);
  const describedBy = [...hints.map((h) => h.id), counter && counter.node.id, errorId].filter(Boolean).join(" ");
  const error = el("p", { className: "field-error", id: errorId, role: "alert" });
  const ctl = control({
    entry, id, labelId: titleId, describedBy,
    onEdit: (v) => {
      liveDraft = { key, value: v };
      if (counter) counter.set(v);
      if (error.textContent) {
        error.textContent = "";
        ctl.invalid(false);
      }
    },
  });
  let saving = false;
  const save = button("Save change", "publish", () => {
    if (saving) return;
    const value = ctl.get();
    const problem = checkLocal(entry.field, value);
    if (problem) {
      error.textContent = problem;
      ctl.invalid(true);
      ctl.focus();
      return;
    }
    let outcome;
    try {
      outcome = addToTray(opFor(entry, { type: "set", value }));
    } catch {
      error.textContent = SAY.gone;
      return;
    }
    if (outcome === "full" || outcome === "locked") {
      error.textContent = outcome === "full" ? SAY.tooMany : SAY.locked;
      return;
    }
    saving = true;
    save.disabled = true;
    liveDraft = null;
    announce(outcome === "same" ? SAY.same : SAY.added);
    back();
  }, { disabled: locked(), "data-lockable": true });
  ctl.node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && !e.isComposing) {
      e.preventDefault();
      save.click();
    }
  });
  const headParts = head(title, { eyebrow: trailText(entry.trail.slice(0, -1)) });
  headParts[0].querySelector(".screen-title").id = titleId;
  if (entry.field.required === false && ["line", "text", "markdown"].includes(controlFor(entry))) {
    hints.push(el("p", { className: "hint", text: "You can leave this empty." }));
  }
  return [
    ...headParts,
    lockLine(),
    el("div", { className: "field" }, ctl.node, counter && counter.node, hints, error),
    el("div", { className: "actions" }, save, button("Cancel", "line", () => {
      liveDraft = null;
      back();
    })),
  ].filter(Boolean);
}

// ---- List ---------------------------------------------------------------------

function listScreen(r) {
  const list = locate(site.schema, view, r.file, r.path);
  if (!list || list.item || list.field.type !== "list") return goneScreen("List");
  const f = list.field;
  const items = Array.isArray(list.value) ? list.value : [];
  const atMax = f.max !== undefined && items.length >= f.max;
  const atMin = f.min !== undefined && items.length <= f.min;
  const addable = canAdd(f);
  const photoField = (f.fields || []).find((x) => x.type === "image");
  const frozen = locked();
  const parts = head(f.label, { eyebrow: trailText(list.trail.slice(0, -1)) });
  parts.push(lockLine());

  const say = el("p", { className: "flash", role: "status", hidden: true });
  const tell = (text) => {
    say.textContent = text;
    say.hidden = !text;
  };

  const rows = items.map((item, i) => {
    const name = itemName(item, i);
    const li = el("li", { className: "item" });
    const actions = el("div", { className: "item-actions" });
    const showActions = () => {
      const btns = [
        button("Edit", "text", () => {
          const key = itemKey(r.file, r.path, i);
          drafts.delete(key);
          navigate({ name: "item", file: r.file, path: r.path, at: i });
        }, { "aria-label": `Edit ${name}` }),
        button("Move up", "text", () => move(i, i - 1, "up"), { "aria-label": `Move ${name} up`, disabled: frozen || i === 0, "data-act": "up" }),
        button("Move down", "text", () => move(i, i + 1, "down"), { "aria-label": `Move ${name} down`, disabled: frozen || i === items.length - 1, "data-act": "down" }),
      ];
      if (!atMin) btns.push(button("Remove", "text", () => !hushed() && confirmRemove(), { "aria-label": `Remove ${name}`, disabled: frozen }));
      actions.replaceChildren(...btns);
    };
    const confirmRemove = () => {
      const yes = button("Yes, remove", "dark", () => {
        if (hushed()) return;
        yes.disabled = true;
        const outcome = addToTray(opFor(list, { type: "remove", at: i }));
        if (outcome === "full" || outcome === "locked") {
          tell(outcome === "full" ? SAY.tooMany : SAY.locked);
          showActions();
          return;
        }
        hush();
        announce(`Removed ${name}. You can undo it from your changes.`);
        render({ scroll: ui.scroller.scrollTop }); // focus goes to the list's heading
      });
      const keep = button("Keep it", "line", () => {
        showActions();
        actions.querySelector("button")?.focus();
      });
      actions.replaceChildren(el("p", { className: "confirm-question", text: "Remove this?" }), yes, keep);
      yes.focus();
    };
    showActions();
    const t = photoField ? thumb(item && item[photoField.name]) : null;
    li.append(el("div", { className: "item-line" }, t, el("p", { className: "item-name", text: name },
      pendingAt(r.file, `${r.path}/${i}`) ? el("span", { className: "pending", text: "Changed" }) : null)), actions);
    return li;
  });

  const move = (from, to, dir) => {
    if (hushed()) return;
    const outcome = addToTray(opFor(list, { type: "move", at: from, to }));
    if (outcome === "full" || outcome === "locked") {
      tell(outcome === "full" ? SAY.tooMany : SAY.locked);
      return;
    }
    announce(`Moved ${dir}. It is now number ${to + 1}.`);
    render({ scroll: ui.scroller.scrollTop });
    // Keep her place: focus the same control on the item where it is now.
    const moved = ui.screen.querySelectorAll(".item")[to];
    const again = moved && moved.querySelector(`[data-act="${dir}"]`);
    const target = again && !again.disabled ? again : moved && moved.querySelector("button");
    if (target) target.focus({ preventScroll: false });
  };

  parts.push(say);
  parts.push(items.length ? el("ol", { className: "items" }, rows) : el("p", { className: "lead", text: "Nothing here yet." }));

  const notes = [];
  if (!addable) notes.push("New ones can't be added here, because each needs its own page. Ask Jeff if you need one.");
  else if (atMax && atMin) notes.push(`This list always has exactly ${f.max}. Use Edit to change one.`);
  else {
    if (atMax) notes.push(`This list is full: it can hold ${f.max} at most.`);
    if (atMin && items.length) notes.push(`This list needs at least ${f.min}, so none can be removed.`);
  }
  if (addable && !atMax) {
    parts.push(el("div", { className: "actions" }, button("Add one", "dark", () => {
      drafts.delete(itemKey(r.file, r.path, -1));
      navigate({ name: "item", file: r.file, path: r.path, at: -1 });
    }, { disabled: frozen })));
  }
  for (const n of notes) parts.push(el("p", { className: "hint list-note", text: n }));
  return parts;
}

const itemKey = (file, path, at) => `${file}:${path}:${at}`;

// ---- Item form (every field of one list item) ----------------------------------

function itemScreen(r) {
  const list = locate(site.schema, view, r.file, r.path);
  if (!list || list.item || list.field.type !== "list") return goneScreen("Item");
  const f = list.field;
  const items = Array.isArray(list.value) ? list.value : [];
  const isNew = r.at === -1;
  if (!isNew && !(r.at >= 0 && r.at < items.length)) return goneScreen("Item");
  const key = itemKey(r.file, r.path, r.at);
  // A new guest's number is not one already on the site, even if that guest is removed in the tray.
  const onSite = locate(site.schema, site.content, r.file, r.path);
  if (!drafts.has(key)) drafts.set(key, isNew ? emptyItem(f, items, Array.isArray(onSite?.value) ? onSite.value : []) : structuredClone(items[r.at]));
  const draft = drafts.get(key);
  const current = isNew ? null : items[r.at];
  const itemPath = isNew ? null : `${r.path}/${r.at}`;

  const title = isNew ? "Add one" : itemName(current, r.at);
  const fields = [];
  const controls = [];
  for (const sub of f.fields || []) {
    if (!isShown(sub, true)) continue;
    const id = newId("field");
    const labelId = `${id}-label`;
    const errorId = `${id}-error`;
    const entry = { file: r.file, field: sub, value: draft[sub.name], choices: sub.type === "select" ? optionLabels(sub, f.fields) : undefined };
    if (sub.type === "list") {
      // A list inside an item has its own screen, once the item is on the list.
      fields.push(el("div", { className: "field" },
        el("p", { className: "field-label", id: labelId, text: sub.label }),
        isNew
          ? el("p", { className: "hint", text: "You can add these after saving." })
          : el("ul", { className: "rows" }, rowButton({
            label: sub.label,
            value: el("span", { className: "row-value", text: describe({ field: sub }, (current || {})[sub.name]) }),
            pending: pendingAt(r.file, `${itemPath}/${sub.name}`),
            onClick: () => navigate({ name: "list", file: r.file, path: `${itemPath}/${sub.name}` }),
          }))));
      continue;
    }
    const hints = hintsFor(entry, id);
    const counter = counterFor(entry, id);
    const error = el("p", { className: "field-error", id: errorId, role: "alert" });
    const describedBy = [...hints.map((h) => h.id), counter && counter.node.id, errorId].filter(Boolean).join(" ");
    const ctl = control({
      entry, id, labelId, describedBy,
      onEdit: (v) => {
        draft[sub.name] = v;
        if (counter) counter.set(v);
        if (error.textContent) {
          error.textContent = "";
          ctl.invalid(false);
        }
      },
      onPhoto: () => navigate({ name: "photo", file: r.file, path: r.path, at: r.at, draft: key, field: sub.name, label: sub.label, required: !!sub.required }),
    });
    const labelNode = ["choice", "order", "switch", "photo"].includes(controlFor(entry))
      ? el("p", { className: "field-label", id: labelId, text: sub.label })
      : el("label", { className: "field-label", id: labelId, for: id, text: sub.label });
    fields.push(el("div", { className: "field" }, labelNode, ctl.node, counter && counter.node, hints, error));
    controls.push({ sub, ctl, error });
  }

  let saving = false;
  const save = button(isNew ? "Add it" : "Save changes", "publish", () => {
    if (saving) return;
    if (locked()) return flash(SAY.locked);
    let firstBad = null;
    for (const c of controls) {
      const problem = checkLocal(c.sub, c.ctl.get());
      c.error.textContent = problem || "";
      c.ctl.invalid(!!problem);
      if (problem && !firstBad) firstBad = c;
    }
    if (firstBad) {
      firstBad.ctl.focus();
      return;
    }
    for (const c of controls) draft[c.sub.name] = c.ctl.get();
    let next = tray;
    try {
      if (isNew) {
        const op = opFor(list, { type: "insert", index: -1, value: draft });
        next = addChange(site.schema, site.content, next, op, photoRefs(draft).length ? { photoRef: photoRefs(draft)[0] } : {}).tray;
      } else {
        for (const c of controls) {
          const v = draft[c.sub.name];
          if (JSON.stringify(v) === JSON.stringify(current[c.sub.name])) continue;
          const op = { op: "set", file: r.file, path: `${itemPath}/${c.sub.name}`, value: v };
          next = addChange(site.schema, site.content, next, op, isPhonePhoto(v) ? { photoRef: v.slice(7) } : {}).tray;
        }
      }
    } catch {
      flash(SAY.gone);
      return;
    }
    if (next.length > MAX_CHANGES) {
      flash(SAY.tooMany);
      return;
    }
    saving = true;
    save.disabled = true;
    const changed = next !== tray;
    drafts.delete(key);
    setTray(next);
    announce(changed ? SAY.added : SAY.same);
    back();
  }, { disabled: locked(), "data-lockable": true });
  const cancel = button("Cancel", "line", () => {
    drafts.delete(key);
    forgetUnusedPhotos();
    back();
  });

  return [
    ...head(title, { eyebrow: trailText(list.trail) }),
    lockLine(),
    ...fields,
    el("div", { className: "actions" }, save, cancel),
  ].filter(Boolean);
}

// ---- Photo --------------------------------------------------------------------

const SITE_ICONS = /^\/images\/(favicon|apple-touch-icon)/;

function photoScreen(r) {
  // Either one photo field on the site (set straight into the tray), or a photo
  // in an item form being filled in (r.draft).
  let label = r.label;
  let required = r.required;
  let current;
  let eyebrow = "";
  if (r.draft) {
    const d = drafts.get(r.draft);
    if (!d) return goneScreen("Photo");
    current = d[r.field];
  } else {
    const entry = locate(site.schema, view, r.file, r.path);
    if (!entry || controlFor(entry) !== "photo") return goneScreen("Photo");
    label = entry.field.label;
    required = entry.field.required;
    current = entry.value;
    eyebrow = trailText(entry.trail.slice(0, -1));
  }
  const status = el("p", { className: "flash", role: "status", hidden: true });
  const tell = (text) => {
    status.textContent = text;
    status.hidden = !text;
  };
  let busy = false;

  const use = (value) => {
    if (busy) return;
    if (locked() && !r.draft) return tell(SAY.locked);
    if (r.draft) {
      const d = drafts.get(r.draft);
      if (d) d[r.field] = value;
      forgetUnusedPhotos();
      back();
      return;
    }
    const entry = locate(site.schema, view, r.file, r.path);
    if (!entry) return tell(SAY.gone);
    const outcome = addToTray(opFor(entry, { type: "set", value }), isPhonePhoto(value) ? { photoRef: value.slice(7) } : {});
    if (outcome === "full" || outcome === "locked") return tell(outcome === "full" ? SAY.tooMany : SAY.locked);
    busy = true;
    announce(outcome === "same" ? SAY.same : SAY.added);
    back();
  };

  const fileInput = el("input", { type: "file", accept: "image/*", className: "vh", tabindex: "-1", "aria-hidden": "true" });
  const fromPhone = button("Choose from my phone", "dark", () => {
    if (busy) return;
    if (photoRefsInUse().size >= MAX_PHONE_PHOTOS && !isPhonePhoto(current)) {
      tell(SAY.photoLimit);
      return;
    }
    fileInput.value = "";
    fileInput.click();
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file || busy) return;
    // New photos all go in one request with the changes: this one gets what is left.
    let used = 0;
    for (const [ref, p] of photos) if (photoRefsInUse().has(ref) && `@photo:${ref}` !== current) used += p.bytes;
    const room = Math.min(PHOTO_MAX_BYTES, photoRoom(used));
    if (room <= 0) {
      tell(SAY.photoTooBig);
      return;
    }
    busy = true;
    fromPhone.disabled = true;
    tell(SAY.readyingPhoto);
    try {
      const blob = await shrinkPhoto(file, room);
      const ref = `p${Date.now().toString(36)}${(++uid).toString(36)}`;
      photos.set(ref, { base64: await toBase64(blob), thumbUrl: URL.createObjectURL(blob), bytes: blob.size });
      busy = false;
      tell("");
      use(`@photo:${ref}`);
    } catch (err) {
      busy = false;
      fromPhone.disabled = false;
      tell(err && err.tooBig ? SAY.photoTooBig : SAY.badPhoto);
    }
  });

  const tile = (value, name, isNewPhoto) => {
    const src = photoSrc(value);
    const inUse = value === current;
    return el("li", {},
      el("button", {
        type: "button", className: "tile", "aria-pressed": String(inUse),
        "aria-label": isNewPhoto ? "Your new photo" : `Photo ${name}`, onClick: () => use(value),
      },
      el("img", { src, alt: "", loading: "lazy", decoding: "async", width: "160", height: "160" }),
      inUse ? el("span", { className: "tile-tag", text: "In use" }) : null));
  };
  const mine = [...photos.keys()].map((ref) => tile(`@photo:${ref}`, "", true));
  const onSite = (site.images || []).filter((src) => !SITE_ICONS.test(src))
    .map((src) => tile(src, src.split("/").pop().replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "), false));

  const parts = [
    ...head(label || "Photo", { eyebrow }),
    r.draft ? null : lockLine(),
    status,
    el("div", { className: "actions photo-actions" }, fromPhone,
      !required && current ? button("No photo", "line", () => use("")) : null),
    fileInput,
  ];
  const frozen = locked() && !r.draft;
  if (frozen) for (const b of [...mine, ...onSite].map((li) => li.firstChild)) b.disabled = true;
  if (frozen) fromPhone.disabled = true;
  if (mine.length) parts.push(el("h3", { className: "group-title", text: "Your new photos" }), el("ul", { className: "tiles" }, mine));
  parts.push(el("h3", { className: "group-title", text: "Photos already on the site" }), el("ul", { className: "tiles" }, onSite));
  return parts.filter(Boolean);
}

// Upright, long side at most 2000px, JPEG. Smaller and softer if still too big
// for `budget` bytes.
async function shrinkPhoto(file, budget) {
  const source = await decodePhoto(file);
  try {
    let blob = await encode(source.image, source.width, source.height, 2000, 0.85);
    if (blob.size > budget) blob = await encode(source.image, source.width, source.height, 1600, 0.75);
    if (blob.size > budget) blob = await encode(source.image, source.width, source.height, 1200, 0.7);
    if (blob.size > budget) throw Object.assign(new Error("too big"), { tooBig: true });
    return blob;
  } finally {
    source.release();
  }
}

async function decodePhoto(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      /* fall back to an <img>, which browsers also turn upright */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("empty");
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(image, width, height, longSide, quality) {
  const scale = Math.min(1, longSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FBF8F2"; // under any transparent parts
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no image"))), "image/jpeg", quality));
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---- Tray (the list of changes) --------------------------------------------------

function trayScreen() {
  const parts = head("Your changes", { eyebrow: tray.length ? changesReady(tray.length) : "" });
  if (!tray.length) {
    parts.push(el("p", { className: "lead", text: "No changes yet. Find something to change and save it, and it shows up here." }));
    return parts;
  }
  const frozen = locked();
  parts.push(lockLine());
  const rows = tray.map((t, i) => {
    const li = el("li", { className: "change" });
    const words = el("p", { className: "change-words", text: t.entryLabel });
    const actions = el("div", { className: "item-actions" });
    const offer = () => actions.replaceChildren(button("Undo this one", "text", () => ask(), { "aria-label": `Undo this one: ${t.entryLabel}`, disabled: frozen }));
    const ask = () => {
      if (hushed() || locked()) return;
      const plan = dropChange(tray, i);
      const others = plan.dropped.length - 1;
      if (!others) return drop(plan.tray);
      const yes = button("Yes, undo them", "dark", () => !hushed() && drop(plan.tray));
      const keep = button("Keep them", "line", () => {
        offer();
        actions.querySelector("button")?.focus();
      });
      actions.replaceChildren(
        el("p", { className: "confirm-question", text: others === 1 ? "One later change depends on this one, so it goes too. Undo both?" : `${others} later changes depend on this one, so they go too. Undo them all?` }),
        yes, keep);
      yes.focus();
    };
    offer();
    const photoValue = t.photoRef ? `@photo:${t.photoRef}` : null;
    li.append(el("div", { className: "item-line" }, photoValue ? thumb(photoValue) : null, words), actions);
    return li;
  });
  const drop = (next) => {
    if (locked()) return;
    hush(); // the next row's control is now under her finger
    setTray(next);
    announce("Undone. That change is out of the tray.");
    render({ scroll: ui.scroller.scrollTop }); // focus goes to the list's heading
  };
  parts.push(el("ol", { className: "changes" }, rows));
  parts.push(el("div", { className: "actions" }, button("Review", "publish", goOnce("review"))));
  return parts;
}

// ---- Review -------------------------------------------------------------------

// What Review last got for the tray: a card, or the server's problems or sentence.
// `fresh` is set when she taps Review, so a cancelled card or an old answer is
// replaced by a new one; Back to this screen shows what was there.
const review = { card: null, pending: false, sig: "", outcome: null, notice: "", fresh: false };

function reviewScreen() {
  const parts = head("Review your changes");
  const body = el("div", { className: "review-body" });
  parts.push(body);
  const sig = traySig();
  const fresh = review.fresh;
  review.fresh = false;
  let card = review.card;
  if (card && card.state === "cancelled" && (fresh || card.sig !== sig)) card = review.card = null;
  if (card && (card.sig === sig || card.published)) {
    if (review.notice) body.append(el("p", { className: "notice", text: review.notice }));
    body.append(card.node);
  } else if (review.outcome && review.outcome.sticky && !fresh) {
    // The site changed under her: she checks her changes before asking again.
    body.append(...outcomeNodes(review.outcome));
    if (!tray.length) body.append(el("p", { className: "lead", text: SAY.noChanges }));
  } else if (!tray.length) {
    body.append(el("p", { className: "lead", text: SAY.noChanges }));
  } else if (review.pending) {
    body.append(working());
  } else if (review.outcome && review.sig === sig && !fresh && review.outcome.kind !== "unreachable") {
    body.append(...outcomeNodes(review.outcome));
  } else {
    body.append(working());
    propose();
  }
  return parts;
}

function working() {
  return el("div", { className: "working", role: "status" },
    el("p", { text: SAY.gettingReady }),
    el("div", { className: "progress", "aria-hidden": "true" }));
}

function outcomeNodes(o) {
  const out = [];
  if (review.notice) out.push(el("p", { className: "notice", text: review.notice }));
  if (o.kind === "problems") out.push(el("p", { className: "lead", text: SAY.fixFirst }), problemList(o.problems));
  else if (o.kind === "unreachable") out.push(el("p", { className: "card-said", text: SAY.cantReach }), el("div", { className: "actions" }, button("Try again", "line", () => render())));
  else out.push(el("p", { className: "card-said", text: o.text }));
  if (o.sticky && tray.length) {
    out.push(el("div", { className: "actions" },
      button("See my changes", "line", () => navigate({ name: "tray" })),
      button("Review again", "text", () => {
        review.fresh = true;
        render();
      })));
  }
  return out;
}

async function propose() {
  if (review.pending) return;
  review.pending = true; // locks the tray until the answer is in
  review.card = null;
  review.outcome = null;
  review.notice = "";
  lockMaybeChanged();
  const sig = traySig();
  const ids = tray.map((t) => t.id); // exactly what this review covers
  const { ops, refs } = numberPhotos(trayOps());
  const request = { ops };
  if (refs.length) request.photos = refs.map((ref) => photos.get(ref)?.base64 || "");
  if (typeof site.version === "string") request.base = site.version;
  if (JSON.stringify(request).length > MAX_REQUEST_CHARS) {
    review.pending = false;
    review.sig = sig;
    review.outcome = { kind: "text", text: SAY.photosTooBig };
    lockMaybeChanged();
    if (route.name === "review") render();
    return;
  }
  let data = null;
  let failure = null;
  try {
    data = await api("propose", "POST", request);
  } catch (err) {
    failure = err;
  } finally {
    review.pending = false;
  }
  review.sig = sig;
  if (failure instanceof SignedOut) {
    review.outcome = { kind: "unreachable" };
    lockMaybeChanged();
    renderedSig = ""; // drawn again after signing in, so it asks again
    showSignIn();
    return;
  }
  if (data && data.kind === "proposal" && typeof data.id === "string" && traySig() !== sig) {
    // The tray changed while the answer was on its way (it should not have, it
    // was locked): this card is for changes she no longer has. Cancel it (best
    // effort), keep nothing from it, and review the tray as it is now.
    api("cancel", "POST", { id: data.id }).catch(() => {});
    review.outcome = null;
    lockMaybeChanged();
    if (route.name === "review" && signedIn) render(); // with nothing stored, Review asks again
    return;
  }
  if (data && typeof data.notice === "string") review.notice = data.notice;
  if (failure || !data) review.outcome = { kind: "unreachable" };
  else if (data.reload === true) {
    // The site changed since she opened it: load it again (which checks every
    // change in the tray against it) and stay here with the sentence.
    review.outcome = { kind: "text", text: data.text || SAY.wentWrong, sticky: true };
    lockMaybeChanged();
    await loadSite({ quiet: true });
    if (route.name === "review" && signedIn) render(); // even if a load was already under way
    return;
  } else if (data.kind === "proposal" && typeof data.id === "string") review.card = new ProposalCard(data, sig, ids);
  else if (Array.isArray(data.problems) && data.problems.length) review.outcome = { kind: "problems", problems: data.problems };
  else review.outcome = { kind: "text", text: data.error || data.text || SAY.wentWrong };
  lockMaybeChanged();
  if (route.name !== "review" || !signedIn) return;
  render({ scroll: 0 });
  const result = ui.screen.querySelector(".card, .problems, .card-said");
  if (result) {
    if (!result.hasAttribute("tabindex")) result.setAttribute("tabindex", "-1");
    result.focus({ preventScroll: true });
  }
}

// "<label>: <message>", and "Fix it" where it can be matched to a change.
function problemList(problems) {
  return el("ul", { className: "problems" }, problems.map((p) => {
    const label = typeof p.label === "string" ? p.label : "";
    const message = typeof p.message === "string" ? p.message : "";
    const fix = label ? fixFor(label) : null;
    return el("li", {},
      el("p", {}, label ? el("span", { className: "problem-label", text: `${label.replace(/ → /g, " › ")}: ` }) : null, el("span", { text: message })),
      fix ? button("Fix it", "text", fix, { "aria-label": `Fix it: ${label.replace(/ → /g, ", ")}` }) : null);
  }));
}

// Which tray change a problem is about, and how to open it again. The server
// checks the content the whole tray makes, so each change is matched where it
// is now (its spot), not where it was when it was made.
function fixFor(label) {
  for (let i = tray.length - 1; i >= 0; i--) {
    const op = tray[i].op;
    const spot = spots[i];
    if (!spot) continue;
    const mine = checkLabel(site.schema, op.file, spot);
    if (label !== mine && !label.startsWith(`${mine} → `)) continue;
    const parent = spot.slice(0, spot.lastIndexOf("/"));
    if (op.op === "insert") {
      const at = Number(spot.slice(spot.lastIndexOf("/") + 1));
      return () => {
        drafts.delete(itemKey(op.file, parent, at));
        navigate({ name: "item", file: op.file, path: parent, at });
      };
    }
    if (op.op === "remove") return () => navigate({ name: "list", file: op.file, path: spot });
    if (op.op === "move") return () => navigate({ name: "list", file: op.file, path: parent });
    const entry = locate(site.schema, view, op.file, spot);
    if (!entry) return null;
    if (entry.item) return () => navigate({ name: "list", file: op.file, path: parent });
    return () => openEntry(entry);
  }
  return null;
}

// The publish was accepted: the card stays on Review even once the tray has
// moved on. The tray keeps the changes (locked) until the site is live.
function onPublished(card) {
  card.published = true;
}

// Live: exactly the changes it carried leave the tray (it was locked meanwhile).
function onLive(card) {
  if (card.liveSeen) return;
  card.liveSeen = true;
  setTray(removeEntries(tray, card.ids));
  loadSite({ quiet: true });
}

// The site changed under a reviewed card (the server says so on preview or
// publish, or an undo just changed it): the card is thrown away, cancelled on
// the server as well (best effort), the tray unlocks, the site is loaded again
// (which checks every change), and Review shows the sentence.
async function discardCard(card, text) {
  card.stopPolling();
  card.state = "moved";
  if (review.card === card) {
    review.card = null;
    review.outcome = { kind: "text", text, sticky: true };
    review.sig = traySig();
  }
  api("cancel", "POST", { id: card.id }).catch(() => {});
  lockMaybeChanged();
  await loadSite({ quiet: true });
  if (route.name === "review" && signedIn) render();
}

// ---- proposal cards -------------------------------------------------------

const polling = new Set(); // cards waiting on the site

function stopAllPolling() {
  for (const card of polling) card.pause();
}
function resumeAllPolling() {
  if (!signedIn || document.hidden) return;
  for (const card of polling) card.resume();
}

class ProposalCard {
  constructor(p, sig, ids) {
    this.id = p.id;
    this.sig = sig; // the tray this card was made from
    this.ids = ids; // the tray changes it carries
    this.summary = Array.isArray(p.summary) ? p.summary.filter((s) => typeof s === "string") : [];
    this.sha = ""; // the published edit, which "Undo this" puts back
    this.busy = false;
    this.said = ""; // a sentence from the server shown in the card
    this.previewUrl = "";
    this.timer = 0;
    this.pollStarted = 0;
    this.waitingFor = ""; // "preview" | "publish" while polling
    this.published = false;
    this.node = el("article", { className: "card", tabindex: "-1" });
    this.state = "review";
    this.render();
  }

  // -- server calls --

  async call(route, body) {
    if (this.busy) return null;
    this.busy = true;
    this.said = "";
    this.render();
    try {
      const data = await api(route, "POST", body);
      if (data.error) {
        this.said = data.error;
        return null;
      }
      return data;
    } catch (err) {
      // A preview or publish with no answer may still have reached the site,
      // so it is never simply offered again: the caller asks where it got to.
      if (err instanceof TimedOut && (route === "preview" || route === "publish")) return { timedOut: true };
      if (err instanceof SignedOut) {
        // Drawn again with its buttons back before the sign-in shows, so the
        // card is ready when she returns.
        this.busy = false;
        this.render();
        showSignIn();
      } else this.said = SAY.cantReach;
      return null;
    } finally {
      this.busy = false;
    }
  }

  // After a preview or publish went unanswered: ask the site once where this
  // change got to, and carry on from there. `was` is the card's state before.
  async findOut(stage, was) {
    this.busy = true;
    this.said = "";
    this.render();
    let data = null;
    try {
      data = await api(`status?id=${encodeURIComponent(this.id)}`, "GET");
    } catch (err) {
      if (err instanceof SignedOut) {
        // Still unknown: "Check again" is offered once she has signed in.
        this.busy = false;
        this.lost = { stage, was };
        this.state = "unreachable";
        this.render();
        showSignIn();
        return;
      }
    }
    this.busy = false;
    if (!data || data.error) {
      this.lost = { stage, was };
      this.state = "unreachable";
      this.said = SAY.cantReach;
    } else if (data.state === "failed") {
      this.stopPolling();
      this.said = data.text || (data.stage === "publish" ? SAY.publishFailed : this.failedText());
      this.state = "failed";
    } else if (data.stage === "publish") {
      // It went through; the site says which edit it made.
      if (typeof data.sha === "string") this.sha = data.sha;
      this.state = "publishing";
      onPublished(this);
      this.poll("publish");
    } else if (stage === "preview") {
      this.state = "previewing";
      this.poll("preview");
    } else {
      // Not published (yet): back to where it was. Publishing again is safe now,
      // because the site says whether it is already under way or done.
      this.state = was;
      this.said = SAY.cantReach;
    }
    this.render(true);
  }

  async requestPreview() {
    const was = this.state;
    this.state = "previewing";
    const data = await this.call("preview", { id: this.id });
    if (data && data.timedOut) {
      await this.findOut("preview", was);
      return;
    }
    if (data && data.reload === true) {
      await discardCard(this, data.text || SAY.reviewAgain);
      return;
    }
    if (data && data.ok) {
      this.poll("preview");
    } else {
      if (data) this.said = data.text || "";
      this.state = "review";
    }
    this.render(true);
  }

  async publish() {
    const was = this.state;
    const data = await this.call("publish", { id: this.id });
    if (data && data.timedOut) {
      await this.findOut("publish", was);
      return;
    }
    if (data && data.reload === true) {
      await discardCard(this, data.text || SAY.reviewAgain);
      return;
    }
    if (data && data.ok) {
      this.sha = typeof data.sha === "string" ? data.sha : "";
      this.state = "publishing";
      onPublished(this);
      this.poll("publish");
    } else if (data) {
      // Keep whatever state the card is in now: a status check may have moved it on.
      this.said = data.text || "";
    }
    this.render(true);
  }

  async cancel() {
    const data = await this.call("cancel", { id: this.id });
    if (data && data.ok) {
      this.stopPolling();
      this.state = "cancelled";
    } else if (data) {
      this.said = data.text || "";
      await this.afterRefusedCancel();
    }
    this.render(true);
  }

  // A refused cancel can mean it is already on the site: then follow it there,
  // so "Undo this" is offered.
  async afterRefusedCancel() {
    let data = null;
    try {
      data = await api(`status?id=${encodeURIComponent(this.id)}`, "GET");
    } catch (err) {
      if (err instanceof SignedOut) showSignIn();
      return;
    }
    if (!data || data.stage !== "publish" || data.state === "failed") return;
    if (typeof data.sha === "string") this.sha = data.sha;
    onPublished(this);
    if (data.state === "ready") {
      this.stopPolling();
      this.state = "live";
    } else {
      this.state = "publishing";
      this.poll("publish");
    }
  }

  async undo() {
    if (this.busy) return;
    if (!this.sha) {
      this.said = SAY.noUndo;
      this.render(true);
      return;
    }
    const result = await this.call("undo", { sha: this.sha });
    if (result && result.ok) {
      this.undone = result;
      this.state = "undone";
      loadSite({ quiet: true });
    } else if (result) {
      this.said = result.text || "";
    }
    this.render(true);
  }

  // -- waiting on the site --

  poll(stage) {
    this.waitingFor = stage;
    this.pollStarted = Date.now();
    polling.add(this);
    this.schedule();
  }
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.check(), POLL_MS);
  }
  pause() {
    clearTimeout(this.timer);
    this.timer = 0;
  }
  resume() {
    if (this.state === "slow") return;
    clearTimeout(this.timer);
    this.check();
  }
  stopPolling() {
    this.pause();
    polling.delete(this);
    this.waitingFor = "";
  }
  checkAgain() {
    this.state = this.waitingFor === "publish" ? "publishing" : "previewing";
    this.pollStarted = Date.now();
    polling.add(this);
    this.render(true);
    this.check();
  }
  async check() {
    this.timer = 0;
    if (this.checking || !polling.has(this) || !signedIn || document.hidden) return;
    this.checking = true;
    try {
      await this.checkOnce();
    } finally {
      this.checking = false;
    }
  }

  async checkOnce() {
    let data;
    try {
      data = await api(`status?id=${encodeURIComponent(this.id)}`, "GET");
    } catch (err) {
      if (err instanceof SignedOut) {
        showSignIn(); // polling picks up again after signing in
        return;
      }
      data = null; // a blip: try again on the next round
    }
    if (!polling.has(this)) return;
    if (data && !data.error && data.stage === "publish" && typeof data.sha === "string" && !this.sha) this.sha = data.sha;
    // An error reply is a blip like no reply: only a real "ready" or "failed" ends the wait.
    const next = pollStep(data, { waitingFor: this.waitingFor, elapsedMs: Date.now() - this.pollStarted, limitMs: POLL_LIMIT_MS });
    switch (next.step) {
      case "failed":
        this.stopPolling();
        this.said = next.text || this.failedText();
        this.state = "failed";
        this.render(true);
        return;
      case "live":
        this.stopPolling();
        this.state = "live";
        this.render(true);
        return;
      case "previewReady":
        this.stopPolling();
        this.previewUrl = next.url;
        this.state = "previewReady";
        this.render(true);
        return;
      case "followPublish":
        // Published from somewhere else meanwhile: follow that instead.
        this.waitingFor = "publish";
        this.state = "publishing";
        onPublished(this);
        this.render(true);
        break;
      case "slow":
        this.pause();
        this.state = "slow";
        this.render(true);
        return;
    }
    this.schedule();
  }

  // The sentence for a failure the site gave no words for. Once the publish was
  // accepted, "Nothing changed" would not be true.
  failedText() {
    return this.published ? SAY.publishFailed : SAY.wentWrong;
  }

  // -- drawing --

  summaryList() {
    if (!this.summary.length) return null;
    return el("ul", { className: "summary" },
      this.summary.map((line) =>
        line.startsWith(SAY.checkPrefix)
          ? el("li", { className: "check" },
            el("span", { className: "label", text: "Please check" }),
            el("span", { text: line.slice(SAY.checkPrefix.length) }))
          : el("li", { text: line })));
  }

  render(moved) {
    const b = this.busy;
    const parts = [];
    const status = (text, withBar) => {
      parts.push(el("p", { className: "card-status", text }));
      if (withBar) parts.push(el("div", { className: "progress", "aria-hidden": "true" }));
    };
    const actions = (...buttons) => {
      const list = buttons.filter(Boolean);
      for (const btn of list) if (btn.tagName === "BUTTON") btn.disabled = b;
      if (list.length) parts.push(el("div", { className: "actions" }, list));
    };
    const publishBtn = () => button("Publish", "publish", () => this.publish());
    const cancelBtn = () => button("Cancel", "line", () => this.cancel());
    const previewLink = () =>
      this.previewUrl
        ? el("a", { className: "btn btn-line", href: this.previewUrl, target: "_blank", rel: "noopener", text: "Open the preview" })
        : null;
    const title = (text) => parts.push(el("h3", { className: "card-title", text }));
    const body = () => {
      const list = this.summaryList();
      if (list) parts.push(list);
    };

    switch (this.state) {
      case "review":
        title("Here's what will change");
        body();
        actions(publishBtn(), cancelBtn(), button("See it first", "text", () => this.requestPreview()));
        break;
      case "previewing":
        title("Here's what will change");
        body();
        status(SAY.previewing, true);
        actions(publishBtn(), cancelBtn());
        break;
      case "previewReady":
        title("Here's what will change");
        body();
        status("The preview is ready.");
        actions(publishBtn(), previewLink(), cancelBtn());
        break;
      case "publishing":
        title("Here's what will change");
        body();
        status(SAY.publishing, true);
        break;
      case "live": {
        parts.push(el("p", { className: "card-done", text: SAY.live }));
        body();
        const row = el("div", { className: "actions" },
          el("a", { className: "btn btn-line", href: "/", target: "_blank", rel: "noopener", text: "See the site" }),
          button("Undo this", "text", () => this.undo()));
        row.querySelector("button").disabled = b;
        parts.push(row);
        break;
      }
      case "undone":
        parts.push(...undoResult(this.undone));
        break;
      case "failed": // only the server's sentence, no buttons
        break;
      case "slow":
        title("Here's what will change");
        body();
        status(SAY.slow);
        actions(button("Check again", "line", () => this.checkAgain()));
        break;
      case "unreachable": // a preview or publish went unanswered and the site could not say where it got to
        title("Here's what will change");
        body();
        actions(button("Check again", "line", () => this.findOut(this.lost.stage, this.lost.was)));
        break;
      case "cancelled":
        parts.push(el("p", { className: "card-status", text: SAY.cancelled }));
        parts.push(el("div", { className: "actions" }, button("See my changes", "line", () => navigate({ name: "tray" }))));
        break;
    }
    if (this.said) {
      const saidNode = el("p", { className: "card-said", text: this.said });
      // The sentence sits above the buttons it relates to.
      const at = parts.findIndex((p) => p.classList && p.classList.contains("actions"));
      if (at >= 0) parts.splice(at, 0, saidNode);
      else parts.push(saidNode);
    }
    if (this.state === "failed" && tray.some((t) => this.ids.includes(t.id))) {
      parts.push(el("p", { className: "card-status", text: SAY.stillInTray }),
        el("div", { className: "actions" }, button("See my changes", "line", () => navigate({ name: "tray" }))));
    }

    const hadFocus = this.node.contains(document.activeElement);
    this.node.replaceChildren(...parts);
    if (hadFocus) this.node.focus({ preventScroll: true });
    if (moved && this.node.isConnected) reveal(this.node);
    if (moved) announce(this.node.querySelector(".card-status, .card-done, .card-said")?.textContent || "");
    if (this === review.card) {
      if (this.state === "live") onLive(this);
      if (this.state === "failed" && this.published && !this.failSeen) {
        this.failSeen = true;
        loadSite({ quiet: true }); // the site was put back; her changes stay in the tray
      }
      lockMaybeChanged();
    }
  }
}

// "Done. I put back: …" and, when some were changed again since, the ones left alone.
function undoResult(result) {
  const out = [];
  const restored = Array.isArray(result.restored) ? result.restored : [];
  const skipped = Array.isArray(result.skipped) ? result.skipped : [];
  out.push(el("p", { className: "card-status", text: SAY.restored }));
  out.push(el("ul", { className: "card-list" }, restored.map((t) => el("li", { text: String(t) }))));
  if (skipped.length) {
    out.push(el("p", { className: "card-status", text: SAY.skipped }));
    out.push(el("ul", { className: "card-list" }, skipped.map((t) => el("li", { text: String(t) }))));
  }
  return out;
}

// ---- loading the site -------------------------------------------------------

let loadingSite = false;
let hiddenAt = 0;

// Fetches the site's content. Quietly (after a publish, an undo, or coming back
// to the page) it never hides the screen; the tray is always kept.
async function loadSite({ quiet = false } = {}) {
  if (loadingSite) return;
  loadingSite = true;
  if (!quiet || !site) {
    ui.loading.hidden = false;
    ui.loadingText.textContent = SAY.loading;
    ui.loadingRetry.hidden = true;
  }
  try {
    const data = await api("content", "GET");
    if (!data || data.error || !data.schema || !data.content) throw new Error(data && data.error ? data.error : "no content");
    site = {
      schema: data.schema, content: data.content, images: Array.isArray(data.images) ? data.images : [],
      version: typeof data.version === "string" ? data.version : undefined,
    };
    // Every change is checked against the fresh content: followed to where its
    // item is now, or dropped when it no longer fits.
    const pruned = pruneTray(site.content, tray);
    tray = remark(site.content, pruned.tray);
    saveTray();
    refreshView();
    forgetUnusedPhotos();
    gen = `${LOAD_ID}-${++genCount}`; // every screen checks its place again
    ui.loading.hidden = true;
    if (!signedIn) return;
    if (!(quiet && refreshInPlace())) render({ scroll: quiet ? ui.scroller.scrollTop : route.scroll || 0 });
    if (pruned.dropped) {
      const words = flashText === SAY.siteMovedScreen ? `${siteChanged(pruned.dropped)} ${SAY.siteMovedScreen}` : siteChanged(pruned.dropped);
      flash(words);
      announce(words);
    }
  } catch (err) {
    if (err instanceof SignedOut) {
      showSignIn();
    } else if (!site) {
      ui.loadingText.textContent = err && err.message && err.message !== "no content" && !(err instanceof Unreachable) ? err.message : SAY.cantReach;
      ui.loadingRetry.hidden = false;
    }
  } finally {
    loadingSite = false;
  }
}
ui.loadingRetry.addEventListener("click", () => loadSite());

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    stopAllPolling();
    return;
  }
  resumeAllPolling();
  // Not while a review is under way: the tray it covers must stay as reviewed.
  if (signedIn && site && hiddenAt && Date.now() - hiddenAt > STALE_MS && !locked()) loadSite({ quiet: true });
  hiddenAt = 0;
});

// ---- signing in and out -----------------------------------------------------

function showSignIn(message) {
  signedIn = false;
  stopAllPolling();
  ui.starting.hidden = true;
  ui.links.hidden = true;
  ui.recent.hidden = true;
  ui.loading.hidden = true;
  ui.screen.hidden = true; // keeps whatever is on it, and the tray
  ui.trayBar.hidden = true;
  ui.recentToggle.setAttribute("aria-expanded", "false");
  ui.signin.hidden = false;
  ui.signinError.textContent = message || "";
  ui.signinButton.disabled = false;
  ui.scroller.scrollTop = 0;
  ui.password.focus({ preventScroll: true });
}

function showEditor() {
  signedIn = true;
  ui.starting.hidden = true;
  ui.signin.hidden = true;
  ui.password.value = "";
  ui.signinError.textContent = "";
  ui.links.hidden = false;
  resumeAllPolling();
  if (!site) {
    loadSite();
  } else if (renderedSig === JSON.stringify(route)) {
    if (review.card) review.card.render(); // its buttons, as they are now
    ui.screen.hidden = false; // as she left it
    updateTrayBar();
    ui.screen.querySelector(".screen-title")?.focus({ preventScroll: true });
  } else {
    render({ scroll: route.scroll || 0 });
  }
}

async function start() {
  restoreTray();
  if (validRoute(history.state)) route = history.state;
  // A photo being picked for an unsaved item can't survive a reload: go back to its list.
  if (route.name === "photo" && route.draft) route = { ...route, name: "list", draft: undefined, field: undefined, at: undefined };
  // A review doesn't survive a reload; with nothing in the tray there is nothing to review.
  if (route.name === "review" && !tray.length) route = { name: "find", depth: route.depth, app: "editor" };
  history.replaceState({ ...route, app: "editor" }, "");
  try {
    const data = await api("session", "GET");
    if (data.signedIn === true) showEditor();
    else showSignIn(); // signed out: the form, with no message
  } catch (err) {
    showSignIn(err instanceof SignedOut ? "" : SAY.cantReach);
  }
}

let signingIn = false;
ui.signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (signingIn) return;
  if (!ui.password.value) {
    ui.signinError.textContent = "Please type the password.";
    ui.password.focus();
    return;
  }
  signingIn = true;
  ui.signinButton.disabled = true;
  ui.signinError.textContent = "";
  try {
    const data = await api("login", "POST", { password: ui.password.value });
    if (data.ok) {
      showEditor();
      return;
    }
    ui.signinError.textContent = data.error || SAY.cantReach;
    ui.password.select();
  } catch {
    ui.signinError.textContent = SAY.cantReach;
  } finally {
    signingIn = false;
    ui.signinButton.disabled = false;
  }
});

ui.passwordShow.addEventListener("click", () => {
  const show = ui.password.type === "password";
  ui.password.type = show ? "text" : "password";
  ui.passwordShow.textContent = show ? "Hide" : "Show";
  ui.passwordShow.setAttribute("aria-pressed", String(show));
});

// Signing out keeps the tray for this tab: signing in again brings it back.
let signingOut = false;
ui.signOut.addEventListener("click", async () => {
  if (signingOut) return;
  signingOut = true;
  ui.signOut.disabled = true;
  try {
    await api("logout", "POST", {});
    leaving = true;
    window.location.replace("/admin/");
  } catch (err) {
    if (err instanceof SignedOut) showSignIn();
    else flash(SAY.cantReach);
    signingOut = false;
    ui.signOut.disabled = false;
  }
});

// ---- recent changes -------------------------------------------------------

let loadingRecent = false;
// The outcome of the last undo made from this list; it stays while the list reloads.
const recentResult = el("div", { className: "recent-result" });
ui.recentList.before(recentResult);

ui.recentToggle.addEventListener("click", () => {
  const open = ui.recentToggle.getAttribute("aria-expanded") !== "true";
  ui.recentToggle.setAttribute("aria-expanded", String(open));
  ui.recent.hidden = !open;
  if (open) {
    recentResult.replaceChildren();
    loadRecent();
    reveal(ui.recent);
  }
});

async function loadRecent() {
  if (loadingRecent) return;
  loadingRecent = true;
  ui.recentList.replaceChildren();
  ui.recentStatus.textContent = SAY.loadingRecent;
  try {
    const data = await api("history", "GET");
    if (data.error) {
      ui.recentStatus.textContent = data.error;
      return;
    }
    const edits = Array.isArray(data.edits) ? data.edits : [];
    ui.recentStatus.textContent = edits.length ? "" : SAY.noRecent;
    ui.recentList.replaceChildren(...edits.map(recentRow));
  } catch (err) {
    if (err instanceof SignedOut) showSignIn();
    else ui.recentStatus.textContent = SAY.cantReach;
  } finally {
    loadingRecent = false;
  }
}

function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function recentRow(edit) {
  const row = el("li", { className: "recent-row" });
  const when = shortDate(edit.when);
  const title = el("p", {},
    when ? el("span", { className: "recent-when" }, when, el("span", { className: "vh", text: " · " })) : null,
    el("span", { text: String(edit.title || "") }));
  let busy = false;
  let saidNode = null;

  const say = (text) => {
    if (saidNode) saidNode.remove();
    saidNode = text ? el("p", { className: "card-said", text }) : null;
    if (saidNode) row.append(saidNode);
  };

  const offerUndo = () => {
    const undoBtn = button("Undo this", "line", () => askToConfirm());
    setActions(undoBtn);
    return undoBtn;
  };
  const askToConfirm = () => {
    const yes = button("Yes, undo", "dark", () => doUndo(yes, keep));
    const keep = button("Keep it", "line", () => offerUndo().focus());
    setActions(el("p", { className: "confirm-question", text: "Undo this change?" }), yes, keep);
    yes.focus();
  };
  const doUndo = async (yes, keep) => {
    if (busy) return;
    busy = true;
    yes.disabled = true;
    keep.disabled = true;
    say("");
    try {
      const result = await api("undo", "POST", { sha: edit.sha });
      if (result.error) {
        say(result.error);
        offerUndo();
      } else if (result.ok) {
        setActions();
        recentResult.replaceChildren(...undoResult(result));
        loadRecent(); // the undo is itself a new change at the top of the list
        // A review made before this undo no longer matches the site: it is
        // thrown away and she reviews again. A publish under way (or one whose
        // request is still on its way) is left to finish.
        const card = review.card;
        if (discardAfterUndo(card)) discardCard(card, SAY.reviewAgain);
        else if (!locked()) loadSite({ quiet: true });
      } else {
        say(result.text || "");
        offerUndo();
      }
    } catch (err) {
      if (err instanceof SignedOut) showSignIn();
      else say(SAY.cantReach);
      offerUndo();
    } finally {
      busy = false;
    }
  };

  let actionsNode = null;
  function setActions(...nodes) {
    const next = nodes.length ? el("div", { className: "actions" }, nodes) : null;
    if (actionsNode) actionsNode.replaceWith(...(next ? [next] : []));
    else if (next) title.after(next);
    actionsNode = next;
  }

  row.append(title);
  offerUndo();
  return row;
}

// ---- keep the bottom bar above the on-screen keyboard ---------------------

const vv = window.visualViewport;
if (vv) {
  const root = document.documentElement;
  const fit = () => {
    root.style.setProperty("--app-h", `${vv.height}px`);
    root.style.setProperty("--app-top", `${vv.offsetTop}px`);
  };
  vv.addEventListener("resize", fit);
  vv.addEventListener("scroll", fit);
  fit();
}

start();
