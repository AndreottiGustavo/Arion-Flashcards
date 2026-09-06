// ========== LÓGICA SRS - Repetição Espaçada (SM-2 / Anki-style, dinâmico) ==========
/** Núcleo do agendamento SRS: constantes e limites. Ease Factor é dinâmico por cartão. */
const SRS_CORE = {
    learningSteps: [1, 10],
    lapseSteps: [10],
    graduatingInterval: 1,
    easyInterval: 4,
    startingEase: 2.5,
    easyBonus: 1.3,
    hardInterval: 1.2,
    newInterval: 0.2,
    minEase: 1.3,
    maxInterval: 75,
    againEasePenalty: 0.20,
    easyEaseBonus: 0.15,
    fuzzPercent: 0.05
};

/** Aplica variação aleatória (±fuzzPercent) no intervalo em dias para distribuir carga de estudo. */
function applyIntervalFuzz(intervalDays) {
    const pct = SRS_CORE.fuzzPercent;
    const factor = 1 + (Math.random() * 2 - 1) * pct;
    return Math.max(1, Math.round(intervalDays * factor));
}

const ARION_ESTUDAR_TUDO_ORDEM_KEY = 'arion_estudar_tudo_ordem';
var totalCardsSessaoAtual = 0;
var _sessionCardStartTime = 0;
var _sessionTempoTotalMs = 0;
var _sessionCardsRespondidos = 0;

/** URLs de imagem relevantes ao estudo (oclusão ou frente/verso anexos). */
function coletarUrlsImagemCard(card) {
    if (!card) return [];
    var urls = [];
    if (typeof isOcclusionCard === 'function' && isOcclusionCard(card)) {
        var ou = typeof getOcclusionImageUrl === 'function' ? getOcclusionImageUrl(card) : null;
        if (ou) urls.push(ou);
    } else {
        if (card.imgFrente) urls.push(card.imgFrente);
        if (card.imageUrlFrente) urls.push(card.imageUrlFrente);
        if (card.imgVerso) urls.push(card.imgVerso);
        if (card.imageUrlVerso) urls.push(card.imageUrlVerso);
    }
    return urls;
}
/**
 * Pré-carrega imagens dos primeiros N cards da fila (ex.: ao abrir deck ou iniciar sessão).
 */
function preloadStudyImagesForQueue(queue, maxCards) {
    maxCards = maxCards != null ? maxCards : 5;
    if (!queue || !queue.length || typeof window === 'undefined' || typeof window.preloadArionImageUrl !== 'function') return;
    var lim = Math.min(queue.length, maxCards);
    for (var i = 0; i < lim; i++) {
        coletarUrlsImagemCard(queue[i]).forEach(function (u) { window.preloadArionImageUrl(u); });
    }
}
if (typeof window !== 'undefined') window.preloadStudyImagesForQueue = preloadStudyImagesForQueue;

/** Aplica limites diários (novos por dia e revisões máximas por dia). 0 = sem limite. */
function applyLimitesDiarios(cards) {
    if (!cards || cards.length === 0) return cards;
    var maxNew = parseInt(localStorage.getItem('arion_meta_diaria') || '0', 10) || 0;
    var maxRev = parseInt(localStorage.getItem('arion_max_revisoes_dia') || '0', 10) || 0;
    if (maxNew <= 0 && maxRev <= 0) return cards;
    var newCards = cards.filter(function (c) { return c.state === 'new'; });
    var revCards = cards.filter(function (c) { return c.state !== 'new'; });
    revCards.sort(function (a, b) { return (a.rev || 0) - (b.rev || 0); });
    if (maxNew > 0 && newCards.length > maxNew) newCards = newCards.slice(0, maxNew);
    if (maxRev > 0 && revCards.length > maxRev) revCards = revCards.slice(0, maxRev);
    return newCards.concat(revCards);
}

function getDeckDocKey(deckIdx) {
    var d = baralhos && typeof baralhos !== 'undefined' ? baralhos[deckIdx] : null;
    if (!d) return null;
    // Para decks locais ainda sem docId, usamos o fallback "i_{idx}".
    return d._baralhoDocId || ('i_' + deckIdx);
}

function getDeckIndicesWithSubmodules(parentDeckIdx) {
    var result = [];
    var visited = {};
    function dfs(idx) {
        if (idx == null || visited[idx]) return;
        visited[idx] = true;
        result.push(idx);
        var docKey = getDeckDocKey(idx);
        if (!docKey) return;
        // Inclui todos os filhos diretos e seus descendentes (recursivo).
        for (var j = 0; j < baralhos.length; j++) {
            if (!baralhos[j]) continue;
            if (baralhos[j].parentId === docKey) dfs(j);
        }
    }
    dfs(parentDeckIdx);
    return result;
}

function montarFilaComSubmodulos(deckIdx, agora, assinante) {
    var indices = getDeckIndicesWithSubmodules(deckIdx);
    var filaAgregada = [];
    var novos = 0;
    var revisao = 0;

    indices.forEach(function (di) {
        var deck = baralhos[di];
        if (!deck || !deck.cards) return;
        var cards = deck.cards || [];
        cards.forEach(function (c, cardIdx) {
            if (!c || c.suspended) return;
            var pendente = c.state === 'new' || c.rev <= agora;
            if (!pendente) return;
            var isEd = typeof isPremiumEditorialCard === 'function' && isPremiumEditorialCard(c);
            var isLiberado = !deck.premium || (assinante && (!isEd || c.liberado === true));
            if (!isLiberado) return;

            if (c.state === 'new') novos++;
            else if (c.state !== 'new' && c.rev <= agora) revisao++;

            // Faz cópia para que o sync no "responder()" funcione corretamente
            // (igual ao fluxo de "estudar tudo").
            filaAgregada.push(Object.assign({}, c, {
                _deckNome: deck.nome,
                _deckIdx: di,
                _cardIdx: cardIdx
            }));
        });
    });

    return { fila: filaAgregada, novos: novos, revisao: revisao };
}

/** Extrai resposta e dica opcional de uma tag Cloze {{cN::resposta}} ou {{cN::resposta::dica}}. */
function parseAnkiClozeTag(inner) {
    var parts = inner.split('::');
    var answer = parts[0] || '';
    var hint = parts.length > 1 ? parts.slice(1).join('::') : '';
    return { answer: answer, hint: hint };
}

/** Renderização Cloze: na frente substitui {{cN::texto}} ou {{cN::texto::dica}} por reticências ou dica. */
function renderClozeFront(html) {
    if (!html) return '';
    return html.replace(/\{\{c\d+::([\s\S]*?)\}\}/gi, function (match, inner) {
        var p = parseAnkiClozeTag(inner);
        var label = p.hint ? p.hint : '[…]';
        return '<span class="cloze-blank">' + label + '</span>';
    });
}

/** Renderização Cloze: no verso mostra só a resposta com destaque (.cloze-destaque). */
function renderClozeBack(html) {
    if (!html) return '';
    return String(html).replace(/\{\{c\d+::([^}]*)}}/gi, function (match, inner) {
        var p = parseAnkiClozeTag(inner);
        var text = (p.answer || '').trim();
        return '<span class="cloze-destaque">' + text + '</span>';
    });
}

function abrirDetalhesEstudarTudo() {
    const h = Date.now();
    const assinante = typeof localStorage !== 'undefined' && localStorage.getItem('arion_assinante') === 'true';
    let novos = 0, revisao = 0;
    baralhos.forEach(b => {
        if (b.nome === TUTORIAL_DECK_NOME || b.arquivado) return;
        b.cards.forEach(c => {
            const pendente = c.state === 'new' || c.rev <= h;
            const isEd = typeof isPremiumEditorialCard === 'function' && isPremiumEditorialCard(c);
            const liberado = !b.premium || (assinante && (!isEd || c.liberado === true));
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
    const ordemEstudarTudo = (typeof localStorage !== 'undefined' && localStorage.getItem(ARION_ESTUDAR_TUDO_ORDEM_KEY)) || '';
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
                        <option value="" disabled${!ordemEstudarTudo ? ' selected' : ''}>${_t('config_ordem_cards') || 'Ordem dos cards'}</option>
                        <option value="new_first"${ordemEstudarTudo === 'new_first' ? ' selected' : ''}>${_t('config_ordem_novos_primeiro')}</option>
                        <option value="review_first"${ordemEstudarTudo === 'review_first' ? ' selected' : ''}>${_t('config_ordem_revisao_primeiro')}</option>
                        <option value="mixed"${ordemEstudarTudo === 'mixed' ? ' selected' : ''}>${_t('config_ordem_misturado')}</option>
                    </select>
                </div>
            </div>
        </div>`;
    const selectEl = document.getElementById('estudar-tudo-ordem');
    if (selectEl) {
        selectEl.onchange = function() {
            var val = selectEl.value;
            if (typeof localStorage !== 'undefined') {
                if (val) localStorage.setItem(ARION_ESTUDAR_TUDO_ORDEM_KEY, val);
                else localStorage.removeItem(ARION_ESTUDAR_TUDO_ORDEM_KEY);
            }
            if (typeof salvar === 'function') salvar();
        };
    }
    const heatmapCard = heatmapHtml ? `<div class="stats-card details-heatmap-card"><h3>${_t('heatmap_calendario')}</h3>${heatmapHtml}</div>` : '';
    actions.innerHTML = heatmapCard;
    if (heatmapHtml && typeof initHeatmapTooltip === 'function') initHeatmapTooltip(actions);
}

async function abrirDetalhes(i, finalizou = false) {
    dIdx = i;
    const b = baralhos[i];
    if (!b) return;
    if (b.premium && window.db && usuarioLogado) {
        var userRef = window.db.collection("usuarios").doc(usuarioLogado.uid);
        var userDoc = await userRef.get();
        var dados = userDoc.exists ? userDoc.data() : {};
        var assinanteFirebase = typeof isPremiumUser === 'function' ? isPremiumUser(dados) : (dados.assinante === true);
        if (!assinanteFirebase) {
            if (typeof abrirModalCtaPremium === 'function') abrirModalCtaPremium();
            return;
        }
    } else if (b.premium) {
        if (typeof abrirModalCtaPremium === 'function') abrirModalCtaPremium();
        return;
    }
    const h = Date.now();
    const assinante = typeof localStorage !== 'undefined' && localStorage.getItem('arion_assinante') === 'true';
    const filaInfo = montarFilaComSubmodulos(i, h, assinante);
    fila = filaInfo.fila;
    const novos = filaInfo.novos;
    const revisao = filaInfo.revisao;
    preloadStudyImagesForQueue(filaInfo.fila, 5);

    mudarTela('details-screen');
    document.getElementById('details-deck-name').innerText = b.nome;
    const area = document.getElementById('stats-area');
    const actions = document.getElementById('details-actions');

    const _t = typeof t === 'function' ? t : function(k) { return k; };
    if (finalizou && fila.length === 0) {
        if (typeof window.Haptics !== 'undefined' && window.Haptics.success) window.Haptics.success();
        area.innerHTML = `<div class="congratulations-rect">${_t('parabens_finalizou')}</div>`;
        actions.innerHTML = `<button class="btn-gold" onclick="mudarTela('deck-screen')">${_t('voltar_baralhos')}</button>`;
    } else {
        const isDisabled = fila.length === 0;
        const ordemAtual = b.ordemEstudo || '';
        const ordemSelectHtml = `
            <div class="details-ordem-wrap">
                <select id="details-deck-ordem" class="details-ordem-select" title="${_t('config_ordem_cards')}">
                    <option value="" disabled${!ordemAtual ? ' selected' : ''}>${_t('config_ordem_cards') || 'Ordem dos cards'}</option>
                    <option value="new_first"${ordemAtual === 'new_first' ? ' selected' : ''}>${_t('config_ordem_novos_primeiro')}</option>
                    <option value="review_first"${ordemAtual === 'review_first' ? ' selected' : ''}>${_t('config_ordem_revisao_primeiro')}</option>
                    <option value="mixed"${ordemAtual === 'mixed' ? ' selected' : ''}>${_t('config_ordem_misturado')}</option>
                </select>
            </div>`;
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
        if (selectDeck) {
            selectDeck.onchange = function() {
                var ordem = selectDeck.value;
                if (baralhos[dIdx]) {
                    baralhos[dIdx].ordemEstudo = (ordem === 'new_first' || ordem === 'review_first' || ordem === 'mixed') ? ordem : undefined;
                    salvar();
                }
            };
        }
        const heatmapCard = heatmapHtml ? `<div class="stats-card details-heatmap-card"><h3>${_t('heatmap_calendario')}</h3>${heatmapHtml}</div>` : '';
        const premiumGerenciarBlock = b.premium ? `<div class="details-premium-gerenciar-wrap">
            <button type="button" class="details-gerenciar-premium-btn" onclick="if(typeof abrirPainel==='function') abrirPainel(); if(typeof alternarAbasPainel==='function') alternarAbasPainel('premium');">Liberar flashcards</button>
            <p class="details-premium-gerenciar-texto">Aqui você gerencia sua assinatura e libera os módulos manualmente, conforme o conteúdo que já viu em aula e sua necessidade.</p>
        </div>` : '';
        const fabCriarCards = b.premium ? '' : (
            `<button type="button" class="btn-gold fab-button" id="details-fab-criar-cards" aria-label="${_t('btn_adicionar_cards')}" onclick="abrirCriador(${dIdx})">` +
            `<span>${_t('btn_adicionar_cards')}</span>` +
            `</button>`
        );
        actions.innerHTML = fabCriarCards + heatmapCard + premiumGerenciarBlock;
        var fab = document.querySelector('#details-screen .fab-button');
        if (fab) fab.classList.remove('fab-hidden');
        if (heatmapHtml && typeof initHeatmapTooltip === 'function') initHeatmapTooltip(actions);
    }
}

function sairEstudo() {
    // Persistir progresso ao sair da tela (voltar/swipe), para não perder ao dar F5 ou fechar o app
    if (typeof flushEstudoAgora === 'function') flushEstudoAgora();
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
            const isEd = typeof isPremiumEditorialCard === 'function' && isPremiumEditorialCard(c);
            const isLiberado = !b.premium || (assinante && (!isEd || c.liberado === true));
            if (!c.suspended && isPendente && isLiberado) filaGeral.push({ ...c, _deckNome: b.nome, _deckIdx: deckIdx, _cardIdx: cardIdx });
        });
    });
    if (filaGeral.length === 0) {
        alert("Nada para estudar por hoje! Volte amanhã.");
        return;
    }
    filaGeral = applyLimitesDiarios(filaGeral);
    if (filaGeral.length === 0) {
        alert("Nada para estudar por hoje! Volte amanhã.");
        return;
    }
    _sessionTempoTotalMs = 0;
    _sessionCardsRespondidos = 0;
    veioDeEstudarTudo = true;
    fila = filaGeral;
    totalCardsSessaoAtual = fila.length;
    var ordemTudo = (typeof localStorage !== 'undefined' && localStorage.getItem(ARION_ESTUDAR_TUDO_ORDEM_KEY)) || 'mixed';
    aplicarOrdemFila({ ordemEstudo: ordemTudo });
    preloadStudyImagesForQueue(fila, 5);
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
    const filaInfo = montarFilaComSubmodulos(dIdx, agora, assinante);
    fila = applyLimitesDiarios(filaInfo.fila);
    totalCardsSessaoAtual = fila.length;
    _sessionTempoTotalMs = 0;
    _sessionCardsRespondidos = 0;
    if (fila.length === 0) {
        mostrarParabens();
        return;
    }
    aplicarOrdemFila(b);
    preloadStudyImagesForQueue(fila, 5);
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
    if (!c) return;
    _sessionCardStartTime = Date.now();
    atualizarContadoresEstudo();
    const elTitle = document.getElementById('study-title');
    if (elTitle) elTitle.textContent = (c._deckNome) ? c._deckNome : (baralhos[dIdx] ? baralhos[dIdx].nome : 'Estudo');
    respondido = false;
    cardVirado = false;
    document.getElementById('btn-show-answer').style.display = 'block';
    const cardBox = document.querySelector('.card-box');
    if (cardBox) {
        cardBox.style.transform = 'translate(0,0) rotate(0)';
        cardBox.style.transition = 'none';
        cardBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
        cardBox.style.border = 'none';
    }
    const dispFront = document.getElementById('display-front');
    if (dispFront) {
        if (typeof isOcclusionCard === 'function' && isOcclusionCard(c)) {
            var imgUrl = typeof getOcclusionImageUrl === 'function' ? getOcclusionImageUrl(c) : null;
            var masks = c.occlusionMasks || [];
            var idx = typeof getOcclusionMaskIndex === 'function' ? getOcclusionMaskIndex(c) : 0;
            var mode = typeof getOcclusionMode === 'function' ? getOcclusionMode(c) : 'hide_all_guess_one';
            dispFront.innerHTML = (typeof renderOcclusionStudyHtml === 'function' && imgUrl && masks.length) ? renderOcclusionStudyHtml(imgUrl, masks, idx, mode, false) : '';
            var wrap = document.getElementById('occlusion-study-block');
            var occlImg = wrap && wrap.querySelector('.occlusion-study-img');
            if (occlImg) {
                function hidePlaceholder() { if (wrap) wrap.classList.add('occlusion-loaded'); }
                if (occlImg.complete) hidePlaceholder(); else occlImg.onload = hidePlaceholder;
            }
            if (typeof prefetchOcclusionStudyImages === 'function') {
                prefetchOcclusionStudyImages(fila, 3);
            } else if (fila.length > 1 && typeof getOcclusionImageUrl === 'function') {
                var next = fila[1];
                if (typeof isOcclusionCard === 'function' && isOcclusionCard(next)) {
                    var nextUrl = getOcclusionImageUrl(next);
                    if (nextUrl) { var preload = new Image(); preload.src = nextUrl; }
                }
            }
        } else {
            dispFront.innerHTML = renderClozeFront(typeof sanitizeCardHtml === 'function' ? sanitizeCardHtml(c.f || '') : (c.f || ''));
            var frenteComImg = (c.f || '').indexOf('<img') !== -1;
            if ((c.imgFrente || c.imageUrlFrente) && !frenteComImg) {
                var imgUrlF = c.imgFrente || c.imageUrlFrente;
                var wrapF = document.createElement('div');
                wrapF.className = 'card-image-wrap';
                var placeF = document.createElement('div');
                placeF.className = 'card-image-placeholder';
                placeF.setAttribute('aria-hidden', 'true');
                var img = document.createElement('img');
                img.className = 'card-study-img';
                img.src = imgUrlF;
                img.alt = '';
                img.loading = 'eager';
                img.decoding = 'async';
                img.style.cssText = 'max-width:100%; border-radius:8px; margin-top:8px; display:block;';
                function hidePlaceholderF() { wrapF.classList.add('card-image-loaded'); }
                if (img.complete) hidePlaceholderF(); else img.onload = hidePlaceholderF;
                wrapF.appendChild(placeF);
                wrapF.appendChild(img);
                dispFront.appendChild(wrapF);
            }
        }
        preloadStudyImagesForQueue(fila.slice(1), 3);
    }
    const dispBack = document.getElementById('display-back');
    if (dispBack) {
        dispBack.innerHTML = '';
    }
    var revealWrap = document.getElementById('card-reveal-wrap');
    if (revealWrap) {
        revealWrap.classList.remove('card-reveal-flip', 'card-reveal-instant', 'card-reveal-original', 'card-reveal-occlusion', 'flipped');
        if (typeof isOcclusionCard === 'function' && isOcclusionCard(c)) {
            revealWrap.classList.add('card-reveal-occlusion');
        } else {
            var modo = (typeof localStorage !== 'undefined' && localStorage.getItem('arion_estilo_revelar_card')) || 'flip';
            if (modo === 'instant') revealWrap.classList.add('card-reveal-instant');
            else if (modo === 'original') revealWrap.classList.add('card-reveal-original');
            else revealWrap.classList.add('card-reveal-flip');
            var frontFace = revealWrap.querySelector('.card-reveal-front');
            var backFace = revealWrap.querySelector('.card-reveal-back');
            if (frontFace) frontFace.classList.remove('revealed');
            if (backFace) backFace.classList.remove('revealed');
            if (modo === 'flip') {
                var inner = revealWrap.querySelector('.card-reveal-inner');
                if (inner) inner.style.minHeight = '';
            }
        }
    }
    const cardDivider = document.getElementById('card-divider');
    if (cardDivider) cardDivider.style.display = 'none';
    const ankiBtns = document.getElementById('anki-btns');
    if (ankiBtns) ankiBtns.style.display = 'none';
    if (typeof resetarPillTutorIA === 'function') resetarPillTutorIA();
    var reportWrap = document.getElementById('study-report-error-wrap');
    if (!reportWrap) {
        reportWrap = document.createElement('div');
        reportWrap.id = 'study-report-error-wrap';
        reportWrap.style.cssText = 'text-align:center; margin-top:12px; margin-bottom:8px;';
        var link = document.createElement('a');
        link.href = '#';
        link.textContent = 'Reportar erro';
        link.style.cssText = 'color:#888; font-size:11px; text-decoration:none;';
        link.onclick = function (e) { e.preventDefault(); abrirModalReportarErro(); return false; };
        reportWrap.appendChild(link);
        var container = document.getElementById('study-container');
        if (container) container.appendChild(reportWrap);
    }
    reportWrap.style.display = 'block';
}

function isClozeContent(html) {
    return typeof html === 'string' && /\{\{c\d+::/i.test(html);
}

/** No modo flip, ajusta a altura do card ao maior entre frente e verso para o texto da resposta não ser cortado. */
function ajustarAlturaCardFlip() {
    var revealWrap = document.getElementById('card-reveal-wrap');
    if (!revealWrap || !revealWrap.classList.contains('card-reveal-flip')) return;
    var dispFront = document.getElementById('display-front');
    var dispBack = document.getElementById('display-back');
    var inner = revealWrap && revealWrap.querySelector('.card-reveal-inner');
    if (!inner || !dispFront || !dispBack) return;
    var frontH = dispFront.scrollHeight;
    var backH = dispBack.scrollHeight;
    var maxH = Math.max(frontH, backH, 60);
    inner.style.minHeight = maxH + 'px';
}

function virarCard() {
    if (respondido) return;
    const c = fila[0];
    if (!c) return;
    cardVirado = true;
    document.getElementById('btn-show-answer').style.display = 'none';
    var isOcclusion = typeof isOcclusionCard === 'function' && isOcclusionCard(c);
    if (isOcclusion && typeof revealOcclusionMask === 'function') revealOcclusionMask();
    if (!isOcclusion) {
        var safeF = typeof sanitizeCardHtml === 'function' ? sanitizeCardHtml(c.f || '') : (c.f || '');
        var safeV = typeof sanitizeCardHtml === 'function' ? sanitizeCardHtml(c.v || '') : (c.v || '');
        var partes = [];
        if (isClozeContent(safeF)) {
            partes.push(renderClozeBack(safeF));
        }
        var versoPreenchido = safeV && safeV.trim() !== '' && safeV !== '<br>';
        if (versoPreenchido) {
            partes.push(isClozeContent(safeV) ? renderClozeBack(safeV) : safeV);
        }
        if (partes.length === 0) {
            partes.push(safeV || '');
        }
        var respostaRenderizada = partes.join('<div style="margin-top:0.6rem;"></div>');
        const dispBack = document.getElementById('display-back');
        if (dispBack) {
            dispBack.innerHTML = respostaRenderizada;
            var versoComImg = (c.v || '').indexOf('<img') !== -1;
            if ((c.imgVerso || c.imageUrlVerso) && !versoComImg) {
                var imgUrlV = c.imgVerso || c.imageUrlVerso;
                var wrapV = document.createElement('div');
                wrapV.className = 'card-image-wrap';
                var placeV = document.createElement('div');
                placeV.className = 'card-image-placeholder';
                placeV.setAttribute('aria-hidden', 'true');
                var imgV = document.createElement('img');
                imgV.className = 'card-study-img';
                imgV.src = imgUrlV;
                imgV.alt = '';
                imgV.loading = 'eager';
                imgV.decoding = 'async';
                imgV.style.cssText = 'max-width:100%; border-radius:8px; margin-top:8px; display:block;';
                function hidePlaceholderV() { wrapV.classList.add('card-image-loaded'); }
                if (imgV.complete) hidePlaceholderV(); else imgV.onload = hidePlaceholderV;
                wrapV.appendChild(placeV);
                wrapV.appendChild(imgV);
                dispBack.appendChild(wrapV);
            }
        }
        var revealWrap = document.getElementById('card-reveal-wrap');
        if (revealWrap) {
            var modoRevelar = (typeof localStorage !== 'undefined' && localStorage.getItem('arion_estilo_revelar_card')) || 'flip';
            if (modoRevelar === 'instant') {
                var frontFace = revealWrap.querySelector('.card-reveal-front');
                var backFace = revealWrap.querySelector('.card-reveal-back');
                if (frontFace) frontFace.classList.add('revealed');
                if (backFace) backFace.classList.add('revealed');
            } else if (modoRevelar === 'original') {
                var backFaceOrig = revealWrap.querySelector('.card-reveal-back');
                if (backFaceOrig) backFaceOrig.classList.add('revealed');
                var cardDivider = document.getElementById('card-divider');
                if (cardDivider) cardDivider.style.display = 'block';
            } else {
                revealWrap.classList.add('flipped');
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        ajustarAlturaCardFlip();
                    });
                });
                var dispBackEl = document.getElementById('display-back');
                if (dispBackEl && dispBackEl.querySelector('img')) {
                    setTimeout(ajustarAlturaCardFlip, 350);
                }
            }
        }
    }
    var ankiBtns = document.getElementById('anki-btns');
    if (ankiBtns) ankiBtns.style.display = 'flex';
    const deck = c._deckNome ? baralhos.find(b => b.nome === c._deckNome) : baralhos[dIdx];
    const assinante = typeof localStorage !== 'undefined' && localStorage.getItem('arion_assinante') === 'true';
    const editWrap = document.getElementById('study-edit-btn-wrap');
    const tutorWrap = document.getElementById('study-tutor-btn-wrap');
    if (editWrap) {
        if (deck && deck.premium) editWrap.style.display = 'none';
        else editWrap.style.display = 'flex';
    }
    if (tutorWrap) {
        if (deck && deck.premium && assinante) tutorWrap.style.display = 'flex';
        else tutorWrap.style.display = 'none';
    }
    if (typeof resetarPillTutorIA === 'function') resetarPillTutorIA();

    const int = c.int || 0;
    const ease = c.ease || SRS_CORE.startingEase;
    const steps = SRS_CORE.learningSteps;

    if (c.state === 'new') {
        document.getElementById('t0').innerText = "<1m";
        document.getElementById('t1').innerText = (steps.length >= 2 ? Math.round((steps[0] + steps[1]) / 2) : Math.min(1440, Math.round(steps[0] * 1.5))) + "m";
        document.getElementById('t2').innerText = (steps.length >= 2 ? steps[1] + "m" : SRS_CORE.graduatingInterval + "d");
        document.getElementById('t3').innerText = SRS_CORE.easyInterval + "d";
    } else if (c.state === 'learning') {
        const stepsDisplay = (c.prevInt != null) ? SRS_CORE.lapseSteps : steps;
        const step = Math.min(c.step || 0, stepsDisplay.length - 1);
        const againMin = stepsDisplay[0];
        document.getElementById('t0').innerText = "<" + againMin + "m";
        const hardMin = (step === 0 && stepsDisplay.length >= 2) ? Math.round((stepsDisplay[0] + stepsDisplay[1]) / 2) : stepsDisplay[step];
        document.getElementById('t1').innerText = hardMin + "m";
        const isLastStep = step >= stepsDisplay.length - 1;
        document.getElementById('t2').innerText = isLastStep ? (c.prevInt != null ? (Math.max(1, Math.round(c.prevInt * SRS_CORE.newInterval)) + "d") : (SRS_CORE.graduatingInterval + "d")) : (stepsDisplay[step + 1] + "m");
        document.getElementById('t3').innerText = SRS_CORE.easyInterval + "d";
    } else {
        document.getElementById('t0').innerText = "<" + SRS_CORE.lapseSteps[0] + "m";
        document.getElementById('t1').innerText = Math.max(1, Math.round(int * SRS_CORE.hardInterval)) + "d";
        document.getElementById('t2').innerText = Math.max(1, Math.round(int * ease)) + "d";
        document.getElementById('t3').innerText = Math.max(1, Math.round(int * ease * SRS_CORE.easyBonus)) + "d";
    }

    var reportWrap = document.getElementById('study-report-error-wrap');
    if (!reportWrap) {
        reportWrap = document.createElement('div');
        reportWrap.id = 'study-report-error-wrap';
        reportWrap.style.cssText = 'text-align:center; margin-top:12px; margin-bottom:8px;';
        var link = document.createElement('a');
        link.href = '#';
        link.textContent = 'Reportar erro';
        link.style.cssText = 'color:#888; font-size:11px; text-decoration:none;';
        link.onclick = function (e) { e.preventDefault(); abrirModalReportarErro(); return false; };
        reportWrap.appendChild(link);
        var container = document.getElementById('study-container');
        if (container) container.appendChild(reportWrap);
    }
    reportWrap.style.display = 'block';
}

function abrirModalReportarErro() {
    if (!fila || fila.length === 0) return;
    if (typeof abrirModalOverlay !== 'function') return;
    abrirModalOverlay();
    var titleEl = document.getElementById('modal-title');
    var contentEl = document.getElementById('modal-content');
    var btnConfirm = document.getElementById('modal-confirm-btn');
    var btnCancel = document.getElementById('modal-cancel-btn');
    if (titleEl) titleEl.innerText = 'Reportar erro no card';
    if (contentEl) {
        contentEl.innerHTML = '<p style="margin:0 0 10px 0; color:#666; font-size:0.95rem;">Descreva o que está errado neste flashcard (texto, resposta, imagem, etc.):</p>' +
            '<textarea id="reporte-erro-texto" placeholder="Ex: A resposta correta é outra... / A imagem não carrega... / Há um erro de digitação na frente." style="width:100%; min-height:100px; padding:12px; border-radius:10px; border:1px solid #ddd; font-size:1rem; font-family:inherit; resize:vertical; box-sizing:border-box;" rows="4"></textarea>';
    }
    if (btnConfirm) {
        btnConfirm.textContent = 'Enviar reporte';
        btnConfirm.onclick = function () {
            var texto = document.getElementById('reporte-erro-texto');
            var descricao = (texto && texto.value) ? texto.value.trim() : '';
            if (typeof fecharModal === 'function') fecharModal();
            reportarErroNoCard(descricao);
        };
    }
    if (btnCancel) btnCancel.onclick = (typeof fecharModal === 'function') ? fecharModal : null;
}

function reportarErroNoCard(descricao) {
    if (!fila || fila.length === 0) return;
    var c = fila[0];
    var deckName = c._deckNome ? c._deckNome : (baralhos[dIdx] ? baralhos[dIdx].nome : '');
    if (!window.db || !window.db.collection) {
        alert('Não foi possível enviar o reporte. Tente novamente.');
        return;
    }
    var studentId = (typeof usuarioLogado !== 'undefined' && usuarioLogado) ? usuarioLogado.uid : null;
    var payload = {
        cardFront: c.f || '',
        deckName: deckName,
        descricao: typeof descricao === 'string' ? descricao : '',
        timestamp: new Date(),
        studentId: studentId,
        status: 'pendente'
    };
    window.db.collection('reportes_erros').add(payload).then(function () {
        alert('Obrigado! O erro foi reportado e será revisado pela equipe Árion.');
    }).catch(function () {
        alert('Não foi possível enviar o reporte. Tente novamente.');
    });
}

function responder(q) {
    if (respondido || fila.length === 0) return;
    let c = fila[0];
    if (!c) return;

    var elapsedMs = _sessionCardStartTime > 0 ? (Date.now() - _sessionCardStartTime) : 0;
    if (elapsedMs > 0) {
        _sessionTempoTotalMs += elapsedMs;
        _sessionCardsRespondidos++;
        var totalMs = parseInt(localStorage.getItem('arion_total_tempo_estudo_ms') || '0', 10) + elapsedMs;
        localStorage.setItem('arion_total_tempo_estudo_ms', String(totalMs));
    }

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
    const ls = SRS_CORE.learningSteps;
    const lapses = SRS_CORE.lapseSteps;
    const marcarMinutos = (min) => agora + (min * 60000);
    const marcarDias = (dias) => agora + (dias * dia);

    if (!c.ease) c.ease = SRS_CORE.startingEase;
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
        if (typeof salvarDuranteEstudo === 'function') salvarDuranteEstudo(); else if (typeof salvar === 'function') salvar({ skipRender: true });
        if (typeof MetricasEngajamento !== 'undefined') MetricasEngajamento.registrarFlashcardsRevisados(1, c._deckNome || (baralhos[dIdx] && baralhos[dIdx].nome));
        carregarCard();
    }

    function finalizar() {
        c.rep++;
        sincronizarCardParaBaralho(c);
        if (typeof salvarDuranteEstudo === 'function') salvarDuranteEstudo(); else if (typeof salvar === 'function') salvar({ skipRender: true });
        if (typeof MetricasEngajamento !== 'undefined') MetricasEngajamento.registrarFlashcardsRevisados(1, c._deckNome || (baralhos[dIdx] && baralhos[dIdx].nome));
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
                c.int = Math.max(1, Math.round(c.prevInt * SRS_CORE.newInterval));
                delete c.prevInt;
            } else c.int = SRS_CORE.graduatingInterval;
            c.ease = c.ease != null ? c.ease : SRS_CORE.startingEase;
            c.rev = marcarDias(c.int);
            return finalizar();
        }
        if (q === 3) {
            c.state = 'review';
            c.ease = (c.ease != null ? c.ease : SRS_CORE.startingEase) + SRS_CORE.easyEaseBonus;
            c.int = SRS_CORE.easyInterval;
            if (c.prevInt != null) delete c.prevInt;
            c.rev = marcarDias(c.int);
            return finalizar();
        }
    }

    function processarReview(c, q) {
        if (q === 0) {
            c.lapses = (c.lapses || 0) + 1;
            c.ease = Math.max(SRS_CORE.minEase, c.ease - SRS_CORE.againEasePenalty);
            c.prevInt = c.int;
            c.state = 'learning';
            c.step = 0;
            c.rev = marcarMinutos(lapses[0]);
            return reenfileirar(c);
        }
        var prevInt = c.int;
        if (q === 1) {
            c.int = Math.round(prevInt * SRS_CORE.hardInterval);
        } else if (q === 2) {
            c.int = Math.round(prevInt * c.ease);
        } else if (q === 3) {
            c.ease += SRS_CORE.easyEaseBonus;
            c.int = Math.round(prevInt * c.ease * SRS_CORE.easyBonus);
        }
        c.int = Math.max(1, Math.min(SRS_CORE.maxInterval, applyIntervalFuzz(c.int)));
        c.rev = marcarDias(c.int);
        return finalizar();
    }

    // Estatísticas por card premium (só contadores; não bloqueia o estudo)
    function reportarRespostaPremium(c, q) {
        var deck = c._deckNome ? baralhos.find(function (b) { return b.nome === c._deckNome; }) : baralhos[dIdx];
        if (!deck || !deck.premium) return;
        var hash = c.cardHash || (typeof computarCardHash === 'function' ? computarCardHash(c.f, c.v) : '');
        if (!hash) return;
        var getFns = function () { return window.functions || (typeof firebase !== 'undefined' && firebase.functions ? firebase.functions() : null); };
        var fn = getFns && getFns();
        if (fn && fn.httpsCallable) {
            fn.httpsCallable('registrarRespostaCardPremium')({
                cardHash: hash,
                botao: q,
                f: (c.f || '').substring(0, 500),
                v: (c.v || '').substring(0, 500)
            }).catch(function () {});
        }
    }
    reportarRespostaPremium(c, q);

    // Recap Árion: registrar revisão/erro por cartão (user_card_stats)
    if (typeof RecapArion !== 'undefined' && RecapArion.recordCardReview && typeof usuarioLogado !== 'undefined' && usuarioLogado) {
        var recapCardId = c._cardDocId || c.id;
        if (recapCardId) RecapArion.recordCardReview(usuarioLogado.uid, recapCardId, q === 0);
    }

    if (c.state === 'new' || c.state === 'learning') return processarNewOuLearning(c, q);
    return processarReview(c, q);
}

function mostrarParabens() {
    if (typeof flushEstudoAgora === 'function') flushEstudoAgora();

    // Amigos: registrar atividade no feed (sessão de estudo)
    var n = typeof totalCardsSessaoAtual === 'number' ? totalCardsSessaoAtual : 0;
    if (n > 0 && typeof AmigosSocial !== 'undefined' && AmigosSocial.writeActivity && typeof usuarioLogado !== 'undefined' && usuarioLogado) {
        AmigosSocial.writeActivity(usuarioLogado.uid, 'study_session', n).catch(function () {});
    }

    // Recap Árion: ao terminar sessão de recap, marcar concluído e mostrar mensagem específica
    var eraRecap = false;
    if (typeof RecapArion !== 'undefined' && RecapArion.isRecapMode && RecapArion.isRecapMode()) {
        var recapInfo = RecapArion.clearRecapMode && RecapArion.clearRecapMode();
        if (recapInfo && typeof usuarioLogado !== 'undefined' && usuarioLogado && RecapArion.markRecapCompleted) {
            RecapArion.markRecapCompleted(usuarioLogado.uid, recapInfo.monthKey);
            eraRecap = true;
            if (typeof AmigosSocial !== 'undefined' && AmigosSocial.writeActivity) {
                AmigosSocial.writeActivity(usuarioLogado.uid, 'recap_completed', null).catch(function () {});
            }
        }
    }

    const elNovo = document.getElementById('study-count-novo');
    const elRevisar = document.getElementById('study-count-revisar');
    if (elNovo) { elNovo.textContent = '0'; elNovo.classList.remove('current'); }
    if (elRevisar) { elRevisar.textContent = '0'; elRevisar.classList.remove('current'); }
    const studyContainer = document.getElementById('study-container');
    if (studyContainer) studyContainer.style.display = 'none';
    const finishArea = document.getElementById('finish-area');
    if (finishArea) {
        finishArea.style.display = 'flex';
        if (typeof window.Haptics !== 'undefined' && window.Haptics.success) window.Haptics.success();
        atualizarStreak();
        var n = typeof totalCardsSessaoAtual === 'number' ? totalCardsSessaoAtual : 0;
        var cardsRevisadosTexto = (typeof t === 'function' && t('finish_cards_revisados')) ? t('finish_cards_revisados') : 'Cards revisados: ';
        var streakData = JSON.parse(localStorage.getItem('arion_streak_data') || 'null') || { contagem: 0 };
        var streakValor = streakData.contagem + ' ' + (streakData.contagem === 1 ? 'dia' : 'dias');
        var streakText = 'Sua streak: <strong>' + streakValor + '</strong>';
        var avgSessionSec = _sessionCardsRespondidos > 0 ? _sessionTempoTotalMs / _sessionCardsRespondidos / 1000 : 0;
        var avgFormatado = avgSessionSec > 0 ? String(Math.round(avgSessionSec * 10) / 10).replace('.', ',') : '0';
        var tempoMedioTexto = (typeof t === 'function' && t('finish_tempo_medio')) ? t('finish_tempo_medio') : 'Tempo médio: ';
        var tempoMedioSessaoHtml = (avgSessionSec > 0 && _sessionCardsRespondidos > 0)
            ? '<div class="streak-badge">' + tempoMedioTexto + '<strong>' + avgFormatado + ' segundos/card</strong></div>'
            : '';
        var finishScreen = document.getElementById('finish-screen');
        if (finishScreen) {
            var msg;
            if (eraRecap) {
                msg = (typeof t === 'function' && t('recap_finish_message')) ? t('recap_finish_message') : 'Recap concluído 🎉<br>Você revisou seus cartões mais difíceis do mês.';
            } else {
                msg = (typeof t === 'function' && t('parabens_finalizou')) ? t('parabens_finalizou') : 'Parabéns! Você finalizou os flashcards previstos para hoje.';
            }
            finishScreen.innerHTML = '<div class="trophy-icon" aria-hidden="true">🏆</div>' +
                '<div class="congratulations-rect">' + msg + '</div>' +
                '<div class="finish-badges-row" style="display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:12px; margin:20px 0;">' +
                '<div class="streak-badge">' + cardsRevisadosTexto + '<strong>' + n + '</strong></div>' +
                '<div id="streak-display" class="streak-badge">' + streakText + '</div>' +
                (tempoMedioSessaoHtml ? tempoMedioSessaoHtml : '') +
                '</div>';
        }
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

function initStudyKeyboard() {
    document.addEventListener('keydown', function (e) {
        var studyScreen = document.getElementById('study-screen');
        if (!studyScreen || !studyScreen.classList.contains('active')) return;
        var tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.target.isContentEditable) return;

        if (e.key === '1') { e.preventDefault(); if (typeof responder === 'function' && fila && fila.length > 0 && !respondido) responder(0); return; }
        if (e.key === '2') { e.preventDefault(); if (typeof responder === 'function' && fila && fila.length > 0 && !respondido) responder(1); return; }
        if (e.key === '3') { e.preventDefault(); if (typeof responder === 'function' && fila && fila.length > 0 && !respondido) responder(2); return; }
        if (e.key === '4') { e.preventDefault(); if (typeof responder === 'function' && fila && fila.length > 0 && !respondido) responder(3); return; }
        if (e.key === ' ') {
            e.preventDefault();
            if (!fila || fila.length === 0) return;
            if (!cardVirado) { if (typeof virarCard === 'function') virarCard(); return; }
            if (!respondido && typeof responder === 'function') responder(2);
        }
    });
}
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function () { if (document.getElementById('study-screen')) initStudyKeyboard(); });
}
