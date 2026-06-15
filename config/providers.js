export const routerAuthKey = process.env.ROUTER_AUTH_KEY;

export const providers = [
  {
    id: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com",
    path: "/v1beta/openai/chat/completions",
    apiKey: process.env.GEMINI_API_KEY,
    timeoutMs: 30000,
    models: [
      { name: "gemini-2.5-flash" }
    ]
  },
  {
    id: "cohere",
    baseUrl: "https://api.cohere.com",
    path: "/v2/chat",
    apiKey: process.env.COHERE_API_KEY,
    timeoutMs: 30000,
    models: [
      { name: "command-a-03-2025" }
    ]
  }
];
