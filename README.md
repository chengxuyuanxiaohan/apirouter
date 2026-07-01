国产大模型、Google Gemini、OpenRouter 免费模型……
每个平台都有一点免费额度，但真正用起来却很麻烦：接口不一样、鉴权不一样、模型名不一样，今天这个限流，明天那个超时。

API Router 帮你把这些模型源统一成一个 OpenAI 兼容接口。

你只需要配置一次 PROVIDERS_JSON，就可以把 Gemini、国产大模型、OpenRouter 等多个后端模型接到同一个入口。

客户端仍然像调用 OpenAI 一样请求 /v1/chat/completions，底层由 Router 帮你转发到真实模型源。

想省 token？把各平台的免费额度集中起来用。

想试国产大模型？一个模型名就能切到你配置好的后端。

想接 Gemini？不用改业务代码，换个配置就能跑。

当某个模型限流、超时或服务异常时，Router 还可以按配置顺序尝试下一个可用源，让你的 AI 应用不再被单个平台卡死。

如果你想

- 集中管理多个大模型的 api key
- 白嫖各平台免费 token，不浪费任何可用额度
- 用一个接口管理国产大模型、Gemini、OpenRouter 等多个来源
- 保持 OpenAI SDK 调用方式，少改代码
- 把 provider key 放在服务端，避免暴露到前端
- 可部署到 Vercel，轻量、简单、成本低

**一句话**

API Router 不是另一个大模型平台，而是你的 “免费 token 调度器”。把能用的模型都接进来，把能省的 token 都省下来。

立即部署自己的 API Router，开始整合你的免费 AI Token。
