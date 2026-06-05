import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultPath } from "@/lib/auth/rbac";

export default async function HomePage() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect(getDefaultPath(session.role));
  }
  redirect("/login");
}
