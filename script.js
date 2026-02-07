let baralhos = JSON.parse(localStorage.getItem('arion_db_v4')) || [];
        let dIdx = 0, fila = [], respondido = false;
        let corAtual = "#ff0000";
        let onboardingFeito = localStorage.getItem('arion_onboarding') === 'true';

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

        function formatarIntervalo(ms) {
            const min = Math.round(ms / 60000);
            const dia = 1440;
        
            if (min < 60) return `${min} min`;
            if (min < dia) return `${Math.round(min / 60)} h`;
        
            const dias = Math.round(min / dia);
            if (dias < 30) return `${dias} dia${dias > 1 ? 's' : ''}`;
        
            const meses = Math.round(dias / 30);
            if (meses < 12) return `${meses} mês${meses > 1 ? 'es' : ''}`;
        
            const anos = Math.round(meses / 12);
            return `${anos} ano${anos > 1 ? 's' : ''}`;
        }

        function formatar(cmd, val = null) { document.execCommand(cmd, false, val); }
        function atualizarCorPadrao(cor) { corAtual = cor; document.getElementById('current-color').style.background = cor; }
        function aplicarCorPadrao() { document.execCommand('foreColor', false, corAtual); }
        function salvar() { localStorage.setItem('arion_db_v4', JSON.stringify(baralhos)); renderizar(); }
        
        function mudarTela(id) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            const nav = document.getElementById('main-nav');
            if(id === 'study-screen' || id === 'create-screen' || id === 'splash-screen') {
                nav.style.display = 'none';
            } else {
                nav.style.display = 'flex';
                if(id === 'deck-screen') atualizarNav('nav-decks');
            }
        }

        function atualizarNav(id) {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
            const btn = document.getElementById(id);
            if(btn) btn.classList.add('active-nav');
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

        // 2. Função para salvar o card usando os novos IDs e o Ease Factor do Anki
        function salvarCard() {
            const f = document.getElementById('front').innerHTML.trim();
            const v = document.getElementById('back').innerHTML.trim();

            // Valida se não estão vazios (o <br> é o que o navegador coloca quando você apaga tudo)
            if (!f || f === "<br>" || !v || v === "<br>") {
                alert("Por favor, preencha a Pergunta e a Resposta.");
                return;
            }

            // Salva no baralho selecionado (usando dIdx que você já tem no código)
            baralhos[dIdx].cards.push({
                f: f,
                v: v,
                int: 0,       // Intervalo inicial
                ease: 2.5,    // Ease Factor idêntico ao Anki
                rev: Date.now(),
                state: 'new',
                rep: 0
            });

            salvar(); // Chama sua função salvar() que já existe para gravar no localStorage

            // Limpa os campos para o próximo card reaparecer o placeholder
            document.getElementById('front').innerHTML = "";
            document.getElementById('back').innerHTML = "";
            
            // Foca no primeiro campo para agilizar a criação do próximo
            document.getElementById('front').focus();
        }
        function alternarAbasPainel(aba) {
            document.getElementById('tab-all').classList.toggle('active-tab', aba === 'all');
            document.getElementById('tab-premium').classList.toggle('active-tab', aba === 'premium');
            document.getElementById('browse-all-section').style.display = aba === 'all' ? 'block' : 'none';
            document.getElementById('browse-premium-section').style.display = aba === 'premium' ? 'block' : 'none';
            if(aba === 'premium') renderizarGerenciadorPremium();
        }

        function simularAssinatura() {
            const bioDeck = {
                nome: "Biologia: Completo",
                premium: true,
                cards: [
                    {f: "Mitocôndria", v: "ATP", rev: 0, int: 0, ease: 2.5, state: 'new', rep: 0, liberado: false, modulo: "Citologia", submodulo: "Organelas"},
                    {f: "Ribossomos", v: "Proteína", rev: 0, int: 0, ease: 2.5, state: 'new', rep: 0, liberado: false, modulo: "Citologia", submodulo: "Organelas"},
                    {f: "Poríferos", v: "Esponjas", rev: 0, int: 0, ease: 2.5, state: 'new', rep: 0, liberado: false, modulo: "Zoologia", submodulo: "Poríferos"},
                    {f: "Cnidários", v: "Medusas", rev: 0, int: 0, ease: 2.5, state: 'new', rep: 0, liberado: false, modulo: "Zoologia", submodulo: "Cnidários"}
                ]
            };
            baralhos.push(bioDeck);
            salvar();
            alert("Conteúdo Premium assinado! Libere os módulos no Painel.");
            mudarTela('deck-screen');
        }

        function renderizarGerenciadorPremium() {
            const root = document.getElementById('premium-manager-root');
            root.innerHTML = "";

            if(!onboardingFeito) {
                const balloon = document.createElement('div');
                balloon.className = 'onboarding-balloon';
                balloon.innerHTML = `<strong>Dica Árion:</strong> Toda vez que estudar um conteúdo novo em aula, você deve liberar os flashcards aqui para que eles apareçam no seu estudo diário. 😊`;
                balloon.onclick = () => { balloon.remove(); onboardingFeito = true; localStorage.setItem('arion_onboarding', 'true'); };
                root.appendChild(balloon);
            }

            baralhos.forEach((b, dIdx) => {
                if(!b.premium) return;
                
                // Agrupar por modulo e submodulo
                const grupos = {};
                b.cards.forEach((c, cIdx) => {
                    const mod = c.modulo || "Diversos";
                    const sub = c.submodulo || "Geral";
                    if(!grupos[mod]) grupos[mod] = {};
                    if(!grupos[mod][sub]) grupos[mod][sub] = [];
                    grupos[mod][sub].push({card: c, idx: cIdx});
                });

                for(let mod in grupos) {
                    const h = document.createElement('div');
                    h.className = 'module-header';
                    h.innerText = mod;
                    root.appendChild(h);

                    for(let sub in grupos[mod]) {
                        const row = document.createElement('div');
                        row.className = 'submodule-row';
                        const isTodosLiberados = grupos[mod][sub].every(item => item.card.liberado);
                        
                        row.innerHTML = `
                            <span>${sub} <small style="color:gray">(${grupos[mod][sub].length} cards)</small></span>
                            <input type="checkbox" ${isTodosLiberados ? 'checked' : ''} 
                                style="width:20px; height:20px"
                                onchange="toggleSubmodulo(${dIdx}, '${mod}', '${sub}', this.checked)">
                        `;
                        root.appendChild(row);
                    }
                }
            });
        }

        function toggleSubmodulo(dI, mod, sub, status) {
            baralhos[dI].cards.forEach(c => {
                if(c.modulo === mod && c.submodulo === sub) c.liberado = status;
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
                        tr.innerHTML = `<td style="max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${c.f}</td>
                                        <td style="max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${c.v}</td>
                                        <td style="color:#666">${b.nome}</td>`;
                        tr.onclick = () => editarCardPainel(deckIdx, cardIdx);
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
                if(n.trim()) { baralhos.push({nome: n, cards: [], premium: false}); salvar(); fecharModal(); }
            };
        }

        function prepararRenomear(i) {
            document.getElementById('modal-overlay').style.display = 'flex';
            document.getElementById('modal-title').innerText = "Renomear Baralho";
            document.getElementById('modal-content').innerHTML = `<input type="text" id="edit-n" value="${baralhos[i].nome}">`;
            document.getElementById('modal-confirm-btn').onclick = () => {
                let n = document.getElementById('edit-n').value;
                if(n.trim()) { baralhos[i].nome = n; salvar(); fecharModal(); }
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
                if(respondido) virarCard();
            };
        }

        function renderizar() {
            document.getElementById('deck-list').innerHTML = baralhos.map((b, i) => `
                <div class="deck-item ${b.premium ? 'premium' : ''}" onclick="abrirDetalhes(${i})">
                    ${b.premium ? '<div class="premium-badge">PREMIUM</div>' : ''}
                    <div><strong style="${b.premium ? 'color:var(--premium-gold)' : ''}">${b.nome}</strong><br><small style="opacity:0.6">${b.cards.length} cards</small></div>
                    <div class="deck-options-btn" onclick="event.stopPropagation(); toggleMenu(${i})">⋮</div>
                    <div class="options-menu" id="menu-${i}">
                        <button onclick="event.stopPropagation(); prepararRenomear(${i})">Renomear</button>
                        <button style="color:red" onclick="event.stopPropagation(); prepararExclusao(${i})">Excluir</button>
                    </div>
                </div>`).join('');
        }

        function toggleMenu(i) {
            const menus = document.querySelectorAll('.options-menu');
            const targetMenu = document.getElementById(`menu-${i}`);
            const isVisible = targetMenu.style.display === 'block';
            menus.forEach(m => m.style.display = 'none');
            if (!isVisible) targetMenu.style.display = 'block';
        }

        window.addEventListener('click', (e) => {
            if (!e.target.classList.contains('deck-options-btn')) document.querySelectorAll('.options-menu').forEach(m => m.style.display = 'none');
            if (e.target === document.getElementById('modal-overlay')) fecharModal();
        });

        function abrirDetalhes(i, finalizou = false) {
            dIdx = i; const b = baralhos[i]; const h = Date.now();
            // Mantendo sua lógica de filtro original
            fila = b.cards.filter(c => (c.state === 'new' || c.rev <= h) && (!b.premium || c.liberado === true));
            
            const novos = b.cards.filter(c => c.state === 'new' && (!b.premium || c.liberado)).length;
            const revisao = b.cards.filter(c => c.state !== 'new' && c.rev <= h && (!b.premium || c.liberado)).length;

            mudarTela('details-screen');
            document.getElementById('details-deck-name').innerText = b.nome;
            const area = document.getElementById('stats-area');
            const actions = document.getElementById('details-actions');

            if (finalizou && fila.length === 0) {
                area.innerHTML = `<div class="congratulations-rect">Parabéns! Você finalizou os flashcards previstos para hoje</div>`;
                actions.innerHTML = `<button class="btn-gold" onclick="mudarTela('deck-screen')">VOLTAR PARA MEUS BARALHOS</button>`;
            } else {
                const isDisabled = fila.length === 0;
                area.innerHTML = `
                <div class="anki-stats-card" style="box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: none;">
                    <div style="text-align:left">
                        <div class="stat-row">Novo: <span style="color:#2185d0; font-weight:bold">${novos}</span></div>
                        <div class="stat-row">A Revisar: <span style="color:#2e7d32; font-weight:bold">${revisao}</span></div>
                    </div>
                    <button class="btn-anki" 
                        style="background:${isDisabled ? '#e0e0e0' : '#2185d0'}; color:${isDisabled ? '#999' : 'white'}; padding:12px 20px; width:auto; height:auto; cursor:${isDisabled ? 'not-allowed' : 'pointer'}; opacity:${isDisabled ? '0.7' : '1'}; border-radius:10px; border:none; font-weight:bold;" 
                        onclick="${isDisabled ? '' : 'iniciarEstudo(' + dIdx + ')'}" ${isDisabled ? 'disabled' : ''}>Estudar agora</button>
                </div>`;
                actions.innerHTML = `<button class="btn-gold" onclick="abrirCriador(${i})">+ ADICIONAR CARDS</button>`;
            }
        }
        function iniciarEstudo(i) {
            if (i !== undefined) dIdx = i;
            const b = baralhos[dIdx];
            const hoje = new Date().setHours(0,0,0,0);
            
            // Filtra apenas os cards que precisam ser estudados hoje
            fila = b.cards.filter(c => (c.state === 'new' || c.rev <= Date.now()) && (!b.premium || c.liberado));
            
            if(fila.length === 0) {
                abrirDetalhes(dIdx, true); // Se não tiver nada, volta e mostra os parabéns
                return;
            }
            
            mudarTela('study-screen');
            carregarCard();
        }
        function carregarCard() {
            const c = fila[0];
            respondido = false;
            
            const cardBox = document.querySelector('.card-box');
            cardBox.style.transform = 'translate(0,0) rotate(0)';
            cardBox.style.transition = 'none';
            // Restaurando a sombra e removendo bordas
            cardBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
            cardBox.style.border = 'none';

            document.getElementById('display-front').innerHTML = c.f;
            document.getElementById('display-back').style.display = 'none';
            document.getElementById('card-divider').style.display = 'none';
            document.getElementById('anki-btns').style.display = 'none';
        }

        function virarCard() {
            if(respondido) return;
            respondido = true;
            const c = fila[0];
            document.getElementById('display-back').innerHTML = c.v;
            document.getElementById('display-back').style.display = 'block';
            document.getElementById('card-divider').style.display = 'block';
            document.getElementById('anki-btns').style.display = 'flex';
            
            const int = c.int || 0;
            const ease = c.ease || 2.5;

            if(c.state === 'new') {
                document.getElementById('t0').innerText = "<1m"; document.getElementById('t1').innerText = "2m";
                document.getElementById('t2').innerText = "1d"; document.getElementById('t3').innerText = "4d";
            } else {
                document.getElementById('t0').innerText = "<10m"; 
                document.getElementById('t1').innerText = Math.max(1, Math.round(int * 1.2)) + "d";
                document.getElementById('t2').innerText = Math.round(int * ease) + "d"; 
                document.getElementById('t3').innerText = Math.round(int * ease * 1.3) + "d";
            }
        }


////////////////////AQUI ESTÁ A TODA REVISÃO ESPAÇADA DO ANKI/////////////////
        
        function responder(q) {

           let c = fila.shift();

    // ======== CONSTANTES E FUNÇÕES AUXILIARES ========
    const agora = Date.now();
    const dia = 86400000;

    // Configurações padrão do Anki
    const learningSteps = [1, 10]; // minutos
    const lapseSteps = [10];       // minutos
    const MAX_INTERVAL = 75;       // limite máximo em dias (2,5 meses)
    const MIN_EASE = 1.3;          // menor EF possível

    const marcarMinutos = (min) => agora + (min * 60000);
    const marcarDias = (dias) => agora + (dias * dia);

    // Inicializa propriedades caso não existam
    if (!c.ease) c.ease = 2.5;
    if (!c.int) c.int = 0;
    if (!c.step) c.step = 0;
    if (!c.state) c.state = 'new';

    // ======== FUNÇÕES DE ESTADO ========

    function processarNewOuLearning(c, q) {

        // AGAIN → volta para primeiro passo
        if (q === 0) {
            c.state = 'learning';
            c.step = 0;
            c.rev = marcarMinutos(learningSteps[0]);
            return reenfileirar(c);
        }

        // HARD → repete o mesmo passo
        if (q === 1) {
            c.state = 'learning';
            c.rev = marcarMinutos(learningSteps[c.step]);
            return reenfileirar(c);
        }

        // GOOD → avança passo ou vira review
        if (q === 2) {
            c.step++;
            if (c.step < learningSteps.length) {
                c.state = 'learning';
                c.rev = marcarMinutos(learningSteps[c.step]);
                return reenfileirar(c);
            } else {
                // terminou steps → vira review
                c.state = 'review';
                c.int = 1; // 1 dia
                c.rev = marcarDias(1);
                return finalizar();
            }
        }

        // EASY → pula direto para review com 4 dias
        if (q === 3) {
            c.state = 'review';
            c.int = 4;
            c.rev = marcarDias(4);
            return finalizar();
        }
        }

    function processarReview(c, q) {

        // AGAIN → Lapse: volta para aprendizado
        if (q === 0) {
            c.ease = Math.max(MIN_EASE, c.ease - 0.2);
            c.state = 'learning';
            c.step = 0;
            c.rev = marcarMinutos(lapseSteps[0]);
            return reenfileirar(c);
        }

        // HARD
        if (q === 1) {
            c.ease = Math.max(MIN_EASE, c.ease - 0.15);
            c.int = Math.max(1, Math.round(c.int * 1.2));
        }

        // GOOD
        else if (q === 2) {
            c.int = Math.round(c.int * c.ease);
        }

        // EASY
        else if (q === 3) {
            c.ease += 0.15;
            c.int = Math.round(c.int * c.ease * 1.3);
        }

        // Aplicar limite máximo
        c.int = Math.min(c.int, MAX_INTERVAL);

        // Agendar próxima revisão
        c.rev = marcarDias(c.int);

        return finalizar();
    }

    // ======== FUNÇÕES AUXILIARES DE FLUXO ========

    function reenfileirar(c) {
        fila.push(c);
        salvar();
        carregarCard();
    }

    function finalizar() {
        c.rep++;
        salvar();

        if (fila.length > 0) carregarCard();
        else abrirDetalhes(dIdx, true);
    }

    // ======== DISPATCH (SEPARA POR TIPO DE CARTÃO) ========

    if (c.state === 'new' || c.state === 'learning') {
        return processarNewOuLearning(c, q);
    } else {
        return processarReview(c, q);
    }
    }







            
        (function(){
            const cardBox = document.querySelector('.card-box');
            let startX = 0, startY = 0, isSwiping = false;

            cardBox.addEventListener('touchstart', e => {
                if (!respondido) { isSwiping = false; return; }
                isSwiping = true;
                startX = e.touches[0].clientX; startY = e.touches[0].clientY;
                cardBox.style.transition = 'none';
            }, {passive: true});

cardBox.addEventListener('touchmove', e => {
                if (!isSwiping || !respondido) return;
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                if (e.cancelable) e.preventDefault();
                cardBox.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.05}deg)`;
                
                if (dx > 50) { 
                    cardBox.style.border = '3px solid #5cb85c';
                    cardBox.style.boxShadow = '0 10px 30px rgba(92, 184, 92, 0.4)'; // Sombra Verde
                }
                else if (dx < -50) { 
                    cardBox.style.border = '3px solid #d9534f';
                    cardBox.style.boxShadow = '0 10px 30px rgba(217, 83, 79, 0.4)'; // Sombra Vermelha
                }
                else {
                    cardBox.style.border = 'none';
                    cardBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'; // Volta ao normal
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
                    cardBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                }
            });

        })();

