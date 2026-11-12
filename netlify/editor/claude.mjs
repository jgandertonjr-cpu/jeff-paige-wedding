// The conversation with the model: Paige's request in, either a proposal
// (a list of change operations) or a plain message for her out. Nothing here is
// trusted by the rest of the editor; the server checks every proposal again.
// The client is passed in, so tests never touch the real API.
import Anthropic from "@anthropic-ai/sdk";
import { READABLE_LAYOUT_FILES } from "./guard.mjs";
import { systemPrompt, contentBlock } from "./prompt.mjs";

const MODEL = "claude-sonnet-5-5";
const MAX_TURNS = 4;
const MAX_FILE_CHARS = 120_000;
const MAX_HISTORY_TURNS = 12;
const MAX_HISTORY_CHARS = 2000;

const TOO_LONG = { kind: "message", text: "That took too long. Nothing changed. Try again." };
const UNREACHABLE = { kind: "message", text: "I can't reach the site right now. Try again in a minute." };
const REFUSED = { kind: "message", text: "I can't help with that one." };
const NO_ANSWER = { kind: "message", text: "I couldn't work out a change for that. Could you say it another way?" };

const OPS = ["set", "insert", "remove", "move"];
const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });

export const TOOLS = [
  {
    name: "read_file",
    description: "Read one page file or the stylesheet, to see how the site is laid out before proposing an edit to it.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "One of the page files listed to you, for example src/faq.njk." } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_change",
    description: "Propose the change Paige asked for. She reads the note and approves it before anything is saved.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string", description: "Short plain-English summary for Paige, including any sentences you also updated." },
        content_ops: {
          type: "array",
          description: "Edits to the site's content. Prefer these.",
          items: {
            type: "object",
            properties: {
              op: { type: "string", enum: OPS },
              file: { type: "string", description: "The file key from the outline, for example site." },
              path: { type: "string", description: "RFC 6901 pointer inside that file, for example /couple/partner1_first." },
              value_json: nullable({ type: "string" }),
              index: nullable({ type: "integer" }),
              to: nullable({ type: "integer" }),
            },
            required: ["op", "file", "path", "value_json", "index", "to"],
            additionalProperties: false,
          },
        },
        file_edits: {
          type: "array",
          description: "Exact text replacements in a page file. Only when no content field can do it.",
          items: {
            type: "object",
            properties: { path: { type: "string" }, find: { type: "string" }, replace: { type: "string" } },
            required: ["path", "find", "replace"],
            additionalProperties: false,
          },
        },
      },
      required: ["note", "content_ops", "file_edits"],
      additionalProperties: false,
    },
  },
];

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isString = (v) => typeof v === "string";
const isIntOrNull = (v) => v === null || Number.isInteger(v);
const hasOnly = (obj, keys) => {
  const own = Object.keys(obj);
  return own.length === keys.length && keys.every((k) => Object.hasOwn(obj, k));
};

// Returns { value } or { error }. The error text goes to the model, not to Paige.
function parseProposal(input, schema) {
  if (!isPlain(input) || !hasOnly(input, ["note", "content_ops", "file_edits"])) {
    return { error: "propose_change needs exactly note, content_ops and file_edits." };
  }
  const { note, content_ops, file_edits } = input;
  if (!isString(note) || note.trim() === "") return { error: "note must be a short non-empty sentence for Paige." };
  if (!Array.isArray(content_ops) || !Array.isArray(file_edits)) return { error: "content_ops and file_edits must be lists." };
  if (content_ops.length === 0 && file_edits.length === 0) {
    return { error: "The proposal changes nothing. Ask Paige a question instead, or propose at least one change." };
  }

  const contentOps = [];
  for (const [i, raw] of content_ops.entries()) {
    const at = `content_ops[${i}]`;
    if (!isPlain(raw) || !hasOnly(raw, ["op", "file", "path", "value_json", "index", "to"])) {
      return { error: `${at} needs exactly op, file, path, value_json, index and to.` };
    }
    if (!OPS.includes(raw.op)) return { error: `${at}.op must be one of ${OPS.join(", ")}.` };
    if (!isString(raw.file) || !Object.hasOwn(schema.files, raw.file)) return { error: `${at}.file is not a file key from the outline.` };
    if (!isString(raw.path)) return { error: `${at}.path must be a string.` };
    if (raw.value_json !== null && !isString(raw.value_json)) return { error: `${at}.value_json must be a string or null.` };
    if (!isIntOrNull(raw.index) || !isIntOrNull(raw.to)) return { error: `${at}.index and .to must be whole numbers or null.` };

    const op = { op: raw.op, file: raw.file, path: raw.path };
    if (raw.op === "set" || raw.op === "insert") {
      if (raw.value_json === null) return { error: `${at}.value_json is needed for ${raw.op}.` };
      try {
        op.value = JSON.parse(raw.value_json);
      } catch {
        return { error: `${at}.value_json is not valid JSON text.` };
      }
    }
    if (raw.index !== null) op.index = raw.index;
    if (raw.to !== null) op.to = raw.to;
    contentOps.push(op);
  }

  const fileEdits = [];
  for (const [i, raw] of file_edits.entries()) {
    if (!isPlain(raw) || !hasOnly(raw, ["path", "find", "replace"]) || !isString(raw.path) || !isString(raw.find) || !isString(raw.replace)) {
      return { error: `file_edits[${i}] needs exactly path, find and replace, all text.` };
    }
    fileEdits.push({ path: raw.path, find: raw.find, replace: raw.replace });
  }
  return { value: { kind: "proposal", note, contentOps, fileEdits } };
}

async function runReadFile(input, readFile) {
  if (!isPlain(input) || !hasOnly(input, ["path"]) || !isString(input.path)) {
    return { is_error: true, content: "read_file needs exactly one text value, path." };
  }
  if (!READABLE_LAYOUT_FILES.includes(input.path)) return { is_error: true, content: "That file is not one you can read." };
  const text = await readFile(input.path);
  if (text === null || text === undefined) return { is_error: true, content: "That file was not found." };
  if (text.length > MAX_FILE_CHARS) {
    return { content: `${text.slice(0, MAX_FILE_CHARS)}\n\n[The rest of this file was cut off; it was ${text.length} characters long.]` };
  }
  return { content: text };
}

function historyMessages(history) {
  const turns = (history ?? [])
    .filter((t) => t && (t.role === "user" || t.role === "assistant") && isString(t.text) && t.text.trim() !== "")
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, content: t.text.slice(0, MAX_HISTORY_CHARS) }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

function newUserTurn({ message, photo, feedback }) {
  let body = message;
  if (photo) body += `\n\n(Paige attached the photo above. If you use it, it will be saved as ${photo.willBeSavedAs}.)`;
  if (feedback) body += `\n\nYour previous proposal could not be used: ${feedback}`;
  const content = [];
  if (photo) content.push({ type: "image", source: { type: "base64", media_type: photo.mediaType, data: photo.base64 } });
  content.push({ type: "text", text: body });
  return { role: "user", content };
}

const textOf = (blocks) => blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();

export async function askClaude({
  client,
  schema,
  content,
  message,
  history = [],
  photo,
  readFile,
  feedback,
  deadlineMs,
  now = () => Date.now(),
}) {
  const system = [
    { type: "text", text: systemPrompt(schema), cache_control: { type: "ephemeral" } },
    { type: "text", text: contentBlock(content), cache_control: { type: "ephemeral" } },
  ];
  const messages = [...historyMessages(history), newUserTurn({ message, photo, feedback })];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const remaining = deadlineMs - now();
    if (remaining <= 0) return TOO_LONG;

    let response;
    try {
      response = await client.beta.messages.create(
        {
          model: MODEL,
          max_tokens: 8000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system,
          tools: TOOLS,
          messages,
        },
        { signal: AbortSignal.timeout(remaining), timeout: remaining, maxRetries: 0 },
      );
    } catch (error) {
      // Only the type decides the wording; the SDK's own message is never passed on.
      if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof Anthropic.APIUserAbortError) return TOO_LONG;
      if (error instanceof Anthropic.APIError) return UNREACHABLE;
      if (error?.name === "TimeoutError" || error?.name === "AbortError") return TOO_LONG;
      throw error;
    }

    // Check the stop reason before looking at content: a cut-off or refused turn
    // can contain a half-written tool call that must never be used.
    if (response.stop_reason === "refusal") return REFUSED;
    if (response.stop_reason === "max_tokens") return TOO_LONG;

    const calls = response.content.filter((b) => b.type === "tool_use");
    if (calls.length === 0) {
      const text = textOf(response.content);
      return text ? { kind: "message", text } : NO_ANSWER;
    }

    const results = [];
    for (const call of calls) {
      let result;
      if (call.name === "propose_change") {
        const parsed = parseProposal(call.input, schema);
        if (parsed.value) return parsed.value;
        result = { is_error: true, content: parsed.error };
      } else if (call.name === "read_file") {
        result = await runReadFile(call.input, readFile);
      } else {
        result = { is_error: true, content: "There is no such tool." };
      }
      results.push({ type: "tool_result", tool_use_id: call.id, ...result });
    }

    // The assistant turn goes back exactly as received (thinking blocks included).
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: results });
  }
  return TOO_LONG;
}
