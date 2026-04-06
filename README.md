# NAG CRM

CRM estilo Kanban com inbox de WhatsApp, construído com Next.js 14, TypeScript, Tailwind e Supabase.

## Stack

- Next.js 14+ com App Router
- TypeScript
- Tailwind CSS
- shadcn/ui style components
- Supabase (PostgreSQL, Realtime, Auth)
- Deploy na Vercel

## Estrutura

- `app/`: rotas App Router e endpoints da API
- `components/`: layout, kanban, chat e UI base
- `lib/repositories/`: acesso ao banco
- `lib/services/`: lógica de negócio
- `lib/validations/`: contratos Zod
- `supabase/schema.sql`: schema completo do banco

## Setup local

1. Instale dependências:

```bash
npm install
```

2. Copie `.env.example` para `.env.local` e preencha as chaves do Supabase e da Evolution API.

3. Execute `supabase/schema.sql` no projeto Supabase.

4. Rode:

```bash
npm run dev
```

## Endpoints

- `GET /api/leads`
- `GET /api/cards`
- `PATCH /api/cards/move`
- `GET /api/messages/:leadId`
- `POST /api/messages/send`
- `POST /api/webhook/whatsapp`

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure as mesmas variáveis de ambiente do `.env.local`.
3. Habilite o Realtime no Supabase para `messages` e `cards`.
4. Faça o deploy.
