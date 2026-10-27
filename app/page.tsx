import Dashboard from "@/components/Dashboard";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  return <Dashboard userName={session?.nome ?? null} />;
}
