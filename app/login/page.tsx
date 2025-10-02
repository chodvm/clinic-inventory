import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Make sure these are set in your env (e.g., .env.local)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage("Signed in! Redirecting…");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage("Check your email to confirm your account.");
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage("Magic link sent! Check your inbox.");
  }

  async function handleGoogle() {
    setLoading(true); setError(null); setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen w-full grid place-items-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold text-center mb-2">Welcome</h1>
        <p className="text-center text-sm text-gray-500 mb-6">Sign in to access Inventory</p>

        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setMode("signin")}
            className={`px-3 py-1 rounded-full text-sm ${mode === "signin" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
          >Email & Password</button>
          <button
            onClick={() => setMode("magic")}
            className={`px-3 py-1 rounded-full text-sm ${mode === "magic" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
          >Magic Link</button>
          <button
            onClick={() => setMode("signup")}
            className={`px-3 py-1 rounded-full text-sm ${mode === "signup" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
          >Create Account</button>
        </div>

        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              className="w-full border rounded-lg p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full border rounded-lg p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button disabled={loading} className="w-full rounded-lg py-2 bg-gray-900 text-white">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="email"
              placeholder="Work email"
              className="w-full border rounded-lg p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Create password"
              className="w-full border rounded-lg p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button disabled={loading} className="w-full rounded-lg py-2 bg-gray-900 text-white">
              {loading ? "Creating…" : "Create Account"}
            </button>
          </form>
        )}

        {mode === "magic" && (
          <form onSubmit={handleMagic} className="space-y-3">
            <input
              type="email"
              placeholder="Work email"
              className="w-full border rounded-lg p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button disabled={loading} className="w-full rounded-lg py-2 bg-gray-900 text-white">
              {loading ? "Sending…" : "Send Magic Link"}
            </button>
          </form>
        )}

        <div className="mt-6">
          <button onClick={handleGoogle} disabled={loading} className="w-full rounded-lg border py-2">
            Continue with Google
          </button>
        </div>

        {(message || error) && (
          <div className="mt-4 text-center text-sm">
            {message && <p className="text-green-700">{message}</p>}
            {error && <p className="text-red-600">{error}</p>}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-6 text-center">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

