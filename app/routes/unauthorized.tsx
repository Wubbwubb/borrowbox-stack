import { Link } from "@remix-run/react";
import { json, LoaderArgs, redirect } from "@remix-run/node";
import { requireUserCredentials } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  const {
    user: { authorized },
  } = await requireUserCredentials(request);

  if (authorized) {
    // The user is authorized - we don't want him to be here...
    return redirect("/");
  }
}

export default function Unauthorized() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-3xl font-bold text-red-500">You're not authorized to use this App.</div>
      <Link to="/logout" className="ml-8 rounded-lg border-2 border-red-500 p-3 text-base font-medium text-red-500">
        logout
      </Link>
    </div>
  );
}
