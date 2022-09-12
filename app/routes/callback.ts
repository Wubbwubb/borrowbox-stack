import type { LoaderFunction } from "@remix-run/node";
import { createSession, verifyCallback } from "~/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const [tokenSet, redirectTo] = await verifyCallback(request);

  return await createSession(request, tokenSet, redirectTo);
};
