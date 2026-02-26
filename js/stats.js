// =============================== ESTATÍSTICAS ===========================================
var NUM_SEMANAS_HEATMAP = 53;

function getHeatmapWeekdays() {
    return (typeof t === 'function' ? t('heatmap_weekdays') : 'Domingo,Segunda-feira,Terça-feira,Quarta-feira,Quinta-feira,Sexta-feira,Sábado').split(',');
}
function getHeatmapMonths() {
    return (typeof t === 'function' ? t('heatmap_months') : 'janeiro,fevereiro,março,abril,maio,junho,julho,agosto,setembro,outubro,novembro,dezembro').split(',');
}

function gerarHeatmapHtml(paraDetalhes) {
    const DIAS_SEMANA_HEATMAP = getHeatmapWeekdays();
    const MESES_HEATMAP = getHeatmapMonths();
    const _t = typeof t === 'function' ? t : function(k) { return k; };
    const heatmap = getHeatmapData();
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), 0, 1);
    const grid = Array(7).fill(null).map(() => Array(NUM_SEMANAS_HEATMAP).fill(0));
    for (let i = 0; i < NUM_SEMANAS_HEATMAP * 7; i++) {
        const d = new Date(inicio.getTime() + i * 86400000);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const count = (d <= hoje) ? (heatmap[dateStr] || 0) : 0;
        const row = d.getDay();
        const col = Math.floor(i / 7);
        if (col >= 0 && col < NUM_SEMANAS_HEATMAP) grid[row][col] = count;
    }
    function dataParaCell(r, c) {
        const dStart = new Date(inicio.getTime() + c * 7 * 86400000);
        const offset = (r - dStart.getDay() + 7) % 7;
        return new Date(dStart.getTime() + offset * 86400000);
    }
    function formatarData(d) {
        const mes = MESES_HEATMAP[d.getMonth()];
        return `${DIAS_SEMANA_HEATMAP[d.getDay()]}, ${d.getDate()} ${mes.charAt(0).toUpperCase() + mes.slice(1)}`;
    }
    const valoresNaoZero = [];
    for (let r = 0; r < 7; r++)
        for (let c = 0; c < NUM_SEMANAS_HEATMAP; c++)
            if (grid[r][c] > 0) valoresNaoZero.push(grid[r][c]);
    valoresNaoZero.sort((a, b) => a - b);
    const totalNaoZero = valoresNaoZero.length;
    const nivelByCount = {};
    const countsDistintos = [...new Set(valoresNaoZero)].sort((a, b) => a - b);
    const minCount = countsDistintos[0];
    if (minCount != null) nivelByCount[minCount] = 1;
    const acimaDoMin = valoresNaoZero.filter((v) => v > minCount);
    const totalAcima = acimaDoMin.length;
    countsDistintos.forEach((count) => {
        if (count === minCount) return;
        if (totalAcima === 0) { nivelByCount[count] = 2; return; }
        let menoresOuIguais = 0;
        for (let i = 0; i < totalAcima; i++) {
            if (acimaDoMin[i] <= count) menoresOuIguais++;
            else break;
        }
        const percentil = menoresOuIguais / totalAcima;
        if (percentil <= 0.25) nivelByCount[count] = 2;
        else if (percentil <= 0.5) nivelByCount[count] = 3;
        else if (percentil <= 0.75) nivelByCount[count] = 4;
        else nivelByCount[count] = 5;
    });
    const nivel = (count) => (count === 0 ? 0 : (nivelByCount[count] ?? 1));
    let rowHoje = -1, colHoje = -1;
    for (let r = 0; r < 7; r++) {
        for (let c = 0; c < NUM_SEMANAS_HEATMAP; c++) {
            if (dataParaCell(r, c).toDateString() === hoje.toDateString()) { rowHoje = r; colHoje = c; break; }
        }
        if (rowHoje >= 0) break;
    }
    if (colHoje < 0) colHoje = 0;
    if (rowHoje < 0) rowHoje = hoje.getDay();
    let html = '<div class="heatmap-wrapper details-heatmap-wrapper" style="display:flex; direction:ltr; align-items:flex-start">';
    html += '<div class="heatmap-weekdays">';
    for (let r = 0; r < 7; r++) html += `<div class="heatmap-weekday">${DIAS_SEMANA_HEATMAP[r].charAt(0)}</div>`;
    html += '</div><div class="heatmap-grid" style="flex:1; overflow-x:auto; min-width:0">';
    for (let r = 0; r < 7; r++) {
        html += '<div class="heatmap-row">';
        for (let c = 0; c < NUM_SEMANAS_HEATMAP; c++) {
            const count = grid[r][c];
            const isHoje = c === colHoje && r === rowHoje;
            const isFuturo = c > colHoje || (c === colHoje && r > rowHoje);
            const dataCell = dataParaCell(r, c);
            const dataStr = formatarData(dataCell);
            let parteContagem = isFuturo ? _t('heatmap_dia_futuro') : (count === 0 ? _t('heatmap_nenhum_card') : (count === 1 ? _t('heatmap_1_card') : count + ' ' + _t('heatmap_n_cards')));
            const title = parteContagem + ' - ' + dataStr;
            const futuroClass = isFuturo ? ' heatmap-cell-future' : '';
            const tituloEscapado = title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const hojeAttr = isHoje && !paraDetalhes ? ' id="heatmap-cell-hoje" style="outline:2px solid var(--accent-gold); outline-offset:1px"' : (isHoje ? ' class="heatmap-cell-hoje" style="outline:2px solid var(--accent-gold); outline-offset:1px"' : '');
            html += `<div class="heatmap-cell${futuroClass}" data-level="${nivel(count)}" data-heatmap-info="${tituloEscapado}" title="${tituloEscapado}" role="button" tabindex="0"${hojeAttr}></div>`;
        }
        html += '</div>';
    }
    html += '</div></div>';
    html += '<div class="heatmap-tooltip" aria-live="polite"></div>';
    html += '<div class="stats-heatmap-legend"><span>' + _t('heatmap_menos') + '</span>';
    for (let i = 0; i <= 5; i++) html += `<div class="heatmap-cell" data-level="${i}"></div>`;
    html += '<span>' + _t('heatmap_mais') + '</span></div>';
    return html;
}

function initHeatmapTooltip(container) {
    if (!container) return;
    const tooltipEl = container.querySelector('.heatmap-tooltip');
    const hideTooltip = () => {
        if (tooltipEl) { tooltipEl.textContent = ''; tooltipEl.classList.remove('heatmap-tooltip-visible'); }
    };
    container.querySelectorAll('.heatmap-cell').forEach(cell => {
        if (!cell.getAttribute('data-heatmap-info')) return;
        const show = () => {
            const info = cell.getAttribute('data-heatmap-info');
            if (!info || !tooltipEl) return;
            tooltipEl.textContent = info;
            tooltipEl.classList.add('heatmap-tooltip-visible');
            clearTimeout(tooltipEl._hideId);
            tooltipEl._hideId = setTimeout(hideTooltip, 4000);
        };
        cell.addEventListener('click', show);
        cell.addEventListener('touchend', function (e) { e.preventDefault(); show(); }, { passive: false });
    });
    if (tooltipEl) tooltipEl.addEventListener('click', hideTooltip);
    document.addEventListener('click', function handler(e) {
        if (tooltipEl && tooltipEl.classList.contains('heatmap-tooltip-visible') && !e.target.closest('.heatmap-wrapper') && !e.target.closest('.heatmap-tooltip')) hideTooltip();
    });
}

function abrirEstatisticas() {
    mudarTela('stats-screen');
    renderEstatisticas();
}

function renderEstatisticas() {
    const container = document.getElementById('stats-content');
    if (!container) return;

    const streakData = JSON.parse(localStorage.getItem('arion_streak_data')) || { contagem: 0, ultimaData: null };
    const heatmap = getHeatmapData();
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    let totalRespondidos = 0;
    let totalCartoes = 0;
    baralhos.forEach(b => {
        b.cards.forEach(c => {
            totalCartoes++;
            totalRespondidos += (c.rep || 0);
        });
    });

    const hojeRespondidos = heatmap[hojeStr] || 0;
    const diasComEstudo = Object.keys(heatmap).length;
    const mediaPorDia = diasComEstudo > 0 ? Math.round(totalRespondidos / diasComEstudo) : 0;

    const agora = Date.now();
    let restantesAgora = 0;
    baralhos.forEach(b => {
        if (b.nome === TUTORIAL_DECK_NOME) return;
        b.cards.forEach(c => {
            const assinante = typeof localStorage !== 'undefined' && localStorage.getItem('arion_assinante') === 'true';
            const pendente = c.state === 'new' || c.rev <= agora;
            const liberado = !b.premium || (assinante && c.liberado === true);
            if (pendente && liberado) restantesAgora++;
        });
    });
    const totalDisponivelHoje = hojeRespondidos + restantesAgora;
    const progressoDia = totalDisponivelHoje > 0 ? Math.min(100, (hojeRespondidos / totalDisponivelHoje) * 100) : 100;

    const metaDiaria = parseInt(localStorage.getItem('arion_meta_diaria') || '0', 10) || 0;
    const metaAtingida = metaDiaria > 0 && hojeRespondidos >= metaDiaria;

    const heatmapHtml = gerarHeatmapHtml(false);
    const _t = typeof t === 'function' ? t : function(k) { return k; };

    const percentualTexto = Math.round(progressoDia) + '%';
    const textoCardsDia = totalDisponivelHoje === 0
        ? _t('stats_nada_hoje')
        : `${hojeRespondidos} de ${totalDisponivelHoje} ` + _t('stats_cards_do_dia');
    const metaLinha = metaDiaria > 0
        ? `<div class="stats-meta-meta-linha">${_t('stats_meta_sua')} ${metaDiaria} cards/dia${metaAtingida ? ' <span class="stats-meta-atingida">· ' + _t('stats_meta_atingida') + '</span>' : ''}</div>`
        : '<div class="stats-meta-meta-linha stats-meta-meta-opcional">' + _t('stats_meta_opcional') + ' <strong>' + _t('stats_perfil') + '</strong></div>';

    const metaBarraHtml = `<div class="stats-meta-bar-wrap">
            <div class="stats-meta-bar" role="progressbar" aria-valuenow="${hojeRespondidos}" aria-valuemin="0" aria-valuemax="${totalDisponivelHoje || 1}" style="width:${progressoDia}%"></div>
            <span class="stats-meta-percent">${percentualTexto}</span>
           </div>
           <div class="stats-meta-text">${textoCardsDia}</div>
           ${metaLinha}`;

    const locale = (typeof getIdioma === 'function' && getIdioma() === 'en') ? 'en-US' : 'pt-BR';
    container.innerHTML = `
        <div class="stats-card stats-card-meta">
            <h3>📋 ${_t('stats_progresso_dia')}</h3>
            ${metaBarraHtml}
        </div>
        <div class="stats-card">
            <h3>🔥 ${_t('stats_streak')}</h3>
            <div class="stats-value">${streakData.contagem} ${streakData.contagem === 1 ? _t('dia') : _t('dias')}</div>
            <small style="opacity:0.8">${streakData.ultimaData ? _t('ultimo_estudo') + ': ' + streakData.ultimaData : _t('estude_para_comecar')}</small>
        </div>
        <div class="stats-grid">
            <div class="stats-card">
                <h3>📝 ${_t('stats_cartoes_respondidos')}</h3>
                <div class="stats-value">${totalRespondidos.toLocaleString(locale)}</div>
            </div>
            <div class="stats-card">
                <h3>📚 ${_t('stats_total_cartoes')}</h3>
                <div class="stats-value">${totalCartoes.toLocaleString(locale)}</div>
            </div>
            <div class="stats-card">
                <h3>✅ ${_t('stats_hoje')}</h3>
                <div class="stats-value">${hojeRespondidos}</div>
                <small style="opacity:0.8">${_t('stats_revisoes_hoje')}</small>
            </div>
            <div class="stats-card">
                <h3>📊 ${_t('stats_media_revisoes')}</h3>
                <div class="stats-value">${mediaPorDia}</div>
                <small style="opacity:0.8">${_t('stats_em_dias_estudo')}</small>
            </div>
        </div>
        <div class="stats-card">
            <h3>${_t('heatmap_calendario')}</h3>
            ${heatmapHtml}
        </div>
    `;
    initHeatmapTooltip(document.getElementById('stats-content'));
}
