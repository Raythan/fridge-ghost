# Pra Já  
**Um app 100% offline que transforma sua geladeira em chef particular**

**[Abrir no navegador (GitHub Pages)](https://raythan.github.io/fridge-ghost/)** · **[Código-fonte](https://github.com/Raythan/fridge-ghost)**

### Descrição em uma frase
Fotografe sua geladeira ou digite os ingredientes que você tem → o app (rodando inteiramente no seu celular) te mostra imediatamente o que está prestes a vencer e gera receitas deliciosas e rápidas usando **apenas** o que você já possui.

### Objetivo
Resolver dois problemas diários ao mesmo tempo:
- Desperdício de comida (principal causa de gasto extra no supermercado)
- “O que eu faço pra comer hoje?” com a geladeira cheia mas sem ideia

### Como funciona (100% client-side – zero servidor)

#### Fluxo Principal (em menos de 15 segundos):

1. **Tela Inicial**
   - Botão grande: “Fotografar Geladeira”
   - Botão secundário: “Digitar ingredientes manualmente”
   - Botão: “Ver meus ingredientes salvos”

2. **Captura de Ingredientes**
   - Opção A: Câmera → tira foto da geladeira/abertura
     - Usa Tesseract.js (OCR offline) para extrair texto dos rótulos
     - Ou usa detecção simples de itens comuns (leite, ovos, tomate, etc.) via palavras-chave
   - Opção B: Digitação ou voz (Web Speech API) – “tenho 3 ovos, 1 tomate, queijo mussarela, arroz e cebola”

3. **Processamento Local**
   - Todos os ingredientes são salvos no `localStorage` / IndexedDB com data de validade (usuário informa ou estima)
   - Calcula automaticamente:
     - Itens que vencem em até 3 dias (destacados em vermelho)
     - Itens que vencem em até 7 dias (amarelo)

4. **Geração de Receitas**
   - Banco de **200+ receitas** em PT-BR no JSON estático (`public/data/recipes-free.json`): curadoria própria + dados normalizados a partir do projeto aberto [Afrodite.json](https://github.com/adrianosferreira/afrodite.json) (agregado em português). Para refazer o merge: coloque `afrodite.json` em `scripts/.cache/` e rode `npm run import-recipes-afrodite`.
   - Cada receita contém: nome, tempo de preparo, dificuldade, ingredientes necessários e modo de preparo
   - Algoritmo simples em JavaScript:
     - Calcula quantos ingredientes da receita o usuário já tem (match %)
     - Prioriza receitas com maior % de aproveitamento
     - Dá bônus para receitas que usam itens perto da validade
     - Ordena por: tempo (mais rápido primeiro) → aproveitamento → itens vencendo

5. **Resultados na Tela**
   - Seção “Vencendo em breve” (com alerta visual)
   - Lista de 5–8 receitas recomendadas com:
     - % de aproveitamento (“Usa 87% do que você tem”)
     - Tempo estimado
     - Dificuldade
     - Botão “Ver receita completa”
   - Opção “Surpreenda-me” (receita aleatória com alto aproveitamento)

6. **Detalhe da Receita**
   - Ingredientes (marca em verde os que você tem, vermelho os que faltam – mas prioriza só os que tem)
   - Modo de preparo passo a passo
   - Dica de variação usando outro item que está vencendo

### Funcionalidades Extras (ainda 100% offline)

- Histórico de receitas feitas (marcar como “fiz hoje”)
- Lista de compras inteligente: gera automaticamente o que falta se você quiser completar uma receita
- Modo “Geladeira vazia” – sugere receitas com 3 ingredientes ou menos
- Streak de “zero desperdício” (dias seguidos usando itens vencendo)
- Exportar lista de ingredientes como texto (para colar no WhatsApp)

### Stack Técnica (MVP em 1–3 dias)

- HTML + Vanilla JS ou Svelte/Vite (muito leve)
- Tesseract.js para OCR offline (~2 MB)
- Web Speech API para entrada por voz
- localStorage + IndexedDB para persistência
- Tailwind CSS para interface bonita e responsiva
- PWA (instalável no celular)

### Descoberta (SEO, partilha e GitHub)

- **Open Graph / Twitter Card**: no build de produção, se existir `VITE_PUBLIC_CANONICAL_ORIGIN` (ex.: `https://SEU-USUARIO.github.io`), o Vite injeta `canonical`, `og:*` e `twitter:*` com imagem `pwa-512.png`. O workflow **Deploy GitHub Pages** define isso automaticamente a partir do dono do repositório. Com **domínio próprio**, altere esse valor no `pages.yml` (ou no comando de build) para a origem canónica real.
- **GitHub → About**: preencha **Website** com a URL do Pages, **Description** numa linha (pode reutilizar a meta description do `index.html`) e **Topics**, por exemplo: `pwa`, `recipes`, `offline-first`, `food-waste`, `vite`, `typescript`, `brazil`, `portuguese`.

### Receitas e feedback
- Catálogo: `data/recipes-free.json` + `data/recipes-premium.json` — o app **carrega tudo ao abrir** (sem paywall).
- **Feedback de quem não usa GitHub**: [Web3Forms](https://web3forms.com) (plano gratuito). Crie um formulário, copie a **Access Key**, e no GitHub do repo vá em **Settings → Secrets and variables → Actions** e crie o secret **`WEB3FORMS_ACCESS_KEY`** (nome exato; em **Repository secrets**, não só em Environment). O deploy do Pages passa a variável `VITE_FEEDBACK_WEB3FORMS_ACCESS_KEY` no build; as mensagens chegam no e-mail que você configurou no Web3Forms. Localmente use `VITE_FEEDBACK_WEB3FORMS_ACCESS_KEY` no `.env`.
- **Só aparece “Abrir no GitHub” em produção?** A chave tem de existir **no momento do `npm run build` no Actions**. Depois de criar ou corrigir o secret, faça um novo deploy (push em `main` ou **Actions → Deploy GitHub Pages → Run workflow**). No log do job `build`, o passo **Verificar secret Web3Forms** avisa se o secret está vazio. Não commite a key no repositório — só no painel de Secrets.
- **Feedback para contribuidores**: em **Configurações** → **Enviar feedback** continua disponível **Abrir no GitHub** (nova issue com título e corpo). Crie a label **`feedback`** no repositório para classificar.
- Variável opcional: `VITE_FEEDBACK_REPO=dono/repo` para forks apontarem o link de issue para o repo certo (padrão: `Raythan/fridge-ghost`).
- Dev: `VITE_DEV_UNLOCK_ALL=true` mantém atalhos de desenvolvimento no cliente.

### Deploy (GitHub Actions)

**Configurar Pages no GitHub (obrigatório para o site abrir):**

1. Abra o repositório no GitHub → **Settings** → **Pages** (menu lateral).
2. Em **Build and deployment** → **Source**, escolha **GitHub Actions** — **não** use “Deploy from a branch” (isso não usa o workflow e o site pode dar 404 ou ficar vazio).
3. Se aparecer pedido de aprovação do ambiente **`github-pages`**, aprove em **Settings** → **Environments** → `github-pages`.
4. Confirme que o workflow **Deploy GitHub Pages** rodou com sucesso em **Actions** (jobs `build` e `deploy` verdes). Para forçar de novo: **Actions** → **Deploy GitHub Pages** → **Run workflow**.
5. URL esperada: `https://<seu-usuario>.github.io/fridge-ghost/` (o `BASE_URL` no workflow já usa `/<nome-do-repo>/`).

---

- O CI usa **`npm install`** com o `package-lock.json` (não `npm ci`), para evitar falha no Linux com **opcionais do Rollup** ([npm/cli#4828](https://github.com/npm/cli/issues/4828)).
- Em `package.json`, **`optionalDependencies`** declara `@rollup/rollup-linux-x64-gnu` na mesma versão do Rollup que o Vite traz; ao atualizar o Vite, rode `npm ls rollup` e alinhe essa versão se o build no Actions quebrar.

### Por que isso é poderoso e simples
- Todo mundo abre a geladeira e pensa “o que faço com isso?”
- Responde exatamente esse momento de dor
- Funciona offline (perfeito para quem mora em lugar com internet ruim)
- Zero custo de servidor ou privacidade (nada sai do celular do usuário)

### Próximos passos para MVP
1. Criar banco JSON de 100 receitas simples (arroz, feijão, ovo, macarrão, frango, etc.)
2. Implementar captura de foto + OCR básico
3. Criar algoritmo de matching (match % + prioridade de validade)
4. Interface mobile-first
