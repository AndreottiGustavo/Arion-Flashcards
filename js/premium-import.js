// ========== PREMIUM E IMPORTAÇÃO (atualizações, assinatura, importação .txt admin) ==========
let _ultimaExecucaoPremium = { uid: null, time: 0 };
let _premiumEmExecucao = false;

async function importarDeckAdministrador(conteudoTXT, nomeBaralho) {
    if (!usuarioLogado || usuarioLogado.uid !== meuUIDAdmin) {
        console.warn("Importação restrita ao administrador.");
        return;
    }
    const hashesExistentes = new Set();
    try {
        const snap = await window.db.collection("cards_estudo").where("uid", "==", meuUIDAdmin).where("deckNome", "==", nomeBaralho).get();
        snap.forEach(doc => {
            const d = doc.data();
            if (d.cardHash) hashesExistentes.add(d.cardHash);
            else if (d.f != null && d.v != null) hashesExistentes.add(computarCardHash(d.f, d.v));
        });
    } catch (e) { console.warn("Não foi possível verificar cards existentes:", e); }

    const linhas = conteudoTXT.split('\n').filter(l => l.trim() !== "");
    let contador = 0, ignorados = 0;
    const LIMITE_BATCH = 500;
    let batchAtual = window.db.batch();
    let opsNoBatch = 0;
    let colunaTags = 2;
    for (const l of linhas) {
        if (l.startsWith('#tags column:')) {
            const num = parseInt(l.replace(/#tags column:\s*/i, '').trim(), 10);
            if (num >= 1) colunaTags = num - 1;
            break;
        }
    }
    for (const linha of linhas) {
        if (linha.startsWith('#')) continue;
        const colunas = linha.split('\t');
        if (colunas.length < 2) continue;
        const frente = colunas[0].replace(/^"|"$/g, '').trim();
        const verso = colunas[1].replace(/^"|"$/g, '').trim();
        const tagsRaw = colunas[colunaTags] ? colunas[colunaTags].replace(/^"|"$/g, '').trim() : (colunas[2] ? colunas[2].replace(/^"|"$/g, '').trim() : "");
        let mod = "Geral", sub = "Diversos";
        (tagsRaw || "").split(/\s+/).forEach(t => {
            const token = t.trim();
            if (!token) return;
            const modMatch = token.match(/^mod:+(.*)$/i);
            const subMatch = token.match(/^sub:+(.*)$/i);
            if (modMatch) mod = modMatch[1].replace(/_/g, ' ').trim() || mod;
            if (subMatch) sub = subMatch[1].replace(/_/g, ' ').trim() || sub;
        });
        const cardHash = computarCardHash(frente, verso);
        if (hashesExistentes.has(cardHash)) { ignorados++; continue; }
        hashesExistentes.add(cardHash);
        const cardRef = window.db.collection("cards_estudo").doc();
        batchAtual.set(cardRef, {
            uid: meuUIDAdmin, deckNome: nomeBaralho, f: frente, v: verso, rev: Date.now(), int: 0, ease: 2.5,
            state: 'new', rep: 0, step: 0, premium: true, liberado: false, cardHash, modulo: mod, submodulo: sub
        });
        contador++;
        opsNoBatch++;
        if (opsNoBatch >= LIMITE_BATCH) { await batchAtual.commit(); batchAtual = window.db.batch(); opsNoBatch = 0; }
    }
    if (opsNoBatch > 0) await batchAtual.commit();
    if (contador > 0) {
        if (usuarioLogado && usuarioLogado.uid === meuUIDAdmin) {
            if (typeof sincronizarComNuvem === 'function') await sincronizarComNuvem();
            renderizar();
            if (typeof renderizarGerenciadorPremium === 'function') renderizarGerenciadorPremium();
        }
        const msgIgnorados = ignorados > 0 ? ` ${ignorados} já existiam e foram ignorados.` : "";
        alert(`Sucesso! ${contador} card(s) novo(s) adicionado(s) ao deck "${nomeBaralho}".${msgIgnorados}`);
    } else if (ignorados > 0) {
        alert(`Nenhum card novo. Todos os ${ignorados} card(s) do arquivo já existem no deck "${nomeBaralho}".`);
    } else {
        alert("Erro: Verifique se o arquivo .txt está no formato correto (Pergunta [TAB] Resposta [TAB] Tags).");
    }
}

function dispararImportacao() {
    const user = window.auth && window.auth.currentUser;
    if (!user || user.uid !== meuUIDAdmin) {
        alert("Apenas o administrador pode importar conteúdo para a nuvem.");
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async e => {
        const arquivos = Array.from(e.target.files);
        const txt = arquivos.find(f => f.name.endsWith('.txt'));
        if (txt) {
            const leitor = new FileReader();
            leitor.onload = async ev => { await importarDeckAdministrador(ev.target.result, txt.name.replace('.txt', '')); };
            leitor.readAsText(txt);
        }
    };
    input.click();
}

async function verificarAtualizacoesPremium() {
    const user = (window.auth && window.auth.currentUser) || usuarioLogado;
    if (!user || !window.db) return 0;
    if (_premiumEmExecucao) return 0;
    if (user.uid === _ultimaExecucaoPremium.uid && (Date.now() - _ultimaExecucaoPremium.time) < 6000) return 0;
    _premiumEmExecucao = true;
    try {
        const userRef = window.db.collection("usuarios").doc(user.uid);
        const userSnap = await userRef.get();
        const assinante = userSnap.exists && userSnap.data().assinante === true;
        if (!assinante) return 0;
        const [adminSnap, alunoSnap] = await Promise.all([
            window.db.collection("cards_estudo").where("uid", "==", meuUIDAdmin).where("premium", "==", true).get(),
            window.db.collection("cards_estudo").where("uid", "==", user.uid).get()
        ]);
        const hashesDoAluno = new Set();
        alunoSnap.forEach(doc => {
            const data = doc.data();
            if (data.cardHash) hashesDoAluno.add(data.cardHash);
            hashesDoAluno.add(computarCardHash(data.f, data.v));
        });
        const LIMITE_BATCH = 500;
        let batch = window.db.batch();
        let contagemBatch = 0, novos = 0;
        for (const doc of adminSnap.docs) {
            const d = doc.data();
            const cardHash = d.cardHash || computarCardHash(d.f, d.v);
            if (hashesDoAluno.has(cardHash)) continue;
            hashesDoAluno.add(cardHash);
            const cardRef = window.db.collection("cards_estudo").doc();
            const payload = {
                uid: user.uid, deckNome: d.deckNome, f: d.f, v: d.v, rev: Date.now(), int: 0, ease: 2.5,
                state: 'new', rep: 0, step: 0, premium: true, liberado: false, cardHash,
                modulo: d.modulo || 'Geral', submodulo: d.submodulo || 'Diversos'
            };
            if (d.imgFrente) payload.imgFrente = d.imgFrente;
            if (d.imgVerso) payload.imgVerso = d.imgVerso;
            batch.set(cardRef, payload);
            novos++;
            contagemBatch++;
            if (contagemBatch >= LIMITE_BATCH) { await batch.commit(); batch = window.db.batch(); contagemBatch = 0; }
        }
        if (contagemBatch > 0) await batch.commit();
        if (novos > 0) {
            setTimeout(() => {
                const notices = document.getElementById('deck-notices');
                if (notices) {
                    notices.innerHTML = '';
                    const balloon = document.createElement('div');
                    balloon.className = 'onboarding-balloon';
                    balloon.innerHTML = '<span class="balloon-close-x" aria-label="Fechar">✕</span><strong>🎁 Novos cards premium!</strong><br>' + novos + ' novo(s) card(s) foram adicionados. Libere-os na aba <strong>Premium</strong> para que apareçam no seu estudo. 😊';
                    const xBtn = balloon.querySelector('.balloon-close-x');
                    if (xBtn) xBtn.onclick = (e) => { e.stopPropagation(); balloon.remove(); };
                    notices.appendChild(balloon);
                }
            }, 300);
        }
        _ultimaExecucaoPremium = { uid: user.uid, time: Date.now() };
        await sincronizarComNuvem();
        if (typeof renderizar === 'function') renderizar();
        return novos;
    } catch (e) {
        console.error("Erro em verificarAtualizacoesPremium:", e);
        return 0;
    } finally {
        _premiumEmExecucao = false;
    }
}

async function processarAssinatura() {
    if (!usuarioLogado || !window.db) { alert('Faça login para assinar.'); return; }
    const userRef = window.db.collection("usuarios").doc(usuarioLogado.uid);
    const confirmar = confirm('Confirmar assinatura? (Simulação de In-App Purchase)\n\nEm produção, aqui seria chamado o plugin de IAP da App Store.');
    if (!confirmar) return;
    try {
        await userRef.set({ assinante: true }, { merge: true });
        localStorage.setItem('arion_assinante', 'true');
        await verificarAtualizacoesPremium();
        await sincronizarComNuvem();
        if (typeof renderizar === 'function') renderizar();
        alert('Assinatura ativada! Conteúdos premium liberados.');
    } catch (e) {
        console.error('Erro ao processar assinatura:', e);
        alert('Erro ao ativar assinatura. Tente novamente.');
    }
}

function simularAssinatura() { processarAssinatura(); }

async function atualizarConteudoPremium() {
    const user = (window.auth && window.auth.currentUser) || usuarioLogado;
    if (!user || !window.db) { alert('Faça login primeiro.'); return; }
    try {
        const userRef = window.db.collection("usuarios").doc(user.uid);
        const docAtual = await userRef.get();
        const dados = docAtual.exists ? docAtual.data() : {};
        const assinante = dados.assinante === true;
        localStorage.setItem('arion_assinante', assinante ? 'true' : 'false');
        if (!assinante) {
            alert('Esta conta não está marcada como assinante no Firestore. Verifique a coleção usuarios e o campo assinante.');
            return;
        }
        const novos = await verificarAtualizacoesPremium();
        alert('Busca concluída! ' + novos + ' novos cards adicionados. Seu progresso nos cards antigos foi preservado.');
    } catch (e) {
        console.error('Erro ao atualizar conteúdo premium:', e);
        alert('Erro ao atualizar. Tente novamente.');
    }
}
