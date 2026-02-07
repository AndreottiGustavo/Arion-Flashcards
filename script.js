let baralhos = JSON.parse(localStorage.getItem('arion_db_v4')) || [];
let dIdx = 0, fila = [], respondido = false;
let corAtual = "#ff0000";

window.onload = () => {
    setTimeout(() => {
        document.getElementById('splash-screen').style.opacity = '0';
        setTimeout(() => { 
            document.getElementById('splash-screen').style.display = 'none'; 
            mudarTela('deck-screen');
            renderizar(); 
        }, 500);
    }, 1500);
    
    document.addEventListener('selectionchange', () => {
        if(document.getElementById('create-screen').classList.contains('active')){
            document.getElementById('btn-sup').classList.toggle('active-tool', document.queryCommandState('superscript'));
            document.getElementById('btn-sub').classList.toggle('active-tool', document.queryCommandState('subscript'));
        }
    });
};

function mudarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0,0);
}

function renderizar() {
    const list = document.getElementById('deck-list');
    list.innerHTML = '';
    baralhos.forEach((d, i) => {
        const hoje = Date.now();
        const cardsHoje = d.cards.filter(c => c.rev <= hoje).length;
        list.innerHTML += `
            <div class="deck-card" onclick="abrirDetalhes(${i})">
                <div class="deck-info">
                    <h3>${d.nome}</h3>
                    <span class="badge">${d.cards.length} cards</span>
                </div>
                <div style="text-align:right">
                    <div style="color:${cardsHoje > 0 ? '#ff4d4d' : '#5cb85c'}; font-weight:bold; font-size:0.9rem">
                        ${cardsHoje} para hoje
                    </div>
                </div>
            </div>`;
    });
}

function abrirModalDeck() { document.getElementById('modal-overlay').style.display = 'flex'; }
function fecharModal() { document.getElementById('modal-overlay').style.display = 'none'; }

function salvarDeck() {
    const nome = document.getElementById('deck-name').value;
    if(!nome) return;
    baralhos.push({ nome, cards: [] });
    salvar();
    fecharModal();
    renderizar();
    document.getElementById('deck-name').value = '';
}

function abrirDetalhes(idx, vindoDeEstudo = false) {
    dIdx = idx;
    const d = baralhos[dIdx];
    mudarTela('detail-screen');
    document.getElementById('detail-title').innerText = d.nome;

    const hoje = Date.now();
    const paraRevisar = d.cards.filter(c => c.rev <= hoje).length;
    const novos = d.cards.filter(c => !c.rep || c.rep === 0).length;

    document.getElementById('deck-stats-container').innerHTML = `
        <div class="anki-stats-card">
            <div><div style="font-size:0.8rem; color:gray">PARA REVISAR</div><div style="font-size:1.5rem; font-weight:bold; color:#ff4d4d">${paraRevisar}</div></div>
            <div><div style="font-size:0.8rem; color:gray">NOVOS</div><div style="font-size:1.5rem; font-weight:bold; color:#5bc0de">${novos}</div></div>
            <div><div style="font-size:0.8rem; color:gray">TOTAL</div><div style="font-size:1.5rem; font-weight:bold">${d.cards.length}</div></div>
        </div>
    `;

    const cList = document.getElementById('card-list');
    cList.innerHTML = '';
    d.cards.forEach((c, ci) => {
        cList.innerHTML += `
            <div style="background:white; color:#333; padding:15px; border-radius:12px; margin-bottom:10px; font-size:0.9rem; display:flex; justify-content:space-between">
                <div style="max-width:80%">${c.f.substring(0,60)}...</div>
                <button onclick="deletarCard(${ci})" style="color:red; background:none; border:none; font-weight:bold">X</button>
            </div>`;
    });
}

function abrirCriador() { mudarTela('create-screen'); document.getElementById('front').focus(); }

function formatar(cmd) { document.execCommand(cmd, false, null); }

function atualizarCorPadrao(cor) {
    corAtual = cor;
    document.getElementById('current-color').style.background = cor;
}

function aplicarCorPadrao() { document.execCommand('foreColor', false, corAtual); }

function salvarCard() {
    const f = document.getElementById('front').innerHTML;
    const b = document.getElementById('back').innerHTML;
    if(!f || !b) return;
    baralhos[dIdx].cards.push({ f, b, rev: Date.now(), rep: 0, ease: 2.5, int: 0, step: 0, state: 'new' });
    salvar();
    document.getElementById('front').innerHTML = '';
    document.getElementById('back').innerHTML = '';
    document.getElementById('front').focus();
}

function deletarCard(ci) {
    if(confirm("Excluir este card?")) {
        baralhos[dIdx].cards.splice(ci, 1);
        salvar();
        abrirDetalhes(dIdx);
    }
}

function iniciarEstudo() {
    const hoje = Date.now();
    fila = baralhos[dIdx].cards.filter(c => c.rev <= hoje);
    if(fila.length === 0) { alert("Nenhum card para revisar agora!"); return; }
    mudarTela('study-screen');
    document.getElementById('study-area').style.display = 'block';
    document.getElementById('congratulations-container').style.display = 'none';
    carregarCard();
}

function carregarCard() {
    if(fila.length === 0) {
        document.getElementById('study-area').style.display = 'none';
        document.getElementById('congratulations-container').style.display = 'block';
        return;
    }
    const c = fila[0];
    const card = document.getElementById('flashcard');
    card.style.transform = 'translate(0,0) rotate(0)';
    card.style.transition = 'none';
    card.style.border = 'none';
    card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.18)';
    
    document.getElementById('card-content').innerHTML = c.f;
    document.getElementById('study-progress').innerText = fila.length + " restantes";
    document.getElementById('controls').style.display = 'none';
    document.querySelector('.divider').style.display = 'none';
    respondido = false;
}

function virarCard() {
    if(respondido) return;
    document.getElementById('card-content').innerHTML += `<div class="divider" style="display:block"></div>` + fila[0].b;
    document.getElementById('controls').style.display = 'grid';
    respondido = true;
}

function responder(q) {
    let c = fila.shift();
    const agora = Date.now();
    const dia = 86400000;
    const learningSteps = [1, 10]; 
    const lapseSteps = [10];       
    const MAX_INTERVAL = 75;       
    const MIN_EASE = 1.3;          

    const marcarMinutos = (min) => agora + (min * 60000);
    const marcarDias = (dias) => agora + (dias * dia);

    if (!c.ease) c.ease = 2.5;
    if (!c.int) c.int = 0;
    if (!c.step) c.step = 0;
    if (!c.state) c.state = 'new';

    function processarNewOuLearning(c, q) {
        if (q === 0) {
            c.state = 'learning'; c.step = 0;
            c.rev = marcarMinutos(learningSteps[0]);
            return reenfileirar(c);
        }
        if (q === 1) {
            c.state = 'learning';
            c.rev = marcarMinutos(learningSteps[c.step]);
            return reenfileirar(c);
        }
        if (q === 2) {
            c.step++;
            if (c.step < learningSteps.length) {
                c.state = 'learning';
                c.rev = marcarMinutos(learningSteps[c.step]);
                return reenfileirar(c);
            } else {
                c.state = 'review'; c.int = 1;
                c.rev = marcarDias(1);
                return finalizar();
            }
        }
        if (q === 3) {
            c.state = 'review'; c.int = 4;
            c.rev = marcarDias(4);
            return finalizar();
        }
    }

    function processarReview(c, q) {
        if (q === 0) {
            c.ease = Math.max(MIN_EASE, c.ease - 0.2);
            c.state = 'learning'; c.step = 0;
            c.rev = marcarMinutos(lapseSteps[0]);
            return reenfileirar(c);
        }
        if (q === 1) {
            c.ease = Math.max(MIN_EASE, c.ease - 0.15);
            c.int = Math.max(1, Math.round(c.int * 1.2));
        }
        else if (q === 2) { c.int = Math.round(c.int * c.ease); }
        else if (q === 3) {
            c.ease += 0.15;
            c.int = Math.round(c.int * c.ease * 1.3);
        }
        c.int = Math.min(c.int, MAX_INTERVAL);
        c.rev = marcarDias(c.int);
        return finalizar();
    }

    function reenfileirar(c) { fila.push(c); salvar(); carregarCard(); }
    function finalizar() { c.rep++; salvar(); if (fila.length > 0) carregarCard(); else abrirDetalhes(dIdx, true); }

    if (c.state === 'new' || c.state === 'learning') {
        processarNewOuLearning(c, q);
    } else {
        processarReview(c, q);
    }
}

function salvar() { localStorage.setItem('arion_db_v4', JSON.stringify(baralhos)); }
function finalizarEstudo() { renderizar(); mudarTela('deck-screen'); }

// --- GESTOS (SWIPE) ---
(function(){
    let startX = 0, isSwiping = false, touchStartX = 0;
    const cardBox = document.getElementById('flashcard');

    document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
    document.addEventListener('touchend', e => {
        let touchEndX = e.changedTouches[0].screenX;
        if (touchStartX < 50 && touchEndX > touchStartX + 100) {
            const telaAtiva = document.querySelector('.screen.active').id;
            if (['study-screen', 'create-screen', 'browse-screen'].includes(telaAtiva)) {
                telaAtiva === 'create-screen' ? abrirDetalhes(dIdx) : mudarTela('deck-screen');
            }
        }
    });

    cardBox.addEventListener('touchstart', e => {
        if (!respondido) return;
        startX = e.touches[0].clientX;
        isSwiping = true;
        cardBox.style.transition = 'none';
    });

    cardBox.addEventListener('touchmove', e => {
        if (!isSwiping) return;
        const dx = e.touches[0].clientX - startX;
        cardBox.style.transform = `translate(${dx}px, 0) rotate(${dx * 0.05}deg)`;
        if (dx > 50) {
            cardBox.style.border = '3px solid #5cb85c';
            cardBox.style.boxShadow = '0 10px 30px rgba(92, 184, 92, 0.4)';
        } else if (dx < -50) {
            cardBox.style.border = '3px solid #d9534f';
            cardBox.style.boxShadow = '0 10px 30px rgba(217, 83, 79, 0.4)';
        } else {
            cardBox.style.border = 'none';
            cardBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
        }
    }, {passive: false});

    cardBox.addEventListener('touchend', e => {
        if (!isSwiping) return;
        isSwiping = false;
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > 100) {
            cardBox.style.transition = 'transform 0.4s ease-out';
            cardBox.style.transform = `translate(1000px, 0) rotate(30deg)`;
            setTimeout(() => responder(2), 200);
        } else if (dx < -100) {
            cardBox.style.transition = 'transform 0.4s ease-out';
            cardBox.style.transform = `translate(-1000px, 0) rotate(-30deg)`;
            setTimeout(() => responder(0), 200);
        } else {
            cardBox.style.transition = 'transform 0.3s ease';
            cardBox.style.transform = 'translate(0,0) rotate(0)';
            cardBox.style.border = 'none';
        }
    });
})();