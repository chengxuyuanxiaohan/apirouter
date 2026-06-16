import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { createChatHandler, findProviderCandidates } from "../lib/router.js";

const providers = [
  {
    id: "first",
    baseUrl: "https://first.example.com",
    path: "/v1/chat/completions",
    apiKey: "first-key",
    models: [{ name: "shared-model" }, { name: "first-only" }]
  },
  {
    id: "second",
    baseUrl: "https://second.example.com",
    path: "/openai/v1/chat/completions",
    apiKey: "second-key",
    models: [{ name: "shared-model" }]
  }
];

function createRequest(body, routerKey = "test-key", headers = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = "POST";
  req.headers = { "x-router-key": routerKey, ...headers };
  return req;
}

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body) {
      this.body = Buffer.isBuffer(body) ? body.toString("utf8") : String(body ?? "");
    }
  };
}

test("findProviderCandidates returns every provider that supports a model", () => {
  const candidates = findProviderCandidates(providers, "shared-model");

  assert.deepEqual(
    candidates.map((candidate) => candidate.provider.id),
    ["first", "second"]
  );
});

test("handler falls back to the next provider after rate limiting", async () => {
  const calls = [];
  const handler = createChatHandler({
    providers,
    routerAuthKey: "test-key",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });

      if (calls.length === 1) {
        return new Response(JSON.stringify({ error: "rate limit" }), {
          status: 429,
          headers: { "content-type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  const res = createResponse();

  await handler(
    createRequest({
      model: "shared-model",
      messages: [{ role: "user", content: "hello" }]
    }),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["x-router-provider"], "second");
  assert.deepEqual(
    calls.map((call) => call.url),
    [
      "https://first.example.com/v1/chat/completions",
      "https://second.example.com/openai/v1/chat/completions"
    ]
  );
});

test("handler accepts OpenAI-style bearer authentication and forwards request params", async () => {
  const calls = [];
  const handler = createChatHandler({
    providers,
    routerAuthKey: "test-key",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  const res = createResponse();

  await handler(
    createRequest(
      {
        model: "first-only",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "hello" }]
          }
        ],
        temperature: 0.2,
        max_tokens: 64
      },
      undefined,
      { authorization: "Bearer test-key" }
    ),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(calls[0].body.model, "first-only");
  assert.equal(calls[0].body.temperature, 0.2);
  assert.equal(calls[0].body.max_tokens, 64);
  assert.deepEqual(calls[0].body.messages[0].content, [{ type: "text", text: "hello" }]);
});

test("handler rejects missing router auth", async () => {
  const handler = createChatHandler({
    providers,
    routerAuthKey: "test-key",
    fetchImpl: async () => {
      throw new Error("fetch should not be called");
    }
  });
  const res = createResponse();

  await handler(createRequest({ model: "shared-model", messages: [] }, "wrong-key"), res);

  assert.equal(res.statusCode, 401);
});

test("handler rejects unknown models", async () => {
  const handler = createChatHandler({
    providers,
    routerAuthKey: "test-key",
    fetchImpl: async () => {
      throw new Error("fetch should not be called");
    }
  });
  const res = createResponse();

  await handler(
    createRequest({
      model: "missing-model",
      messages: [{ role: "user", content: "hello" }]
    }),
    res
  );

  assert.equal(res.statusCode, 404);
});
