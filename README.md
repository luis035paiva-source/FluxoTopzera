# FluxoTopzera — Pipeline de Imagens para Acougue

Sistema completo para gerar, baixar, processar e catalogar imagens de produtos de acougue. Combina scripts JSX do Photoshop, uma extensao Chrome para busca de imagens e um servidor web com IA para remocao de fundo e categorizacao automatica.

---

## Estrutura do Projeto

```
PythonPhotoshop/
├── JSONVizualizer/           # Servidor web (Node.js/Express) + dashboard
│   ├── server/               # Backend (rotas, servicos, utilitarios)
│   ├── public/               # Frontend (HTML, CSS, JS vanilla)
│   └── data/                 # Dados gerados (catalog.json, imagens, logs)
├── DownloadExtension/        # Extensao Chrome — busca e download de imagens
├── PeixeDownloadExtension/   # Extensao Chrome — variante para peixes
├── input/                    # Fila de entrada para scripts Photoshop
├── output/                   # Imagens geradas pelo pipeline Photoshop
├── downloads/                # Imagens baixadas pela extensao (temporario)
├── import_next_input_to_active_doc.jsx
├── save_active_document_output.jsx
└── topcenter_and_generate.jsx
```

---

## Pre-requisitos

- **Node.js** v18 ou superior
- **Google Chrome** (para a extensao)
- **Adobe Photoshop** (opcional, para os scripts JSX)
- Chave de API da **OpenAI** (GPT-4.1-mini ou superior)
- Chave de API da **PicWish** (remocao de fundo)

---

## Instalacao

### 1. Clonar o repositorio

```bash
git clone https://github.com/luis035paiva-source/FluxoTopzera.git
cd FluxoTopzera
```

### 2. Instalar dependencias do servidor

```bash
cd JSONVizualizer
npm install
```

### 3. Configurar variaveis de ambiente

Crie o arquivo `JSONVizualizer/.env`:

```env
OPENAI_API_KEY=sua-chave-openai-aqui
PICWISH_API_KEY=sua-chave-picwish-aqui
PORT=3000
OPENAI_MODEL=gpt-4.1-mini
```

### 4. Iniciar o servidor

```bash
# Modo desenvolvimento (com hot-reload)
npm run dev

# Modo producao
npm start
```

O servidor roda em **http://localhost:3000**.

### 5. Instalar a extensao Chrome

1. Abra `chrome://extensions/` no Chrome
2. Ative o **Modo de desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactacao**
4. Selecione a pasta `DownloadExtension/`
5. A extensao aparece como **Acougue Imagens** na barra de extensoes

---

## Como Usar

### Fluxo Completo (Busca + Download + Processamento)

#### Passo 1 — Buscar imagens no Google

1. Clique no icone da extensao na barra do Chrome para abrir o **Side Panel**
2. Voce vera uma lista de 84 produtos de acougue pre-definidos
3. Use o campo **Buscar item** para filtrar a lista
4. Clique em qualquer produto — ele abre uma pesquisa no Google Imagens

#### Passo 2 — Baixar 20 imagens

1. Na pagina do Google Imagens, um botao verde **"Baixar 20"** aparece no canto inferior direito
2. Clique nele — a extensao extrai ate 20 URLs de imagens da pagina
3. As imagens sao salvas automaticamente em `C:/PythonPhotoshop/downloads/` com nomes como:
   - `MusculoBovino1.jpg`
   - `MusculoBovino2.jpg`
   - `MusculoBovino3.jpg`
   - etc.

> **Importante:** O servidor (localhost:3000) precisa estar rodando para o download funcionar.

#### Passo 3 — Processar com ChatGPT

1. Volte ao Side Panel da extensao
2. Clique no botao azul **"Processar com ChatGPT"**
3. O servidor processa automaticamente todas as imagens da pasta `downloads/`:
   - Salva o original no catalogo
   - Remove o fundo usando a API **PicWish**
   - Categoriza com IA (**OpenAI**) — detecta nome, categoria e subcategoria
   - Adiciona ao catalogo de produtos
4. O resultado aparece na barra de status da extensao

#### Passo 4 — Revisar no Dashboard

1. Abra **http://localhost:3000** no navegador
2. Na aba **Editor de JSON produtos**, voce vera todos os produtos catalogados
3. Pode editar nome, categoria, subcategoria de cada produto
4. Pode exportar o catalogo como JSON

---

### Dashboard Web (JSONVizualizer)

Acesse **http://localhost:3000** para o dashboard com duas abas:

#### Aba 1 — Editor de JSON Produtos

- Upload manual de imagens de produtos
- Remocao de fundo automatica (PicWish)
- Categorizacao por IA (OpenAI)
- Edicao, exclusao e busca de produtos
- Import/Export do catalogo em JSON

**8 categorias de produtos:**
Bovinos, Suinos, Aves, Miudos & visceras, Embutidos frescos & preparados, Frios & defumados, Complementos, Peixes

#### Aba 2 — Editor de Templates

- Visualiza imagens geradas pelo Photoshop (pasta `output/`)
- Categoriza templates por ocasiao/data comemorativa com IA
- 24 categorias de templates (Natal, Carnaval, Pascoa, etc.)

---

### Extensao Chrome — Configuracoes

No Side Panel da extensao:

| Opcao | Descricao |
|-------|-----------|
| **Buscar item** | Filtra a lista de produtos |
| **Reutilizar aba de pesquisa** | Abre novas buscas na mesma aba |
| **Sufixo global da pesquisa** | Texto adicionado a todas as buscas (padrao: "foto produto fundo branco") |
| **Editar lista** | Adicionar/remover/reordenar produtos |
| **Importar/Exportar JSON** | Backup da lista de produtos |
| **Processar com ChatGPT** | Envia imagens baixadas para processamento automatico |

---

## API do Servidor

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/catalog` | Lista todos os produtos |
| POST | `/api/catalog` | Cria um produto |
| PUT | `/api/catalog/:id` | Atualiza um produto |
| DELETE | `/api/catalog/:id` | Remove um produto |
| GET | `/api/catalog/export` | Exporta catalog.json |
| POST | `/api/upload/original` | Upload de imagem |
| POST | `/api/process/remove-bg` | Remocao de fundo (PicWish) |
| POST | `/api/analyze` | Analise IA do produto |
| POST | `/api/downloads/fetch` | Baixa imagens por URL |
| POST | `/api/downloads/process` | Processa imagens baixadas (bg + IA + catalogo) |
| GET | `/api/downloads/list` | Lista arquivos na pasta downloads |
| DELETE | `/api/downloads/clear` | Limpa a pasta downloads |
| GET | `/api/templates` | Lista templates |
| POST | `/api/templates/analyze` | Analise IA de template |
| GET | `/api/output-images` | Lista imagens do Photoshop |
| GET | `/api/health` | Health check |

---

## Scripts Photoshop (JSX)

| Script | Funcao |
|--------|--------|
| `import_next_input_to_active_doc.jsx` | Importa a proxima imagem da pasta `input/` para o documento ativo |
| `topcenter_and_generate.jsx` | Centraliza no topo e gera a composicao |
| `save_active_document_output.jsx` | Salva o documento ativo na pasta `output/` |

---

## Tecnologias

- **Backend:** Node.js, Express, Multer, Zod, UUID
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **IA:** OpenAI API (GPT-4.1-mini)
- **Processamento de imagem:** PicWish API
- **Extensao:** Chrome Manifest v3
- **Armazenamento:** Arquivos JSON (sem banco de dados)
