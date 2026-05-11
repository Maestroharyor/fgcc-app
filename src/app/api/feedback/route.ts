import { type NextRequest, NextResponse } from "next/server";
import { submitFeedbackAction } from "@/app/(marketing)/skillup/feedback/actions";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const result = await submitFeedbackAction(payload);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
