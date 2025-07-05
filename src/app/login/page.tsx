"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = (event.target as HTMLFormElement).username.value;
    const password = (event.target as HTMLFormElement).password.value;

    const result = await signIn("credentials", {
      username,
      password,
      callbackUrl: "/dashboard",
      redirect: false,
    });

    if (result?.ok) {
      window.location.href = "/dashboard";
    } else {
      alert("Login failed!");
    }
  };

  return (
    <div className="login-page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username:</label>
        <input type="text" id="username" name="username" required />

        <label htmlFor="password">Password:</label>
        <input type="password" id="password" name="password" required />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
