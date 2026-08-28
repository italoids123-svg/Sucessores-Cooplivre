# Mapa Sucessório | Cooplivre

Aplicação Next.js (App Router) que replica o dashboard "Mapa Sucessório · Ciclo 2027–2030" da Cooplivre, pronta para deploy na Vercel.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Build de produção

```bash
npm run build
npm start
```

## Estrutura

- `app/` — layout, página raiz e estilos globais (CSS portado 1:1 do HTML original).
- `components/` — UI do dashboard (TopBar, Sidebar, páginas de nível, elegibilidade, critérios, questionário, modal de cadeira).
- `lib/` — dados base (`data.ts`, `criteria.ts`), regras de pontuação/elegibilidade (`scoring.ts`), estado global via Context (`context.tsx`) e leitura/escrita de planilhas `.xlsx` (`workbook.ts`).

O comportamento é 100% client-side, igual ao HTML original: os dados de sucessão (`SUCCESSION`) começam vazios a cada carregamento da página e só são preenchidos importando a planilha `.xlsx` pelo botão "Carregar base preenchida". O botão "Baixar base para coleta" exporta o modelo (abas Leia-me, Cadeiras, Base de dados, Hierarquia, Valores aceitos) para preenchimento offline.

## Deploy na Vercel

1. Publique este repositório no GitHub (já está neste repo).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório `Sucessores-Cooplivre`.
3. A Vercel detecta Next.js automaticamente — não é necessário configurar build command, output directory nem variáveis de ambiente.
4. Clique em **Deploy**.

Qualquer push no branch de produção (`main`) gera um novo deploy automaticamente; branches e PRs geram *preview deployments*.

## Observação de segurança

A biblioteca `xlsx` (SheetJS) usada para importar/exportar a planilha tem um advisory conhecido (prototype pollution / ReDoS) sem correção publicada no registro npm — o mesmo pacote/versão já era carregado via CDN no HTML original. A SheetJS distribui builds corrigidas apenas pelo próprio CDN (`cdn.sheetjs.com`); se desejar aplicá-la, troque a dependência `xlsx` do `package.json` por essa build.
