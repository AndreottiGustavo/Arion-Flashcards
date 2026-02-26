// ========== NAVEGAÇÃO, MODAIS, PAINEL BROWSE, CRIADOR DE CARDS ==========
function formatar(cmd, val = null) { document.execCommand(cmd, false, val); }
function atualizarCorPadrao(cor) { corAtual = cor; var el = document.getElementById('current-color'); if (el) el.style.background = cor; var elEdit = document.getElementById('edit-current-color'); if (elEdit) elEdit.style.background = cor; }
function aplicarCorPadrao() { document.execCommand('foreColor', false, corAtual); }

function getEditCardToolbarHTML() {
    return '<div class="toolbar edit-card-toolbar" style="margin-bottom:12px">' +
        '<button type="button" class="tool-btn" onclick="formatar(\'bold\')">B</button>' +
        '<button type="button" class="tool-btn" onclick="formatar(\'italic\')" style="font-style:italic">I</button>' +
        '<button type="button" class="tool-btn" onclick="formatar(\'underline\')" style="text-decoration:underline">U</button>' +
        '<button type="button" class="tool-btn" onclick="formatar(\'superscript\')">x²</button>' +
        '<button type="button" class="tool-btn" onclick="formatar(\'subscript\')">x₂</button>' +
        '<div class="edit-card-color-wrap color-split-btn" style="margin-left:8px">' +
        '<button type="button" class="color-main-btn" onclick="aplicarCorPadrao()"><span>A</span><div id="edit-current-color" class="color-indicator" style="width:16px;height:3px;background:' + (corAtual || '#000') + ';margin-top:2px"></div></button>' +
        '<label for="edit-colorPicker" class="color-select-btn" style="cursor:pointer;margin:0;display:flex;align-items:center;justify-content:center;user-select:none">▼</label>' +
        '</div>' +
        '<input type="color" id="edit-colorPicker" class="emoji-picker-input-cor-hidden" value="' + (corAtual || '#000000') + '">' +
        '</div>';
}
function initEditCardColorPicker() {
    var picker = document.getElementById('edit-colorPicker');
    if (picker) {
        picker.onchange = function() {
            corAtual = this.value;
            atualizarCorPadrao(corAtual);
        };
    }
}

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

function formatarDataRevisao(c) {
    if (!c || c.state === 'new') return 'Novo';
    var rev = c.rev;
    if (rev == null || rev === undefined) return 'Novo';
    var d = new Date(typeof rev === 'number' ? rev : parseInt(rev, 10));
    if (isNaN(d.getTime())) return 'Novo';
    var day = ('0' + d.getDate()).slice(-2);
    var month = ('0' + (d.getMonth() + 1)).slice(-2);
    var year = d.getFullYear();
    return day + '/' + month + '/' + year;
}

function abrirModalOverlay() {
    var o = document.getElementById('modal-overlay');
    o.style.display = 'flex';
    o.scrollTop = 0;
    var box = document.getElementById('custom-modal');
    if (box) box.scrollTop = 0;
}
function fecharModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    var btn = document.getElementById('modal-confirm-btn');
    if (btn) { btn.textContent = 'CONFIRMAR'; btn.className = 'btn-gold modal-confirm-btn'; }
    var cb = document.getElementById('modal-cancel-btn');
    if (cb) cb.onclick = fecharModal;
}

function abrirPainel() {
    alternarAbasPainel('all');
    document.getElementById('browse-search').value = "";
    var sel = document.getElementById('browse-deck-filter');
    if (sel) {
        var assinante = localStorage.getItem('arion_assinante') === 'true';
        sel.innerHTML = '<option value="">Todos os baralhos</option>';
        baralhos.forEach(function(b, i) {
            if (b.premium && !assinante) return;
            if (b.nome === TUTORIAL_DECK_NOME) return;
            var opt = document.createElement('option');
            opt.value = b.nome;
            opt.textContent = b.nome;
            sel.appendChild(opt);
        });
    }
    filtrarPainel();
    mudarTela('browse-screen');
    atualizarNav('nav-browse');
    initBrowseFabPesquisarObserver();
}
var _browseFabPesquisarObserver = null;
function initBrowseFabPesquisarObserver() {
    var screen = document.getElementById('browse-screen');
    var searchEl = document.getElementById('browse-search');
    if (!screen || !searchEl) return;
    if (_browseFabPesquisarObserver) { _browseFabPesquisarObserver.disconnect(); _browseFabPesquisarObserver = null; }
    _browseFabPesquisarObserver = new IntersectionObserver(function(entries) {
        var e = entries[0];
        if (!e) return;
        var allSection = document.getElementById('browse-all-section');
        var showFab = !e.isIntersecting && allSection && allSection.style.display !== 'none';
        if (showFab) screen.classList.add('browse-fab-pesquisar-visible');
        else screen.classList.remove('browse-fab-pesquisar-visible');
    }, { root: screen, threshold: 0, rootMargin: '0px' });
    _browseFabPesquisarObserver.observe(searchEl);
}
function browseFabPesquisar() {
    var el = document.getElementById('browse-filters');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(function() { var s = document.getElementById('browse-search'); if (s) s.focus(); }, 400); }
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
    var screen = document.getElementById('browse-screen');
    if (screen && aba === 'premium') screen.classList.remove('browse-fab-pesquisar-visible');
    if (aba === 'premium') renderizarGerenciadorPremium();
}

function renderizarGerenciadorPremium() {
    const root = document.getElementById('premium-manager-root');
    root.innerHTML = "";
    const assinante = localStorage.getItem('arion_assinante') === 'true';
    if (!assinante) {
        root.innerHTML = '<p style="padding:20px; color:#666; text-align:center">Renove sua assinatura para gerenciar e liberar conteúdo premium.</p>';
        return;
    }
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
    const termo = document.getElementById('browse-search').value.toLowerCase().trim();
    const list = document.getElementById('browse-list');
    const deckFilterEl = document.getElementById('browse-deck-filter');
    const deckFiltro = deckFilterEl ? deckFilterEl.value : '';
    list.innerHTML = "";
    const assinante = localStorage.getItem('arion_assinante') === 'true';
    const passaFiltro = function(b, c) {
        if (!termo) return true;
        return (c.f && c.f.toLowerCase().includes(termo)) || (c.v && c.v.toLowerCase().includes(termo)) || (b.nome && b.nome.toLowerCase().includes(termo));
    };
    baralhos.forEach(function(b, deckIdx) {
        if (b.premium && !assinante) return;
        if (deckFiltro && b.nome !== deckFiltro) return;
        b.cards.forEach(function(c, cardIdx) {
            if (!passaFiltro(b, c)) return;
            const tr = document.createElement('tr');
            tr.className = 'card-row';
            const frente = (c.f || '').replace(/</g, '&lt;').substring(0, 80);
            const verso = (c.v || '').replace(/</g, '&lt;').substring(0, 80);
            const podeEditar = !b.premium;
            const podeApagar = !b.premium && b.nome !== (typeof TUTORIAL_DECK_NOME !== 'undefined' ? TUTORIAL_DECK_NOME : 'Tutorial');
            var aRevisar = formatarDataRevisao(c);
            tr.innerHTML = '<td class="browse-cell-frente">' + frente + (frente.length >= 80 ? '…' : '') + '</td><td class="browse-cell-verso">' + verso + (verso.length >= 80 ? '…' : '') + '</td><td class="browse-cell-deck">' + (b.nome || '') + '</td><td class="browse-cell-revisao">' + aRevisar + '</td>';
            tr.dataset.deckIdx = deckIdx;
            tr.dataset.cardIdx = cardIdx;
            if (podeEditar) tr.onclick = function() { editarCardPainel(deckIdx, cardIdx); };
            list.appendChild(tr);
        });
    });
}

function abrirModalConfirmarApagarCard(deckIdx, cardIdx, fromEditModal) {
    abrirModalOverlay();
    document.getElementById('modal-title').innerText = 'Apagar card';
    document.getElementById('modal-content').innerHTML = '<p class="modal-aviso-apagar">Este card será apagado para sempre. Esta ação não pode ser desfeita.</p>';
    var btn = document.getElementById('modal-confirm-btn');
    btn.textContent = 'Apagar para sempre';
    btn.className = 'modal-confirm-btn btn-apagar-confirm';
    btn.onclick = function() {
        baralhos[deckIdx].cards.splice(cardIdx, 1);
        salvar();
        fecharModal();
        if (fromEditModal) abrirPainel(); else filtrarPainel();
    };
    var cancelBtn = document.getElementById('modal-cancel-btn');
    if (cancelBtn) cancelBtn.onclick = function() {
        fecharModal();
        if (fromEditModal) abrirPainel();
    };
}

function confirmarApagarCardPainel(deckIdx, cardIdx) {
    abrirModalConfirmarApagarCard(deckIdx, cardIdx, false);
}

function editarCardPainel(di, ci) {
    const c = baralhos[di].cards[ci];
    abrirModalOverlay();
    document.getElementById('modal-title').innerText = "Editar Card";
    document.getElementById('modal-content').innerHTML = getEditCardToolbarHTML() +
        '<div class="divider" style="height:1px;background:#eee;margin:8px 0"></div>' +
        '<label style="font-size:0.8rem;color:#666;margin-bottom:4px">Frente</label>' +
        '<div id="edit-f-p" class="main-input" contenteditable="true" style="min-height:70px; background:#f5f5f5; border-radius:10px; padding:12px; margin-bottom:12px"></div>' +
        '<label style="font-size:0.8rem;color:#666;margin-bottom:4px">Verso</label>' +
        '<div id="edit-v-p" class="main-input" contenteditable="true" style="min-height:70px; background:#f5f5f5; border-radius:10px; padding:12px; margin-bottom:12px"></div>' +
        '<button type="button" class="browse-btn-apagar-card" onclick="abrirModalConfirmarApagarCard(' + di + ',' + ci + ', true)" style="margin-top:8px; background:#ff3b30; color:white; border:none; padding:10px 16px; border-radius:10px; font-size:0.9rem; cursor:pointer;">Apagar este card</button>';
    document.getElementById('edit-f-p').innerHTML = c.f || '';
    document.getElementById('edit-v-p').innerHTML = c.v || '';
    initEditCardColorPicker();
    document.getElementById('modal-confirm-btn').onclick = function() {
        c.f = document.getElementById('edit-f-p').innerHTML;
        c.v = document.getElementById('edit-v-p').innerHTML;
        salvar(); fecharModal(); abrirPainel();
    };
}

function apagarCardPainelDesdeModal(deckIdx, cardIdx) {
    abrirModalConfirmarApagarCard(deckIdx, cardIdx, true);
}

function abrirModalCriar() {
    abrirModalOverlay();
    document.getElementById('modal-title').innerText = "Novo Baralho";
    document.getElementById('modal-content').innerHTML = `<input type="text" id="deck-n" placeholder="Nome do baralho...">`;
    document.getElementById('modal-confirm-btn').onclick = () => {
        let n = document.getElementById('deck-n').value;
        if (n.trim()) { baralhos.push({ nome: n, cards: [], premium: false }); salvar(); fecharModal(); }
    };
}

function prepararRenomear(i) {
    abrirModalOverlay();
    document.getElementById('modal-title').innerText = "Renomear Baralho";
    document.getElementById('modal-content').innerHTML = `<input type="text" id="edit-n" value="${baralhos[i].nome}">`;
    document.getElementById('modal-confirm-btn').onclick = () => {
        let n = document.getElementById('edit-n').value;
        if (n.trim()) { baralhos[i].nome = n; salvar(); fecharModal(); }
    };
}

function prepararExclusao(i) {
    abrirModalOverlay();
    document.getElementById('modal-title').innerText = "Excluir Baralho?";
    document.getElementById('modal-content').innerHTML = `<p style="color:#666">Isso apagará permanentemente todos os cartões deste baralho e seu progesso será perdido.</p>`;
    document.getElementById('modal-confirm-btn').onclick = () => { baralhos.splice(i, 1); salvar(); fecharModal(); };
}

function abrirModalEditarCard() {
    const c = fila[0];
    abrirModalOverlay();
    document.getElementById('modal-title').innerText = "Editar Cartão";
    document.getElementById('modal-content').innerHTML = getEditCardToolbarHTML() +
        '<div class="divider" style="height:1px;background:#eee;margin:8px 0"></div>' +
        '<label style="font-size:0.8rem;color:#666;margin-bottom:4px">Frente</label>' +
        '<div id="edit-f" class="main-input" contenteditable="true" style="min-height:70px; background:#f5f5f5; border-radius:10px; padding:12px; margin-bottom:12px"></div>' +
        '<label style="font-size:0.8rem;color:#666;margin-bottom:4px">Verso</label>' +
        '<div id="edit-v" class="main-input" contenteditable="true" style="min-height:70px; background:#f5f5f5; border-radius:10px; padding:12px; margin-bottom:12px"></div>' +
        '<button type="button" class="browse-btn-apagar-card" onclick="apagarCardDuranteEstudo()" style="margin-top:8px; background:#ff3b30; color:white; border:none; padding:10px 16px; border-radius:10px; font-size:0.9rem; cursor:pointer;">Apagar este card</button>';
    document.getElementById('edit-f').innerHTML = c.f || '';
    document.getElementById('edit-v').innerHTML = c.v || '';
    initEditCardColorPicker();
    document.getElementById('modal-confirm-btn').onclick = function() {
        c.f = document.getElementById('edit-f').innerHTML;
        c.v = document.getElementById('edit-v').innerHTML;
        salvar(); fecharModal(); carregarCard();
        if (respondido) virarCard();
    };
}

function apagarCardDuranteEstudo() {
    if (!fila || fila.length === 0) return;
    const card = fila[0];
    const deckIdx = card._deckIdx !== undefined ? card._deckIdx : (typeof dIdx !== 'undefined' ? dIdx : 0);
    const b = baralhos[deckIdx];
    if (!b) return;
    if (typeof TUTORIAL_DECK_NOME !== 'undefined' && b.nome === TUTORIAL_DECK_NOME) return;
    if (!confirm('Apagar este card permanentemente? Ele será removido do baralho.')) return;
    const cardIdx = card._cardIdx !== undefined ? card._cardIdx : b.cards.indexOf(card);
    if (cardIdx < 0) return;
    baralhos[deckIdx].cards.splice(cardIdx, 1);
    fila.shift();
    salvar();
    fecharModal();
    if (typeof atualizarContadoresEstudo === 'function') atualizarContadoresEstudo();
    if (fila.length === 0) {
        if (typeof mostrarParabens === 'function') mostrarParabens();
    } else {
        if (typeof carregarCard === 'function') carregarCard();
        if (typeof respondido !== 'undefined' && respondido && typeof virarCard === 'function') virarCard();
    }
}

function toggleMenu(i) {
    const menus = document.querySelectorAll('.options-menu');
    const targetMenu = document.getElementById(`menu-${i}`);
    const isVisible = targetMenu.style.display === 'block';
    menus.forEach(m => m.style.display = 'none');
    if (!isVisible) targetMenu.style.display = 'block';
}

// Fechar teclado ao arrastar/rolar em áreas de escrita (criação de cards e modal de editar)
function deveFecharTecladoNoElemento(el) {
    if (!el) return false;
    return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
}
function fecharTecladoSeEmAreaDeEscrita(e) {
    var active = document.activeElement;
    if (!active || !deveFecharTecladoNoElemento(active)) return;
    var target = e.target;
    if (target.closest('#create-screen') || target.closest('#modal-overlay')) active.blur();
}
(function() {
    document.addEventListener('scroll', fecharTecladoSeEmAreaDeEscrita, true);
    document.addEventListener('touchmove', fecharTecladoSeEmAreaDeEscrita, { passive: true, capture: true });
})();
