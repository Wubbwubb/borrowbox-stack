import path from "path";
import express, { RequestHandler } from "express";
import compression from "compression";
import morgan from "morgan";
import {
  createRequestHandler,
  GetLoadContextFunction,
} from "@remix-run/express";
import { initKeycloak, requiredRealmRole } from "~/keycloak.server";
import session, { MemoryStore, Session, SessionData } from "express-session";
import { Token } from "keycloak-connect";

export type User = {
  id: string;
  email: string;
  username: string;
  name: string;
};

export type AuthInfo = {
  user: User;
  accessToken: string;
};

export type AuthInfoLoadContext = {
  authInfo: AuthInfo;
};

type CustomSession = Session & Partial<SessionData> & AuthInfoLoadContext;

const app = express();

// TODO use distributed cache like
//  https://www.npmjs.com/package/connect-memcached
//  or https://www.npmjs.com/package/connect-redis
//  or maybe use cookies?
const sessionStore = new MemoryStore();
const keycloak = initKeycloak(sessionStore);

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
  })
);
app.use(keycloak.middleware());

app.use((req, res, next) => {
  // helpful headers:
  res.set("Strict-Transport-Security", `max-age=${60 * 60 * 24 * 365 * 100}`);

  // /clean-urls/ -> /clean-urls
  if (req.path.endsWith("/") && req.path.length > 1) {
    const query = req.url.slice(req.path.length);
    const safepath = req.path.slice(0, -1).replace(/\/+/g, "/");
    res.redirect(301, safepath + query);
    return;
  }
  next();
});

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "build");

const enrichWithAuthInfo: RequestHandler = async (req, res, next) => {
  const requestSession = req.session as CustomSession;
  const nextAfterAuthInfoHandling = !requestSession.authInfo;

  if (!nextAfterAuthInfoHandling) {
    // In this case, the session already contains an existing authInfo object.
    // We can go on with the next request handler in the chain.
    // In parallel, we reassign the current auth info to the session.
    next();
  }

  const grant = await keycloak.getGrant(req, res);

  if (grant.access_token) {
    const accessTokenString = (grant.access_token as any).token;

    if (
      !nextAfterAuthInfoHandling &&
      accessTokenString === (requestSession.authInfo as AuthInfo).accessToken
    ) {
      // In this case we can ignore the reassignment of auth info, since the
      // access token is still the same.
      return;
    }

    const userInfo = await keycloak.grantManager.userInfo<
      Token,
      {
        email: string;
        preferred_username: string;
        name: string;
        sub: string;
      }
    >(grant.access_token);

    const user: User = {
      id: userInfo.sub,
      email: userInfo.email as string,
      username: userInfo.preferred_username as string,
      name: userInfo.name as string,
    };

    requestSession.authInfo = {
      user,
      accessToken: accessTokenString,
    };

    sessionStore.set(req.sessionID, requestSession);
  }

  if (nextAfterAuthInfoHandling) {
    // We only have to process the next request handler in the chain,
    // if did not already.
    next();
  }
};

const useAuthInfoForLoadContext: GetLoadContextFunction = (
  req
): AuthInfoLoadContext => {
  const authInfo = (req.session as CustomSession).authInfo;

  return { authInfo };
};

app.all(
  "*",
  keycloak.protect(
    (accessToken) =>
      !requiredRealmRole || accessToken.hasRealmRole(requiredRealmRole)
  ),
  enrichWithAuthInfo,
  MODE === "production"
    ? createRequestHandler({
        build: require(BUILD_DIR),
        getLoadContext: useAuthInfoForLoadContext,
      })
    : (...args) => {
        purgeRequireCache();
        const requestHandler = createRequestHandler({
          build: require(BUILD_DIR),
          mode: MODE,
          getLoadContext: useAuthInfoForLoadContext,
        });
        return requestHandler(...args);
      }
);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  // require the built app so we're ready when the first request comes in
  require(BUILD_DIR);
  console.log(`✅ app ready: http://localhost:${port}`);
});

function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete require.cache[key];
    }
  }
}
