// ========== LISTA DE BARALHOS (renderizar, fixar, arquivar) ==========
var mostrandoArquivados = false;

function renderizar() {
    let totalNovos = 0;
    let totalRevisao = 0;
    const agora = Date.now();
    mostrandoArquivados = localStorage.getItem('arion_ver_arquivados') === 'true';
    const baseFiltro = baralhos.map((b, i) => ({ b, i })).filter(({ b }) => (!b.premium || b.cards.some(c => c.liberado === true)) && (mostrandoArquivados ? (b.arquivado === true) : (b.arquivado !== true)));

    baralhos.forEach((b) => {
        if (b.arquivado || b.nome === TUTORIAL_DECK_NOME) return;
        if (b.premium && !b.cards.some(c => c.liberado === true)) return;
        totalNovos += b.cards.filter(c => c.state === 'new' && (b.premium ? c.liberado : true)).length;
        totalRevisao += b.cards.filter(c => c.state !== 'new' && c.rev <= agora && (b.premium ? c.liberado : true)).length;
    });

    const numArquivados = baralhos.filter(b => b.arquivado === true && (!b.premium || b.cards.some(c => c.liberado === true))).length;
    const filtroEl = document.getElementById('deck-filter-archived');
    if (filtroEl) {
        if (numArquivados > 0 || mostrandoArquivados) {
            filtroEl.style.display = 'block';
            var verAtivos = (typeof t === 'function' ? t('filtro_ver_ativos') : 'Ver ativos');
            var verArquivados = (typeof t === 'function' ? t('filtro_ver_arquivados') : 'Ver arquivados');
            filtroEl.innerHTML = mostrandoArquivados
                ? `<button type="button" class="deck-filter-btn" onclick="toggleVerArquivados()">← ${verAtivos}</button>`
                : `<button type="button" class="deck-filter-btn" onclick="toggleVerArquivados()">📦 ${verArquivados} (${numArquivados})</button>`;
        } else {
            filtroEl.style.display = 'none';
            filtroEl.innerHTML = '';
        }
    }
    const iconePinVetor = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:5px;"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>`;
    var lblNovos = typeof t === 'function' ? t('study_novos') : 'novos';
    var lblRevisoes = typeof t === 'function' ? t('study_revisar') : 'revisões';
    const ordenados = [...baseFiltro].sort((x, y) => (y.b.fixado ? 1 : 0) - (x.b.fixado ? 1 : 0));
    const listaHtml = ordenados.map(({ b, i }) => {
        const n = b.cards.filter(c => c.state === 'new' && (b.premium ? c.liberado : true)).length;
        const r = b.cards.filter(c => c.state !== 'new' && c.rev <= agora && (b.premium ? c.liberado : true)).length;
        const estaFixado = b.fixado === true;
        const labelArquivar = b.arquivado ? 'DESARQ.' : 'ARQUIVAR';
        return `
            <div class="deck-item ${b.premium ? 'premium' : ''}" style="position: relative; margin-top: 10px; margin-bottom: 8px; background: transparent; border: none; padding: 0; min-height: auto; overflow: visible;">
                <div class="deck-actions deck-action-bar" data-deck-index="${i}" onclick="if (!event.target.closest('.deck-action-btn')) { var idx = parseInt(this.getAttribute('data-deck-index'),10); if (!isNaN(idx) && typeof abrirDetalhes === 'function') abrirDetalhes(idx); }" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: space-between; align-items: center; border-radius: 18px; overflow: hidden; z-index: 1;">
                    <div style="display: flex; height: 100%;">
                        <div class="deck-action-btn" onclick="alternarFixar(${i})" style="background: ${estaFixado ? '#8e8e93' : '#007aff'}; width: 80px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.65rem;">${estaFixado ? 'DESAFIXAR' : 'FIXAR'}</div>
                        <div class="deck-action-btn" onclick="alternarArquivar(${i})" style="background: #6d6d6d; width: 68px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.6rem;">${labelArquivar}</div>
                    </div>
                    <div style="display:flex; height: 100%;">
                        ${b.premium ? '' : `<div class="deck-action-btn" onclick="abrirConfigurarDeck(${i})" style="background: #ff9500; width: 70px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.6rem;">CONFIG</div>`}
                        <div class="deck-action-btn" onclick="prepararExclusao(${i})" style="background: #ff3b30; width: 70px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.65rem;">APAGAR</div>
                    </div>
                </div>
                ${b.premium ? '<div class="premium-badge" style="position: absolute; top: -10px; left: 15px; z-index: 10;">PREMIUM</div>' : ''}
                <div class="deck-content" data-deck-index="${i}" style="padding: 22px 15px; display: flex; justify-content: space-between; align-items: center; width: 100%; position: relative; z-index: 2; transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); background: var(--primary-green); border-radius: 18px; box-sizing: border-box; ${b.premium ? 'border: 2px solid var(--premium-gold);' : 'border: 1px solid rgba(244, 233, 193, 0.3);'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <strong style="${b.premium ? 'color:var(--premium-gold)' : 'color: white;'}">${estaFixado ? iconePinVetor : ''}${b.nome}</strong>
                        <small style="white-space: nowrap; color: white;">
                            <span style="color: #2185d0; font-weight: bold;">${n}</span> ${lblNovos} <span style="color: #ccc; margin: 0 2px;">|</span> <span style="color: #21ba45; font-weight: bold;">${r}</span> ${lblRevisoes}
                        </small>
                    </div>
                </div>
            </div>`;
    }).join('');

    const container = document.getElementById('deck-list');
    if (container) {
        var estudarTudoLabel = typeof t === 'function' ? t('estudar_tudo') : 'Estudar Tudo';
        const btnEstudarTudo = mostrandoArquivados ? '' : `
            <div class="deck-item study-all" onclick="abrirDetalhesEstudarTudo()" style="background: linear-gradient(315deg,rgb(68, 131, 61),rgb(90, 138, 85)); color: white; margin-bottom: 20px; border: none; cursor: pointer; padding: 25px 15px 25px 15px;border-radius: 18px; overflow: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <strong style="font-size: 1.1em;">🔥 ${estudarTudoLabel}</strong>
                    <small style="opacity: 1; color: white; white-space: nowrap;">
                        <span style="color: #90caf9; font-weight: bold;">${totalNovos}</span> ${lblNovos} | <span style="color: #a5d6a7; font-weight: bold;">${totalRevisao}</span> ${lblRevisoes}
                    </small>
                </div>
            </div>`;
        container.innerHTML = btnEstudarTudo + listaHtml;
    }
}

function alternarFixar(i) {
    if (i < 0 || i >= baralhos.length) return;
    baralhos[i].fixado = !baralhos[i].fixado;
    salvar();
    renderizar();
}

function fixarDeck(i) {
    alternarFixar(i);
}

function alternarArquivar(i) {
    if (i < 0 || i >= baralhos.length) return;
    baralhos[i].arquivado = !baralhos[i].arquivado;
    salvar();
    renderizar();
}

function toggleVerArquivados() {
    mostrandoArquivados = !mostrandoArquivados;
    localStorage.setItem('arion_ver_arquivados', mostrandoArquivados ? 'true' : 'false');
    renderizar();
}
