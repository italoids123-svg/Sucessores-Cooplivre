import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Entrar | Mapa Sucessório Cooplivre",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="login-page">
      <LoginForm />
    </div>
  );
}
