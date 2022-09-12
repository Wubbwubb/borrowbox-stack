import invariant from "tiny-invariant";
import type { Session } from "@remix-run/node";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import type { TokenSet } from "openid-client";
import { BaseClient, generators, Issuer } from "openid-client";
import { getToken, insertToken, removeToken, updateToken } from "~/token.server";
import jwtDecode from "jwt-decode";
import { JWTPayload } from "jose";

export type User = {
  id: string;
  email: string;
  username: string;
  name: string;
  authorized: boolean;
};

export type AuthInfo = {
  user: User;
  accessToken: string;
};

type KeycloakJWTPayload = {
  sub: string;
  email: string;
  preferred_username: string;
  name: string;
  realm_access: { roles: string[] };
};

invariant(process.env.SESSION_SECRET, "SESSION_SECRET must be set");
invariant(process.env.KEYCLOAK_RESOURCE, "KEYCLOAK_RESOURCE must be set");
const requiredRealmRole: string | undefined = process.env.KEYCLOAK_REQUIRED_REALM_ROLE;

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

export const SESSION_KEY = "id";

invariant(process.env.AUTH_URL, "AUTH_URL must be set");

let _client: BaseClient;

export const getClient = async () => {
  if (!_client) {
    const issuer = await Issuer.discover(process.env.AUTH_URL!);

    _client = new issuer.Client({
      client_id: process.env.KEYCLOAK_RESOURCE!,
      token_endpoint_auth_method: "none",
    });
  }

  return _client;
};

export const getUrlOrigin = (request: Request) => {
  return new URL(request.url).origin;
};

export const getSession = async (request: Request) => {
  const cookie = request.headers.get("Cookie");
  return await sessionStorage.getSession(cookie);
};

export const getSessionId = async (request: Request) => {
  const session = await getSession(request);
  return session.get(SESSION_KEY) as string | undefined;
};

export const requireUserCredentials = async (request: Request) => {
  const cookie = request.headers.get("Cookie");
  const session = await sessionStorage.getSession(cookie);
  const sessionId = session.get(SESSION_KEY) as string | undefined;

  if (!sessionId) {
    throw await login(request);
  }

  let tokenSet;
  try {
    tokenSet = await getToken(sessionId);

    if (tokenSet?.expired()) {
      const client = await getClient();

      const nextTokenSet = await client.refresh(tokenSet);
      await updateToken(sessionId, nextTokenSet);
      tokenSet = nextTokenSet;
    }
  } catch (e) {
    throw await login(request);
  }

  if (!tokenSet) {
    throw await login(request);
  }

  const jwt = jwtDecode<JWTPayload & KeycloakJWTPayload>(tokenSet.access_token!);

  let authorized = true;
  if (!!requiredRealmRole && !jwt.realm_access.roles.find((role) => role === requiredRealmRole)) {
    if (new URL(request.url).pathname !== "/unauthorized") {
      throw redirect("/unauthorized", {
        status: 302,
      });
    } else {
      authorized = false;
    }
  }

  const { email, name, preferred_username: username, sub: id } = jwt;
  const user: User = {
    id,
    email,
    username,
    name,
    authorized,
  };
  const authInfo: AuthInfo = {
    user,
    accessToken: tokenSet.access_token!,
  };

  return authInfo;
};

export const createAuthUrl = async (session: Session, redirect_uri: string, action: string | undefined = undefined) => {
  const client = await getClient();

  const state = generators.state();
  const nonce = generators.nonce();
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);

  const url = client.authorizationUrl({
    redirect_uri,
    scope: "openid email profile",
    response_mode: "query",
    response_type: "code",
    state,
    nonce,
    code_challenge,
    code_challenge_method: "S256",
    kc_action: action,
  });

  session.set("state", state);
  session.set("nonce", nonce);
  session.set("code_verifier", code_verifier);

  return url;
};

export const login = async (request: Request) => {
  const requestUrl = new URL(request.url);

  const session = await getSession(request);

  const url = await createAuthUrl(session, `${getUrlOrigin(request)}/callback`);

  const redirectTo = requestUrl || "/";
  session.set("redirectTo", redirectTo);

  return redirect(url, {
    status: 302,
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: 90,
      }),
    },
  });
};

export const verifyCallback = async (request: Request) => {
  const client = await getClient();
  const session = await getSession(request);

  const state = session.get("state");
  const nonce = session.get("nonce");
  const code_verifier = session.get("code_verifier");
  const redirectTo = session.get("redirectTo");

  let tokenSet;
  try {
    const params = client.callbackParams(request.url);
    tokenSet = await client.callback(`${getUrlOrigin(request)}/callback`, params, { code_verifier, state, nonce });
  } catch (e) {
    console.error("Invalid callback: ", e);
    throw redirect("/");
  }

  session.unset("state");
  session.unset("nonce");
  session.unset("code_verifier");
  session.unset("redirectTo");

  return [tokenSet, redirectTo];
};

export const createSession = async (request: Request, tokenSet: TokenSet, redirectTo: string) => {
  const session = await getSession(request);

  let sessionId;
  try {
    sessionId = await insertToken(tokenSet);
  } catch (e) {
    console.error("Couldn't store token in", e);
    throw await logout(request);
  }

  session.set(SESSION_KEY, sessionId);

  return redirect(redirectTo, {
    status: 302,
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: 120,
      }),
    },
  });
};

export const logout = async (request: Request) => {
  const client = await getClient();
  const session = await getSession(request);
  const sessionId = await getSessionId(request);

  try {
    if (sessionId) {
      await removeToken(sessionId);
    }
  } catch (e) {}

  const url = client.endSessionUrl({
    post_logout_redirect_uri: `${getUrlOrigin(request)}/`,
  });

  return redirect(url, {
    status: 302,
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
};
