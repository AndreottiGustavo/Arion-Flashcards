// ========== TUTORIAL (deck e cards iniciais) ==========
// Dados dos cards do tutorial (isTutorial/corEspecial aplicados no deck na sincronização)
const TUTORIAL_CARDS_DATA = [
    { f: `Como funciona um <b>flashcard</b>?`, v: `Você lê a pergunta, tenta lembrar a resposta, vira a carta e escolhe se foi <i>fácil</i>, <i>médio </i> ou <i>difícil</i>.`, rev: 0, int: 0, ease: 2.5, liberado: true, state: 'new', step: 0, skipSRS: true },
    { f: `Para que serve cada botão de resposta?`, v: `<div>Para dizer ao Árion <strong>como foi o seu esforço para lembrar</strong> — e assim ele escolhe quando te mostrar esse card de novo.</div><ul><li><span style="color: rgb(217, 83, 79);"><strong>De novo</strong></span> → Você errou. O card volta imediatamente.</li><li><span style="color: rgb(240, 173, 78);"><strong>Difícil</strong></span> → Você acertou, mas com esforço. O card volta em pouco tempo.</li><li><span style="color: rgb(92, 184, 92);"><strong>Bom</strong> </span>→ Você lembrou sem travar. Ele volta mais tarde.</li><li><span style="color: rgb(91, 192, 222);"><strong>Fácil</strong> </span>→ Foi óbvio. Ele só vai reaparecer depois de bastante tempo.</li></ul>`, rev: 0, int: 0, ease: 2.5, state: 'new', liberado: true, step: 0, skipSRS: true },
    { f: `👉 <strong>Sabia que também dá pra responder com Swipe?</strong>`, v: `<div>No Árion, você pode responder ao <strong>arrastar o card para o lado.</strong></div><div>⬅️ <strong>Esquerda?</strong> Marcar como "De novo"<li>➡️ <strong>Direita?</strong> Marcar como "Bom".</li></div>`, rev: 0, int: 0, ease: 2.5, state: 'new', step: 0, liberado: true, skipSRS: true },
    { f: `💡 <strong>O que é um bom flashcard?</strong>`, v: `Aquele que tem <strong>resposta curta</strong>, <strong>direta</strong> e <strong>sem muita explicação</strong>. Ele testa <strong>uma informação por vez</strong>. ✔ Fácil de revisar e lembrar. Mais efetivo para aprender.`, rev: 0, int: 0, ease: 2.5, state: 'new', step: 0, liberado: true, skipSRS: true },
    { f: `🧬 <strong>Exemplo de um bom flashcard:</strong><br><em>Qual organela é responsável pela síntese de proteínas?</em>`, v: `<div><strong>Ribossomo.</strong></div><sub>✔ Resposta curta e direta. Fácil de revisar</sub>`, rev: 0, int: 0, ease: 2.5, state: 'new', step: 0, liberado: true, skipSRS: true },
    { f: `⚠️ <strong>Exemplo de um flashcard ruim:</strong><br><em>Quais são todas as organelas envolvidas no processo de síntese, dobra, modificação e transporte de proteínas?</em>`, v: `<strong>(Resposta enorme e confusa):</strong><br>"Os ribossomos sintetizam proteínas, mas o retículo endoplasmático rugoso faz a dobra inicial..." ❌ Resposta longa com muitos conceitos misturados.`, rev: 0, int: 0, ease: 2.5, state: 'new', step: 0, liberado: true, skipSRS: true },
    { f: `Por que devo responder com sinceridade?`, v: `Porque a revisão funciona melhor quando você diz a <b>verdade </b>sobre sua dificuldade. Quanto <b>mais sincero</b>, mais o <b>Árion acerta</b> o seu tempo de estudo.`, rev: 0, int: 0, ease: 2.5, state: 'new', step: 0, liberado: true, skipSRS: true },
    { f: `Por que a <b>revisão espaçada</b> do Árion é tão poderosa?`, v: `O Árion identifica quando você está quase esquecendo e traz o card de volta nesse momento exato. Ciência + prática usada para passar em medicina na UFSC.<b>Mas atenção:</b> para funcionar, você deve revisar <b>todos os dias!</b>`, rev: 0, int: 0, ease: 2.5, state: 'new', step: 0, liberado: true, skipSRS: true },
    { f: `🚀 <strong>O seu único trabalho?</strong>`, v: `<div><strong>Responder com sinceridade e Constância.</strong></div><div>Esqueça a parte chata de programar revisões manualmente. O Árion cuida de <strong>todo o cronograma</strong> para você focar apenas no que importa: aprender.</div>`, rev: 0, int: 0, ease: 2.5, state: 'new', step: 0, liberado: true, skipSRS: true },
    { f: `🎯 <strong>Pronto para começar?</strong>`, v: `O tutorial acabou! Já pode apagar este deck e começar a criar seus próprios cards ou explore nossos <b>Decks Premium</b>. Lembre-se: Sinceridade na resposta e constância diária. <br><br><b>Bons estudos!</b>`, rev: 0, int: 0, ease: 2.5, state: 'new', step: 0, liberado: true, skipSRS: true }
];

let _ultimaExecucaoTutorial = { uid: null, time: 0 };
let _tutorialInjecting = false;

async function verificarTutorial() {
    if (!usuarioLogado || !window.db) return;
    const uid = usuarioLogado.uid;
    const userRef = window.db.collection("usuarios").doc(uid);
    const userDoc = await userRef.get();
    const tutorialConcluido = userDoc.exists && userDoc.data().tutorialConcluido === true;
    localStorage.setItem('arion_tutorial_concluido', tutorialConcluido ? 'true' : 'false');

    if (tutorialConcluido) return;

    if (_tutorialInjecting) return;
    if (uid === _ultimaExecucaoTutorial.uid && (Date.now() - _ultimaExecucaoTutorial.time) < 6000) return;

    const tutorialExistente = await window.db.collection("cards_estudo").where("uid", "==", uid).where("deckNome", "==", TUTORIAL_DECK_NOME).get();
    if (tutorialExistente.size >= TUTORIAL_CARDS_DATA.length) {
        await userRef.set({ tutorialConcluido: true }, { merge: true });
        localStorage.setItem('arion_tutorial_concluido', 'true');
        return;
    }

    _tutorialInjecting = true;
    _ultimaExecucaoTutorial = { uid, time: Date.now() };

    try {
        const LIMITE_BATCH = 500;
        let batch = window.db.batch();
        let ops = 0;
        const now = Date.now();

        for (let i = 0; i < TUTORIAL_CARDS_DATA.length; i++) {
            const c = TUTORIAL_CARDS_DATA[i];
            const cardRef = window.db.collection("cards_estudo").doc();
            batch.set(cardRef, {
                uid: uid,
                deckNome: TUTORIAL_DECK_NOME,
                f: c.f,
                v: c.v,
                rev: c.rev !== undefined ? c.rev : now,
                int: c.int !== undefined ? c.int : 0,
                ease: c.ease !== undefined ? c.ease : 2.5,
                state: c.state || 'new',
                step: c.step !== undefined ? c.step : 0,
                rep: c.rep !== undefined ? c.rep : 0,
                liberado: c.liberado !== false,
                premium: false,
                skipSRS: c.skipSRS === true,
                ordemTutorial: i
            });
            ops++;
            if (ops >= LIMITE_BATCH) {
                await batch.commit();
                batch = window.db.batch();
                ops = 0;
            }
        }
        if (ops > 0) await batch.commit();

        await userRef.set({ tutorialConcluido: true }, { merge: true });
        localStorage.setItem('arion_tutorial_concluido', 'true');
        await sincronizarComNuvem();
        if (typeof renderizar === 'function') renderizar();
    } finally {
        _tutorialInjecting = false;
    }
}
