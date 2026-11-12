// The raw source of src/css/styles.css, so pages can fingerprint the
// stylesheet URL (see the "fingerprint" filter in eleventy.config.js).
import fs from "node:fs";

export default fs.readFileSync(new URL("../css/styles.css", import.meta.url), "utf8");
