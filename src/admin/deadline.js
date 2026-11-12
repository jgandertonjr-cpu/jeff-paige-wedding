// How long the editor page waits for the site before giving up on a request.
// A plain script loaded before admin.js; it adds `editorDeadline` to the page.
(function (root) {
  "use strict";

  const ASK_MS = 75 * 1000; // a request to change something can take most of a minute
  const OTHER_MS = 30 * 1000;

  function deadlineFor(route) {
    return String(route).split("?")[0] === "ask" ? ASK_MS : OTHER_MS;
  }

  // Runs request(signal). Settles with its result, or, once `ms` have passed,
  // aborts the signal and rejects with an error whose `timedOut` is true, even
  // if the request itself never settles.
  function withDeadline(ms, request) {
    const controller = new AbortController();
    return new Promise((resolve, reject) => {
      const timedOut = () => Object.assign(new Error("No answer in time."), { timedOut: true });
      const timer = setTimeout(() => {
        controller.abort();
        reject(timedOut());
      }, ms);
      Promise.resolve()
        .then(() => request(controller.signal))
        .then(
          (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          (err) => {
            clearTimeout(timer);
            reject(controller.signal.aborted ? timedOut() : err);
          },
        );
    });
  }

  root.editorDeadline = { deadlineFor, withDeadline };
})(typeof window !== "undefined" ? window : globalThis);
