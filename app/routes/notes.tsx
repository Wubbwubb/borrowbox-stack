import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";

import { getNoteListItems } from "~/models/note.server";
import { useUser } from "~/utils";
import { requireUserCredentials } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  const {
    user: { id: userId },
  } = await requireUserCredentials(request);

  const noteListItems = await getNoteListItems({ userId });
  return json({ noteListItems });
}

export default function NotesPage() {
  const data = useLoaderData<typeof loader>();
  const user = useUser();

  return (
    <>
      <div className="h-full w-80 border-r bg-gray-50">
        <Link to="new" className="block p-4 text-xl text-blue-500">
          + New Note
        </Link>

        <hr />

        {data.noteListItems.length === 0 ? (
          <p className="p-4">No notes yet</p>
        ) : (
          <ol>
            {data.noteListItems.map((note) => (
              <li key={note.id}>
                <NavLink
                  className={({ isActive }) => `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`}
                  to={note.id}
                >
                  📝 {note.title}
                </NavLink>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </>
  );
}
