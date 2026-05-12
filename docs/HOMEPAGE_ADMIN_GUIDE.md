# Guia de Preenchimento da Pagina Inicial (Landing Page)

Este documento explica, de forma pratica, o que cada campo da pagina inicial faz e como o administrador deve preencher para finalizar o frontend.

Onde editar:
- Painel Admin: `http://localhost:3000/admin`
- Aba: `Landing`

Imagens:
- O site aceita URLs diretas de imagem (recomendado `https://...jpg/png`).
- Para melhor qualidade, use imagens em proporcao 16:9 (ex.: 1600x900).
- Evite links de Google Images (muitas vezes nao sao URL diretas do arquivo).

## Header (Topo)

**Logo**
- O logo exibido no topo vem do arquivo: `public/images/Logo_Igor.png`.
- Ao clicar no logo, o usuario volta para a pagina inicial.

**Menu**
- Links: Home / About / Services / Blog / Contacts.
- No mobile, o menu vira um botao "Menu" (abre/fecha a navegacao).

**Botoes**
- `Login`: abre o modal de login.
- `Cadastrar`: abre o modal de cadastro.

---

## Home

Objetivo: apresentar a proposta do engenheiro e incentivar cadastro/login.

Campos (Admin > Landing > Home):
- **Hero - Eyebrow**
  - Texto curto acima do titulo.
  - Ex.: "Projetos precisos. Resultados solidos."
- **Hero - Titulo**
  - Titulo principal (destaque).
  - Ex.: "Engenharia que transforma decisoes em seguranca e valor."
- **Hero - Texto**
  - Texto de apoio (1 a 3 linhas).
  - Ex.: explicacao breve dos servicos e beneficio.
- **Hero - Imagem (URL direta, recomendado 1600x900)**
  - Imagem de fundo do card/hero (chamativa).
  - Dica: use fotos de obra/engenharia com boa iluminacao e pouco texto na imagem.
- **CTA Cadastro**
  - Texto do botao de cadastro dentro da Home.
  - Ex.: "Quero me cadastrar"
- **CTA Login**
  - Texto do botao de login dentro da Home.
  - Ex.: "Ja tenho conta"

Como aparece:
- A imagem aparece como fundo do bloco visual da Home (lado direito no desktop, abaixo no mobile).
- O Eyebrow, Titulo e Texto aparecem no bloco de texto (lado esquerdo no desktop).

---

## About

Objetivo: explicar credenciais/abordagem do engenheiro e gerar confianca.

Campos (Admin > Landing > About):
- **About - Intro**
  - Texto introdutorio da secao.
- **About - Card 1 titulo / texto**
- **About - Card 2 titulo / texto**
- **About - Card 3 titulo / texto**

Como aparece:
- Os cards aparecem em formato de carrossel (com setas laterais).
- Cada card mostra: titulo + texto.

Recomendacao de conteudo:
- Card 1: Experiencia e registro profissional.
- Card 2: Tipos de obras/projetos atendidos.
- Card 3: Metodo de trabalho (prazo, clareza, acompanhamento).

---

## Services

Objetivo: listar servicos principais de forma visual.

Campos (Admin > Landing > Services):
- **Services - Intro**
  - Texto introdutorio da secao.
- **Services - Background imagem (URL direta, recomendado 1600x900)**
  - Imagem de fundo da secao (opcional).
  - Se ficar em branco, a secao usa o fundo normal do site.
- **Services - Opacidade do fundo (0 a 1)**
  - Controla a transparencia da imagem de fundo (0 = invisivel, 1 = totalmente visivel).
  - Recomendado: entre 0.20 e 0.40.
- **Services - Cards**
  - Cada card possui:
    - Titulo
    - Texto
    - Imagem (URL direta) (opcional)
  - Botao **Adicionar card**: cria mais cards.
  - Botao **Remover**: remove o card selecionado.

Como aparece:
- Desktop: carrossel com 3 cards visiveis; o card central fica em destaque.
- Mobile: carrossel com 1 card por vez.
- Se a imagem do card for preenchida, ela aparece no topo do card.

Recomendacao de cards:
- Laudos tecnicos
- Projetos estruturais
- Regularizacao/ART
- Consultoria/Pericia

---

## Blog

Objetivo: mostrar conteudo em video (YouTube) para educar o cliente e gerar autoridade.

Campos (Admin > Landing > Blog):
- **Blog - Intro**
  - Texto introdutorio da secao.
- **Blog - Video 1 URL (YouTube)**
- **Blog - Video 2 URL (YouTube)**
- **Blog - Video 3 URL (YouTube)**

Como preencher URLs:
- Pode colar links como:
  - `https://www.youtube.com/watch?v=...`
  - `https://youtu.be/...`
  - `https://www.youtube.com/shorts/...`
- O site converte automaticamente para o formato embed.

Como aparece:
- Os videos aparecem lado a lado com o mesmo tamanho e espacos iguais (no desktop).
- No mobile, ficam em uma coluna.

---

## Contacts (Rodape)

Objetivo: disponibilizar contato e informacoes basicas no final da pagina.

Campos (Admin > Landing > Contacts):
- **Contato - Email**
  - Email de contato principal.
- **Contato - Telefone**
  - Telefone principal.
- **Contato - Endereco**
  - Endereco (cidade/estado ou completo).
- **Contato - Horario**
  - Horario de atendimento.

Como aparece:
- Fica no rodape, com fundo escuro e organizado em colunas.

---

## Checklist Rapido (Admin)

- Home:
  - Eyebrow, Titulo, Texto preenchidos
  - Imagem do hero com URL direta
- About:
  - Intro e 3 cards revisados
- Services:
  - Intro preenchido
  - (Opcional) fundo + opacidade
  - Cards com titulo/texto e imagens (se desejar)
- Blog:
  - 1 a 3 links do YouTube validos
- Contacts:
  - Email, telefone, endereco e horario revisados

