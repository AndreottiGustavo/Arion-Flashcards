// ========== GESTOS (swipe no card, swipe para voltar, swipe em decks, menu sanduíche) ==========
(function () {
    const cardBox = document.querySelector('.card-box');
    if (!cardBox) return;
    let startX = 0, startY = 0, isSwiping = false;
    let swipeIntent = null;
    const THRESHOLD_PX = 12;
    cardBox.addEventListener('touchstart', e => {
        if (!cardVirado || respondido) { isSwiping = false; swipeIntent = null; return; }
        isSwiping = true;
        swipeIntent = null;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        cardBox.style.transition = 'none';
    }, { passive: true });
    cardBox.addEventListener('touchmove', e => {
        if (!cardVirado || respondido) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (swipeIntent === null) {
            if (Math.abs(dx) > THRESHOLD_PX || Math.abs(dy) > THRESHOLD_PX) swipeIntent = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
        }
        if (swipeIntent === 'vertical') return;
        if (swipeIntent !== 'horizontal') return;
        if (e.cancelable) e.preventDefault();
        cardBox.style.transform = `translate(${dx}px, 0) rotate(${dx * 0.05}deg)`;
        if (dx > 50) { cardBox.style.border = '3px solid #5cb85c'; cardBox.style.boxShadow = '0 10px 30px rgba(92, 184, 92, 0.4)'; }
        else if (dx < -50) { cardBox.style.border = '3px solid #d9534f'; cardBox.style.boxShadow = '0 10px 30px rgba(217, 83, 79, 0.4)'; }
        else { cardBox.style.border = 'none'; cardBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'; }
    }, { passive: false });
    cardBox.addEventListener('touchend', e => {
        if (!isSwiping) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (swipeIntent === 'horizontal') {
            if (dx > 100) { cardBox.style.transition = 'transform 0.4s ease-out'; cardBox.style.transform = 'translate(1000px, 0) rotate(30deg)'; setTimeout(() => responder(2), 200); }
            else if (dx < -100) { cardBox.style.transition = 'transform 0.4s ease-out'; cardBox.style.transform = 'translate(-1000px, 0) rotate(-30deg)'; setTimeout(() => responder(0), 200); }
            else { cardBox.style.transition = 'transform 0.3s ease'; cardBox.style.transform = 'translate(0,0) rotate(0)'; cardBox.style.border = 'none'; cardBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'; }
        }
        isSwiping = false;
        swipeIntent = null;
    });
})();

(function () {
    let touchStartX = 0;
    let initialLeft = 0;
    let telaAtual = null;
    let telaFundo = null;
    const bordaSensivel = 28;
    const distanciaMinima = 100;
    window.addEventListener('touchstart', e => {
        const menu = document.getElementById('main-nav');
        if (menu && menu.classList.contains('show')) return;
        if (e.target.closest('.deck-content') || e.target.closest('.card-box')) { telaAtual = null; return; }
        touchStartX = (e.touches && e.touches[0]) ? e.touches[0].screenX : 0;
        telaAtual = document.querySelector('.screen.active');
        if (!telaAtual || telaAtual.id === 'deck-screen') { telaAtual = null; return; }
        if (touchStartX < bordaSensivel) {
            initialLeft = telaAtual.getBoundingClientRect().left;
            telaAtual.style.transition = 'none';
            let idDestino = (telaAtual.id === 'study-screen') ? 'details-screen' : 'deck-screen';
            telaFundo = document.getElementById(idDestino);
            if (telaFundo) {
                telaFundo.style.display = 'flex';
                telaFundo.style.transition = 'none';
                telaFundo.style.opacity = '0.5';
                telaFundo.style.left = initialLeft + 'px';
                telaFundo.style.transform = 'translateX(0) scale(0.95)';
                telaFundo.style.zIndex = '1';
                telaAtual.style.left = initialLeft + 'px';
                telaAtual.style.transform = 'translateX(0)';
                telaAtual.style.zIndex = '2';
            }
        }
    }, { passive: true });
    window.addEventListener('touchmove', e => {
        if (!telaAtual || touchStartX >= bordaSensivel) return;
        if (e.target.closest('.deck-content') || e.target.closest('.card-box')) return;
        const touch = (e.touches && e.touches[0]) ? e.touches[0] : e.changedTouches[0];
        const currentX = touch.screenX;
        const deslocamento = Math.max(0, currentX - touchStartX);
        const progresso = Math.min(1, deslocamento / window.innerWidth);
        telaAtual.style.transform = `translateX(${deslocamento}px)`;
        telaAtual.style.boxShadow = '-10px 0 20px rgba(0,0,0,0.2)';
        if (telaFundo) { telaFundo.style.opacity = 0.5 + (progresso * 0.5); telaFundo.style.transform = `scale(${0.95 + (progresso * 0.05)})`; }
    }, { passive: true });
    window.addEventListener('touchend', e => {
        if (!telaAtual || touchStartX >= bordaSensivel) return;
        const touchEndX = e.changedTouches[0].screenX;
        const deslocamentoFinal = touchEndX - touchStartX;
        telaAtual.style.transition = 'transform 0.3s ease-out';
        if (telaFundo) telaFundo.style.transition = 'all 0.3s ease-out';
        if (deslocamentoFinal > distanciaMinima) {
            telaAtual.style.transform = 'translateX(100vw)';
            if (telaFundo) { telaFundo.style.opacity = '1'; telaFundo.style.transform = 'scale(1)'; }
            setTimeout(() => {
                const idAtual = telaAtual.id;
                if (idAtual === 'study-screen') sairEstudo();
                else { mudarTela('deck-screen'); atualizarNav('nav-decks'); }
                requestAnimationFrame(() => { resetEstilos(telaAtual); if (telaFundo) resetEstilos(telaFundo); telaAtual = null; telaFundo = null; });
            }, 300);
        } else {
            telaAtual.style.transform = 'translateX(0)';
            if (telaFundo) {
                telaFundo.style.opacity = '0.5';
                telaFundo.style.transform = 'scale(0.95)';
                setTimeout(() => { if (telaFundo && !telaFundo.classList.contains('active')) { telaFundo.style.display = 'none'; resetEstilos(telaFundo); } }, 300);
            }
            setTimeout(() => {
                if (telaAtual) {
                    telaAtual.style.left = '';
                    telaAtual.style.transform = '';
                    telaAtual.style.boxShadow = '';
                    telaAtual.style.transition = '';
                }
            }, 300);
        }
    }, { passive: true });
})();

function resetEstilos(el) {
    if (!el) return;
    if (el.classList.contains('active')) {
        el.style.transition = 'none';
        el.style.left = '';
        el.style.transform = '';
        el.style.boxShadow = '';
        el.style.zIndex = '';
        el.style.opacity = '';
        return;
    }
    el.style.transition = 'none';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.boxShadow = '';
    el.style.zIndex = '';
    el.style.opacity = '';
    setTimeout(() => { el.style.left = ''; el.style.transition = ''; }, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('menu-toggle');
    const menu = document.getElementById('main-nav');
    if (btn && menu) {
        btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
        document.addEventListener('click', (e) => {
            if (menu.classList.contains('show') && !menu.contains(e.target) && e.target !== btn) menu.classList.remove('show');
        });
        menu.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => menu.classList.remove('show')));
    }
});

let touchStartX = 0;
let touchEndX = 0;
let currentSwipeEl = null;
document.addEventListener('touchstart', e => {
    const menu = document.getElementById('main-nav');
    if (menu && menu.classList.contains('show')) return;
    if (e.target.closest('.deck-content') || e.target.closest('.card-box')) { currentSwipeEl = null; return; }
    touchStartX = (e.touches && e.touches[0]) ? e.touches[0].screenX : 0;
    currentSwipeEl = e.target.closest('.screen.active');
}, { passive: true });
document.addEventListener('touchmove', e => {
    if (!currentSwipeEl || touchStartX > 50) return;
    if (e.target.closest('.deck-content') || e.target.closest('.card-box')) return;
    const touch = (e.touches && e.touches[0]) ? e.touches[0] : e.changedTouches[0];
    let moveX = touch.screenX - touchStartX;
    if (moveX > 0) { currentSwipeEl.style.transform = `translateX(calc(-50% + ${moveX}px))`; currentSwipeEl.style.transition = 'none'; }
}, { passive: true });
document.addEventListener('touchend', e => {
    if (!currentSwipeEl || touchStartX > 50) return;
    touchEndX = e.changedTouches[0].screenX;
    let diff = touchEndX - touchStartX;
    if (diff > 100) {
        const idAtual = currentSwipeEl.id;
        if (idAtual === 'details-screen' || idAtual === 'store-screen' || idAtual === 'browse-screen' || idAtual === 'create-screen' || idAtual === 'stats-screen' || idAtual === 'vestibulares-screen') mudarTela('deck-screen');
        else if (idAtual === 'study-screen') sairEstudo();
        else resetSwipe(currentSwipeEl);
    } else resetSwipe(currentSwipeEl);
    currentSwipeEl = null;
}, { passive: true });

function resetSwipe(el) {
    if (!el) return;
    el.style.transition = 'transform 0.3s ease';
    el.style.transform = 'translateX(-50%)';
}

const SWIPE_ACTIVATE_PX = 28;
const SWIPE_OPEN_MENU_PX = 95;
let swipeStartX = 0;
let swipeStartY = 0;
let currentSwipeX = 0;
let deckSwipeEl = null;
let deckSwipeActivated = false;
let lastSwipeTarget = null;
let lastSwipeTime = 0;

function handleSwipeStart(e) {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    e.currentTarget.style.transition = 'none';
}
function handleSwipeMove(e) {
    let diffX = e.touches[0].clientX - swipeStartX;
    let diffY = e.touches[0].clientY - (swipeStartY || 0);
    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (e.cancelable) e.preventDefault();
    let diff = diffX;
    if (diff > 100) diff = 100;
    if (diff < -180) diff = -180;
    currentSwipeX = e.touches[0].clientX;
    e.currentTarget.style.transform = `translateX(${diff}px)`;
}
function handleSwipeEnd(e) {
    const el = e.currentTarget;
    el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    const finalDiff = currentSwipeX - swipeStartX;
    if (finalDiff < -70) el.style.transform = 'translateX(-150px)';
    else if (finalDiff > 50) el.style.transform = 'translateX(80px)';
    else el.style.transform = 'translateX(0)';
}

(function initDeckSwipeDelegation() {
    const list = document.getElementById('deck-list');
    if (!list) return;
    list.addEventListener('touchstart', e => {
        const card = e.target.closest('.deck-content');
        if (!card) return;
        deckSwipeEl = card;
        deckSwipeActivated = false;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        currentSwipeX = swipeStartX;
        card.style.transition = 'none';
    }, { passive: true, capture: true });
    list.addEventListener('touchmove', e => {
        if (!deckSwipeEl) return;
        const card = e.target.closest('.deck-content');
        if (!card || card !== deckSwipeEl) return;
        const diffX = e.touches[0].clientX - swipeStartX;
        const diffY = e.touches[0].clientY - swipeStartY;
        if (Math.abs(diffY) > Math.abs(diffX)) return;
        if (!deckSwipeActivated) { if (Math.abs(diffX) < SWIPE_ACTIVATE_PX) return; deckSwipeActivated = true; }
        if (e.cancelable) e.preventDefault();
        let diff = diffX;
        if (diff > 100) diff = 100;
        if (diff < -180) diff = -180;
        currentSwipeX = e.touches[0].clientX;
        deckSwipeEl.style.transform = `translateX(${diff}px)`;
    }, { passive: false, capture: true });
    list.addEventListener('touchend', () => {
        if (!deckSwipeEl) return;
        const el = deckSwipeEl;
        const finalDiff = currentSwipeX - swipeStartX;
        deckSwipeEl = null;
        el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        if (finalDiff < -SWIPE_OPEN_MENU_PX) { el.style.transform = 'translateX(-150px)'; lastSwipeTarget = el; lastSwipeTime = Date.now(); }
        else if (finalDiff > 50) el.style.transform = 'translateX(80px)';
        else el.style.transform = 'translateX(0)';
    }, { passive: true, capture: true });
    list.addEventListener('touchcancel', () => { deckSwipeEl = null; deckSwipeActivated = false; }, { passive: true, capture: true });
    list.addEventListener('click', e => {
        const card = e.target.closest('.deck-content');
        if (!card) return;
        if (lastSwipeTarget === card && (Date.now() - lastSwipeTime) < 450) { e.preventDefault(); e.stopPropagation(); lastSwipeTarget = null; return; }
        const i = parseInt(card.getAttribute('data-deck-index'), 10);
        if (!isNaN(i) && typeof abrirDetalhes === 'function') abrirDetalhes(i);
    }, true);
})();

function fecharTodosSwipes() {
    document.querySelectorAll('.deck-content').forEach(card => {
        if (card.style.transform !== 'translateX(0px)' && card.style.transform !== '') {
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = 'translateX(0px)';
        }
    });
}
document.addEventListener('scroll', fecharTodosSwipes, true);
const deckListElement = document.getElementById('deck-list');
if (deckListElement) deckListElement.addEventListener('scroll', fecharTodosSwipes);
