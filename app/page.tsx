import { redirect } from "next/navigation";

// Middleware bounces unauthenticated requests to /login; authed users land on
// the dashboard.
export default function Home() {
  redirect("/dashboard");
}
