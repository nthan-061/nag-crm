"use client";

import { useState } from "react";
import { AlertCircle, Download, Phone, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ContactLookupResult, MissingContact } from "@/lib/services/reconciliation-service";

type ImportState = "idle" | "importing" | "done" | "error";

type ContactState = {
  state: ImportState;
  message?: string;
};

export function ReconciliationPanel() {
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<MissingContact[] | null>(null);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResult, setLookupResult] = useState<ContactLookupResult | null>(null);
  const [importStates, setImportStates] = useState<Record<string, ContactState>>({});
  const [bulkImporting, setBulkImporting] = useState(false);

  async function checkMissing() {
    setLoading(true);
    setError(null);
    setContacts(null);
    setImportStates({});

    try {
      const response = await fetch("/api/reconciliation", { cache: "no-store" });
      const payload = (await response.json()) as { data?: MissingContact[]; error?: string };
      if (!response.ok || payload.error) {
        setError(payload.error ?? "Falha ao buscar contatos");
        return;
      }
      setContacts(payload.data ?? []);
    } catch {
      setError("Nao foi possivel conectar a Evolution API. Verifique as variaveis de ambiente.");
    } finally {
      setLoading(false);
    }
  }

  async function checkPhone() {
    if (!lookupPhone.trim()) return;

    setLookupLoading(true);
    setError(null);
    setLookupResult(null);

    try {
      const response = await fetch(`/api/reconciliation?phone=${encodeURIComponent(lookupPhone)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { data?: ContactLookupResult; error?: string };
      if (!response.ok || payload.error) {
        setError(payload.error ?? "Falha ao consultar numero");
        return;
      }
      setLookupResult(payload.data ?? null);
    } catch {
      setError("Nao foi possivel consultar o numero agora.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function importOne(contact: MissingContact) {
    setImportStates((prev) => ({ ...prev, [contact.jid]: { state: "importing" } }));
    try {
      const response = await fetch("/api/reconciliation/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jid: contact.jid, phone: contact.phone, name: contact.name }),
      });
      const payload = (await response.json()) as {
        data?: { messagesImported: number; cardCreated: boolean };
        error?: string;
      };
      if (!response.ok || payload.error) {
        setImportStates((prev) => ({
          ...prev,
          [contact.jid]: { state: "error", message: payload.error ?? "Erro" },
        }));
        return;
      }
      const imported = payload.data?.messagesImported ?? 0;
      setImportStates((prev) => ({
        ...prev,
        [contact.jid]: { state: "done", message: `${imported} mensagem(s) importada(s)` },
      }));
      setContacts((prev) => prev?.filter((c) => c.jid !== contact.jid) ?? null);
    } catch {
      setImportStates((prev) => ({
        ...prev,
        [contact.jid]: { state: "error", message: "Erro na importacao" },
      }));
    }
  }

  async function importAll() {
    if (!contacts?.length) return;
    setBulkImporting(true);
    for (const contact of contacts) {
      const current = importStates[contact.jid];
      if (current?.state === "done") continue;
      await importOne(contact);
    }
    setBulkImporting(false);
  }

  const pendingContacts =
    contacts?.filter((c) => {
      const s = importStates[c.jid]?.state;
      return !s || s === "error";
    }) ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Reconciliacao</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Contatos nao importados</h2>
          <p className="mt-2 text-sm text-secondary leading-relaxed">
            Detecta contatos presentes na instancia WhatsApp mas ausentes do CRM e os importa com
            historico de mensagens.
          </p>
        </div>
        <Users className="mt-1 h-6 w-6 flex-shrink-0 text-accent/60" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button variant="secondary" onClick={checkMissing} disabled={loading || bulkImporting}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Verificando..." : "Verificar contatos"}
        </Button>

        {contacts !== null && pendingContacts.length > 0 && (
          <Button onClick={importAll} disabled={bulkImporting || loading}>
            <Download className="mr-2 h-4 w-4" />
            {bulkImporting
              ? "Importando..."
              : `Importar todos (${pendingContacts.length})`}
          </Button>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-border/40 bg-surface/25 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-accent/80">Busca manual</p>
        <p className="mt-2 text-sm text-secondary">
          Consulte um numero especifico para descobrir se ele esta na instancia, no CRM, no pipeline
          ou se existe como lead sem card.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <div className="min-w-[240px] flex-1">
            <Input
              placeholder="Ex.: 5511976896161"
              value={lookupPhone}
              onChange={(event) => setLookupPhone(event.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={checkPhone} disabled={lookupLoading}>
            <Phone className="mr-2 h-4 w-4" />
            {lookupLoading ? "Consultando..." : "Consultar numero"}
          </Button>
        </div>

        {lookupResult && (
          <div className="mt-4 rounded-xl border border-border/40 bg-background/30 px-4 py-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{lookupResult.normalizedPhone}</span>
              <span className="rounded-md border border-border/50 px-2 py-0.5 text-xs text-secondary">
                {lookupResult.status === "synced" && "Sincronizado"}
                {lookupResult.status === "instance_only" && "So na instancia"}
                {lookupResult.status === "crm_only" && "So no CRM"}
                {lookupResult.status === "crm_without_card" && "CRM sem card"}
                {lookupResult.status === "missing_everywhere" && "Nao encontrado"}
                {lookupResult.status === "possible_match" && "Possivel correspondencia"}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-secondary sm:grid-cols-2">
              <p>Instancia: {lookupResult.foundInInstance ? "sim" : "nao"}</p>
              <p>CRM: {lookupResult.foundInCrm ? "sim" : "nao"}</p>
              <p>Pipeline/card: {lookupResult.hasCard ? "sim" : "nao"}</p>
              <p>Mensagens no CRM: {lookupResult.messageCount}</p>
            </div>

            {lookupResult.instanceName && (
              <p className="mt-3 text-secondary">
                Nome na instancia: <span className="text-foreground">{lookupResult.instanceName}</span>
              </p>
            )}

            {lookupResult.lead && (
              <p className="mt-1 text-secondary">
                Lead no CRM: <span className="text-foreground">{lookupResult.lead.nome}</span>
              </p>
            )}

            {lookupResult.status === "instance_only" && lookupResult.jid && (
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={() =>
                    void importOne({
                      jid: lookupResult.jid!,
                      phone: lookupResult.normalizedPhone,
                      name: lookupResult.instanceName ?? `+${lookupResult.normalizedPhone}`,
                      lastTimestamp: lookupResult.lastTimestamp,
                    })
                  }
                >
                  Importar este contato
                </Button>
              </div>
            )}

            {lookupResult.possibleMatches.length > 0 && (
              <div className="mt-4 rounded-xl border border-border/30 bg-surface/20 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-accent/80">
                  Possiveis correspondencias
                </p>
                <div className="mt-3 space-y-2">
                  {lookupResult.possibleMatches.map((match, index) => (
                    <div
                      key={`${match.source}-${match.phone}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/20 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {match.name} <span className="text-secondary">({match.phone})</span>
                        </p>
                        <p className="mt-1 text-secondary">
                          {match.source === "instance" ? "Instancia" : "CRM"} • match {match.matchType}
                          {match.source === "crm" ? ` • card ${match.hasCard ? "sim" : "nao"}` : ""}
                        </p>
                      </div>

                      {match.source === "instance" && match.jid && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void importOne({
                              jid: match.jid!,
                              phone: match.phone,
                              name: match.name,
                              lastTimestamp: null,
                            })
                          }
                        >
                          Importar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {contacts !== null && contacts.length === 0 && (
        <div className="mt-4 rounded-xl border border-border/40 bg-surface/50 px-4 py-5 text-center text-sm text-secondary">
          Todos os contatos da instancia ja estao no CRM.
        </div>
      )}

      {contacts !== null && contacts.length > 0 && (
        <div className="mt-4 space-y-2">
          {contacts.map((contact) => {
            const state = importStates[contact.jid];
            const isDone = state?.state === "done";
            const isImporting = state?.state === "importing";
            const isError = state?.state === "error";

            return (
              <div
                key={contact.jid}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-surface/40 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{contact.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 flex-shrink-0 text-secondary/60" />
                    <span className="font-mono text-xs text-secondary/70">{contact.phone}</span>
                  </div>
                </div>

                {isDone && (
                  <span className="text-xs text-success">{state.message}</span>
                )}
                {isError && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-danger">{state.message}</span>
                    <Button size="sm" variant="ghost" onClick={() => importOne(contact)}>
                      Tentar
                    </Button>
                  </div>
                )}
                {!isDone && !isError && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isImporting || bulkImporting}
                    onClick={() => importOne(contact)}
                  >
                    {isImporting ? "Importando..." : "Importar"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
