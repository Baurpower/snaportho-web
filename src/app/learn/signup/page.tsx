// src/app/learn/signup/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { signUp, user } = useAuth();
  const router = useRouter();

  if (user) {
    console.log("User already signed in:", user);
    router.push("/learn");
    return null;
  }

  // Whether we've attempted a signup (so we can show the resend button)
  const [attempted, setAttempted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    console.log("Attempting to sign up with:", { email, password });
    try {
      const response = await signUp(email, password);
      console.log("Supabase signUp response:", response);
      if (response.error) {
        console.error("SignUp error:", response.error);
        setMessage(response.error.message);
      } else {
        console.log("SignUp success, data:", response.data);
        setMessage("Check your email to confirm your account!");
      }
    } catch (err) {
      console.error("Unexpected error in signUp:", err);
      setMessage("An unexpected error occurred. See console for details.");
    }
  };

  const handleResend = async () => {
    console.log("Resending confirmation email to:", email);
    try {
      const response = await signUp(email, password);
    console.log("Resend response:", response);
     if (response.error) {
       console.error("Resend error:", response.error);
       setMessage(response.error.message);
      } else {
        setMessage("Confirmation email resent! Check your inbox.");
      }
    } catch (err) {
      console.error("Unexpected error during resend:", err);      setMessage("Error resending email—check console for details.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-navy">
        Sign Up
      </h2>
      {message && (
        <p className="mb-4 text-center text-sm text-midnight/70">{message}</p>
      )}
     {attempted && (
       <div className="mb-4 text-center">
         <button
           onClick={handleResend}
           className="px-4 py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
         >
              Resend confirmation email
         </button>
       </div>
     )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <input
          type="password"
          required
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <button
          type="submit"
          className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
        >
          Create Account
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already have one?{" "}
        <a href="/learn/signin" className="text-sky hover:underline">
          Sign In
        </a>
      </p>
    </div>
  );
}
