import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Оптимистичная проверка: без cookie сессии — на страницу входа.
// Полная проверка сессии и прав выполняется на сервере в каждом обработчике.
export function proxy(request: NextRequest) {
  const cookie = getSessionCookie(request, { cookiePrefix: "leadflow" });
  if (!cookie) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
