# Sistema de Agendamento para Manicure

Sistema web (mobile-first) para gerenciar agenda, clientes, serviços, pagamentos e faturamento.

**Stack:** React + Vite (frontend) · Node.js + Express (backend) · Supabase/PostgreSQL (banco) · deploy no Vercel (frontend) e Render (backend).

---

## 📁 Estrutura do projeto

```
manicure-sistema/
├── backend/          # API Node.js + Express
├── frontend/          # App React (mobile-first)
├── database/
│   └── schema.sql     # Script para criar as tabelas no Supabase
└── README.md
```

---

## 1. Criar o banco de dados no Supabase

1. Crie uma conta gratuita em **https://supabase.com** e clique em "New project".
2. Escolha um nome (ex: `sistema-manicure`), uma senha para o banco e a região mais próxima (ex: São Paulo).
3. Aguarde o projeto ser criado (leva ~2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `database/schema.sql` deste projeto, copie todo o conteúdo, cole no editor e clique em **Run**.
   - Isso cria as tabelas `clientes`, `servicos`, `agendamentos`, `pagamentos`, `configuracoes` e já insere os 7 serviços do seu documento de requisitos.
6. Vá em **Project Settings → API**. Você vai precisar de dois valores:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **service_role key** (em "Project API keys" — é uma chave secreta, não a `anon` key)

Guarde esses dois valores, você vai usá-los no passo 2.

---

## 2. Rodar o backend localmente (opcional, para testar antes do deploy)

```bash
cd backend
cp .env.example .env
```

Abra o arquivo `.env` e preencha:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Depois instale e rode:
```bash
npm install
npm run dev
```

A API vai subir em `http://localhost:3001`. Teste em: `http://localhost:3001/` — deve responder `{"status":"ok", ...}`.

---

## 3. Rodar o frontend localmente

Em outro terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5173` no navegador (ou no celular, pelo IP da máquina na mesma rede Wi-Fi, ex: `http://192.168.0.10:5173`).

---

## 4. Subir o código para o GitHub

Como você ainda não tem um repositório, crie um em **https://github.com/new** (ex: `sistema-manicure`), sem inicializar com README (para não dar conflito).

Depois, na pasta raiz do projeto (`manicure-sistema`):
```bash
git init
git add .
git commit -m "Primeira versão do sistema"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/sistema-manicure.git
git push -u origin main
```

---

## 5. Deploy do backend no Render

1. Crie uma conta em **https://render.com** (dá para entrar com GitHub).
2. Clique em **New → Web Service** e conecte o repositório que você acabou de criar.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Em **Environment Variables**, adicione as mesmas variáveis do `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `FRONTEND_URL` (por enquanto pode deixar em branco ou `*`, você atualiza depois do passo 6)
5. Clique em **Create Web Service**. Ao final, você vai ter uma URL tipo `https://sistema-manicure-api.onrender.com`.

> ⚠️ No plano gratuito do Render, o servidor "dorme" depois de alguns minutos sem uso e demora ~30s para acordar na primeira requisição do dia. Isso é normal.

---

## 6. Deploy do frontend na Vercel

1. Crie uma conta em **https://vercel.com** (entre com GitHub).
2. Clique em **Add New → Project** e selecione o repositório.
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (detecta automaticamente)
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = a URL do backend no Render (ex: `https://sistema-manicure-api.onrender.com`)
5. Clique em **Deploy**. Em ~1 minuto você terá uma URL tipo `https://sistema-manicure.vercel.app` — é esse link que você vai abrir pelo celular.
6. Volte no Render e atualize a variável `FRONTEND_URL` com essa URL da Vercel, para liberar o CORS corretamente.

---

## 7. Usar no celular

- Abra a URL da Vercel no navegador do celular (Chrome/Safari).
- Toque em **"Adicionar à tela inicial"** para que o sistema abra como se fosse um app.

---

## 📋 Funcionalidades da V1 (implementadas)

- Dashboard com resumo do dia
- Agenda (Hoje / Amanhã / Semana) com mudança de status
- Novo agendamento com cálculo automático de preço, duração e checagem de conflito de horário
- Cancelamento e remarcação (mantendo histórico)
- Cadastro e busca de clientes, marcação de "cliente fixa"
- Histórico de atendimentos por cliente
- Controle de pagamento (Pago/Pendente, forma de pagamento)
- Faturamento diário/semanal/mensal — mostrando separadamente **atendimentos realizados** e **pagamentos recebidos**, conforme combinado
- Botão de WhatsApp com mensagem de lembrete pré-preenchida
- Tela de Configurações: horário de funcionamento por dia da semana e edição de serviços/preços/duração

## 🔜 Pendências do documento original, para revisar com você depois

- Duração do "Banho de gel" (assumi 60 min — ajuste em Configurações a qualquer momento)
- Intervalo entre atendimentos (não implementado ainda — hoje os horários são encostados um no outro)
- Lista de "clientes fixas próximas do prazo": a API já calcula isso (`GET /api/clientes/fixas/proximas`), mas ainda não tem uma tela dedicada — pode ser a próxima etapa
- Login: ficou fora da V1 conforme combinado, qualquer pessoa com o link acessa o sistema

## 🧭 Próxima etapa sugerida (2ª fase do documento)

- Tela dedicada para "clientes fixas" com alerta de reagendamento
- Relatórios com gráficos (faturamento por período, serviços mais vendidos)
- Controle de faltas
- Automação de lembretes

database/migracao_ajustes.sql 
-- ============================================================
-- MIGRAÇÃO: ajustes solicitados (rode no SQL Editor do Supabase)
-- Pode rodar mais de uma vez sem problema (comandos são idempotentes)
-- ============================================================

-- TELA CLIENTES #3: inativar cliente
alter table clientes add column if not exists ativo boolean not null default true;

-- TELA CLIENTES #4 / FINANCEIRO: formas de pagamento viram Dinheiro, Pix, Crédito, Débito
alter table pagamentos drop constraint if exists pagamentos_forma_pagamento_check;
alter table pagamentos add constraint pagamentos_forma_pagamento_check
  check (forma_pagamento in ('pix','dinheiro','credito','debito'));

-- Se você já tinha pagamentos salvos como 'cartao', migre para 'credito' (ajuste manualmente se preferir 'debito')
update pagamentos set forma_pagamento = 'credito' where forma_pagamento = 'cartao';