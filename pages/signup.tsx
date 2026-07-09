import Head from "next/head";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <>
      <Head>
        <title>Create Account | Afflio</title>
      </Head>
      <AuthForm mode="signup" />
    </>
  );
}
