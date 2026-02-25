// =============================== ESTATÍSTICAS ===========================================
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

    const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const NUM_SEMANAS = 53;
    const grid = Array(7).fill(null).map(() => Array(NUM_SEMANAS).fill(0));
    const inicio = new Date(hoje.getFullYear(), 0, 1);
    let maxCount = 0;
    for (let i = 0; i < NUM_SEMANAS * 7; i++) {
        const d = new Date(inicio.getTime() + i * 86400000);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const count = (d <= hoje) ? (heatmap[dateStr] || 0) : 0;
        const row = d.getDay();
        const col = Math.floor(i / 7);
        if (col >= 0 && col < NUM_SEMANAS) {
            grid[row][col] = count;
            if (count > maxCount) maxCount = count;
        }
    }
    function dataParaCell(r, c) {
        const dStart = new Date(inicio.getTime() + c * 7 * 86400000);
        const offset = (r - dStart.getDay() + 7) % 7;
        return new Date(dStart.getTime() + offset * 86400000);
    }
    function formatarDataComMesMaiusculo(d) {
        const mes = MESES[d.getMonth()];
        const mesMaiusculo = mes.charAt(0).toUpperCase() + mes.slice(1);
        return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} ${mesMaiusculo}`;
    }
    const nivel = (c) => {
        if (c === 0) return 0;
        if (maxCount <= 0) return 0;
        const p = c / maxCount;
        if (p <= 0.25) return 1;
        if (p <= 0.5) return 2;
        if (p <= 0.75) return 3;
        return 4;
    };

    const dayIndexHoje = Math.round((hoje - inicio) / 86400000);
    const colHoje = Math.min(Math.floor(dayIndexHoje / 7), NUM_SEMANAS - 1);
    const rowHoje = hoje.getDay();

    let heatmapHtml = '<div class="heatmap-wrapper" style="display:flex; direction:ltr; align-items:flex-start">';
    heatmapHtml += '<div class="heatmap-weekdays">';
    for (let r = 0; r < 7; r++) heatmapHtml += `<div class="heatmap-weekday">${DIAS_SEMANA[r].charAt(0)}</div>`;
    heatmapHtml += '</div><div id="heatmap-grid-scroll" class="heatmap-grid" style="flex:1; overflow-x:auto; min-width:0">';
    for (let r = 0; r < 7; r++) {
        heatmapHtml += '<div class="heatmap-row">';
        for (let c = 0; c < NUM_SEMANAS; c++) {
            const count = grid[r][c];
            const isHoje = c === colHoje && r === rowHoje;
            const isFuturo = c > colHoje || (c === colHoje && r > rowHoje);
            const dataCell = dataParaCell(r, c);
            const dataStr = formatarDataComMesMaiusculo(dataCell);
            let parteContagem;
            if (isFuturo) parteContagem = 'Dia futuro';
            else if (count === 0) parteContagem = 'Nenhum card revisado';
            else if (count === 1) parteContagem = '1 card revisado';
            else parteContagem = `${count} cards revisados`;
            const title = `${parteContagem} - ${dataStr}`;
            const futuroClass = isFuturo ? ' heatmap-cell-future' : '';
            const hojeAttr = isHoje ? ' id="heatmap-cell-hoje" style="outline:2px solid var(--accent-gold); outline-offset:1px"' : '';
            heatmapHtml += `<div class="heatmap-cell${futuroClass}" data-level="${nivel(count)}" title="${title.replace(/"/g, '&quot;')}"${isHoje ? hojeAttr : ''}></div>`;
        }
        heatmapHtml += '</div>';
    }
    heatmapHtml += '</div></div>';
    heatmapHtml += '<div class="stats-heatmap-legend"><span>Menos</span>';
    for (let i = 0; i <= 4; i++) heatmapHtml += `<div class="heatmap-cell" data-level="${i}"></div>`;
    heatmapHtml += '<span>Mais</span></div>';

    container.innerHTML = `
        <div class="stats-card">
            <h3>🔥 Streak</h3>
            <div class="stats-value">${streakData.contagem} ${streakData.contagem === 1 ? 'dia' : 'dias'}</div>
            <small style="opacity:0.8">${streakData.ultimaData ? 'Último estudo: ' + streakData.ultimaData : 'Estude para começar'}</small>
        </div>
        <div class="stats-grid">
            <div class="stats-card">
                <h3>📝 Cartões respondidos</h3>
                <div class="stats-value">${totalRespondidos.toLocaleString('pt-BR')}</div>
            </div>
            <div class="stats-card">
                <h3>📚 Total de cartões</h3>
                <div class="stats-value">${totalCartoes.toLocaleString('pt-BR')}</div>
            </div>
            <div class="stats-card">
                <h3>✅ Hoje</h3>
                <div class="stats-value">${hojeRespondidos}</div>
                <small style="opacity:0.8">revisões hoje</small>
            </div>
            <div class="stats-card">
                <h3>📊 Média de revisões por dia</h3>
                <div class="stats-value">${mediaPorDia}</div>
                <small style="opacity:0.8">em dias em que você estudou</small>
            </div>
        </div>
        <div class="stats-card">
            <h3>Calendário de estudo (heatmap)</h3>
            ${heatmapHtml}
        </div>
    `;
    requestAnimationFrame(() => {
        const hojeCell = document.getElementById('heatmap-cell-hoje');
        if (hojeCell) hojeCell.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    });
}
