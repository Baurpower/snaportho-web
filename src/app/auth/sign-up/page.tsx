import { Suspense } from "react";
import SignUpClient from "./signupclient";

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-16 p-6">Loading...</div>}>
      <SignUpClient />
    </Suspense>
  );
}