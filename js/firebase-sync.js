// =============== backup nuvem ===================
function computarCardHash(f, v) {
    return btoa(unescape(encodeURIComponent((f || '') + (v || '')))).substring(0, 16);
}

function hashDeCard(card) {
    return (card && card.cardHash) || computarCardHash(card && card.f, card && card.v);
}

function mesclarProgressoPremium(baralhosDaNuvem, baralhosDoUsuario) {
    if (!baralhosDoUsuario || baralhosDoUsuario.length === 0) return baralhosDaNuvem;
    const resultado = baralhosDaNuvem.map(deckNuvem => {
        const deckUsuario = baralhosDoUsuario.find(d => d.nome === deckNuvem.nome);
        if (!deckUsuario || !deckUsuario.cards || deckUsuario.cards.length === 0) return deckNuvem;
        const mapaPorHash = new Map();
        deckUsuario.cards.forEach(c => { mapaPorHash.set(hashDeCard(c), c); });
        const cardsMerged = deckNuvem.cards.map(card => {
            const h = hashDeCard(card);
            const doUsuario = mapaPorHash.get(h);
            const liberadoUsuario = doUsuario && doUsuario.liberado !== false;
            const cardComLiberado = doUsuario ? { ...card, liberado: liberadoUsuario } : card;
            if (!doUsuario) return card;
            const teveProgresso = doUsuario.state !== 'new' || (doUsuario.rep || 0) > 0 || (doUsuario.rev || 0) > 0;
            if (!teveProgresso) return cardComLiberado;
            return {
                ...cardComLiberado,
                state: doUsuario.state != null ? doUsuario.state : card.state,
                rev: doUsuario.rev != null ? doUsuario.rev : card.rev,
                ease: doUsuario.ease != null ? doUsuario.ease : card.ease,
                rep: doUsuario.rep != null ? doUsuario.rep : card.rep,
                step: doUsuario.step != null ? doUsuario.step : card.step,
                int: doUsuario.int != null ? doUsuario.int : card.int
            };
        });
        return { ...deckNuvem, cards: cardsMerged };
    });
    return resultado;
}

async function sincronizarComNuvem() {
    if (!usuarioLogado || !window.db || !window.db.collection) return;

    try {
        const uid = usuarioLogado.uid;
        const docRef = window.db.collection("usuarios").doc(uid);
        const docSnap = await docRef.get();

        const cardsSnapshot = await window.db.collection("cards_estudo").where("uid", "==", uid).get();
        const decksByNome = {};
        cardsSnapshot.forEach((doc) => {
            const d = doc.data();
            const nome = d.deckNome || "Sem nome";
            if (!decksByNome[nome]) {
                const isTutorialDeck = nome === TUTORIAL_DECK_NOME;
                decksByNome[nome] = {
                    nome,
                    premium: d.premium === true,
                    cards: [],
                    ...(isTutorialDeck && { isTutorial: true, corEspecial: '#007aff' })
                };
            }
            const card = {
                f: d.f, v: d.v, rev: d.rev, int: d.int, ease: d.ease, state: d.state || 'new',
                rep: d.rep || 0, step: d.step || 0, liberado: d.liberado !== false,
                modulo: d.modulo, submodulo: d.submodulo
            };
            if (d.cardHash) card.cardHash = d.cardHash;
            if (d.skipSRS) card.skipSRS = d.skipSRS;
            if (d.imgFrente) card.imgFrente = d.imgFrente;
            if (d.imgVerso) card.imgVerso = d.imgVerso;
            if (d.ordemTutorial != null) card.ordemTutorial = d.ordemTutorial;
            decksByNome[nome].cards.push(card);
        });

        let baralhosPremium = Object.values(decksByNome);
        const tutorialDeck = baralhosPremium.find(b => b.nome === TUTORIAL_DECK_NOME);
        if (tutorialDeck && tutorialDeck.cards.length) {
            tutorialDeck.cards.forEach(c => {
                if (c.ordemTutorial == null) {
                    const idx = TUTORIAL_CARDS_DATA.findIndex(t => (t.f || '').trim() === (c.f || '').trim());
                    c.ordemTutorial = idx >= 0 ? idx : 999;
                }
            });
            tutorialDeck.cards.sort((a, b) => (a.ordemTutorial ?? 999) - (b.ordemTutorial ?? 999));
            const vistos = new Set();
            tutorialDeck.cards = tutorialDeck.cards.filter(c => {
                const o = c.ordemTutorial ?? 999;
                if (o >= TUTORIAL_CARDS_DATA.length || vistos.has(o)) return false;
                vistos.add(o);
                return true;
            });
            baralhosPremium = [tutorialDeck, ...baralhosPremium.filter(b => b.nome !== TUTORIAL_DECK_NOME)];
        } else if (tutorialDeck) {
            baralhosPremium = [tutorialDeck, ...baralhosPremium.filter(b => b.nome !== TUTORIAL_DECK_NOME)];
        }

        if (docSnap.exists) {
            const dados = docSnap.data();
            const baralhosDoDoc = Array.isArray(dados.baralhos) ? dados.baralhos : [];
            const baralhosPessoais = baralhosDoDoc.filter(b => b.premium !== true);
            const baralhosPremiumDoDoc = baralhosDoDoc.filter(b => b.premium === true);
            baralhosPremium = mesclarProgressoPremium(baralhosPremium, baralhosPremiumDoDoc);
            const nomesPremium = new Set(baralhosPremium.map(b => b.nome));
            baralhos = [...baralhosPessoais.filter(b => !nomesPremium.has(b.nome)), ...baralhosPremium];
        } else {
            baralhos = baralhosPremium;
        }

        localStorage.setItem('arion_db_v4', JSON.stringify(baralhos));

        if (docSnap.exists) {
            const dados = docSnap.data();
            if (dados.meusVestibulares) {
                meusVestibulares = dados.meusVestibulares;
                localStorage.setItem('meusVestibulares', JSON.stringify(meusVestibulares));
            }
            if (dados.dadosStreak) {
                localStorage.setItem('arion_streak_data', JSON.stringify(dados.dadosStreak));
            }
            if (dados.heatmap && typeof dados.heatmap === 'object') {
                const merged = { ...getHeatmapData(), ...dados.heatmap };
                localStorage.setItem(HEATMAP_KEY, JSON.stringify(merged));
            }
            if (dados.metaDiaria != null) localStorage.setItem('arion_meta_diaria', String(dados.metaDiaria));
            if (dados.horarioLembrete) localStorage.setItem('arion_horario_lembrete', dados.horarioLembrete);
            if (dados.lembreteAtivo === true) localStorage.setItem('arion_lembrete_ativo', 'true');
            else if (dados.lembreteAtivo === false) localStorage.setItem('arion_lembrete_ativo', 'false');
            if (dados.fotoPerfilCustom) localStorage.setItem('arion_foto_perfil_custom', typeof dados.fotoPerfilCustom === 'object' ? JSON.stringify(dados.fotoPerfilCustom) : dados.fotoPerfilCustom);
        }

        renderizar();
        if (typeof renderizarVestibulares === 'function') renderizarVestibulares();
    } catch (e) {
        console.error("Erro na sincronização:", e);
    }
}

function removerUndefinedParaFirestore(val) {
    if (val === undefined) return null;
    if (val === null) return null;
    if (Array.isArray(val)) return val.map(removerUndefinedParaFirestore);
    if (typeof val === 'object' && val !== null) {
        const out = {};
        for (const k of Object.keys(val)) {
            if (val[k] === undefined) continue;
            out[k] = removerUndefinedParaFirestore(val[k]);
        }
        return out;
    }
    return val;
}

function salvar() {
    // 1. Salva no celular primeiro (sempre funciona)
    localStorage.setItem('arion_db_v4', JSON.stringify(baralhos));
    localStorage.setItem('meusVestibulares', JSON.stringify(meusVestibulares));
    const heatmapAtual = getHeatmapData();
    localStorage.setItem(HEATMAP_KEY, JSON.stringify(heatmapAtual));

    const streakAtual = JSON.parse(localStorage.getItem('arion_streak_data')) || { contagem: 0, ultimaData: null };
    renderizar();

    // Preferências de perfil para enviar à nuvem
    const metaDiaria = localStorage.getItem('arion_meta_diaria');
    const horarioLembrete = localStorage.getItem('arion_horario_lembrete');
    const lembreteAtivo = localStorage.getItem('arion_lembrete_ativo') === 'true';
    const fotoPerfilCustom = localStorage.getItem('arion_foto_perfil_custom');

    // 2. Se não estiver logado, para por aqui
    if (!usuarioLogado || !window.db) return;

    try {
        const docRef = window.db.collection("usuarios").doc(usuarioLogado.uid);
        const payload = removerUndefinedParaFirestore({
            baralhos: baralhos,
            ultimaAtualizacao: Date.now(),
            dadosStreak: streakAtual,
            meusVestibulares: meusVestibulares,
            heatmap: getHeatmapData(),
            metaDiaria: metaDiaria != null && metaDiaria !== '' ? parseInt(metaDiaria, 10) : null,
            horarioLembrete: horarioLembrete || null,
            lembreteAtivo: lembreteAtivo,
            fotoPerfilCustom: fotoPerfilCustom && (!fotoPerfilCustom.startsWith('data:') || fotoPerfilCustom.length < 100000) ? fotoPerfilCustom : null,
        });
        docRef.set(payload, { merge: true })
            .then(() => console.log("Nuvem atualizada com sucesso (Upload OK)"))
            .catch(e => console.error("Erro ao enviar para nuvem:", e));
    } catch (e) {
        console.error("Erro na função salvar:", e);
    }
}
