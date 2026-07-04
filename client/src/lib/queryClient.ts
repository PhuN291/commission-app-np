import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Global 401 handler — token cũ trong localStorage không còn hợp lệ
 * (server in-memory `tokens` Map đã reset sau restart).
 *
 * Xóa state auth + hard redirect về /login để tránh blank page khi user mở
 * trang sau khi server restart. Phase 2 sẽ ổn khi token persist DB.
 *
 * EXPORT cho các page tự viết local `authFetch` gọi vào (12 file đang dùng).
 * Phase 2 cleanup: consolidate thành 1 `authFetch` central, xóa local copies.
 */
export function handleUnauthorized() {
  if (typeof window === "undefined") return;
  ["np_token", "np_user_id", "np_role", "np_phone", "np_device_id"].forEach((k) =>
    localStorage.removeItem(k),
  );
  queryClient.clear();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

/** Lấy Bearer token từ localStorage (np_token issued bởi /api/auth/verify-otp). */
function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("np_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Central authFetch — fetch với Bearer token + tự xử lý 401 (clear + redirect).
 *
 * Replace local `async function authFetch` ở mọi page để có 401 handling nhất quán.
 * Signature support cả 2 pattern: `authFetch(url)` và `authFetch(url, { method, body, headers })`.
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      ...getAuthHeader(),
    },
  });
  if (res.status === 401) handleUnauthorized();
  return res;
}

/**
 * Get current user id từ localStorage để namespace queryKey.
 *
 * Lý do: data /api/orders/:id, /api/income/me, /api/customers... khác nhau theo
 * role. Nếu user switch session (TC → Sale) mà queryKey không include userId,
 * React Query (staleTime: Infinity) sẽ serve cache cũ của user trước → leak data.
 *
 * Pattern dùng trong useQuery:
 *   queryKey: ["/api/orders/" + orderId, getCurrentUserId()]
 *
 * Trả "anon" nếu chưa login để vẫn cache được data public.
 */
export function getCurrentUserId(): string {
  if (typeof window === "undefined") return "anon";
  return localStorage.getItem("np_user_id") ?? "anon";
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeader(),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    handleUnauthorized();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // queryKey[0] = URL; phần còn lại (userId, cycle, …) chỉ làm cache discriminator,
    // KHÔNG đưa vào URL. Trước đây dùng queryKey.join("/") khiến `["/api/orders","1"]`
    // bị nối thành `/api/orders/1` (đơn detail) → vỡ list page.
    const url = queryKey[0];
    if (typeof url !== "string") {
      throw new Error(`queryKey[0] must be a URL string, got: ${typeof url}`);
    }
    const res = await fetch(url, {
      credentials: "include",
      headers: getAuthHeader(),
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") return null;
      // Throw mode — clear auth + redirect, sau đó throw cho TanStack mark error.
      handleUnauthorized();
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Mỗi lần vào lại 1 trang (query mount lại) thì refetch nền → list/dashboard/badge
      // luôn hiện data mới sau khi mutation ở trang khác, tránh stale-cache toàn app.
      // (staleTime Infinity giữ cache phục vụ ngay trong khi refetch nền, không nháy.)
      refetchOnMount: "always",
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
