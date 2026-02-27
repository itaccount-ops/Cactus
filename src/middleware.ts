import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Middleware para protección de rutas según rol
 */
export default auth((req) => {
    const { nextUrl, auth: session } = req;
    const pathname = nextUrl.pathname;

    // Rutas públicas - no requieren auth
    const publicPaths = ["/", "/login", "/register", "/forgot-password", "/api/auth"];
    if (publicPaths.some((path) => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Si no hay sesión, redirigir a login
    if (!session?.user) {
        const loginUrl = new URL("/login", nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    const userRole = session.user.role as string;

    // Protección de rutas SUPERADMIN
    if (pathname.startsWith("/superadmin")) {
        // Festivos accesible también para ADMIN
        const isHolidaysPath = pathname.startsWith("/superadmin/holidays");
        const allowedForHolidays = ["SUPERADMIN", "ADMIN"].includes(userRole);
        if (isHolidaysPath && !allowedForHolidays) {
            return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
        }
        if (!isHolidaysPath && userRole !== "SUPERADMIN") {
            console.log(`[Middleware] Blocked ${userRole} from /superadmin`);
            return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
        }
    }

    // Protección de rutas ADMIN (solo ADMIN y SUPERADMIN)
    if (pathname.startsWith("/admin")) {
        if (!["SUPERADMIN", "ADMIN"].includes(userRole)) {
            console.log(`[Middleware] Blocked ${userRole} from /admin`);
            return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
        }
    }

    // GUEST solo puede acceder a rutas específicas
    if (userRole === "GUEST") {
        const guestAllowed = ["/dashboard", "/settings", "/notifications"];
        if (!guestAllowed.some((path) => pathname.startsWith(path))) {
            console.log(`[Middleware] GUEST restricted from ${pathname}`);
            return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - api routes that handle their own auth
         */
        "/((?!_next/static|_next/image|favicon.ico|public|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
