import { AppFrame } from "@/components/layout/app-frame";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <AppFrame>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Webhook</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Entrada do WhatsApp</h2>
          <p className="mt-3 text-sm text-secondary">
            Endpoint ativo em <span className="text-foreground">/api/webhook/whatsapp</span>.
          </p>
          <p className="mt-2 text-sm text-secondary">
            O endpoint aceita segredo por header, bearer token, query string e apikey da Evolution.
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Operacao</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Status do CRM</h2>
          <p className="mt-3 text-sm text-secondary">
            Esta area pode receber configuracoes de equipe, integrações e observabilidade.
          </p>
        </Card>
      </div>
    </AppFrame>
  );
}
