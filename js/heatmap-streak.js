// =============================== heatmap (reviews por dia, estilo Anki) ===========================================
const HEATMAP_KEY = 'arion_heatmap_data';

function getHeatmapData() {
    try {
        const raw = localStorage.getItem(HEATMAP_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function incrementarHeatmapHoje() {
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const heatmap = getHeatmapData();
    heatmap[hojeStr] = (heatmap[hojeStr] || 0) + 1;
    localStorage.setItem(HEATMAP_KEY, JSON.stringify(heatmap));
}

// =============================== atualizar streak ===========================================
function atualizarStreak() {
    const agora = new Date();
    const hojeStr = `${agora.getFullYear()}-${agora.getMonth() + 1}-${agora.getDate()}`;
    let dadosStreak = JSON.parse(localStorage.getItem('arion_streak_data')) || {
        contagem: 0,
        ultimaData: null
    };

    if (dadosStreak.ultimaData) {
        const ultimaDataEstudo = new Date(dadosStreak.ultimaData);
        ultimaDataEstudo.setHours(0, 0, 0, 0);

        const dataHoje = new Date(hojeStr);
        dataHoje.setHours(0, 0, 0, 0);
        const diffTempo = dataHoje.getTime() - ultimaDataEstudo.getTime();
        const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24));

        if (diffDias === 1) {
            dadosStreak.contagem += 1;
            dadosStreak.ultimaData = hojeStr;
        } else if (diffDias > 1) {
            dadosStreak.contagem = 1;
            dadosStreak.ultimaData = hojeStr;
        } else if (diffDias === 0) {
            console.log("Streak já contabilizada hoje.");
        }
    } else {
        dadosStreak.contagem = 1;
        dadosStreak.ultimaData = hojeStr;
    }

    localStorage.setItem('arion_streak_data', JSON.stringify(dadosStreak));
    salvar();

    const display = document.getElementById('streak-display');
    if (display) {
        display.innerText = `Sua streak continua: ${dadosStreak.contagem} dias`;
    }

    return dadosStreak.contagem;
}
