import { AppFrame } from "@/components/layout/app-frame";
import { Card } from "@/components/ui/card";
import { ReconciliationPanel } from "@/components/settings/reconciliation-panel";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <AppFrame>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Webhook</p>
          <h2 className="mt-1.5 text-xl font-semibold text-foreground">Entrada do WhatsApp</h2>
          <p className="mt-2 text-[13px] text-secondary">
            Endpoint ativo em <span className="text-foreground">/api/webhook/whatsapp</span>.
          </p>
          <p className="mt-1.5 text-[13px] text-secondary">
            O endpoint aceita segredo por header, bearer token, query string e apikey da Evolution.
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Operacao</p>
          <h2 className="mt-1.5 text-xl font-semibold text-foreground">Status do CRM</h2>
          <p className="mt-2 text-[13px] text-secondary">
            Esta area pode receber configuracoes de equipe, integrações e observabilidade.
          </p>
        </Card>
      </div>

      <div className="mt-3">
        <ReconciliationPanel />
      </div>
    </AppFrame>
  );
}
