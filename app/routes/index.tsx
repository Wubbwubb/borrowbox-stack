import { useUser } from "~/utils";

export default function Index() {
  const { username } = useUser();
  return (
    <div className="flex h-full w-full items-center justify-center text-3xl font-bold">
      Hello {username}!<br />
      Welcome to our App! 🚀
    </div>
  );
}
