"use client";

import { useState, useTransition } from "react";

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

export default function QueueTableClient(props: {
  initialItems: QueueItem[];
  workspaceId: string;
}) {
  const [items, setItems] = useState<QueueItem[]>(props.initialItems);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function transitionWorkItem(workItemId: string, toStatus: "todo" | "doing" | "done") {
    setLoadingId(workItemId);

    const res = await fetch(`/api/work-items/${workItemId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: props.workspaceId, toStatus }),
    });

    if (!res.ok) {
      const text = await res.text();
      setLoadingId(null);
      throw new Error(`Falha ao mudar status: ${res.status} ${text}`);
    }

    const data = (await res.json()) as { ok: boolean; item?: { id: string; status: string } };

    // Atualiza status na tela sem precisar recarregar
    startTransition(() => {
      setItems((prev) =>
        prev.map((it) => (it.id === workItemId ? { ...it, status: data.item?.status ?? toStatus } : it))
      );
      setLoadingId(null);
    });
  }

  return (
    <div style={{ marginTop: 18, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#fafafa", textAlign: "left" }}>
            <th style={th}>Ações</th>
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
              <td style={td} colSpan={9}>
                Nenhum item na fila deste setor.
              </td>
            </tr>
          ) : (
            items.map((it) => {
              const isLoading = loadingId === it.id;
              const disabled = isPending || isLoading;

              return (
                <tr key={it.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        disabled={disabled || it.status !== "todo"}
                        onClick={() => transitionWorkItem(it.id, "doing")}
                        style={btn(disabled || it.status !== "todo")}
                        title="Muda de todo -> doing"
                      >
                        Iniciar
                      </button>

                      <button
                        disabled={disabled || it.status !== "doing"}
                        onClick={() => transitionWorkItem(it.id, "done")}
                        style={btn(disabled || it.status !== "doing")}
                        title="Muda de doing -> done"
                      >
                        Concluir
                      </button>

                      <button
                        disabled={disabled}
                        onClick={() => transitionWorkItem(it.id, "todo")}
                        style={btn(disabled)}
                        title="Volta para todo"
                      >
                        Voltar
                      </button>
                    </div>
                  </td>

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
              );
            })
          )}
        </tbody>
      </table>
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

function btn(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: "6px 10px",
    background: disabled ? "#f5f5f5" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontSize: 12,
    fontWeight: 700,
  };
}