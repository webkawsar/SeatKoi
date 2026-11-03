
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TokenForm, {
  type TokenFormData,
} from "@/components/token/TokenForm";

const RAILWAY_USER_CREDENTIALS_KEY = "SeatKoi_user_credentials";
const RAILWAY_USER_PROFILE_KEY = "SeatKoi_user_profile";

export default function TokenPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function handleTokenSubmit(data: TokenFormData) {
    setMessage("");

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Authentication failed. Please try again."
      );
    }

    // save user info to session storage
    sessionStorage.setItem(
      RAILWAY_USER_PROFILE_KEY,
      JSON.stringify(result?.data)
    );

    // save credentials to session storage
    sessionStorage.setItem(
      RAILWAY_USER_CREDENTIALS_KEY,
      JSON.stringify(data)
    );

    setMessage("Authentication successful. Redirecting...");

    router.replace("/search");
  }

  return (
    <>
    {message && (
        <p
          role="status"
          style={{
            margin: "0 16px 20px",
            color: "#16803d",
            textAlign: "center",
            fontSize: "13px",
          }}
        >
          {message}
        </p>
      )}

      <TokenForm onSubmit={handleTokenSubmit} />
    </>
  );
}
