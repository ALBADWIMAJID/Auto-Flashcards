import { supabase } from "./supabaseClient";

function isRefreshTokenError(error) {
  const message = error?.message || "";
  return message.toLowerCase().includes("refresh token");
}

export async function getSessionSafe() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    if (isRefreshTokenError(error)) {
      await supabase.auth.signOut();
      return { data: { session: null }, error: null };
    }

    return { data: { session: null }, error };
  }

  return { data, error: null };
}

export async function getUserSafe() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (isRefreshTokenError(error)) {
      await supabase.auth.signOut();
      return { data: { user: null }, error: null };
    }

    return { data: { user: null }, error };
  }

  return { data, error: null };
}
