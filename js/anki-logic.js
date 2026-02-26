// ========== LÓGICA SRS/ANKI (revisão espaçada, fila de estudo, responder) ==========
const ANKI = {
    learningSteps: [1, 10],
    lapseSteps: [10],
    graduatingInterval: 1,
    easyInterval: 4,
    startingEase: 2.5,
    easyBonus: 1.3,
    hardInterval: 1.2,
    newInterval: 0.2,
    minEase: 1.3,
    maxInterval: 75
};

const ARION_ESTUDAR_TUDO_ORDEM_KEY = 'arion_estudar_tudo_ordem';

function abrirDetalhesEstudarTudo() {
    const h = Date.now();
    const assinante = typeof localStorage !== 'undefined' && localStorage.getItem('arion_assinante') === 'true';
    let novos = 0, revisao = 0;
    baralhos.forEach(b => {
        if (b.nome === TUTORIAL_DECK_NOME || b.arquivado) return;
        b.cards.forEach(c => {
            const pendente = c.state === 'new' || c.rev <= h;
            const liberado = !b.premium || (assinante && c.liberado === true);
            if (pendente && liberado) {
                if (c.state === 'new') novos++; else revisao++;
            }
        });
    });
    const total = novos + revisao;
    mudarTela('details-screen');
    const _t = typeof t === 'function' ? t : function(k) { return k; };
    document.getElementById('details-deck-name').innerText = _t('estudar_tudo');
    const area = document.getElementById('stats-area');
    const actions = document.getElementById('details-actions');
    const isDisabled = total === 0;
    const ordemAtual = (typeof localStorage !== 'undefined' && localStorage.getItem(ARION_ESTUDAR_TUDO_ORDEM_KEY)) || 'mixed';
    const heatmapHtml = typeof gerarHeatmapHtml === 'function' ? gerarHeatmapHtml(true) : '';
    area.innerHTML = `
        <div class="anki-stats-card" style="box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: none;">
            <div style="text-align:left">
                <div class="stat-row">${_t('study_label_novo')}: <span style="color:#2185d0; font-weight:bold">${novos}</span></div>
                <div class="stat-row">${_t('study_label_revisar')}: <span style="color:#2e7d32; font-weight:bold">${revisao}</span></div>
            </div>
            <div class="details-btn-ordem-col">
                <button class="btn-anki" style="background:${isDisabled ? '#e0e0e0' : '#2185d0'}; color:${isDisabled ? '#999' : 'white'}; padding:12px 20px; width:auto; height:auto; cursor:${isDisabled ? 'not-allowed' : 'pointer'}; opacity:${isDisabled ? '0.7' : '1'}; border-radius:10px; border:none; font-weight:bold;" onclick="${isDisabled ? '' : 'estudarTudo()'}" ${isDisabled ? 'disabled' : ''}>${_t('study_agora')}</button>
                <div class="details-ordem-wrap">
                    <select id="estudar-tudo-ordem" class="details-ordem-select" title="${_t('config_ordem_cards')}">
                        <option value="" disabled${ordemAtual === 'mixed' ? ' selected' : ''}>Ordem dos Cards</option>
                        <option value="new_first"${ordemAtual === 'new_first' ? ' selected' : ''}>${_t('config_ordem_novos_primeiro')}</option>
                        <option value="review_first"${ordemAtual === 'review_first' ? ' selected' : ''}>${_t('config_ordem_revisao_primeiro')}</option>
                        <option value="mixed">${_t('config_ordem_misturado')}</option>
                    </select>
                </div>
            </div>
        </div>`;
    const selectEl = document.getElementById('estudar-tudo-ordem');
    if (selectEl) {
        selectEl.onchange = function() {
            if (typeof localStorage !== 'undefined') localStorage.setItem(ARION_ESTUDAR_TUDO_ORDEM_KEY, selectEl.value || 'mixed');
        };
    }
    const heatmapCard = heatmapHtml ? `<div class="stats-card details-heatmap-card"><h3>${_t('heatmap_calendario')}</h3>${heatmapHtml}</div>` : '';
    actions.innerHTML = heatmapCard;
    if (heatmapHtml && typeof initHeatmapTooltip === 'function') initHeatmapTooltip(actions);
}

function abrirDetalhes(i, finalizou = false) {
    dIdx = i;
    const b = baralhos[i];
    const h = Date.now();
    const assinante = typeof localStorage !== 'undefined' && localStorage.getItem('arion_assinante') === 'true';
    fila = b.cards.filter(c => (c.state === 'new' || c.rev <= h) && (!b.premium || (assinante && c.liberado === true)));
    const novos = b.cards.filter(c => c.state === 'new' && (!b.premium || (assinante && c.liberado))).length;
    const revisao = b.cards.filter(c => c.state !== 'new' && c.rev <= h && (!b.premium || (assinante && c.liberado))).length;

    mudarTela('details-screen');
    document.getElementById('details-deck-name').innerText = b.nome;
    const area = document.getElementById('stats-area');
    const actions = document.getElementById('details-actions');

    const _t = typeof t === 'function' ? t : function(k) { return k; };
    if (finalizou && fila.length === 0) {
        area.innerHTML = `<div class="congratulations-rect">${_t('parabens_finalizou')}</div>`;
        actions.innerHTML = `<button class="btn-gold" onclick="mudarTela('deck-screen')">${_t('voltar_baralhos')}</button>`;
    } else {
        const isDisabled = fila.length === 0;
        const ordemAtual = (b.ordemEstudo || 'mixed');
        const ordemSelectHtml = b.premium ? `
            <div class="details-ordem-wrap">
                <select id="details-deck-ordem" class="details-ordem-select" title="${_t('config_ordem_cards')}">
                    <option value="" disabled${ordemAtual === 'mixed' ? ' selected' : ''}>Ordem dos Cards</option>
                    <option value="new_first"${ordemAtual === 'new_first' ? ' selected' : ''}>${_t('config_ordem_novos_primeiro')}</option>
                    <option value="review_first"${ordemAtual === 'review_first' ? ' selected' : ''}>${_t('config_ordem_revisao_primeiro')}</option>
                    <option value="mixed">${_t('config_ordem_misturado')}</option>
                </select>
            </div>` : '';
        const heatmapHtml = typeof gerarHeatmapHtml === 'function' ? gerarHeatmapHtml(true) : '';
        area.innerHTML = `
            <div class="anki-stats-card" style="box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: none;">
                <div style="text-align:left">
                    <div class="stat-row">${_t('study_label_novo')}: <span style="color:#2185d0; font-weight:bold">${novos}</span></div>
                    <div class="stat-row">${_t('study_label_revisar')}: <span style="color:#2e7d32; font-weight:bold">${revisao}</span></div>
                </div>
                <div class="details-btn-ordem-col">
                    <button class="btn-anki" style="background:${isDisabled ? '#e0e0e0' : '#2185d0'}; color:${isDisabled ? '#999' : 'white'}; padding:12px 20px; width:auto; height:auto; cursor:${isDisabled ? 'not-allowed' : 'pointer'}; opacity:${isDisabled ? '0.7' : '1'}; border-radius:10px; border:none; font-weight:bold;" onclick="${isDisabled ? '' : 'iniciarEstudo(' + dIdx + ')'}" ${isDisabled ? 'disabled' : ''}>${_t('study_agora')}</button>
                    ${ordemSelectHtml}
                </div>
            </div>`;
        const selectDeck = document.getElementById('details-deck-ordem');
        if (selectDeck && b.premium) {
            selectDeck.onchange = function() {
                var ordem = selectDeck.value || 'mixed';
                if (baralhos[dIdx]) {
                    baralhos[dIdx].ordemEstudo = (ordem === 'new_first' || ordem === 'review_first') ? ordem : 'mixed';
                    salvar();
                }
            };
        }
        const heatmapCard = heatmapHtml ? `<div class="stats-card details-heatmap-card"><h3>${_t('heatmap_calendario')}</h3>${heatmapHtml}</div>` : '';
        actions.innerHTML = (b.premium ? '' : `<button class="btn-gold" onclick="abrirCriador(${i})">${_t('btn_adicionar_cards')}</button>`) + heatmapCard;
        if (heatmapHtml && typeof initHeatmapTooltip === 'function') initHeatmapTooltip(actions);
    }
}

function sairEstudo() {
    if (veioDeEstudarTudo) {
        veioDeEstudarTudo = false;
        mudarTela('deck-screen');
        if (typeof atualizarNav === 'function') atualizarNav('nav-decks');
    } else {
        abrirDetalhes(dIdx);
    }
}

function estudarTudo() {
    let filaGeral = [];
    const agora = Date.now();
    const assinante = typeof localStorage !== 'undefined' && localStorage.getItem('arion_assinante') === 'true';
    baralhos.forEach((b, deckIdx) => {
        if (b.nome === TUTORIAL_DECK_NOME || b.arquivado) return;
        b.cards.forEach((c, cardIdx) => {
            const isPendente = c.state === 'new' || c.rev <= agora;
            const isLiberado = b.premium ? (assinante && c.liberado) : true;
            if (isPendente && isLiberado) filaGeral.push({ ...c, _deckNome: b.nome, _deckIdx: deckIdx, _cardIdx: cardIdx });
        });
    });
    if (filaGeral.length === 0) {
        alert("Nada para estudar por hoje! Volte amanhã.");
        return;
    }
    veioDeEstudarTudo = true;
    fila = filaGeral;
    var ordemTudo = (typeof localStorage !== 'undefined' && localStorage.getItem(ARION_ESTUDAR_TUDO_ORDEM_KEY)) || 'mixed';
    aplicarOrdemFila({ ordemEstudo: ordemTudo });
    if (document.getElementById('study-container')) document.getElementById('study-container').style.display = 'block';
    if (document.getElementById('finish-area')) document.getElementById('finish-area').style.display = 'none';
    mudarTela('study-screen');
    carregarCard();
}

function iniciarEstudo(i) {
    veioDeEstudarTudo = false;
    if (i !== undefined) dIdx = i;
    const elTitle = document.getElementById('study-title');
    if (elTitle && baralhos[dIdx]) elTitle.textContent = baralhos[dIdx].nome;
    if (document.getElementById('study-container')) document.getElementById('study-container').style.display = 'block';
    if (document.getElementById('finish-area')) document.getElementById('finish-area').style.display = 'none';
    const b = baralhos[dIdx];
    const agora = Date.now();
    const assinante = typeof localStorage !== 'undefined' && localStorage.getItem('arion_assinante') === 'true';
    fila = b.cards.filter(c => (c.state === 'new' || c.rev <= agora) && (!b.premium || (assinante && c.liberado)));
    if (fila.length === 0) {
        mostrarParabens();
        return;
    }
    aplicarOrdemFila(b);
    mudarTela('study-screen');
    carregarCard();
}

function aplicarOrdemFila(deck) {
    var ordem = (deck && deck.ordemEstudo) || 'mixed';
    if (ordem === 'new_first') {
        fila.sort(function (a, b) {
            var aNew = a.state === 'new' ? 0 : 1;
            var bNew = b.state === 'new' ? 0 : 1;
            return aNew - bNew;
        });
    } else if (ordem === 'review_first') {
        fila.sort(function (a, b) {
            var aNew = a.state === 'new' ? 1 : 0;
            var bNew = b.state === 'new' ? 1 : 0;
            return aNew - bNew;
        });
    } else {
        for (var j = fila.length - 1; j > 0; j--) {
            var r = Math.floor(Math.random() * (j + 1));
            var tmp = fila[j];
            fila[j] = fila[r];
            fila[r] = tmp;
        }
    }
}

function atualizarContadoresEstudo() {
    const elNovo = document.getElementById('study-count-novo');
    const elRevisar = document.getElementById('study-count-revisar');
    if (!elNovo || !elRevisar) return;
    const novos = fila.filter(c => c.state === 'new').length;
    const revisar = fila.filter(c => c.state !== 'new').length;
    elNovo.textContent = novos;
    elRevisar.textContent = revisar;
    elNovo.classList.remove('current');
    elRevisar.classList.remove('current');
    if (fila.length > 0) {
        const atual = fila[0];
        if (atual.state === 'new') elNovo.classList.add('current');
        else elRevisar.classList.add('current');
    }
}

function carregarCard() {
    const c = fila[0];
    atualizarContadoresEstudo();
    const elTitle = document.getElementById('study-title');
    if (elTitle) elTitle.textContent = (c && c._deckNome) ? c._deckNome : (baralhos[dIdx] ? baralhos[dIdx].nome : 'Estudo');
    respondido = false;
    cardVirado = false;
    document.getElementById('btn-show-answer').style.display = 'block';
    const cardBox = document.querySelector('.card-box');
    cardBox.style.transform = 'translate(0,0) rotate(0)';
    cardBox.style.transition = 'none';
    cardBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
    cardBox.style.border = 'none';
    document.getElementById('display-front').innerHTML = c.f || '';
    const dispFront = document.getElementById('display-front');
    if (c.imgFrente) {
        const img = document.createElement('img');
        img.src = c.imgFrente;
        img.alt = '';
        img.style.cssText = 'max-width:100%; border-radius:8px; margin-top:8px; display:block;';
        dispFront.appendChild(img);
    }
    document.getElementById('display-back').style.display = 'none';
    document.getElementById('card-divider').style.display = 'none';
    document.getElementById('anki-btns').style.display = 'none';
}

function virarCard() {
    if (respondido) return;
    cardVirado = true;
    const c = fila[0];
    document.getElementById('btn-show-answer').style.display = 'none';
    document.getElementById('display-back').innerHTML = c.v || '';
    const dispBack = document.getElementById('display-back');
    if (c.imgVerso) {
        const imgV = document.createElement('img');
        imgV.src = c.imgVerso;
        imgV.alt = '';
        imgV.style.cssText = 'max-width:100%; border-radius:8px; margin-top:8px; display:block;';
        dispBack.appendChild(imgV);
    }
    document.getElementById('display-back').style.display = 'block';
    document.getElementById('card-divider').style.display = 'block';
    document.getElementById('anki-btns').style.display = 'flex';
    const deck = c._deckNome ? baralhos.find(b => b.nome === c._deckNome) : baralhos[dIdx];
    const editWrap = document.getElementById('study-edit-btn-wrap');
    if (editWrap) editWrap.style.display = (deck && deck.premium) ? 'none' : 'flex';

    const int = c.int || 0;
    const ease = c.ease || ANKI.startingEase;
    const steps = ANKI.learningSteps;

    if (c.state === 'new') {
        document.getElementById('t0').innerText = "<1m";
        document.getElementById('t1').innerText = (steps.length >= 2 ? Math.round((steps[0] + steps[1]) / 2) : Math.min(1440, Math.round(steps[0] * 1.5))) + "m";
        document.getElementById('t2').innerText = (steps.length >= 2 ? steps[1] + "m" : ANKI.graduatingInterval + "d");
        document.getElementById('t3').innerText = ANKI.easyInterval + "d";
    } else if (c.state === 'learning') {
        const stepsDisplay = (c.prevInt != null) ? ANKI.lapseSteps : steps;
        const step = Math.min(c.step || 0, stepsDisplay.length - 1);
        const againMin = stepsDisplay[0];
        document.getElementById('t0').innerText = "<" + againMin + "m";
        const hardMin = (step === 0 && stepsDisplay.length >= 2) ? Math.round((stepsDisplay[0] + stepsDisplay[1]) / 2) : stepsDisplay[step];
        document.getElementById('t1').innerText = hardMin + "m";
        const isLastStep = step >= stepsDisplay.length - 1;
        document.getElementById('t2').innerText = isLastStep ? (c.prevInt != null ? (Math.max(1, Math.round(c.prevInt * ANKI.newInterval)) + "d") : (ANKI.graduatingInterval + "d")) : (stepsDisplay[step + 1] + "m");
        document.getElementById('t3').innerText = ANKI.easyInterval + "d";
    } else {
        document.getElementById('t0').innerText = "<" + ANKI.lapseSteps[0] + "m";
        document.getElementById('t1').innerText = Math.max(1, Math.round(int * ANKI.hardInterval)) + "d";
        document.getElementById('t2').innerText = Math.max(1, Math.round(int * ease)) + "d";
        document.getElementById('t3').innerText = Math.max(1, Math.round(int * ease * ANKI.easyBonus)) + "d";
    }
}

function responder(q) {
    if (respondido || fila.length === 0) return;
    let c = fila[0];
    if (!c) return;

    if (c.skipSRS) {
        respondido = true;
        fila.shift();
        setTimeout(() => {
            if (fila.length > 0) {
                carregarCard();
                respondido = false;
            } else {
                mostrarParabens();
            }
        }, 150);
        return;
    }

    incrementarHeatmapHoje();
    respondido = true;
    fila.shift();

    const agora = Date.now();
    const dia = 86400000;
    const ls = ANKI.learningSteps;
    const lapses = ANKI.lapseSteps;
    const marcarMinutos = (min) => agora + (min * 60000);
    const marcarDias = (dias) => agora + (dias * dia);

    if (!c.ease) c.ease = ANKI.startingEase;
    if (!c.int) c.int = 0;
    if (!c.step) c.step = 0;
    if (!c.state) c.state = 'new';

    function sincronizarCardParaBaralho(card) {
        if (card._deckIdx == null || card._cardIdx == null) return;
        const orig = baralhos[card._deckIdx].cards[card._cardIdx];
        if (!orig) return;
        orig.rep = card.rep;
        orig.state = card.state;
        orig.rev = card.rev;
        orig.int = card.int;
        orig.ease = card.ease;
        orig.step = card.step;
        if (card.hasOwnProperty('prevInt')) orig.prevInt = card.prevInt;
    }

    function reenfileirar(c) {
        sincronizarCardParaBaralho(c);
        fila.push(c);
        salvar();
        carregarCard();
    }

    function finalizar() {
        c.rep++;
        sincronizarCardParaBaralho(c);
        salvar();
        if (fila.length > 0) carregarCard();
        else mostrarParabens();
    }

    function processarNewOuLearning(c, q) {
        const steps = (c.prevInt != null) ? lapses : ls;
        if (q === 0) {
            c.state = 'learning';
            c.step = 0;
            c.rev = marcarMinutos(steps[0]);
            return reenfileirar(c);
        }
        if (q === 1) {
            c.state = 'learning';
            let minHard = steps[c.step];
            if (c.step === 0 && steps.length >= 2) minHard = Math.round((steps[0] + steps[1]) / 2);
            else if (steps.length === 1) minHard = Math.min(1440, Math.round(steps[0] * 1.5));
            c.rev = marcarMinutos(minHard);
            return reenfileirar(c);
        }
        if (q === 2) {
            c.step++;
            if (c.step < steps.length) {
                c.state = 'learning';
                c.rev = marcarMinutos(steps[c.step]);
                return reenfileirar(c);
            }
            c.state = 'review';
            if (c.prevInt != null) {
                c.int = Math.max(1, Math.round(c.prevInt * ANKI.newInterval));
                delete c.prevInt;
            } else c.int = ANKI.graduatingInterval;
            c.rev = marcarDias(c.int);
            return finalizar();
        }
        if (q === 3) {
            c.state = 'review';
            c.int = ANKI.easyInterval;
            if (c.prevInt != null) delete c.prevInt;
            c.rev = marcarDias(c.int);
            return finalizar();
        }
    }

    function processarReview(c, q) {
        if (q === 0) {
            c.ease = Math.max(ANKI.minEase, c.ease - 0.2);
            c.prevInt = c.int;
            c.state = 'learning';
            c.step = 0;
            c.rev = marcarMinutos(lapses[0]);
            return reenfileirar(c);
        }
        if (q === 1) {
            c.ease = Math.max(ANKI.minEase, c.ease - 0.15);
            c.int = Math.max(c.int + 1, Math.round(c.int * ANKI.hardInterval));
        } else if (q === 2) {
            c.int = Math.max(c.int + 1, Math.round(c.int * c.ease));
        } else if (q === 3) {
            c.ease += 0.15;
            c.int = Math.max(c.int + 1, Math.round(c.int * c.ease * ANKI.easyBonus));
        }
        c.int = Math.min(c.int, ANKI.maxInterval);
        c.rev = marcarDias(c.int);
        return finalizar();
    }

    if (c.state === 'new' || c.state === 'learning') return processarNewOuLearning(c, q);
    return processarReview(c, q);
}

function mostrarParabens() {
    const elNovo = document.getElementById('study-count-novo');
    const elRevisar = document.getElementById('study-count-revisar');
    if (elNovo) { elNovo.textContent = '0'; elNovo.classList.remove('current'); }
    if (elRevisar) { elRevisar.textContent = '0'; elRevisar.classList.remove('current'); }
    const studyContainer = document.getElementById('study-container');
    if (studyContainer) studyContainer.style.display = 'none';
    const finishArea = document.getElementById('finish-area');
    if (finishArea) {
        finishArea.style.display = 'flex';
        atualizarStreak();
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 180,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 999,
                colors: ['#f4e9c1', '#FFD700', '#5bc0de', '#ff7eb9', 'ff0000', '#ffffff', '#22c55e']
            });
        }
    }
}
