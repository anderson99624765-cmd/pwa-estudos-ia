# PWA de Estudos com IA

App instalável (PWA) que simula entrevistas de estudo com IA. Você cria categorias (ex.: JavaScript, Enfermagem), escolhe o nível e responde às perguntas; a IA avalia e faz a próxima.

## Stack
- **Front-end:** HTML, CSS e JavaScript puro (ES modules), sem build
- **Firebase:** Authentication (e-mail/senha), Firestore, Hosting
- **IA:** Cloud Function (`functions/index.js`) que chama a API da Anthropic. A chave fica só no servidor (Secret Manager)

## Estrutura
```
public/            -> tudo que vai para o Hosting
  index.html, styles.css, manifest.webmanifest, service-worker.js
  icons/           -> ícones do PWA
  src/             -> módulos JS (firebase, auth, db, ai, voice, router, ui, main)
functions/         -> Cloud Function "ask"
firestore.rules    -> regras de segurança
firebase.json      -> hosting + rewrite /api/ask -> função
```

## Configuração (uma vez)
1. Crie um projeto em https://console.firebase.google.com e **ative o plano Blaze** (necessário para Functions chamarem APIs externas).
2. No console: **Authentication → Sign-in method → E-mail/senha** e **Firestore Database → Criar banco**.
3. **Configurações do projeto → Seus apps → Web** e copie a config para `public/src/firebase-config.js`.
4. Edite `.firebaserc` com o ID do seu projeto.
5. Instale a CLI e faça login:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
6. Guarde a chave da Anthropic como secret:
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
7. Instale as dependências da função:
   ```bash
   cd functions && npm install && cd ..
   ```

## Deploy
```bash
firebase deploy
```
Depois de cada deploy que mude arquivos em `public/`, incremente `CACHE_VERSION` em `public/service-worker.js`.

## Testar localmente
```bash
firebase emulators:start
```
Para a função no emulador, crie `functions/.secret.local` com `ANTHROPIC_API_KEY=sua_chave`.

## Ajustes
Variáveis opcionais da função (`functions/.env`): `ANTHROPIC_MODEL` (padrão `claude-sonnet-5-5`) e `DAILY_TOKEN_LIMIT` (padrão 30000 tokens/usuário/dia).

## Segurança
- A função valida o ID token do Firebase; o `uid` nunca é aceito do cliente.
- `ai_sessions` e `usage` só são escritos pelo servidor (regras bloqueiam escrita do cliente).
- Textos do usuário e da IA são escapados na interface (sem XSS).
