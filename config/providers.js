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
  },
  {
    id: "openrouter",
    baseUrl: "https://openrouter.ai",
    path: "/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeoutMs: 30000,
    extraHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://localhost",
      "X-Title": process.env.OPENROUTER_APP_NAME || "apirouter"
    },
    models: [
      { name: "openrouter/free"}
    ]
  },
  {
    id: "nvidia",
    baseUrl: "https://integrate.api.nvidia.com",
    path: "/v1/chat/completions",
    apiKey: process.env.NVIDIA_API_KEY,
    timeoutMs: 30000,
    models: [
      { name: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning" }
    ]
  },
  {
    id: "groq",
    baseUrl: "https://api.groq.com",
    path: "/openai/v1/chat/completions",
    apiKey: process.env.GROQ_API_KEY,
    timeoutMs: 30000,
    models: [
      { name: "qwen/qwen3-32b"}
    ]
  },
  {
    id: "mistral",
    baseUrl: "https://api.mistral.ai",
    path: "/v1/chat/completions",
    apiKey: process.env.MISTRAL_API_KEY,
    timeoutMs: 30000,
    models: [
      { name: "mistral-large-latest" },
      { name: "mistral-small-latest" }
    ]
  }
];
