"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError } from "../api";
import PasswordInput from "../password-input";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function RegisterPage() {
  const router = useRouter();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const response = await fetch(API + "/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({email,password}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Registration failed");
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err, "Registration failed"));
    } finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Trao Assessment</p>
      <h1 className="mt-2 text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-slate-600">Your interview kits will be isolated to your account.</p>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="grid gap-2"><span className="font-medium">Email</span><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="min-h-11 rounded-xl border p-3"/></label>
        <label className="grid gap-2"><span className="font-medium">Password</span><PasswordInput autoComplete="new-password" maxLength={128} value={password} onChange={setPassword}/></label>
        <label className="grid gap-2"><span className="font-medium">Confirm password</span><PasswordInput autoComplete="new-password" maxLength={128} value={confirm} onChange={setConfirm}/></label>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button disabled={loading} className="min-h-11 rounded-xl bg-indigo-600 px-5 font-semibold text-white disabled:opacity-60">{loading ? "Creating account..." : "Register"}</button>
      </form>
      <p className="mt-6 text-sm text-slate-600">Already have an account? <a className="font-semibold text-indigo-600 hover:underline" href="/login">Log in</a></p>
    </div>
  </main>;
}
