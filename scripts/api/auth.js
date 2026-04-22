import { CONFIG } from "../config.js";

export function validateConfig() {
  return Boolean(CONFIG.apiBase && CONFIG.gameKey && CONFIG.domainKey);
}

export async function createSessionFromCredentials(
  api,
  email,
  password,
  remember,
) {
  const whiteLabel = await api.signIn(email, password, remember);
  const session = await api.startWhiteLabelGameSession(
    email,
    whiteLabel.session_token,
  );
  return session.session_token;
}

export async function signUpAndCreateSession(api, email, password, remember) {
  await api.signUp(email, password);
  return createSessionFromCredentials(api, email, password, remember);
}
