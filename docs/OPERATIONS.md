# NAG CRM Operations

## Mensagens programadas

Mensagens programadas ficam em `scheduled_messages` e passam pelos estados:

- `pending`: aguardando horario de envio.
- `processing`: adquirida pelo processador.
- `sent`: enviada pela Evolution e vinculada a uma mensagem em `messages`.
- `failed`: excedeu o limite de tentativas.
- `canceled`: cancelada antes do envio.

O processador busca itens `pending` com `scheduled_for <= now()`, marca cada item como `processing` com update condicional e so entao envia pela Evolution. Depois do envio, cria uma mensagem `saida`, atualiza o card do lead e grava `sent_at`, `external_id` e `message_id`.

## Vercel Cron

O projeto possui cron para:

- `/api/scheduled-messages/process`: processar mensagens programadas.
- `/api/messages/media/process-pending`: tentar hidratar midias pendentes.

A conta Hobby da Vercel aceita apenas cron diario. Por isso o `vercel.json` fica com um cron diario de seguranca. Para envio realmente operacional a cada 5 minutos, use uma conta Pro ou um cron externo chamando `/api/scheduled-messages/process` com `CRON_SECRET`.

A rota de mensagens programadas exige segredo em producao:

- `Authorization: Bearer $CRON_SECRET`
- ou header `x-cron-secret: $CRON_SECRET`

## Variaveis obrigatorias

- `CRON_SECRET`: segredo para autorizar o processador de mensagens programadas.
- `EVOLUTION_API_URL`: URL base da Evolution API.
- `EVOLUTION_API_KEY`: chave da Evolution API.
- `EVOLUTION_INSTANCE`: instancia usada para envio.
- `NEXT_PUBLIC_SUPABASE_URL`: URL do Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon publica.
- `SUPABASE_SERVICE_ROLE_KEY`: chave service role usada apenas no servidor.

## Respostas rapidas

Templates ficam em `message_templates`. O chat carrega templates ativos e insere o conteudo no campo de mensagem, sem enviar automaticamente. A gestao simples fica em Configuracoes.

## SLA e fila de resposta

O SLA e derivado das mensagens, sem criar campos extras no lead:

- Precisa responder: a ultima mensagem nao anotacao do lead e do tipo `entrada`.
- 24h, 48h e 72h: calculados pela idade dessa ultima mensagem de entrada.

Esses indicadores aparecem no dashboard, no pipeline e na lista de conversas.

## Eventos operacionais

Eventos importantes sao gravados em `crm_events` com payload sanitizado. A tabela ajuda a investigar:

- mensagens enviadas ou falhas;
- webhook criando lead/mensagem;
- mensagens programadas criadas, canceladas, enviadas ou com erro;
- templates criados/alterados;
- card movido no kanban.

Em Configuracoes ha um painel simples com os eventos recentes.

## Validacao manual

1. Abra uma conversa e programe uma mensagem para alguns minutos a frente.
2. Confirme que ela aparece como pendente no chat.
3. Cancele uma programacao pendente e confira o status.
4. Crie outra programacao proxima.
5. Chame `/api/scheduled-messages/process` com o segredo.
6. Confirme que a mensagem chegou ao WhatsApp e apareceu no chat.
7. Chame o processador novamente e confirme que nao houve duplicidade.
8. Crie uma resposta rapida em Configuracoes.
9. Insira a resposta rapida no chat e envie.
10. Verifique dashboard, pipeline e conversas com filtro "Preciso responder".
