import { NextResponse } from "next/server";
import { transitionWorkItem } from "@/lib/workflow";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const body = (await req.json()) as { workspaceId: string; toStatus: "todo" | "doing" | "done" };

  if (!body?.workspaceId || !body?.toStatus) {
    return NextResponse.json({ ok: false, error: "workspaceId e toStatus são obrigatórios." }, { status: 400 });
  }

  const updated = await transitionWorkItem({
    workItemId: id,
    workspaceId: body.workspaceId,
    toStatus: body.toStatus,
  });

  return NextResponse.json({ ok: true, workItem: updated });
}