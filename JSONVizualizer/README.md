# JSON Vizualizer - Dashboard de Catalogo (Acougue)

Projeto completo com frontend vanilla e backend Node.js/Express para cadastro de produtos com upload de imagens, remocao de fundo (PicWish), analise IA (OpenAI) e persistencia local em JSON.

## Stack
- Frontend: HTML + CSS + JavaScript (vanilla)
- Backend: Node.js + Express
- Upload: multer
- Persistencia: `data/catalog.json`
- Imagens:
  - Originais: `data/images`
  - Processadas: `data/images_processed`
- Logs OpenAI:
  - Respostas: `data/logs/openai`
- Logs PicWish:
  - Respostas: `data/logs/picwish`

## Estrutura
```
server/
  index.js
  routes/
  services/
  utils/
public/
  index.html
  app.js
  styles.css
data/
  catalog.json
  images/
  images_processed/
  logs/
    openai/
    picwish/
```

## Instalacao
1. Instale as dependencias:
```bash
npm i
```
2. Copie `.env.example` para `.env` e preencha as chaves:
```bash
copy .env.example .env
```
3. Rode em desenvolvimento:
```bash
npm run dev
```
4. Acesse:
```text
http://localhost:3000
```

## Variaveis de ambiente
- `OPENAI_API_KEY`: chave da OpenAI (necessaria para `/api/analyze`)
- `PICWISH_API_KEY`: chave da PicWish (necessaria para `/api/process/remove-bg`)
- `OPENAI_MODEL`: opcional, default `gpt-4.1-mini`
- `PORT`: opcional, default `3000`

## Endpoints principais
- `GET /api/catalog`
- `POST /api/catalog`
- `DELETE /api/catalog`
- `GET /api/catalog/export`
- `POST /api/catalog/import`
- `POST /api/upload/original`
- `POST /api/process/remove-bg`
- `POST /api/analyze`

## Exemplo curl - /api/analyze
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"nomeProduto\":\"Picanha\",\"imagePath\":\"/data/images_processed/exemplo.png\"}"
```

## Exemplo curl - /api/process/remove-bg
Com imagem enviada no request:
```bash
curl -X POST http://localhost:3000/api/process/remove-bg \
  -F "image=@C:/caminho/arquivo.png"
```

Com imagem ja salva (path relativo):
```bash
curl -X POST http://localhost:3000/api/process/remove-bg \
  -H "Content-Type: application/json" \
  -d "{\"relativePathOriginal\":\"/data/images/arquivo.png\"}"
```

## Observacoes
- O catalogo usa apenas paths relativos (`/data/...`) e nao caminhos absolutos do sistema.
- Se PicWish nao estiver configurado, a UI mostra erro amigavel e permite continuar.
- Se a analise IA falhar, o backend retorna campos vazios com mensagem de erro.
