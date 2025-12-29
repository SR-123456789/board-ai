import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);

    return NextResponse.json({
        FRONTEND_URL: process.env.FRONTEND_URL || "NOT SET",
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "NOT SET",
        requestUrlOrigin: requestUrl.origin,
        host: request.headers.get("host"),
        xForwardedProto: request.headers.get("x-forwarded-proto"),
        xForwardedHost: request.headers.get("x-forwarded-host"),
        computedBaseUrl: process.env.FRONTEND_URL ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            requestUrl.origin,
    });
}
