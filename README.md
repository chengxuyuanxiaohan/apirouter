# API Router

A Vercel-ready API router for forwarding chat requests to configured backend model providers. Provider tokens stay on the server, and the router automatically tries another configured provider when one is rate-limited or temporarily unavailable.

## Request

```text
POST /api/chat
```

```bash
curl https://your-app.vercel.app/api/chat \
  -H "x-router-key: $ROUTER_AUTH_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"hello"}]}'
```

Clients send only:

- `model`: the backend model name to use.
- `messages`: chat messages.

## Configuration

Configure providers in [config/providers.js](/Users/gd-npc-1176/Documents/apirouter/config/providers.js).

```js
export const providers = [
  {
    id: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    path: "/v1beta/openai/chat/completions",
    apiKey: process.env.GEMINI_API_KEY,
    models: [{ name: "gemini-2.5-flash" }]
  },
  {
    id: "cohere",
    baseUrl: "https://api.cohere.com",
    path: "/v2/chat",
    apiKey: process.env.COHERE_API_KEY,
    models: [{ name: "command-a-03-2025" }]
  }
];
```

This is a many-to-many mapping:

- One provider can list many models.
- One model can appear under many providers.
- Matching providers are tried in the order they appear in `providers`.

If the same model appears under multiple providers, the router tries them in config order.

## Provider Fields

- `id`: provider identifier used in response headers.
- `baseUrl`: upstream API origin.
- `path`: upstream chat endpoint path.
- `apiKey`: provider API key.
- `authHeader`: optional auth header name. Defaults to `authorization`.
- `authScheme`: optional auth scheme. Defaults to `Bearer`; set to `null` for raw key headers.
- `extraHeaders`: optional fixed upstream headers.
- `extraBody`: optional fixed upstream JSON body fields.
- `models`: models this provider can serve.

Model entries support:

- `name`: model name accepted from the client.
- `upstreamModel`: optional provider-specific model name override.
- `extraBody`: optional fixed body fields for that provider/model pair.

## Fallback

Fallback is triggered for:

- HTTP `429`
- HTTP `500`, `502`, `503`, `504`
- response bodies containing `rate limit`, `too many requests`, `quota`, `resource exhausted`, or `limit exceeded`

Responses include:

```text
x-router-provider: provider that answered
x-router-model: model sent upstream
x-router-attempts: JSON list of attempted providers
```

## Environment Variables

Use `.env.example` as a starting point.

```bash
ROUTER_AUTH_KEY=change-me
GEMINI_API_KEY=...
COHERE_API_KEY=...
```

`ROUTER_AUTH_KEY` is required. If it is missing, the API returns `500` instead of running without authentication.

## Local Development

```bash
npm install
cp .env.example .env
npm run local
```

Test locally:

```bash
curl http://localhost:3000/api/chat \
  -H "x-router-key: change-me" \
  -H "content-type: application/json" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"hello"}]}'
```

## Verification

```bash
npm run check
npm test
```

`npm run local` does not require Vercel login. Use `npm run vercel:dev` only when you specifically want to test through the Vercel CLI.
