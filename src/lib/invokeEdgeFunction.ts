import type { SupabaseClient } from "@supabase/supabase-js";

type InvokeOptions = {
  body?: Record<string, unknown>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
};

type EdgeFunctionContext = {
  body?: BodyInit;
  json?: () => Promise<unknown>;
};

/**
 * Extracts a user-friendly error message from a Supabase Edge Function error.
 * Uses response body (data?.error or error.context) when the function returns 4xx/5xx with JSON { error: "..." }.
 */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  data: unknown,
  defaultMessage: string
): Promise<string> {
  let serverMessage: string | null = null;
  if (data != null && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    serverMessage = (data as { error: string }).error;
    const debug = (data as { debug?: string }).debug;
    const blockingTables = (data as { blocking_tables?: { schema_name?: string; table_name?: string; row_count?: number }[] }).blocking_tables;
    if (Array.isArray(blockingTables) && blockingTables.length > 0) {
      const blockingStr = blockingTables
        .map((r) => `${r.schema_name ?? "public"}.${r.table_name ?? "?"} (${r.row_count ?? 0})`)
        .join(", ");
      serverMessage += ` Blocking: ${blockingStr}.`;
    } else if (typeof debug === "string" && debug) {
      serverMessage += ` (${debug})`;
    }
  }
  if (!serverMessage && error != null && typeof error === "object" && "context" in error) {
    try {
      const ctx = (error as { context?: EdgeFunctionContext }).context as EdgeFunctionContext | undefined;
      if (ctx) {
        const body =
          typeof ctx.json === "function"
            ? await ctx.json()
            : ctx.body != null
              ? await new Response(ctx.body).json()
              : null;
        if (body != null && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string") {
          serverMessage = (body as { error: string }).error;
          const blockingTables = (body as { blocking_tables?: { schema_name?: string; table_name?: string; row_count?: number }[] }).blocking_tables;
          if (Array.isArray(blockingTables) && blockingTables.length > 0) {
            const blockingStr = blockingTables
              .map((r) => `${r.schema_name ?? "public"}.${r.table_name ?? "?"} (${r.row_count ?? 0})`)
              .join(", ");
            serverMessage += ` Blocking: ${blockingStr}.`;
          } else {
            const debug = (body as { debug?: string }).debug;
            if (typeof debug === "string" && debug) serverMessage += ` (${debug})`;
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  const fallback = (error != null && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string")
    ? (error as { message: string }).message
    : defaultMessage;
  const message = serverMessage ?? fallback;
  // When backend returns "Database error deleting user" without blocking table names, show actionable hint
  if (
    message.includes("Database error deleting user") &&
    !message.includes("Blocking:") &&
    !message.includes("blocking_tables")
  ) {
    return "User could not be deleted (database constraint). Run: supabase db push (include latest migration), then supabase functions deploy admin-manage-user. If it still fails, check the toast for details or Dashboard > Edge Functions > Logs.";
  }
  // When cleanup RPC fails (e.g. function missing), suggest applying migrations
  if (message.includes("Cleanup failed:") && (message.includes("does not exist") || message.includes("function"))) {
    return message + " Apply migrations: supabase db push, then redeploy: supabase functions deploy admin-manage-user.";
  }
  return message;
}

/**
 * Invokes a Supabase Edge Function and normalizes errors so the response body message
 * (e.g. { error: "OpenAI API key is invalid" }) is thrown as Error.message for user-facing toasts.
 *
 * Usage:
 *   try {
 *     const data = await invokeEdgeFunction(supabase, 'my-function', { body: { ... } });
 *     // use data
 *   } catch (e: any) {
 *     toast.error(e?.message ?? 'Something went wrong');
 *   }
 */
export async function invokeEdgeFunction<T = unknown>(
  supabase: SupabaseClient,
  name: string,
  options?: InvokeOptions
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    ...options,
    method: options?.method,
  } as Parameters<SupabaseClient["functions"]["invoke"]>[1]);
  if (error) {
    const message = await getEdgeFunctionErrorMessage(
      error,
      data,
      `Request to ${name} failed. Please try again.`
    );
    throw new Error(message);
  }
  return data as T;
}
