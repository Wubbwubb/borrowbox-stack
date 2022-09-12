import { Link, Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { json } from "@remix-run/node";
import { Menu, Transition } from "@headlessui/react";

import tailwindStylesheetUrl from "./styles/tailwind.css";
import { requireUserCredentials } from "~/session.server";
import { useUser } from "~/utils";

import type { LinksFunction, LoaderArgs, MetaFunction } from "@remix-run/node";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Fragment } from "react";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: tailwindStylesheetUrl }];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Remix Notes",
  viewport: "width=device-width,initial-scale=1",
});

export async function loader({ request }: LoaderArgs) {
  const authInfo = await requireUserCredentials(request);

  return json({
    authInfo,
  });
}

export default function App() {
  const { username, authorized } = useUser();

  return (
    <html lang="en" className="h-full">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="flex h-full flex-col">
        {authorized ? (
          <header className="sticky top-0">
            <nav className="flex flex-wrap items-center justify-between bg-blue-500 p-3">
              <div className="mr-6 flex flex-shrink-0 items-center text-white">
                <svg
                  className="mr-2 h-8 w-8 fill-current"
                  width="54"
                  height="54"
                  viewBox="0 0 54 54"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M13.5 22.1c1.8-7.2 6.3-10.8 13.5-10.8 10.8 0 12.15 8.1 17.55 9.45 3.6.9 6.75-.45 9.45-4.05-1.8 7.2-6.3 10.8-13.5 10.8-10.8 0-12.15-8.1-17.55-9.45-3.6-.9-6.75.45-9.45 4.05zM0 38.3c1.8-7.2 6.3-10.8 13.5-10.8 10.8 0 12.15 8.1 17.55 9.45 3.6.9 6.75-.45 9.45-4.05-1.8 7.2-6.3 10.8-13.5 10.8-10.8 0-12.15-8.1-17.55-9.45-3.6-.9-6.75.45-9.45 4.05z" />
                </svg>
                <span className="text-xl font-semibold tracking-tight">Tailwind CSS</span>
              </div>
              <div className="flex w-auto flex-grow items-center">
                <div className="flex-grow text-sm">
                  <Link to="/" className="mr-4 text-blue-200 hover:text-white">
                    Home
                  </Link>
                  <Link to="/notes" className="mr-4 text-blue-200 hover:text-white">
                    Notes
                  </Link>
                </div>
                <div>
                  <Menu as="div" className="relative inline-block text-left">
                    <div>
                      <Menu.Button className="inline-flex w-full justify-center rounded-md bg-black bg-opacity-20 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                        {username}
                        <ChevronDownIcon
                          className="ml-2 -mr-1 h-5 w-5 text-blue-200 hover:text-blue-100"
                          aria-hidden="true"
                        />
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-1 py-1 ">
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/logout"
                                className={`${
                                  active ? "bg-blue-500 text-white" : "text-gray-900"
                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                              >
                                Logout
                              </Link>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
              </div>
            </nav>
          </header>
        ) : null}
        <main className="flex h-full">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
