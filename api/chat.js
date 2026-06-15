import { providers, routerAuthKey } from "../config/providers.js";
import { createChatHandler } from "../lib/router.js";

export default createChatHandler({
  providers,
  routerAuthKey
});
