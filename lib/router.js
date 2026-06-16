const FALLBACK_STATUSES = new Set([429, 500, 502, 503, 504]);

export function findProviderCandidates(providers, modelName) {
  const candidates = [];

  for (const provider of providers) {
    for (const model of provider.models || []) {
      if (model.name === modelName) {
        candidates.push({
          provider,
          model,
          upstreamModel: model.upstreamModel || model.name
        });
      }
    }
  }

  return candidates;
}

export function shouldFallback(status, responseText) {
  if (FALLBACK_STATUSES.has(status)) {
    return true;
  }

  const text = responseText.toLowerCase();
  return (
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("quota") ||
    text.includes("resource exhausted") ||
    text.includes("limit exceeded")
  );
}

export function buildProviderUrl(provider) {
  return new URL(provider.path, provider.baseUrl.replace(/\/?$/, "/"));
}

export function buildAuthValue(provider) {
  if (provider.authScheme === null) {
    return provider.apiKey;
  }

  return `${provider.authScheme || "Bearer"} ${provider.apiKey}`;
}

export function buildUpstreamRequest(candidate, requestBody) {
  const { provider, model, upstreamModel } = candidate;
  const headers = {
    "content-type": "application/json",
    [provider.authHeader || "authorization"]: buildAuthValue(provider)
  };

  if (provider.extraHeaders) {
    Object.assign(headers, provider.extraHeaders);
  }

  return {
    url: buildProviderUrl(provider),
    init: {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...requestBody,
        model: upstreamModel,
        ...provider.extraBody,
        ...model.extraBody
      })
    }
  };
}

export function validateMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every((message) => {
      return (
        message &&
        typeof message === "object" &&
        typeof message.role === "string"
      );
    })
  );
}

export async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("request body must be valid JSON");
  }
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function isMissingApiKey(provider) {
  return !provider.apiKey;
}

function getRequestAuthToken(req) {
  const authorization = req.headers.authorization;

  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return req.headers["x-router-key"];
}

async function callProvider(candidate, requestBody, fetchImpl) {
  if (isMissingApiKey(candidate.provider)) {
    throw new Error(`provider ${candidate.provider.id} is missing apiKey`);
  }

  const request = buildUpstreamRequest(candidate, requestBody);
  const timeoutMs = candidate.model.timeoutMs || candidate.provider.timeoutMs || 30000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchImpl(request.url, {
      ...request.init,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`provider ${candidate.provider.id} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const responseBody = Buffer.from(await response.arrayBuffer());

  return {
    response,
    responseBody,
    providerId: candidate.provider.id,
    upstreamModel: candidate.upstreamModel
  };
}

export function createChatHandler({ providers, routerAuthKey, fetchImpl = fetch }) {
  return async function handler(req, res) {
    if (req.method !== "POST") {
      res.setHeader("allow", "POST");
      return sendJson(res, 405, { error: "method not allowed" });
    }

    if (!routerAuthKey) {
      return sendJson(res, 500, { error: "router auth key is not configured" });
    }

    if (getRequestAuthToken(req) !== routerAuthKey) {
      return sendJson(res, 401, { error: "unauthorized" });
    }

    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }

    if (typeof body.model !== "string" || !body.model.trim()) {
      return sendJson(res, 400, { error: "request body must include a model" });
    }

    if (!validateMessages(body.messages)) {
      return sendJson(res, 400, {
        error: "request body must include messages with role strings"
      });
    }

    const modelName = body.model.trim();
    const candidates = findProviderCandidates(providers, modelName);

    if (candidates.length === 0) {
      return sendJson(res, 404, { error: `unknown model: ${modelName}` });
    }

    const attempts = [];
    let upstreamResult;

    for (const candidate of candidates) {
      try {
        upstreamResult = await callProvider(candidate, body, fetchImpl);
      } catch (error) {
        attempts.push({
          provider: candidate.provider.id,
          model: candidate.upstreamModel,
          error: error.message
        });

        if (candidate === candidates[candidates.length - 1]) {
          return sendJson(res, 502, { error: "all providers failed", attempts });
        }

        continue;
      }

      const responseText = upstreamResult.responseBody.toString("utf8");
      attempts.push({
        provider: candidate.provider.id,
        model: candidate.upstreamModel,
        status: upstreamResult.response.status
      });

      if (
        upstreamResult.response.ok ||
        !shouldFallback(upstreamResult.response.status, responseText) ||
        candidate === candidates[candidates.length - 1]
      ) {
        break;
      }
    }

    res.statusCode = upstreamResult.response.status;
    res.setHeader("x-router-provider", upstreamResult.providerId);
    res.setHeader("x-router-model", upstreamResult.upstreamModel);
    res.setHeader("x-router-attempts", JSON.stringify(attempts));
    res.setHeader(
      "content-type",
      upstreamResult.response.headers.get("content-type") || "application/json; charset=utf-8"
    );
    res.end(upstreamResult.responseBody);
  };
}
