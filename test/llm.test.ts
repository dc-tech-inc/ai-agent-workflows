import { describe, expect, it } from "vitest";
import { createProvider, FakeProvider, loadDotEnv, REFUSAL } from "../src/llm/index.js";
import { anthropicProvider, geminiProvider, openaiProvider } from "../src/llm/real.js";
import type { FetchLike } from "../src/llm/types.js";

const messages = [
  { role: "system" as const, content: "be brief" },
  { role: "user" as const, content: "hi" },
];

function fakeFetch(body: unknown, ok = true) {
  const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) as Record<string, unknown> });
    return { ok, status: ok ? 200 : 500, json: async () => body };
  };
  return { fn, calls };
}

describe("createProvider", () => {
  it("defaults to the offline fake", () => {
    expect(createProvider({}).name).toBe("fake");
    expect(createProvider({ LLM_PROVIDER: "FAKE" }).name).toBe("fake");
  });

  it("needs a key and a model for a real provider, and knows only three", () => {
    expect(() => createProvider({ LLM_PROVIDER: "anthropic" })).toThrow(/LLM_API_KEY and LLM_MODEL/);
    expect(() => createProvider({ LLM_PROVIDER: "nope", LLM_API_KEY: "k", LLM_MODEL: "m" })).toThrow(/Unknown LLM_PROVIDER/);
    for (const kind of ["anthropic", "openai", "gemini"]) {
      expect(createProvider({ LLM_PROVIDER: kind, LLM_API_KEY: "k", LLM_MODEL: "m", LLM_BASE_URL: "http://localhost" }).name).toBe(kind);
    }
  });

  it("loadDotEnv ignores a missing file", () => {
    expect(() => loadDotEnv("does-not-exist.env")).not.toThrow();
  });
});

describe("FakeProvider", () => {
  it("refuses when the context has nothing relevant", async () => {
    const prompt = "<context>\n[a#1] Cats sleep a lot.\n</context>\n\n<question>\nhow do tax refunds work\n</question>";
    expect(await new FakeProvider().complete([{ role: "user", content: prompt }])).toBe(REFUSAL);
    expect(await new FakeProvider().complete([])).toBe(REFUSAL);
  });
});

describe("real provider request shapes (no network)", () => {
  it("anthropic: system is top level, key in x-api-key", async () => {
    const { fn, calls } = fakeFetch({ content: [{ type: "text", text: "hello" }, { type: "tool_use" }] });
    expect(await anthropicProvider({ apiKey: "KEY", model: "m", fetch: fn }).complete(messages)).toBe("hello");
    expect(calls[0]).toMatchObject({
      url: "https://api.anthropic.com/v1/messages",
      headers: { "x-api-key": "KEY", "anthropic-version": "2023-06-01" },
      body: { model: "m", system: "be brief", messages: [{ role: "user", content: "hi" }] },
    });
  });

  it("openai: bearer auth, messages unchanged", async () => {
    const { fn, calls } = fakeFetch({ choices: [{ message: { content: "yo" } }] });
    expect(await openaiProvider({ apiKey: "KEY", model: "m", fetch: fn }).complete(messages)).toBe("yo");
    expect(calls[0]).toMatchObject({ url: "https://api.openai.com/v1/chat/completions", headers: { authorization: "Bearer KEY" }, body: { messages } });
  });

  it("gemini: systemInstruction and model role mapping", async () => {
    const { fn, calls } = fakeFetch({ candidates: [{ content: { parts: [{ text: "a" }, { text: "b" }] } }] });
    const turns = [...messages, { role: "assistant" as const, content: "ok" }];
    expect(await geminiProvider({ apiKey: "KEY", model: "g m", fetch: fn }).complete(turns)).toBe("ab");
    expect(calls[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/g%20m:generateContent");
    expect(calls[0]?.body).toMatchObject({
      systemInstruction: { parts: [{ text: "be brief" }] },
      contents: [{ role: "user" }, { role: "model" }],
    });
  });

  it("tolerates empty responses and surfaces HTTP errors without leaking the key", async () => {
    expect(await openaiProvider({ apiKey: "K", model: "m", fetch: fakeFetch({}).fn }).complete(messages)).toBe("");
    expect(await anthropicProvider({ apiKey: "K", model: "m", fetch: fakeFetch({}).fn }).complete(messages)).toBe("");
    expect(await geminiProvider({ apiKey: "K", model: "m", fetch: fakeFetch({}).fn }).complete(messages)).toBe("");
    const failing = openaiProvider({ apiKey: "SECRET-KEY", model: "m", fetch: fakeFetch({}, false).fn });
    await expect(failing.complete(messages)).rejects.toThrow("HTTP 500");
    await expect(failing.complete(messages)).rejects.not.toThrow(/SECRET-KEY/);
  });
});
