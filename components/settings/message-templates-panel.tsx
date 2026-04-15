"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MessageTemplate } from "@/lib/types/database";

export function MessageTemplatesPanel() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTemplates() {
    const response = await fetch("/api/message-templates", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { data?: MessageTemplate[] };
    if (Array.isArray(payload.data)) setTemplates(payload.data);
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function createTemplate() {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ error: "Falha ao criar resposta rapida" }))) as { error?: string };
        throw new Error(payload.error);
      }
      setTitle("");
      setContent("");
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar resposta rapida");
    } finally {
      setLoading(false);
    }
  }

  async function removeTemplate(templateId: string) {
    setLoading(true);
    try {
      await fetch(`/api/message-templates/${templateId}`, { method: "DELETE", cache: "no-store" });
      await loadTemplates();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Respostas rapidas</p>
          <h2 className="mt-1.5 text-xl font-semibold text-foreground">Templates de mensagem</h2>
          <p className="mt-2 text-[13px] text-secondary">
            Crie textos reutilizaveis para inserir no chat sem enviar automaticamente.
          </p>
        </div>
        <MessageSquareText className="h-5 w-5 text-accent/70" />
      </div>

      <div className="mt-4 space-y-2">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo curto" disabled={loading} />
        <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Conteudo da resposta rapida" disabled={loading} />
        <Button size="sm" onClick={() => void createTemplate()} disabled={loading || !title.trim() || !content.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Criar resposta rapida
        </Button>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>

      <div className="mt-4 space-y-2">
        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-secondary">
            Nenhuma resposta rapida ativa.
          </p>
        ) : templates.map((template) => (
          <div key={template.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-surface/40 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{template.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-secondary">{template.content}</p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-danger/10 hover:text-danger"
              onClick={() => void removeTemplate(template.id)}
              disabled={loading}
              aria-label={`Remover ${template.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
