export const routerAuthKey = process.env.ROUTER_AUTH_KEY;

function envValue(value, env) {
  if (typeof value !== "string" || !value.startsWith("$")) {
    return value;
  }

  return env[value.slice(1)];
}

function resolveHeaders(headers, env) {
  if (!headers) {
    return undefined;
  }

  const resolvedHeaders = Object.entries(headers)
    .map(([name, value]) => [name, envValue(value, env)])
    .filter(([, value]) => value !== undefined);

  return resolvedHeaders.length ? Object.fromEntries(resolvedHeaders) : undefined;
}

function normalizeProvider(provider, env) {
  return {
    ...provider,
    apiKey: provider.apiKey,
    extraHeaders: resolveHeaders(provider.extraHeaders, env)
  };
}

export function loadProvidersFromJson(rawJson, env = process.env) {
  if (!rawJson) {
    return {
      providers: [],
      error: "PROVIDERS_JSON is not configured"
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      providers: [],
      error: "PROVIDERS_JSON must be valid JSON"
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      providers: [],
      error: "PROVIDERS_JSON must be a JSON array"
    };
  }

  return {
    providers: parsed.map((provider) => normalizeProvider(provider, env)),
    error: null
  };
}

const providerConfig = loadProvidersFromJson(process.env.PROVIDERS_JSON);

export const providers = providerConfig.providers;
export const providerConfigError = providerConfig.error;
