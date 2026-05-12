# Producao (Docker + Postgres + Caddy)

Este guia sobe:
- API (Node/TS) em container
- Postgres no mesmo servidor
- Caddy como reverse proxy (HTTP agora, HTTPS automatico quando houver dominio)

## 1) Comprar um dominio (sem curva de aprendizado)

Opcoes comuns:
- Registro.br (bom para `.com.br`)
- Cloudflare Registrar (simples se voce ja for usar Cloudflare para DNS)
- Namecheap / GoDaddy (funciona, mas Cloudflare costuma ser mais simples para DNS)

Passos (geral):
1. Escolha um nome (ex.: `engenheiroplatform.com.br`).
2. Registre o dominio.
3. Configure o DNS:
   - Crie um registro `A` para `@` apontando para o IP publico do seu servidor.
   - Crie um registro `A` para `www` apontando para o mesmo IP (opcional).
4. Aguarde propagacao (pode levar minutos ate algumas horas).

Dica: usar Cloudflare como DNS deixa a gestao mais simples (interface melhor) e voce ganha protecoes basicas.

## 2) Preparar o servidor (VPS)

Recomendado:
- Ubuntu 22.04+
- 1 vCPU / 1GB RAM (minimo)

Instale Docker e Compose.

## 3) Configurar variaveis de ambiente

Crie um arquivo `.env` **no servidor** (na pasta do projeto) com:

```env
# Banco (pode manter os defaults se quiser)
POSTGRES_DB=engenheiro_platform
POSTGRES_USER=engenheiro
POSTGRES_PASSWORD=uma_senha_forte_aqui

# API
JWT_SECRET=uma_chave_bem_grande_e_aleatoria
ADMIN_NOTIFY_EMAIL=seu-email@dominio.com

# Mailjet (se for usar)
MJ_APIKEY_PUBLIC=
MJ_APIKEY_PRIVATE=
MJ_SENDER_EMAIL=
MJ_SENDER_NAME=Engenheiro Platform

# SendGrid (opcional; so sera usado se comecar com SG.)
SENDGRID_API_KEY=
SENDGRID_SENDER_EMAIL=
SENDGRID_SENDER_NAME=Engenheiro Platform
```

## 4) Subir os containers

Na pasta do projeto:

```bash
docker compose up -d --build
docker compose logs -f api
```

Teste:
- `GET http://IP_DO_SERVIDOR/health`

## 5) Ativar HTTPS quando tiver dominio

1. Confirme que o dominio aponta para o IP do servidor.
2. Edite o `Caddyfile` e troque `:80` por `seu-dominio.com`.
3. Recarregue o Caddy:

```bash
docker compose up -d
```

O Caddy vai emitir o certificado automaticamente (porta 80/443 precisam estar abertas).

## 6) Backup e manutencao minima

Backup do Postgres:
- Volume `pgdata` contem os dados.
- O jeito mais seguro: backup diario com `pg_dump` para um storage externo.

Atualizacao:
```bash
git pull
docker compose up -d --build
```

