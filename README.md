# PWA de Estudos com IA

## Visão geral
Aplicativo **Progressive Web App** que auxilia nos estudos de programação e outras áreas (ex.: Enfermagem) simulando entrevistas com IA. Funciona como site e pode ser instalado em Android, iOS e desktop.

## Stack técnico
- **Frontend**: HTML5, CSS3, JavaScript puro (ES6 modules)
- **PWA**: `manifest.webmanifest` + Service Worker com cache offline
- **Backend**: Firebase Authentication + Firestore
- **IA**: Cloud Function que chama a API Anthropic (Claude). A chave da IA fica segura no servidor.
- **Hospedagem**: Firebase Hosting + Functions (HTTPS obrigatório)

## Começando
1. **Instalar Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. **Criar projeto Firebase** (ou usar um existente) e copiar o ID.
3. **Configurar variáveis de ambiente** em `functions/.env` (não versionado):
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```
4. **Instalar dependências**
   ```bash
   cd pwa-estudos-ia
   npm install
   cd functions && npm install && cd ..
   ```
5. **Deploy**
   ```bash
   firebase init (Hosting, Functions, Firestore, Authentication)
   firebase deploy
   ```

## Estrutura de diretórios
```
 pwa-estudos-ia/
 ├─ public/
 │   ├─ index.html
 │   ├─ manifest.webmanifest
 │   └─ service-worker.js
 ├─ src/
 │   ├─ main.js
 │   ├─ router.js
 │   ├─ ui.js
 │   ├─ auth.js
 │   ├─ db.js
 │   ├─ ai.js
 │   └─ voice.js
 ├─ firebase/
 │   ├─ firebase.json
 │   └─ firestore.rules
 ├─ functions/
 │   ├─ index.js
 │   └─ package.json
 ├─ tests/
 │   ├─ unit/
 │   └─ e2e/
 ├─ .eslintrc.json
 ├─ jest.config.js
 └─ cypress.json
```

## Testes e auditoria
- **Jest** para testes unitários
- **Cypress** para testes end‑to‑end
- **Lighthouse** (via `firebase hosting:channel:deploy preview`) para auditoria PWA, performance, acessibilidade e boas práticas.

## Próximos passos
O código base já está criado; prossiga implementando cada módulo conforme o roadmap no relatório.
