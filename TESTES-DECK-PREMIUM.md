# Testes – Deck Premium (evitar bugs)

Use esta lista para conferir se o deck premium está funcionando antes de publicar ou após mudanças no código.

---

## 1. Conta e permissões

| # | Teste | Como fazer | Esperado |
|---|--------|------------|----------|
| 1.1 | Só admin importa | Login com conta **diferente** do admin → tentar importar .txt | Mensagem: "Apenas o administrador pode importar conteúdo para a nuvem." |
| 1.2 | Admin importa | Login com conta admin (`meuUIDAdmin`) → importar um .txt | Importação concluída e mensagem de sucesso com número de cards. |
| 1.3 | Não-assinante não vê premium | Login com usuário **sem** `assinante: true` no Firestore → ir em Meus Baralhos | Decks premium do admin **não** aparecem (ou não são copiados). |
| 1.4 | Assinante vê premium | Marcar usuário como assinante no Firestore (`usuarios/{uid}` → `assinante: true`) → login → sincronizar | Decks premium aparecem na lista; "Atualizar conteúdo premium" pode adicionar novos cards. |

---

## 2. Importação (admin)

| # | Teste | Como fazer | Esperado |
|---|--------|------------|----------|
| 2.1 | Formato .txt | Importar arquivo com linhas: `Pergunta[TAB]Resposta[TAB]Tags` | Cards criados com frente, verso e tags (mod:/sub:). |
| 2.2 | Cabeçalhos # | Importar .txt com linhas `#separator:tab`, `#html:true`, `#tags column:3` no início | Essas linhas não viram cards; só linhas com pelo menos 2 colunas (TAB) importam. |
| 2.3 | Deck já existe | Importar de novo o mesmo .txt (mesmo deck/nome) | Novos cards são adicionados ao mesmo deck; duplicatas (mesma frente+verso) podem ser ignoradas ou duplicadas conforme a lógica atual. |
| 2.4 | Campos com aspas | Linha com campos entre aspas e vírgulas no conteúdo | Valores importados corretamente (aspas não quebram colunas). |

---

## 3. Sincronização e cópia para o assinante

| # | Teste | Como fazer | Esperado |
|---|--------|------------|----------|
| 3.1 | Primeira vez assinante | Usuário recém marcado como assinante → login → "Atualizar conteúdo premium" ou abrir app | Cards do admin (premium) são copiados para `cards_estudo` com `uid` do usuário; decks premium aparecem. |
| 3.2 | Não duplicar mesmo card | Assinante já tem cópia do card → admin não mudou nada → "Atualizar conteúdo premium" de novo | Nenhum card duplicado (mesmo `cardHash` não é copiado de novo). |
| 3.3 | Novos cards do admin | Admin importa novos cards em um deck premium → assinante clica "Atualizar conteúdo premium" | Só os **novos** cards são copiados; progresso (state, rev, ease) dos cards antigos é preservado. |
| 3.4 | Sincronização após estudo | Assinante estuda alguns cards premium → fechar app ou trocar de tela → `sincronizarComNuvem()` (login já feito) | Progresso (state, rev, ease, liberado) continua ao reabrir; baralhos em `usuarios/{uid}.baralhos` refletem o estudo. |

---

## 4. Liberação de cards (aba Premium)

| # | Teste | Como fazer | Esperado |
|---|--------|------------|----------|
| 4.1 | Aba Premium | Assinante → aba "Premium" (ou equivalente) | Lista de decks premium; módulos/submódulos com checkbox para liberar. |
| 4.2 | Liberar submódulo | Marcar checkbox de um submódulo → salvar/sincronizar | Cards daquele submódulo passam a ter `liberado: true` e entram na fila de estudo. |
| 4.3 | Desmarcar submódulo | Desmarcar checkbox → salvar | Cards desse submódulo não entram mais em "Estudar agora" / fila (liberado false). |
| 4.4 | Persistência liberado | Liberar um grupo → fechar app → abrir de novo (com sync) | Liberação continua; contagens "Novo" e "A Revisar" batem com os liberados. |

---

## 5. Estudo (fila e progresso)

| # | Teste | Como fazer | Esperado |
|---|--------|------------|----------|
| 5.1 | Só liberados na fila | Deck premium com alguns cards liberados e outros não → "Estudar agora" | Só cards com `liberado === true` entram na fila. |
| 5.2 | Contagem Novo/Revisão | Deck premium → tela de detalhes do deck | "Novo" e "A Revisar" contam apenas cards liberados. |
| 5.3 | Estudar tudo | Vários decks (incluindo premium) com cards liberados → "Estudar tudo" | Fila inclui apenas cards liberados dos decks premium; baralhos pessoais sem filtro liberado. |
| 5.4 | Progresso não se perde | Estudar vários cards (fácil/médio/difícil) → salvar/sincronizar → reabrir | state, rev, ease, rep atualizados; próximas revisões no dia certo. |
| 5.5 | Deck só com não liberados | Deck premium com todos os cards `liberado: false` | Botão "Estudar agora" desabilitado ou mensagem tipo "nada para estudar"; não quebra a tela. |

---

## 6. Merge de progresso (nuvem + local)

| # | Teste | Como fazer | Esperado |
|---|--------|------------|----------|
| 6.1 | Mesclar progresso | Usuário tem progresso local em cards premium → sincronizar (login) | `mesclarProgressoPremium`: progresso do usuário (state, rev, ease, rep, step, int, liberado) prevalece; conteúdo (f, v) vem da nuvem. |
| 6.2 | Novo dispositivo | Mesmo usuário assinante em outro navegador/dispositivo → login | Após sync, baralhos e progresso (incluindo liberado) vêm de `usuarios.baralhos`; estudo continua de onde parou. |

---

## 7. Firestore e dados

| # | Teste | Como fazer | Esperado |
|---|--------|------------|----------|
| 7.1 | Cards do admin | Coleção `cards_estudo`: docs com `uid === meuUIDAdmin` e `premium === true` | São esses que são copiados para assinantes. |
| 7.2 | Cards do assinante | Após "Atualizar conteúdo premium": docs em `cards_estudo` com `uid` do assinante | Têm `premium: true`, `liberado: false` ao copiar; deckNome igual ao do admin. |
| 7.3 | Campo assinante | Documento `usuarios/{uid}` | Campo `assinante: true` para quem pode ver e receber decks premium. |

---

## 8. Erros e bordas

| # | Teste | Como fazer | Esperado |
|---|--------|------------|----------|
| 8.1 | Falha de rede na sync | Desligar rede após login → estudar → ligar rede e sincronizar | App não quebra; quando a rede voltar, sync atualiza. |
| 8.2 | verificarAtualizacoesPremium falha | Simular erro (ex.: regras do Firestore bloqueando leitura) | Erro tratado (try/catch), console com "Erro em verificarAtualizacoesPremium"; app continua usável. |
| 8.3 | Muitos cards (batch 500) | Admin importa 600+ cards em um deck premium | Importação e cópia para assinante usam batches de 500; não estoura limite do Firestore. |
| 8.4 | Deck sem módulo/submódulo | Cards com `modulo`/`submodulo` ausentes ou "Geral"/"Diversos" | Gerenciador premium não quebra; cards aparecem em algum grupo; liberação ainda funciona. |

---

## Resumo rápido (smoke test)

1. **Admin:** importar um .txt com 3–5 linhas (Pergunta TAB Resposta TAB Tags) e conferir se os cards aparecem no deck.
2. **Assinante:** usuário com `assinante: true` → abrir app → "Atualizar conteúdo premium" → ver deck premium na lista.
3. **Liberar:** aba Premium → liberar um submódulo → ir ao deck → "Estudar agora" e responder 1–2 cards.
4. **Persistência:** recarregar a página (ou fechar e abrir) → mesmo deck deve mostrar progresso e revisões corretos.

Se todos esses passarem, o fluxo básico do deck premium está estável. Use a tabela completa para testes mais profundos ou antes de releases.
