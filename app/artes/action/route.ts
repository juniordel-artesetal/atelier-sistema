// app/artes/action/route.ts
import { NextRequest, NextResponse } from "next/server";
import { transitionWorkItem, WorkStatus } from "@/lib/workflow";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const workItemId = searchParams.get("workItemId");
  const toStatus = searchParams.get("toStatus") as WorkStatus | null;

  if (!workItemId || !toStatus) {
    return NextResponse.redirect(new URL("/artes", req.url));
  }

  await transitionWorkItem({
    workItemId,
    toStatus,
    workspaceId: "ws_default",
  });

  return NextResponse.redirect(new URL("/artes", req.url));
}