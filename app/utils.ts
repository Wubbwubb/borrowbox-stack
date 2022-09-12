import { useMatches } from "@remix-run/react";
import { useMemo } from "react";
import type { AuthInfo, User } from "./session.server";

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(id: string): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches();
  const route = useMemo(() => matchingRoutes.find((route) => route.id === id), [matchingRoutes, id]);
  return route?.data;
}

function isAuthInfo(authInfo: any): authInfo is AuthInfo {
  return (
    authInfo &&
    typeof authInfo === "object" &&
    typeof authInfo.user === "object" &&
    typeof authInfo.accessToken === "string"
  );
}

function isUser(user: any): user is User {
  return user && typeof user === "object" && typeof user.email === "string";
}

export function useOptionalUser(): User | undefined {
  const data = useMatchesData("root");
  if (!data || !isAuthInfo(data.authInfo) || !isUser(data.authInfo.user)) {
    return undefined;
  }
  return data.authInfo.user;
}

export function useUser(): User {
  const maybeUser = useOptionalUser();
  if (!maybeUser) {
    throw new Error(
      "No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead."
    );
  }
  return maybeUser;
}
