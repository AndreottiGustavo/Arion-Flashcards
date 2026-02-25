// ========== LISTA DE BARALHOS (renderizar, fixar) ==========
function renderizar() {
    let totalNovos = 0;
    let totalRevisao = 0;
    const agora = Date.now();
    const comIndice = baralhos.map((b, i) => ({ b, i })).filter(({ b }) => !b.premium || b.cards.some(c => c.liberado === true));

    comIndice.forEach(({ b: d }) => {
        if (d.nome === TUTORIAL_DECK_NOME) return;
        totalNovos += d.cards.filter(c => c.state === 'new' && (d.premium ? c.liberado : true)).length;
        totalRevisao += d.cards.filter(c => c.state !== 'new' && c.rev <= agora && (d.premium ? c.liberado : true)).length;
    });

    const iconePinVetor = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:5px;"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>`;
    const ordenados = [...comIndice].sort((x, y) => (y.b.fixado ? 1 : 0) - (x.b.fixado ? 1 : 0));
    const listaHtml = ordenados.map(({ b, i }) => {
        const n = b.cards.filter(c => c.state === 'new' && (b.premium ? c.liberado : true)).length;
        const r = b.cards.filter(c => c.state !== 'new' && c.rev <= agora && (b.premium ? c.liberado : true)).length;
        const estaFixado = b.fixado === true;
        return `
            <div class="deck-item ${b.premium ? 'premium' : ''}" style="position: relative; margin-top: 10px; margin-bottom: 8px; background: transparent; border: none; padding: 0; min-height: auto; overflow: visible;">
                <div class="deck-actions" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: space-between; align-items: center; border-radius: 18px; overflow: hidden; z-index: 1;">
                    <div onclick="alternarFixar(${i})" style="background: ${estaFixado ? '#8e8e93' : '#007aff'}; width: 80px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.65rem;">${estaFixado ? 'DESAFIXAR' : 'FIXAR'}</div>
                    <div style="display:flex; height: 100%;">
                        ${b.premium ? '' : `<div onclick="prepararRenomear(${i})" style="background: #ff9500; width: 75px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.65rem;">EDITAR</div>`}
                        <div onclick="prepararExclusao(${i})" style="background: #ff3b30; width: 75px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.65rem;">APAGAR</div>
                    </div>
                </div>
                ${b.premium ? '<div class="premium-badge" style="position: absolute; top: -10px; left: 15px; z-index: 10;">PREMIUM</div>' : ''}
                <div class="deck-content" data-deck-index="${i}" style="padding: 22px 15px; display: flex; justify-content: space-between; align-items: center; width: 100%; position: relative; z-index: 2; transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); background: var(--primary-green); border-radius: 18px; box-sizing: border-box; ${b.premium ? 'border: 2px solid var(--premium-gold);' : 'border: 1px solid rgba(244, 233, 193, 0.3);'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <strong style="${b.premium ? 'color:var(--premium-gold)' : 'color: white;'}">${estaFixado ? iconePinVetor : ''}${b.nome}</strong>
                        <small style="white-space: nowrap; color: white;">
                            <span style="color: #2185d0; font-weight: bold;">${n}</span> novos <span style="color: #ccc; margin: 0 2px;">|</span> <span style="color: #21ba45; font-weight: bold;">${r}</span> revisões
                        </small>
                    </div>
                </div>
            </div>`;
    }).join('');

    const container = document.getElementById('deck-list');
    if (container) {
        const btnEstudarTudo = `
            <div class="deck-item study-all" onclick="estudarTudo()" style="background: linear-gradient(315deg,rgb(68, 131, 61),rgb(90, 138, 85)); color: white; margin-bottom: 20px; border: none; cursor: pointer; padding: 25px 15px 25px 15px;border-radius: 18px; overflow: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <strong style="font-size: 1.1em;">🔥 Estudar Tudo</strong>
                    <small style="opacity: 1; color: white; white-space: nowrap;">
                        <span style="color: #90caf9; font-weight: bold;">${totalNovos}</span> novos | <span style="color: #a5d6a7; font-weight: bold;">${totalRevisao}</span> revisões
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
