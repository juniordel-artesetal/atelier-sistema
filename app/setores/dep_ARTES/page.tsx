import QueueTableClient from "./QueueTable.client";
type QueueItem = {
  id: string;
  status: string;
  dueDate: string | null;

  order: {
    id: string;
    channel: string | null;
    motherName: string | null;
    childName: string | null;
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
  };

  step: {
    id: string;
    name: string;
    code: string;
    departmentId: string;
  };
};

async function fetchQueue(departmentId: string, workspaceId: string) {
  const url = `http://localhost:3000/api/work-items/queue?departmentId=${encodeURIComponent(
    departmentId
  )}&workspaceId=${encodeURIComponent(workspaceId)}&take=200`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao carregar fila: ${res.status} ${text}`);
  }

  return (await res.json()) as { ok: boolean; items: QueueItem[]; department?: { id: string; name: string } };
}

export default async function SetorPage({
  params,
  searchParams,
}: {
  params: { departmentId: string };
  searchParams?: { workspaceId?: string };
}) {
  const workspaceId = searchParams?.workspaceId ?? "ws_default";
  const departmentId = params.departmentId;

  const data = await fetchQueue(departmentId, workspaceId);
  const items = data.items ?? [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
            Setor — {data.department?.name ?? departmentId} ({items.length} itens)
          </h1>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
            Mostrando WorkItems do setor com status <b>todo</b> ou <b>doing</b>.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/dashboard"
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "8px 12px",
              textDecoration: "none",
              color: "#111",
            }}
          >
            ← Dashboard
          </a>
          <a
            href={`/setores/${departmentId}?workspaceId=${encodeURIComponent(workspaceId)}`}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: "8px 12px",
              textDecoration: "none",
              color: "#111",
            }}
          >
            ↻ Recarregar
          </a>
        </div>
      </div>

      <div style={{ marginTop: 18, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={th}>Status</th>
              <th style={th}>Mãe</th>
              <th style={th}>Criança</th>
              <th style={th}>Produto</th>
              <th style={th}>Tema</th>
              <th style={th}>Qtd</th>
              <th style={th}>Laço</th>
              <th style={th}>Aplique</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td style={td} colSpan={8}>
                  Nenhum item na fila deste setor.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>{renderStatus(it.status)}</td>
                  <td style={td}>{it.order.motherName ?? "-"}</td>
                  <td style={td}>{it.order.childName ?? "-"}</td>
                  <td style={td}>{it.orderItem.productType}</td>
                  <td style={td}>{it.orderItem.theme ?? "-"}</td>
                  <td style={td}>{it.orderItem.quantity}</td>
                  <td style={td}>
                    {(it.orderItem.bowType ?? "-") + " / " + (it.orderItem.bowColor ?? "-")}
                  </td>
                  <td style={td}>{it.orderItem.needsApplique ? it.orderItem.appliqueType ?? "sim" : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Próximo passo: colocar botões <b>Iniciar</b> e <b>Concluir</b> aqui dentro (vamos fazer já já).
      </div>
    </div>
  );
}

function renderStatus(status: string) {
  if (status === "todo") return "A Fazer";
  if (status === "doing") return "Fazendo";
  if (status === "done") return "Concluído";
  return status;
}

const th: React.CSSProperties = { padding: "10px 12px", fontSize: 12, opacity: 0.8 };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 13 };