import assert from "node:assert/strict";
import test from "node:test";
import { loadProvidersFromJson } from "../config/providers.js";

test("loadProvidersFromJson reads provider keys from JSON", () => {
  const rawJson = JSON.stringify([
    {
      id: "openrouter",
      baseUrl: "https://openrouter.ai",
      path: "/api/v1/chat/completions",
      apiKey: "test-key",
      extraHeaders: {
        "HTTP-Referer": "https://example.com",
        "X-Title": "apirouter"
      },
      models: [{ name: "openrouter/free" }]
    }
  ]);

  const { providers, error } = loadProvidersFromJson(rawJson);

  assert.equal(error, null);
  assert.equal(providers[0].apiKey, "test-key");
  assert.deepEqual(providers[0].extraHeaders, {
    "HTTP-Referer": "https://example.com",
    "X-Title": "apirouter"
  });
});

test("loadProvidersFromJson rejects invalid provider JSON", () => {
  const { providers, error } = loadProvidersFromJson("{bad json");

  assert.deepEqual(providers, []);
  assert.equal(error, "PROVIDERS_JSON must be valid JSON");
});

test("loadProvidersFromJson requires an array", () => {
  const { providers, error } = loadProvidersFromJson("{}");

  assert.deepEqual(providers, []);
  assert.equal(error, "PROVIDERS_JSON must be a JSON array");
});
