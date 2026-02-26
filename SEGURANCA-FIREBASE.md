# Segurança Firebase – Árion Flashcards

## 1. Firestore Security Rules (obrigatório)

As regras estão em **`firestore.rules`**. Você precisa publicá-las no Firebase:

1. Abra o [Console do Firebase](https://console.firebase.google.com) → projeto **arion-flashcards**.
2. Vá em **Firestore Database** → aba **Regras**.
3. Substitua o conteúdo pelo conteúdo do arquivo `firestore.rules` deste projeto.
4. Clique em **Publicar**.

**O que as regras fazem:**
- **usuarios/{uid}**: só o usuário autenticado com esse `uid` pode ler e escrever.
- **cards_estudo**: o usuário só lê documentos em que `uid` seja ele mesmo ou o admin (baralhos premium); só pode criar/editar/apagar documentos com `uid` igual ao dele.

Sem essas regras, qualquer pessoa que tenha o link do app poderia tentar ler ou alterar dados de outros usuários (se as regras atuais estiverem abertas).

---

## 2. Restringir a chave de API (recomendado)

A `apiKey` no front-end é pública por design; a proteção vem das **regras do Firestore** e dos **domínios autorizados**. Ainda assim, vale restringir a chave:

1. No Firebase Console: **Configurações do projeto** (ícone de engrenagem) → **Uso geral**.
2. Em **Suas apps**, selecione o app web.
3. Em **Chaves de API** (ou no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) para o projeto do Firebase):
   - Crie uma restrição por **Referrer HTTP**.
   - Adicione apenas os seus domínios, por exemplo:
     - `https://seudominio.com/*`
     - `https://*.seudominio.com/*`
     - `http://localhost:*` (só desenvolvimento).

Assim a chave só funciona quando a requisição vem desses endereços.

---

## 3. Domínios autorizados (Auth)

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**.
2. Deixe apenas:
   - `localhost` (dev)
   - Seu domínio de produção (ex.: `arion-flashcards.web.app` ou o domínio próprio).

Evite adicionar domínios que você não controla.

---

## 4. O que NÃO é segredo

- **apiKey**, **projectId**, **appId** etc. no `firebaseConfig` podem ficar no código do front-end. O Firebase foi feito para isso; a segurança é pelas regras do Firestore e pelas restrições de domínio acima.

---

## 5. Checklist rápido

| Item | Onde | Status |
|------|------|--------|
| Regras do Firestore publicadas | Firestore → Regras | ⬜ |
| Domínios autorizados (Auth) | Authentication → Settings | ⬜ |
| Restrição da API key (referrer) | Google Cloud Console | ⬜ |
| Apenas provedores necessários (Google, Apple) | Authentication → Sign-in method | ⬜ |

Depois de publicar as regras e conferir domínios e API key, o uso do Firebase no app fica bem mais seguro.
