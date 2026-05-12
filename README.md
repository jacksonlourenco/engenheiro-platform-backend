# Engenheiro Platform Backend

Backend em Node.js + TypeScript com autenticacao completa usando:
- Registro de usuario
- Hash de senha com BCrypt
- Login
- JWT
- Middleware de autenticacao
- Confirmacao de email com Mailjet
- Reset de senha via email
- Notificacao de orcamento aceito (ADMIN_NOTIFY_EMAIL)

## Requisitos

- Node.js 18+
- PostgreSQL
- Conta Mailjet com API keys
- Conta SendGrid com API key (opcional, recomendado)

## Configuracao

1. Instale as dependencias:

```bash
npm install
```

2. Configure o arquivo `.env` na raiz do projeto:

```env
PORT=3000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=uma_chave_forte_aqui
ADMIN_NOTIFY_EMAIL=admin@seu-dominio.com

# SendGrid (recomendado)
SENDGRID_API_KEY=sua_api_key
SENDGRID_SENDER_EMAIL=contato@seu-dominio.com
SENDGRID_SENDER_NAME=Engenheiro Platform

# Mailjet (fallback, opcional)
MJ_APIKEY_PUBLIC=sua_api_key
MJ_APIKEY_PRIVATE=sua_api_secret
MJ_SENDER_EMAIL=contato@seu-dominio.com
MJ_SENDER_NAME=Engenheiro Platform
```

3. Inicie a aplicacao:

```bash
npm run dev
```

A API e a landing page ficam disponiveis em `http://localhost:3000`.

## Endpoints

### Health

- `GET /health`

Resposta esperada:

```json
{
  "status": "ok"
}
```

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/verify-email`
- `GET /auth/me` (protegida)

#### 1) Registro

`POST /auth/register`

Body (JSON):

```json
{
  "name": "Joao",
  "email": "joao@email.com",
  "cpf": "12345678901",
  "phone": "11999998888",
  "password": "123456"
}
```

Sucesso: `201 Created`

#### 2) Verificacao de email

O sistema envia um link de confirmacao para o email informado. Ao abrir o link, o email fica verificado.

#### 3) Login

`POST /auth/login`

Body (JSON):

```json
{
  "email": "joao@email.com",
  "password": "123456"
}
```

Sucesso: `200 OK`

```json
{
  "token": "<JWT_TOKEN>"
}
```

#### 4) Esqueci minha senha

`POST /auth/forgot-password`

Body (JSON):

```json
{
  "email": "joao@email.com"
}
```

#### 5) Resetar senha

`POST /auth/reset-password`

Body (JSON):

```json
{
  "token": "<TOKEN_DO_EMAIL>",
  "password": "nova_senha"
}
```

#### 6) Rota protegida

`GET /auth/me`

Header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Sucesso: `200 OK`

## Frontend

- Landing page: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`
- Reset de senha: link enviado por email

## Observacoes

- A tabela `users` e criada automaticamente na inicializacao se nao existir.
- Se `JWT_SECRET` ou `DATABASE_URL` estiverem ausentes, a API falha na inicializacao.
- `APP_URL` deve refletir o dominio base usado nos links de confirmacao.

## Producao (Docker)

Para subir em producao com Postgres no mesmo servidor e reverse proxy:
veja [`docs/PRODUCTION.md`](docs/PRODUCTION.md).
