// app/artes/page.tsx
import Link from "next/link";

type QueueItem = {
  id: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  step: {
    id: string;
    name: string;
    code: string;
  };
  orderItem: {
    id: string;
    productType: string;
    theme: string | null;
    quantity: number;
    bowType: string | null;
    bowColor: string | null;
    needsApplique: boolean;
    appliqueType: string | null;
    order: {
      id: string;
      motherName: string | null;
      childName: string | null;
      channel: string | null;
      externalOrderId: string | null;
      plannedShipDate: string | null;
    };
  };
};

async function fetchQueue(): Promise<QueueItem[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/work-items/queue?departmentId=dep_ARTES&workspaceId=ws_default`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao carregar fila: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { ok: boolean; items: QueueItem[] };
  return data.items ?? [];
}

export default async function ArtesPage() {
  const items = await fetchQueue();

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Artes — Fila</h1>
        <span style={{ opacity: 0.7 }}>({items.length} itens)</span>

        <div style={{ marginLeft: "auto" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            ⟵ Voltar
          </Link>
        </div>
      </div>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Mostrando WorkItems do departamento <b>Artes</b> com status <b>todo</b> ou <b>doing</b>.
      </p>

      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Status</th>
              <th style={th}>Mãe</th>
              <th style={th}>Criança</th>
              <th style={th}>Produto</th>
              <th style={th}>Tema</th>
              <th style={th}>Qtd</th>
              <th style={th}>Laço</th>
              <th style={th}>Aplique</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td style={{ padding: 16, textAlign: "center" }} colSpan={9}>
                  Nenhum item na fila de Artes.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>
                    <Badge status={it.status} />
                  </td>
                  <td style={td}>{it.orderItem.order.motherName ?? "-"}</td>
                  <td style={td}>{it.orderItem.order.childName ?? it.orderItem.order.childName ?? "-"}</td>
                  <td style={td}>{it.orderItem.productType}</td>
                  <td style={td}>{it.orderItem.theme ?? "-"}</td>
                  <td style={td}>{it.orderItem.quantity}</td>
                  <td style={td}>
                    {(it.orderItem.bowType ?? "-") + " / " + (it.orderItem.bowColor ?? "-")}
                  </td>
                  <td style={td}>
                    {it.orderItem.needsApplique ? it.orderItem.appliqueType ?? "Sim" : "Não"}
                  </td>
                  <td style={td}>
                    <Actions workItemId={it.id} currentStatus={it.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        Próximo passo: quando concluir (done), o sistema cria automaticamente o WorkItem da próxima etapa.
      </p>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const label = status === "todo" ? "A Fazer" : status === "doing" ? "Fazendo" : "Concluído";
  const bg = status === "todo" ? "#fff7e6" : status === "doing" ? "#e6f7ff" : "#e6ffed";
  const br = status === "todo" ? "#ffd591" : status === "doing" ? "#91d5ff" : "#b7eb8f";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${br}`,
        fontSize: 12,
      }}
    >
      {label}
    </span>
  );
}

function Actions({ workItemId, currentStatus }: { workItemId: string; currentStatus: string }) {
  // Server Component: ações vão ser links para uma rota client (vamos fazer isso no próximo passo)
  const canStart = currentStatus === "todo";
  const canFinish = currentStatus === "doing";

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <a
        href={`/artes/action?workItemId=${workItemId}&toStatus=doing`}
        style={{
          ...btn,
          opacity: canStart ? 1 : 0.35,
          pointerEvents: canStart ? "auto" : "none",
        }}
      >
        Iniciar
      </a>

      <a
        href={`/artes/action?workItemId=${workItemId}&toStatus=done`}
        style={{
          ...btn,
          opacity: canFinish ? 1 : 0.35,
          pointerEvents: canFinish ? "auto" : "none",
        }}
      >
        Concluir
      </a>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  fontSize: 12,
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: 12,
  fontSize: 13,
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const btn: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  textDecoration: "none",
  fontSize: 12,
};