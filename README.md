# FridgeGhost + ReceitaImprovisada  
**Um app 100% offline que transforma sua geladeira em chef particular**

### Nome Sugerido
**FridgeChef** (ou **GeladeiraMágica**)

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
   - Banco de ~200 receitas simples embutido no app (JSON estático)
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

### Monetização Futura (opcional e sem servidor)
- Versão gratuita com 200 receitas
- Compra única de “pacote de 500 receitas brasileiras” ou receitas regionais (Nordeste, Mineira, etc.)

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
