"use client";

import { getSessionSafe } from "./supabaseSession";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
  const { data } = await getSessionSafe();
  const token = data?.session?.access_token || null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    // Attach token when available to avoid 401s from the backend.
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return res;
}
