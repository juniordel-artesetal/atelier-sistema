import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const workspaceId = "ws_default";

  // lista setores do workspace
  const departments = await prisma.department.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // contagem de itens na fila (todo/doing) por setor
  const counts = await prisma.workItem.groupBy({
    by: ["stepId", "status"],
    where: {
      status: { in: ["todo", "doing"] },
      step: { workspaceId },
    },
    _count: { _all: true },
  });

  // precisamos mapear stepId -> departmentId
  const steps = await prisma.workflowStep.findMany({
    where: { workspaceId },
    select: { id: true, departmentId: true },
  });

  const stepToDept = new Map(steps.map((s) => [s.id, s.departmentId]));

  // soma por departamento
  const deptTotals = new Map<string, number>();
  for (const row of counts) {
    const deptId = stepToDept.get(row.stepId);
    if (!deptId) continue;
    deptTotals.set(deptId, (deptTotals.get(deptId) ?? 0) + row._count._all);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Dashboard</h1>
      <p style={{ marginTop: 6, opacity: 0.75 }}>
        Selecione um setor para ver a fila (todo/doing).
      </p>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {departments.map((d) => {
          const total = deptTotals.get(d.id) ?? 0;
          return (
            <Link
              key={d.id}
              href={`/setores/${d.id}?workspaceId=${workspaceId}`}
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                padding: 14,
                textDecoration: "none",
                color: "#111",
                display: "block",
              }}
            >
              <div style={{ fontWeight: 800 }}>{d.name}</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
                {total} itens na fila
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}