// ========== NAVEGAÇÃO, MODAIS, PAINEL BROWSE, CRIADOR DE CARDS ==========
function formatar(cmd, val = null) { document.execCommand(cmd, false, val); }
function atualizarCorPadrao(cor) { corAtual = cor; document.getElementById('current-color').style.background = cor; }
function aplicarCorPadrao() { document.execCommand('foreColor', false, corAtual); }

function mudarTela(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.transform = '';
    });
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active');
        target.scrollTop = 0;
        var deckList = document.getElementById('deck-list');
        if (deckList) deckList.scrollTop = 0;
    }
    const nav = document.getElementById('main-nav');
    const header = document.querySelector('.top-header');
    if (id === 'splash-screen' || id === 'login-forced-screen') {
        if (nav) nav.style.display = 'none';
        if (header) header.style.display = 'none';
        var offEl = document.getElementById('sync-offline-bar');
        if (offEl) { offEl.style.display = 'none'; document.body.classList.remove('sync-offline-bar-visible'); }
    } else {
        if (nav) nav.style.display = 'flex';
        if (header) header.style.display = 'flex';
        if (typeof atualizarIndicadorOffline === 'function') atualizarIndicadorOffline();
        if (id === 'deck-screen') {
        if (typeof veioDeEstudarTudo !== 'undefined') veioDeEstudarTudo = false;
        atualizarNav('nav-decks');
    }
        if (id === 'perfil-screen') preencherTelaPerfil();
    }
    window.scrollTo(0, 0);
}

let lastScrollTop = 0;
document.addEventListener('DOMContentLoaded', () => {
    const deckList = document.getElementById('deck-list');
    if (deckList) {
        deckList.addEventListener('scroll', function () {
            const fab = document.querySelector('.fab-button');
            if (!fab) return;
            let scrollTop = deckList.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 50) {
                fab.classList.add('fab-hidden');
            } else {
                fab.classList.remove('fab-hidden');
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        }, { passive: true });
    }
});

function atualizarNav(idAtivo) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    const botaoAtivo = document.getElementById(idAtivo);
    if (botaoAtivo) botaoAtivo.classList.add('active-nav');
    const menu = document.getElementById('main-nav');
    if (menu) menu.classList.remove('show');
}

function fecharModal() { document.getElementById('modal-overlay').style.display = 'none'; }

function abrirPainel() {
    alternarAbasPainel('all');
    document.getElementById('browse-search').value = "";
    filtrarPainel();
    mudarTela('browse-screen');
    atualizarNav('nav-browse');
}

function abrirCriador() {
    document.getElementById('front').innerHTML = "";
    document.getElementById('back').innerHTML = "";
    mudarTela('create-screen');
}

function salvarCard() {
    const f = document.getElementById('front').innerHTML.trim();
    const v = document.getElementById('back').innerHTML.trim();
    if (!f || f === "<br>" || !v || v === "<br>") {
        alert("Por favor, preencha a Pergunta e a Resposta.");
        return;
    }
    baralhos[dIdx].cards.push({
        f: f, v: v, int: 0, ease: 2.5, rev: Date.now(), state: 'new', rep: 0
    });
    salvar();
    document.getElementById('front').innerHTML = "";
    document.getElementById('back').innerHTML = "";
    document.getElementById('front').focus();
}

function alternarAbasPainel(aba) {
    document.getElementById('tab-all').classList.toggle('active-tab', aba === 'all');
    document.getElementById('tab-premium').classList.toggle('active-tab', aba === 'premium');
    document.getElementById('browse-all-section').style.display = aba === 'all' ? 'block' : 'none';
    document.getElementById('browse-premium-section').style.display = aba === 'premium' ? 'block' : 'none';
    if (aba === 'premium') renderizarGerenciadorPremium();
}

function renderizarGerenciadorPremium() {
    const root = document.getElementById('premium-manager-root');
    root.innerHTML = "";
    if (!onboardingFeito) {
        const balloon = document.createElement('div');
        balloon.className = 'onboarding-balloon';
        balloon.innerHTML = `<strong>Dica Árion:</strong> Toda vez que estudar um conteúdo novo em aula, você deve liberar os flashcards aqui para que eles apareçam no seu estudo diário. 😊`;
        balloon.onclick = () => { balloon.remove(); onboardingFeito = true; localStorage.setItem('arion_onboarding', 'true'); };
        root.appendChild(balloon);
    }
    baralhos.forEach((b, dIdx) => {
        if (!b.premium) return;
        const grupos = {};
        b.cards.forEach((c, cIdx) => {
            const mod = c.modulo || "Diversos";
            const sub = c.submodulo || "Geral";
            if (!grupos[mod]) grupos[mod] = {};
            if (!grupos[mod][sub]) grupos[mod][sub] = [];
            grupos[mod][sub].push({ card: c, idx: cIdx });
        });
        for (let mod in grupos) {
            const h = document.createElement('div');
            h.className = 'module-header';
            h.innerText = mod;
            root.appendChild(h);
            for (let sub in grupos[mod]) {
                const row = document.createElement('div');
                row.className = 'submodule-row';
                const isTodosLiberados = grupos[mod][sub].every(item => item.card.liberado);
                row.innerHTML = `
                    <span>${sub} <small style="color:gray">(${grupos[mod][sub].length} cards)</small></span>
                    <input type="checkbox" ${isTodosLiberados ? 'checked' : ''} style="width:20px; height:20px" onchange="toggleSubmodulo(${dIdx}, '${mod}', '${sub}', this.checked)">
                `;
                root.appendChild(row);
            }
        }
    });
}

function toggleSubmodulo(dI, mod, sub, status) {
    baralhos[dI].cards.forEach(c => {
        if (c.modulo === mod && c.submodulo === sub) c.liberado = status;
    });
    salvar();
}

function filtrarPainel() {
    const termo = document.getElementById('browse-search').value.toLowerCase();
    const list = document.getElementById('browse-list');
    list.innerHTML = "";
    baralhos.forEach((b, deckIdx) => {
        b.cards.forEach((c, cardIdx) => {
            if (c.f.toLowerCase().includes(termo) || c.v.toLowerCase().includes(termo) || b.nome.toLowerCase().includes(termo)) {
                const tr = document.createElement('tr');
                tr.className = 'card-row';
                tr.innerHTML = `<td style="max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${c.f}</td><td style="max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${c.v}</td><td style="color:#666">${b.nome}</td>`;
                if (!b.premium) tr.onclick = () => editarCardPainel(deckIdx, cardIdx);
                list.appendChild(tr);
            }
        });
    });
}

function editarCardPainel(di, ci) {
    const c = baralhos[di].cards[ci];
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-title').innerText = "Editar Card";
    document.getElementById('modal-content').innerHTML = `
        <div id="edit-f-p" class="main-input" contenteditable="true" style="height:80px; background:#eee">${c.f}</div>
        <div id="edit-v-p" class="main-input" contenteditable="true" style="height:80px; background:#eee">${c.v}</div>`;
    document.getElementById('modal-confirm-btn').onclick = () => {
        c.f = document.getElementById('edit-f-p').innerHTML;
        c.v = document.getElementById('edit-v-p').innerHTML;
        salvar(); fecharModal(); abrirPainel();
    };
}

function abrirModalCriar() {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-title').innerText = "Novo Baralho";
    document.getElementById('modal-content').innerHTML = `<input type="text" id="deck-n" placeholder="Nome do baralho...">`;
    document.getElementById('modal-confirm-btn').onclick = () => {
        let n = document.getElementById('deck-n').value;
        if (n.trim()) { baralhos.push({ nome: n, cards: [], premium: false }); salvar(); fecharModal(); }
    };
}

function prepararRenomear(i) {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-title').innerText = "Renomear Baralho";
    document.getElementById('modal-content').innerHTML = `<input type="text" id="edit-n" value="${baralhos[i].nome}">`;
    document.getElementById('modal-confirm-btn').onclick = () => {
        let n = document.getElementById('edit-n').value;
        if (n.trim()) { baralhos[i].nome = n; salvar(); fecharModal(); }
    };
}

function prepararExclusao(i) {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-title').innerText = "Excluir Baralho?";
    document.getElementById('modal-content').innerHTML = `<p style="color:#666">Isso apagará permanentemente todos os cartões deste baralho e seu progesso será perdido.</p>`;
    document.getElementById('modal-confirm-btn').onclick = () => { baralhos.splice(i, 1); salvar(); fecharModal(); };
}

function abrirModalEditarCard() {
    const c = fila[0];
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-title').innerText = "Editar Cartão";
    document.getElementById('modal-content').innerHTML = `
        <div id="edit-f" class="main-input" contenteditable="true" style="height:80px; background:#eee">${c.f}</div>
        <div id="edit-v" class="main-input" contenteditable="true" style="height:80px; background:#eee">${c.v}</div>`;
    document.getElementById('modal-confirm-btn').onclick = () => {
        c.f = document.getElementById('edit-f').innerHTML;
        c.v = document.getElementById('edit-v').innerHTML;
        salvar(); fecharModal(); carregarCard();
        if (respondido) virarCard();
    };
}

function toggleMenu(i) {
    const menus = document.querySelectorAll('.options-menu');
    const targetMenu = document.getElementById(`menu-${i}`);
    const isVisible = targetMenu.style.display === 'block';
    menus.forEach(m => m.style.display = 'none');
    if (!isVisible) targetMenu.style.display = 'block';
}
