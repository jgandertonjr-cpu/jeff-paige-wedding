import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import schema from "../netlify/editor/schema.gen.mjs";
import { READABLE_LAYOUT_FILES } from "../netlify/editor/guard.mjs";
import { systemPrompt, contentBlock } from "../netlify/editor/prompt.mjs";
import { askClaude, TOOLS } from "../netlify/editor/claude.mjs";

const TOO_LONG = "That took too long. Nothing changed. Try again.";
const UNREACHABLE = "I can't reach the site right now. Try again in a minute.";

// A scripted stand-in for the SDK client. Each scripted item is either a
// response object or an Error to throw. Requests are copied as they arrive,
// because the loop keeps adding to its messages array afterwards.
function fakeClient(script) {
  const calls = [];
  const queue = [...script];
  return {
    calls,
    beta: {
      messages: {
        async create(request, options) {
          calls.push({ request: structuredClone(request), options });
          const next = queue.shift();
          if (!next) throw new Error("script ran out");
          if (next instanceof Error) throw next;
          return next;
        },
      },
    },
  };
}

const text = (t) => ({ type: "text", text: t });
const toolUse = (id, name, input) => ({ type: "tool_use", id, name, input });
const reply = (content, stop_reason = "end_turn") => ({ content, stop_reason });

const content = { site: { couple: { partner1_first: "Jeff" } } };
const goodOp = { op: "set", file: "site", path: "/couple/partner1_first", value_json: '"Jeffrey"', index: null, to: null };
const goodProposal = { note: "Changed the name.", content_ops: [goodOp], file_edits: [] };

const run = (client, extra = {}) =>
  askClaude({
    client,
    schema,
    content,
    message: "Change Jeff to Jeffrey",
    history: [],
    readFile: async () => "FILE TEXT",
    deadlineMs: 1_000_000,
    now: () => 0,
    ...extra,
  });

test("request uses the agreed model, settings and cached system blocks", async () => {
  const client = fakeClient([reply([text("Hi")])]);
  await run(client);
  const { request, options } = client.calls[0];
  assert.equal(request.model, "claude-sonnet-5-5");
  assert.equal(request.max_tokens, 8000);
  assert.deepEqual(request.output_config, { effort: "low" });
  assert.deepEqual(request.betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(request.fallbacks, "default");
  for (const banned of ["thinking", "temperature", "top_p", "top_k"]) assert.ok(!(banned in request), banned);
  assert.ok(!request.tool_choice || request.tool_choice.type === "auto");
  assert.equal(request.system.length, 2);
  assert.equal(request.system[0].text, systemPrompt(schema));
  assert.equal(request.system[1].text, contentBlock(content));
  for (const block of request.system) assert.deepEqual(block.cache_control, { type: "ephemeral" });
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(options.maxRetries, 0);
  assert.equal(request.tools.length, 2);
  for (const tool of request.tools) assert.equal(tool.strict, true);
});

test("a propose_change call becomes a proposal with parsed ops", async () => {
  const client = fakeClient([reply([text("on it"), toolUse("t1", "propose_change", goodProposal)], "tool_use")]);
  const out = await run(client);
  assert.deepEqual(out, {
    kind: "proposal",
    note: "Changed the name.",
    contentOps: [{ op: "set", file: "site", path: "/couple/partner1_first", value: "Jeffrey" }],
    fileEdits: [],
  });
  assert.equal(client.calls.length, 1);
});

test("insert, move and remove keep index and to; file edits pass through", async () => {
  const input = {
    note: "n",
    content_ops: [
      { op: "insert", file: "faq", path: "/items", value_json: '{"q":"a"}', index: -1, to: null },
      { op: "move", file: "faq", path: "/items", value_json: null, index: 2, to: 0 },
      { op: "remove", file: "faq", path: "/items", value_json: null, index: 1, to: null },
    ],
    file_edits: [{ path: "src/faq.njk", find: "a", replace: "b" }],
  };
  const out = await run(fakeClient([reply([toolUse("t", "propose_change", input)], "tool_use")]));
  assert.deepEqual(out.contentOps, [
    { op: "insert", file: "faq", path: "/items", value: { q: "a" }, index: -1 },
    { op: "move", file: "faq", path: "/items", index: 2, to: 0 },
    { op: "remove", file: "faq", path: "/items", index: 1 },
  ]);
  assert.deepEqual(out.fileEdits, [{ path: "src/faq.njk", find: "a", replace: "b" }]);
});

test("a text-only reply is a message", async () => {
  const out = await run(fakeClient([reply([text("Which hotel do you mean?")])]));
  assert.deepEqual(out, { kind: "message", text: "Which hotel do you mean?" });
});

test("read_file then propose_change takes two calls and returns the file as a tool_result", async () => {
  const thinking = { type: "thinking", thinking: "", signature: "sig" };
  const first = [thinking, toolUse("r1", "read_file", { path: "src/faq.njk" })];
  const client = fakeClient([reply(first, "tool_use"), reply([toolUse("p1", "propose_change", goodProposal)], "tool_use")]);
  const asked = [];
  const out = await run(client, { readFile: async (p) => (asked.push(p), "the faq page") });
  assert.equal(out.kind, "proposal");
  assert.deepEqual(asked, ["src/faq.njk"]);
  const second = client.calls[1].request.messages;
  const assistant = second.at(-2);
  assert.equal(assistant.role, "assistant");
  assert.deepEqual(assistant.content, first);
  const user = second.at(-1);
  assert.equal(user.role, "user");
  assert.deepEqual(user.content, [{ type: "tool_result", tool_use_id: "r1", content: "the faq page" }]);
});

test("read_file outside the readable list is an error result and never reads", async () => {
  const client = fakeClient([
    reply([toolUse("r1", "read_file", { path: "src/_data/guests.json" })], "tool_use"),
    reply([text("Sorry, I can't.")]),
  ]);
  const out = await run(client, { readFile: async () => assert.fail("must not read") });
  assert.equal(out.kind, "message");
  const result = client.calls[1].request.messages.at(-1).content[0];
  assert.equal(result.is_error, true);
  assert.equal(result.tool_use_id, "r1");
});

test("read_file output is capped at 120,000 characters with a note", async () => {
  const client = fakeClient([reply([toolUse("r1", "read_file", { path: READABLE_LAYOUT_FILES[0] })], "tool_use"), reply([text("ok")])]);
  await run(client, { readFile: async () => "x".repeat(300_000) });
  const result = client.calls[1].request.messages.at(-1).content[0];
  assert.ok(result.content.length < 121_000);
  assert.ok(result.content.startsWith("x".repeat(120_000)));
  assert.match(result.content, /cut off/i);
});

test("a missing file comes back as an error result", async () => {
  const client = fakeClient([reply([toolUse("r1", "read_file", { path: "src/faq.njk" })], "tool_use"), reply([text("ok")])]);
  await run(client, { readFile: async () => null });
  assert.equal(client.calls[1].request.messages.at(-1).content[0].is_error, true);
});

test("malformed tool calls are recoverable errors that use up a turn", async () => {
  const bad = [
    { note: "n", content_ops: [], file_edits: [] }, // nothing to change
    { note: "n", content_ops: [{ ...goodOp, op: "delete" }], file_edits: [] },
    { note: "n", content_ops: [{ ...goodOp, file: "nope" }], file_edits: [] },
    { note: "n", content_ops: [{ ...goodOp, value_json: "{not json" }], file_edits: [] },
    { note: "n", content_ops: [{ ...goodOp, extra: 1 }], file_edits: [] },
    { note: "n", content_ops: [{ ...goodOp, index: "1" }], file_edits: [] },
    { note: 5, content_ops: [goodOp], file_edits: [] },
    { note: "n", content_ops: [goodOp], file_edits: [{ path: "a", find: "b" }] },
    { note: "n", content_ops: [goodOp], file_edits: [], extra: true },
    "not an object",
    { note: "n", content_ops: [{ ...goodOp, file: "__proto__" }], file_edits: [] },
  ];
  for (const input of bad) {
    const client = fakeClient([
      reply([toolUse("p1", "propose_change", input)], "tool_use"),
      reply([toolUse("p2", "propose_change", goodProposal)], "tool_use"),
    ]);
    const out = await run(client);
    assert.equal(out.kind, "proposal", JSON.stringify(input));
    assert.equal(client.calls.length, 2);
    const result = client.calls[1].request.messages.at(-1).content[0];
    assert.equal(result.is_error, true, JSON.stringify(input));
    assert.equal(result.tool_use_id, "p1");
  }
});

test("an unknown tool name is an error result", async () => {
  const client = fakeClient([reply([toolUse("x1", "rm_rf", {})], "tool_use"), reply([text("ok")])]);
  await run(client);
  assert.equal(client.calls[1].request.messages.at(-1).content[0].is_error, true);
});

test("every tool_use in a turn gets a result", async () => {
  const client = fakeClient([
    reply([toolUse("a", "read_file", { path: "src/faq.njk" }), toolUse("b", "read_file", { path: "src/index.njk" })], "tool_use"),
    reply([text("ok")]),
  ]);
  await run(client);
  const ids = client.calls[1].request.messages.at(-1).content.map((r) => r.tool_use_id);
  assert.deepEqual(ids, ["a", "b"]);
});

test("four turns without a proposal gives the took-too-long message", async () => {
  const turn = (n) => reply([toolUse(`r${n}`, "read_file", { path: "src/faq.njk" })], "tool_use");
  const client = fakeClient([turn(1), turn(2), turn(3), turn(4), turn(5)]);
  const out = await run(client);
  assert.deepEqual(out, { kind: "message", text: TOO_LONG });
  assert.equal(client.calls.length, 4);
});

test("refusal and max_tokens stop reasons", async () => {
  assert.deepEqual(await run(fakeClient([reply([], "refusal")])), { kind: "message", text: "I can't help with that one." });
  assert.deepEqual(await run(fakeClient([reply([text("par")], "max_tokens")])), { kind: "message", text: TOO_LONG });
  // a tool call cut off by max_tokens must never be treated as a proposal
  const cut = reply([toolUse("p", "propose_change", goodProposal)], "max_tokens");
  assert.deepEqual(await run(fakeClient([cut])), { kind: "message", text: TOO_LONG });
  const refused = reply([toolUse("p", "propose_change", goodProposal)], "refusal");
  assert.deepEqual(await run(fakeClient([refused])), { kind: "message", text: "I can't help with that one." });
});

test("a photo is an image block first, with its future path stated in text", async () => {
  const client = fakeClient([reply([text("ok")])]);
  await run(client, { photo: { mediaType: "image/jpeg", base64: "QUJD", willBeSavedAs: "src/images/cake.jpg" } });
  const last = client.calls[0].request.messages.at(-1);
  assert.equal(last.role, "user");
  assert.deepEqual(last.content[0], { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "QUJD" } });
  assert.equal(last.content[1].type, "text");
  assert.match(last.content[1].text, /Change Jeff to Jeffrey/);
  assert.match(last.content[1].text, /src\/images\/cake\.jpg/);
});

test("feedback is appended to the last user turn", async () => {
  const client = fakeClient([reply([text("ok")])]);
  await run(client, { feedback: "The date is not a real date." });
  const last = client.calls[0].request.messages.at(-1);
  const body = typeof last.content === "string" ? last.content : last.content.map((b) => b.text).join("");
  assert.match(body, /Your previous proposal could not be used: The date is not a real date\./);
});

test("history is capped to 12 turns of 2,000 characters and starts with a user turn", async () => {
  const history = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `${i}:` + "y".repeat(3000) }));
  const client = fakeClient([reply([text("ok")])]);
  await run(client, { history });
  const messages = client.calls[0].request.messages;
  const sent = messages.slice(0, -1);
  assert.ok(sent.length <= 12);
  assert.equal(sent[0].role, "user");
  for (const m of sent) assert.ok(m.content.length <= 2000);
  assert.equal(messages.at(-1).role, "user");
});

test("the deadline is passed to each call and an expired deadline makes no call", async () => {
  const client = fakeClient([reply([text("ok")])]);
  await run(client, { deadlineMs: 5000, now: () => 1000 });
  assert.equal(client.calls[0].options.timeout, 4000);
  const idle = fakeClient([]);
  const out = await run(idle, { deadlineMs: 1000, now: () => 1000 });
  assert.deepEqual(out, { kind: "message", text: TOO_LONG });
  assert.equal(idle.calls.length, 0);
});

test("SDK errors become plain messages and never leak their text", async () => {
  const secret = "request-id req_123 key sk-ant-SECRET";
  const timeouts = [new Anthropic.APIConnectionTimeoutError({ message: secret }), new Anthropic.APIUserAbortError({ message: secret })];
  for (const err of timeouts) assert.deepEqual(await run(fakeClient([err])), { kind: "message", text: TOO_LONG });
  const others = [
    new Anthropic.APIConnectionError({ message: secret }),
    Anthropic.APIError.generate(429, { error: { message: secret } }, secret, new Headers()),
    Anthropic.APIError.generate(500, { error: { message: secret } }, secret, new Headers()),
    Anthropic.APIError.generate(529, { error: { message: secret } }, secret, new Headers()),
    Anthropic.APIError.generate(400, { error: { message: secret } }, secret, new Headers()),
    Anthropic.APIError.generate(401, { error: { message: secret } }, secret, new Headers()),
  ];
  for (const err of others) {
    const out = await run(fakeClient([err]));
    assert.deepEqual(out, { kind: "message", text: UNREACHABLE });
    assert.ok(!JSON.stringify(out).includes("SECRET"));
  }
});

test("a later turn that errors is also a plain message", async () => {
  const client = fakeClient([
    reply([toolUse("r1", "read_file", { path: "src/faq.njk" })], "tool_use"),
    new Anthropic.APIConnectionError({ message: "x" }),
  ]);
  assert.deepEqual(await run(client), { kind: "message", text: UNREACHABLE });
});

test("systemPrompt states the rules in order, has the outline, and no secrets or date", () => {
  const p = systemPrompt(schema);
  assert.equal(p, systemPrompt(schema));
  const order = [
    /Paige/,
    /propose_change/,
    /content_ops/,
    /file_edits/,
    /one short question/i,
    /old date/i,
    /never invent|do not invent/i,
    /decline/i,
    /plain text/i,
    /markdown/i,
    /Names, Date & Venue/,
  ];
  let at = -1;
  for (const re of order) {
    const m = re.exec(p.slice(at + 1));
    assert.ok(m, String(re));
    at += 1 + m.index;
  }
  assert.match(p, /\/couple\/partner1_first/);
  assert.match(p, /ask/i);
  assert.ok(!/NETLIFY_RSVP_TOKEN|RSVP_DASHBOARD_REPO|SITE_ID|ANTHROPIC|GITHUB|process\.env/.test(p));
  assert.ok(!/sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]{8,}|[A-Z]{3,}_(KEY|TOKEN|SECRET)\b/.test(p));
  assert.ok(!/\b20\d\d-\d\d-\d\d\b/.test(p));
});

test("contentBlock carries the site content as text", () => {
  const b = contentBlock(content);
  assert.match(b, /"partner1_first": "Jeff"/);
  assert.match(b, /site/);
});

test("TOOLS are the two named tools, both strict with closed schemas", () => {
  assert.deepEqual(TOOLS.map((t) => t.name), ["read_file", "propose_change"]);
  for (const t of TOOLS) {
    assert.equal(t.strict, true);
    assert.equal(t.input_schema.additionalProperties, false);
    assert.deepEqual([...t.input_schema.required].sort(), Object.keys(t.input_schema.properties).sort());
  }
});
