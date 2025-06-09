// src/components/ClientProvider.tsx
"use client";

import { ReactNode } from "react";
import { AuthProvider } from "../context/AuthContext";

export default function ClientProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
