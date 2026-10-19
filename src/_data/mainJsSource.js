// The raw source of src/js/main.js.njk, so pages can fingerprint the
// main.js URL (see the "fingerprint" filter in eleventy.config.js).
import fs from "node:fs";

export default fs.readFileSync(new URL("../js/main.js.njk", import.meta.url), "utf8");
