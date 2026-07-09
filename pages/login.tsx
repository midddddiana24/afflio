import Head from "next/head";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Log In | Afflio</title>
      </Head>
      <AuthForm mode="login" />
    </>
  );
}
