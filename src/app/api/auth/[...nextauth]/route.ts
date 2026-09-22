import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import {
  rewriteAuthFailureRedirect,
  runWithAuthErrorCapture,
  takeAuthErrorCode,
} from "@/lib/auth-error-redirect";

export const runtime = "nodejs";

async function handle(request: NextRequest, method: "GET" | "POST") {
  return runWithAuthErrorCapture(async () => {
    const response = await handlers[method](request);
    return rewriteAuthFailureRedirect(response, takeAuthErrorCode());
  });
}

export function GET(request: NextRequest) {
  return handle(request, "GET");
}

export function POST(request: NextRequest) {
  return handle(request, "POST");
}
