// ============================ VESTIBULARES (provas e datas) =========================
let corSelecionada = '#ffffff';

function abrirVestibulares() {
    mudarTela('vestibulares-screen');
    renderizarVestibulares();
}

function renderizarVestibulares() {
    const container = document.getElementById('lista-vestibulares');
    if (!container) return;
    meusVestibulares.sort((a, b) => new Date(a.data) - new Date(b.data));
    container.innerHTML = '';
    meusVestibulares.forEach((v, index) => {
        const hoje = new Date();
        const dataProva = new Date(v.data + "T00:00:00");
        const diff = Math.ceil((dataProva - hoje) / (1000 * 60 * 60 * 24));
        const card = document.createElement('div');
        card.className = 'vestibular-card';
        const corFinal = v.cor || '#ffffff';
        if (isDark(corFinal)) card.classList.add('dark-mode');
        card.style.backgroundColor = corFinal;
        card.innerHTML = `
            <button class="btn-remover-vest" onclick="removerVestibular(${index})">×</button>
            <strong>${v.nome}</strong>
            <span class="dias-count">${diff > 0 ? diff : (diff === 0 ? 'HOJE' : '✓')}</span>
            <span class="dias-label">${diff >= 0 ? 'DIAS RESTANTES' : 'FINALIZADA'}</span>`;
        container.appendChild(card);
    });
}

function abrirModalVestibular() {
    const modal = document.getElementById('modal-vestibular');
    modal.style.display = 'flex';
    corSelecionada = '#ffffff';
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.remove('selected');
        if (dot.style.backgroundColor === 'rgb(255, 255, 255)' || dot.style.backgroundColor === '#ffffff') dot.classList.add('selected');
    });
}

function initModalVestibularFecharFora() {
    const modal = document.getElementById('modal-vestibular');
    if (!modal) return;
    modal.addEventListener('click', function(e) {
        if (e.target === modal) fecharModalVestibular();
    });
}

function selectColor(elemento, cor) {
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('selected'));
    elemento.classList.add('selected');
    corSelecionada = cor;
}

function isDark(color) {
    if (!color) return false;
    const darkColors = ['#000000', '#1a1a1a', '#333333', 'black'];
    return darkColors.includes(color.toLowerCase());
}

function salvarVestibular() {
    const nome = document.getElementById('vest-nome').value;
    const data = document.getElementById('vest-data').value;
    if (!nome || !data) {
        alert("Por favor, preencha todos os campos!");
        return;
    }
    meusVestibulares.push({ nome: nome, data: data, cor: corSelecionada });
    salvar();
    fecharModalVestibular();
    renderizarVestibulares();
}

function fecharModalVestibular() {
    document.getElementById('modal-vestibular').style.display = 'none';
    document.getElementById('vest-nome').value = '';
    const campoData = document.getElementById('vest-data');
    campoData.value = '';
    campoData.type = 'text';
    corSelecionada = '#ffffff';
}

function removerVestibular(index) {
    meusVestibulares.splice(index, 1);
    salvar();
    renderizarVestibulares();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalVestibularFecharFora);
} else {
    initModalVestibularFecharFora();
}
