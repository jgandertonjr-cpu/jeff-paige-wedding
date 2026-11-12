// The plain-English editor at /admin/. Paige types what she wants changed; the
// server (/api/editor/*) answers with a reply or a proposed change, which she can
// publish, look at first, or cancel. Everything shown on screen is set with
// textContent, never as HTML.
(function () {
  "use strict";

  const API = "/api/editor/";
  const POLL_MS = 4000;
  const POLL_LIMIT_MS = 5 * 60 * 1000;
  const MAX_CHARS = 2000;
  const COUNT_FROM = 1800;
  const HISTORY_SENT = 12;
  const DRAFT_KEY = "editor-draft";
  const PHOTO_MAX_BYTES = 2.8 * 1024 * 1024;

  const SAY = {
    cantReach: "I can't reach the site right now. Try again in a minute.",
    wentWrong: "Something went wrong. Nothing changed. Try again in a minute.",
    working: "Working on that. This can take up to a minute.",
    previewing: "Getting a preview ready. This takes about a minute.",
    bigger: "It changes how a page looks, so I'm getting a preview ready first.",
    publishing: "Publishing. Live in about a minute.",
    live: "It's live.",
    cancelled: "Okay, I've left the site as it is.",
    slow: "This is taking longer than usual. Check back in a few minutes.",
    restored: "Done. I put back:",
    skipped: "These had been changed again since, so I left them:",
    noUndo: "I can't find that change in the recent list, so I can't undo it.",
    badPhoto: "I couldn't read that photo. Try a different one.",
    readyingPhoto: "Getting the photo ready.",
    photoAdded: "Photo added",
    noRecent: "Nothing has been changed here yet.",
    loadingRecent: "Getting the list.",
    checkPrefix: "Please check: ",
    oneMoment: "One moment…",
  };

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
    conversation: $("conversation"),
    welcome: $("welcome"),
    log: $("log"),
    composer: $("composer"),
    chip: $("chip"),
    chipThumb: $("chip-thumb"),
    chipText: $("chip-text"),
    chipRemove: $("chip-remove"),
    photoInput: $("photo-input"),
    photoButton: $("photo-button"),
    message: $("message"),
    send: $("send"),
    counter: $("counter"),
    composerStatus: $("composer-status"),
    scroller: $("scroller"),
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

  // What every caller does with a failure it doesn't handle itself.
  function failed(err) {
    if (err instanceof SignedOut) showSignIn();
    else note(SAY.cantReach);
  }

  // ---- small DOM helpers ----------------------------------------------------

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "className") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "onClick") node.addEventListener("click", v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) if (c) node.append(c);
    return node;
  }
  const button = (label, kind, onClick) =>
    el("button", { type: "button", className: kind === "text" ? "btn-text" : `btn btn-${kind}`, text: label, onClick });

  function reveal(node) {
    requestAnimationFrame(() => node.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" }));
  }

  // ---- screens --------------------------------------------------------------

  let signedIn = false;

  function showSignIn(message) {
    signedIn = false;
    stopAllPolling();
    ui.starting.hidden = true;
    ui.links.hidden = true;
    ui.recent.hidden = true;
    ui.recentToggle.setAttribute("aria-expanded", "false");
    ui.composer.hidden = true; // keeps whatever is typed in it
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
    ui.conversation.hidden = false;
    ui.composer.hidden = false;
    fitMessage();
    resumeAllPolling();
  }

  async function start() {
    restoreDraft();
    try {
      const data = await api("session", "GET");
      if (data.signedIn === true) showEditor();
      else showSignIn(); // signed out: the form, with no message
    } catch (err) {
      showSignIn(err instanceof SignedOut ? "" : SAY.cantReach);
    }
  }

  // ---- sign-in --------------------------------------------------------------

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
        ui.message.focus();
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

  let signingOut = false;
  ui.signOut.addEventListener("click", async () => {
    if (signingOut) return;
    signingOut = true;
    ui.signOut.disabled = true;
    try {
      await api("logout", "POST", {});
      saveDraft("");
      window.location.replace("/admin/");
    } catch (err) {
      failed(err);
      signingOut = false;
      ui.signOut.disabled = false;
    }
  });

  // ---- the conversation -----------------------------------------------------

  const said = []; // { role: "user" | "assistant", text }, oldest first

  function addEntry(node) {
    ui.welcome.hidden = true;
    ui.log.append(node);
    reveal(node);
    return node;
  }
  function note(text) {
    return addEntry(el("p", { className: "entry entry-note", text }));
  }
  function reply(text) {
    said.push({ role: "assistant", text });
    return addEntry(el("p", { className: "entry entry-reply", text }));
  }

  // ---- the text box ---------------------------------------------------------

  let asking = false; // while true the text box is read-only, so nothing typed can be lost
  let photo = null; // { base64, thumbUrl } once ready
  const typePlaceholder = ui.message.placeholder;
  let readyingPhoto = false;

  function saveDraft(text) {
    try {
      if (text) sessionStorage.setItem(DRAFT_KEY, text);
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* private browsing: the draft just isn't kept */
    }
  }
  function restoreDraft() {
    try {
      const text = sessionStorage.getItem(DRAFT_KEY);
      if (text) ui.message.value = text.slice(0, MAX_CHARS);
    } catch {
      /* nothing kept */
    }
    updateComposer();
  }

  function fitMessage() {
    const box = ui.message;
    box.style.height = "auto";
    const max = parseFloat(getComputedStyle(box).maxHeight) || 140;
    const height = Math.min(box.scrollHeight + 2, max);
    box.style.height = `${Math.max(height, 48)}px`;
    box.style.overflowY = box.scrollHeight + 2 > max ? "auto" : "hidden";
  }

  function updateComposer() {
    const length = ui.message.value.length;
    if (length >= COUNT_FROM) {
      ui.counter.hidden = false;
      ui.counter.textContent = `${length.toLocaleString()} of ${MAX_CHARS.toLocaleString()} characters`;
    } else {
      ui.counter.hidden = true;
      ui.counter.textContent = "";
    }
    ui.send.disabled = asking || readyingPhoto || !ui.message.value.trim();
    ui.photoButton.disabled = asking || readyingPhoto;
    ui.chipRemove.disabled = asking || readyingPhoto;
    ui.message.readOnly = asking;
    ui.message.placeholder = asking ? SAY.oneMoment : typePlaceholder;
    const hint = asking ? SAY.oneMoment : "";
    if (ui.composerStatus.textContent !== hint) ui.composerStatus.textContent = hint;
    fitMessage();
  }

  ui.message.addEventListener("input", () => {
    saveDraft(ui.message.value);
    updateComposer();
  });

  ui.message.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229) return;
    if (touchFirst.matches) return; // on a phone, Enter is a new line
    e.preventDefault();
    send();
  });

  ui.composer.addEventListener("submit", (e) => {
    e.preventDefault();
    send();
  });

  for (const example of document.querySelectorAll(".example")) {
    example.addEventListener("click", () => {
      if (asking) return;
      ui.message.value = example.textContent.trim();
      saveDraft(ui.message.value);
      updateComposer();
      ui.message.focus();
      const end = ui.message.value.length;
      ui.message.setSelectionRange(end, end);
    });
  }

  async function send() {
    const text = ui.message.value.trim();
    if (asking || readyingPhoto) return;
    if (!text) {
      ui.message.focus();
      return;
    }
    asking = true;
    const sentPhoto = photo;
    const history = said.slice(-HISTORY_SENT);
    const mine = addEntry(
      el("div", { className: "entry entry-you" },
        el("span", { text }),
        sentPhoto ? el("span", { className: "label", text: "With a photo" }) : null),
    );
    const working = addEntry(
      el("div", { className: "entry entry-working" },
        el("p", { text: SAY.working }),
        el("div", { className: "progress", "aria-hidden": "true" })),
    );
    ui.message.value = "";
    updateComposer();

    // Nothing happened, so offer the request again: the "you" bubble goes, and the
    // text and photo return to the box. The box is read-only while asking, so it is
    // empty; if it somehow is not, what is there is never overwritten.
    const putBack = () => {
      mine.remove();
      if (ui.message.value.trim()) {
        clearPhoto(sentPhoto);
        return;
      }
      ui.message.value = text;
      if (sentPhoto) setPhoto(sentPhoto);
      saveDraft(text);
    };

    try {
      const body = { message: text, history };
      if (sentPhoto) body.photo = sentPhoto.base64;
      const data = await api("ask", "POST", body);
      working.remove();
      if (data.error || data.retry) {
        putBack();
        note(data.error || (typeof data.text === "string" ? data.text : SAY.cantReach));
      } else {
        said.push({ role: "user", text });
        clearPhoto(sentPhoto);
        saveDraft(ui.message.value);
        if (data.kind === "proposal") {
          said.push({ role: "assistant", text: data.note || "" });
          addEntry(new ProposalCard(data).node);
        } else {
          reply(typeof data.text === "string" ? data.text : SAY.cantReach);
        }
      }
    } catch (err) {
      working.remove();
      putBack();
      failed(err);
    } finally {
      asking = false;
      updateComposer();
    }
  }

  // ---- photos ---------------------------------------------------------------

  ui.photoButton.addEventListener("click", () => {
    if (asking || readyingPhoto) return;
    ui.photoInput.value = "";
    ui.photoInput.click();
  });

  ui.photoInput.addEventListener("change", async () => {
    const file = ui.photoInput.files && ui.photoInput.files[0];
    ui.photoInput.value = "";
    if (!file) return;
    readyingPhoto = true;
    clearPhoto(photo);
    ui.chip.hidden = false;
    ui.chipThumb.hidden = true;
    ui.chipText.textContent = SAY.readyingPhoto;
    updateComposer();
    try {
      const blob = await shrinkPhoto(file);
      setPhoto({ base64: await toBase64(blob), thumbUrl: URL.createObjectURL(blob) });
    } catch {
      ui.chip.hidden = true;
      note(SAY.badPhoto);
    } finally {
      readyingPhoto = false;
      updateComposer();
    }
  });

  ui.chipRemove.addEventListener("click", () => {
    clearPhoto(photo);
    ui.photoButton.focus();
  });

  function setPhoto(p) {
    photo = p;
    ui.chipThumb.src = p.thumbUrl;
    ui.chipThumb.hidden = false;
    ui.chipText.textContent = SAY.photoAdded;
    ui.chip.hidden = false;
    updateComposer();
  }
  function clearPhoto(p) {
    if (p && p === photo) {
      photo = null;
      ui.chip.hidden = true;
      ui.chipThumb.removeAttribute("src");
    }
    if (p && p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
    if (p) p.thumbUrl = null;
  }

  // Upright, long side at most 2000px, JPEG. Smaller and softer if still too big.
  async function shrinkPhoto(file) {
    const source = await decodePhoto(file);
    try {
      let blob = await encode(source.image, source.width, source.height, 2000, 0.85);
      if (blob.size > PHOTO_MAX_BYTES) blob = await encode(source.image, source.width, source.height, 1600, 0.75);
      if (blob.size > PHOTO_MAX_BYTES) throw new Error("too big");
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

  // ---- proposal cards -------------------------------------------------------

  const polling = new Set(); // cards waiting on the site

  function stopAllPolling() {
    for (const card of polling) card.pause();
  }
  function resumeAllPolling() {
    if (!signedIn || document.hidden) return;
    for (const card of polling) card.resume();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAllPolling();
    else resumeAllPolling();
  });

  class ProposalCard {
    constructor(p) {
      this.id = p.id;
      this.summary = Array.isArray(p.summary) ? p.summary.filter((s) => typeof s === "string") : [];
      this.note = typeof p.note === "string" ? p.note : "";
      this.bigger = p.needsPreview === true;
      this.title = "";
      this.busy = false;
      this.said = ""; // a sentence from the server shown in the card
      this.previewUrl = "";
      this.timer = 0;
      this.pollStarted = 0;
      this.waitingFor = ""; // "preview" | "publish" while polling
      this.node = el("article", { className: "entry card", tabindex: "-1" });
      if (this.bigger) {
        this.state = "previewing";
        this.render();
        this.requestPreview();
      } else {
        this.state = "review";
        this.render();
      }
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
          note(data.error);
          return null;
        }
        return data;
      } catch (err) {
        // A preview or publish with no answer may still have reached the site,
        // so it is never simply offered again: the caller asks where it got to.
        if (err instanceof TimedOut && (route === "preview" || route === "publish")) return { timedOut: true };
        failed(err);
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
          this.busy = false;
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
        this.said = data.text || SAY.wentWrong;
        this.state = "failed";
      } else if (data.stage === "publish") {
        // It went through. The server names an edit after its first summary line.
        this.title = this.title || titleFor(this.summary);
        this.state = "publishing";
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
      if (data && data.ok) {
        this.poll("preview");
      } else if (data) {
        this.said = data.text || "";
        this.state = this.bigger ? "previewRefused" : "review";
      } else if (!this.bigger) {
        this.state = "review";
      } else {
        this.state = "previewRefused";
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
      if (data && data.ok) {
        this.title = data.title || "";
        this.state = "publishing";
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
      }
      this.render(true);
    }

    async undo() {
      if (this.busy) return;
      this.busy = true;
      this.said = "";
      this.render();
      let sha = "";
      try {
        const data = await api("history", "GET");
        if (data.error) {
          note(data.error);
        } else {
          const match = (data.edits || []).find((e) => e && e.title === this.title);
          if (match) sha = match.sha;
          else this.said = SAY.noUndo;
        }
      } catch (err) {
        failed(err);
      }
      this.busy = false;
      if (!sha) {
        this.render(true);
        return;
      }
      const result = await this.call("undo", { sha });
      if (result && result.ok) {
        this.undone = result;
        this.state = "undone";
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
          showSignIn();
          return;
        }
        data = null; // a blip: try again on the next round
      }
      if (!polling.has(this)) return;
      if (data && data.error) {
        this.stopPolling();
        note(data.error);
        this.state = "stopped";
        this.render(true);
        return;
      }
      if (data && data.state === "failed") {
        this.stopPolling();
        this.said = data.text || SAY.wentWrong;
        this.state = "failed";
        this.render(true);
        return;
      }
      if (data && data.state === "ready") {
        if (data.stage === "publish") {
          this.stopPolling();
          this.state = "live";
          this.render(true);
          return;
        }
        if (this.waitingFor === "preview") {
          this.stopPolling();
          this.previewUrl = data.url || "";
          this.state = "previewReady";
          this.render(true);
          return;
        }
      }
      if (data && data.stage === "publish" && this.waitingFor === "preview") {
        // Published from somewhere else meanwhile: follow that instead.
        this.waitingFor = "publish";
        this.state = "publishing";
        this.render(true);
      }
      if (Date.now() - this.pollStarted > POLL_LIMIT_MS) {
        this.pause();
        this.state = "slow";
        this.render(true);
        return;
      }
      this.schedule();
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

      const head = (title) => {
        parts.push(el("h2", { className: "card-title", text: title }));
      };
      const body = () => {
        const list = this.summaryList();
        if (list) parts.push(list);
        if (this.note) parts.push(el("p", { className: "card-note", text: this.note }));
      };

      switch (this.state) {
        case "review":
          head("Here's what will change");
          body();
          actions(publishBtn(), cancelBtn(), button("See it first", "text", () => this.requestPreview()));
          break;
        case "previewing":
          if (this.bigger) {
            head("This is a bigger change");
            parts.push(el("p", { className: "card-lead", text: SAY.bigger }));
          } else {
            head("Here's what will change");
          }
          body();
          status(SAY.previewing, true);
          actions(this.bigger ? null : publishBtn(), cancelBtn());
          break;
        case "previewRefused":
          head("This is a bigger change");
          body();
          actions(button("Try again", "line", () => this.requestPreview()), cancelBtn());
          break;
        case "previewReady":
          head(this.bigger ? "This is a bigger change" : "Here's what will change");
          body();
          status("The preview is ready.");
          actions(publishBtn(), previewLink(), cancelBtn());
          break;
        case "publishing":
          head("Here's what will change");
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
        case "stopped":
          head("Here's what will change");
          body();
          break;
        case "slow":
          head("Here's what will change");
          body();
          status(SAY.slow);
          actions(button("Check again", "line", () => this.checkAgain()));
          break;
        case "unreachable": // a preview or publish went unanswered and the site could not say where it got to
          head("Here's what will change");
          body();
          actions(button("Check again", "line", () => this.findOut(this.lost.stage, this.lost.was)));
          break;
        case "cancelled":
          parts.push(el("p", { className: "card-status", text: SAY.cancelled }));
          break;
      }
      if (this.said) {
        const saidNode = el("p", { className: "card-said", text: this.said });
        // The sentence sits above the buttons it relates to.
        const at = parts.findIndex((p) => p.classList && p.classList.contains("actions"));
        if (at >= 0) parts.splice(at, 0, saidNode);
        else parts.push(saidNode);
      }

      const hadFocus = this.node.contains(document.activeElement);
      this.node.replaceChildren(...parts);
      if (hadFocus) this.node.focus({ preventScroll: true });
      if (moved) reveal(this.node);
    }
  }

  // The title the site gives an edit: a copy of titleOf in netlify/editor/service.mjs
  // (keep the two the same). Used only when a publish's own answer never arrived.
  function titleFor(summary) {
    const max = 72;
    const line = (summary[0] || "Site change").replace(/^Please check: /, "");
    if (line.length <= max) return line;
    const steps = line.split(" → ");
    for (let i = 1; i < steps.length; i++) {
      const shorter = `… → ${steps.slice(i).join(" → ")}`;
      if (shorter.length <= max) return shorter;
    }
    const last = steps.length > 1 ? `… → ${steps[steps.length - 1]}` : line;
    return `${last.slice(0, max - 1)}…`;
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

  // ---- keep the text box above the on-screen keyboard ----------------------

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
  ui.message.addEventListener("focus", () => {
    setTimeout(() => {
      const last = ui.log.lastElementChild;
      if (last) last.scrollIntoView({ block: "nearest" });
    }, 300);
  });

  start();
})();
