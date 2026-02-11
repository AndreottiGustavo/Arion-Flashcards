// ========== CONFIGURAÇÕES DADOS (localStorage)==========
let meusVestibulares = JSON.parse(localStorage.getItem('meusVestibulares')) || []; // ADICIONE ESTA LINHA
let dIdx = 0, fila = [], respondido = false;
let corAtual = "#ff0000";
let onboardingFeito = localStorage.getItem('arion_onboarding') === 'true';
let usuarioLogado = null;

function inicializarApp() {
    if (window.auth) {
        window.onAuthStateChanged(window.auth, (user) => {
            const loginScreen = document.getElementById('login-forced-screen');
            const splash = document.getElementById('splash-screen');

            if (user) {
                usuarioLogado = user;
                sincronizarComNuvem().then(() => {
                    setTimeout(() => {
                        if(loginScreen) loginScreen.style.display = 'none';
                        if(splash) splash.style.display = 'none';
                        mudarTela('deck-screen');
                        renderizar();
                    }, 1500); 
                });
            } else {
                if(splash) splash.style.display = 'none';
                if(loginScreen) {
                    loginScreen.style.display = 'flex';
                    loginScreen.style.opacity = '1';
                    mudarTela('login-forced-screen');
                }
            }
        });
    } else {
        // Se o Firebase ainda não carregou, tenta novamente rápido (50ms)
        setTimeout(inicializarApp, 50);
    }
}
function inicializarApp() {
    // 1. Verifica se o Firebase Auth está carregado
    if (window.auth) {
        window.auth.onAuthStateChanged((user) => {
            const loginScreen = document.getElementById('login-forced-screen');
            const splash = document.getElementById('splash-screen');

            if (user) {
                // --- CENÁRIO: USUÁRIO JÁ LOGADO ---
                usuarioLogado = user;
                console.log("Usuário detectado:", user.displayName);
                
                sincronizarComNuvem().then(() => {
                    // Mantém o Splash por 1.5s para carregar visualmente o app
                    setTimeout(() => {
                        if(loginScreen) loginScreen.style.display = 'none';
                        if(splash) splash.style.display = 'none';
                        
                        mudarTela('deck-screen');
                        renderizar();
                    }, 1500); 
                });
            } else {
                // --- CENÁRIO: USUÁRIO DESLOGADO ---
                if(splash) splash.style.display = 'none';
                
                if(loginScreen) {
                    loginScreen.style.display = 'flex';
                    loginScreen.style.opacity = '1';
                    mudarTela('login-forced-screen');
                }
            }
        });
    } else {
        // Caso o Firebase demore a carregar, tenta novamente em 50ms
        setTimeout(inicializarApp, 50);
    }
}

// Chame a função para ela começar a rodar assim que o script carregar
inicializarApp();

async function loginComGoogle() {
    // 1. Verifica se o Firebase global existe (Padrão Compat)
    if (typeof firebase === 'undefined') return alert("Erro: Firebase não carregado.");
    
    // 2. Define o Provider
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        // 3. Login direto pelo objeto firebase (mais estável)
        const result = await firebase.auth().signInWithPopup(provider);
        usuarioLogado = result.user;
        
        console.log("Login OK para:", usuarioLogado.displayName);

        // 4. Aguarda os dados da nuvem
        await sincronizarComNuvem();

        // 5. Esconde as telas de bloqueio
        const loginScreen = document.getElementById('login-forced-screen');
        const splash = document.getElementById('splash-screen');

        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        if (splash) {
            splash.style.display = 'none';
        }

        // 6. Troca a tela e renderiza
        mudarTela('deck-screen');
        renderizar();

    } catch (error) {
        console.error("Erro no login:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert("Erro ao realizar login com Google.");
        }
    }
}


async function loginComApple() {
    // 1. Verifica o Firebase global (Padrão Compat)
    if (typeof firebase === 'undefined' || !firebase.auth) {
        return alert("Erro: Firebase não carregado.");
    }

    // 2. Define o Provider da Apple no padrão Compat
    const provider = new firebase.auth.OAuthProvider('apple.com');
    
    try {
        // 3. Login direto pelo objeto firebase
        const result = await firebase.auth().signInWithPopup(provider);
        usuarioLogado = result.user;
        
        console.log("Logado com Apple:", usuarioLogado.displayName);

        // 4. Aguarda sincronização dos dados
        await sincronizarComNuvem();

        // 5. Esconde as telas de bloqueio
        const loginScreen = document.getElementById('login-forced-screen');
        const splash = document.getElementById('splash-screen');

        if (loginScreen) {
            loginScreen.style.display = 'none';
            loginScreen.classList.remove('active');
        }
        if (splash) splash.style.display = 'none';

        // 6. Muda a tela e renderiza
        mudarTela('deck-screen');
        renderizar();

    } catch (error) {
        console.error("Erro no login Apple:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            alert("Erro ao logar com Apple. Verifique se o provedor está ativo no console do Firebase.");
        }
    }
}


async function deslogar() {
    try {
        await window.auth.signOut();
        
        // Limpa o usuário atual
        usuarioLogado = null;

       

        // Voltar para a tela de login
        mudarTela("login-forced-screen");

        console.log("Usuário deslogado.");
    } catch (e) {
        console.error("Erro ao deslogar:", e);
    }
}


// =============== backup nuvem ===================


async function sincronizarComNuvem() {
    if (!usuarioLogado || !window.db || !window.db.collection) return;

    try {
        const docRef = window.db.collection("usuarios").doc(usuarioLogado.uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const dados = docSnap.data();
            
            // Sincroniza Baralhos
            if (dados.baralhos) {
                baralhos = dados.baralhos;
                localStorage.setItem('arion_db_v4', JSON.stringify(baralhos));
            }

            // Sincroniza Vestibulares (A linha que faltava no seu modelo)
            if (dados.meusVestibulares) {
                meusVestibulares = dados.meusVestibulares;
                localStorage.setItem('meusVestibulares', JSON.stringify(meusVestibulares));
            }

            // Sincroniza Streak
            if (dados.dadosStreak) {
                localStorage.setItem('arion_streak_data', JSON.stringify(dados.dadosStreak));
            }
            
            renderizar();
            if (typeof renderizarVestibulares === 'function') renderizarVestibulares();
        }
    } catch (e) {
        console.error("Erro na sincronização:", e);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    sincronizarComNuvem();

    document.addEventListener('selectionchange', () => {
        if(document.getElementById('create-screen').classList.contains('active')){
            const isSup = document.queryCommandState('superscript');
            const isSub = document.queryCommandState('subscript');
            const btnSup = document.getElementById('btn-sup');
            const btnSub = document.getElementById('btn-sub');
            if(btnSup) btnSup.classList.toggle('active-tool', isSup);
            if(btnSub) btnSub.classList.toggle('active-tool', isSub);
        }
    });
});




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



        function formatar(cmd, val = null) { document.execCommand(cmd, false, val); }
        function atualizarCorPadrao(cor) { corAtual = cor; document.getElementById('current-color').style.background = cor; }
        function aplicarCorPadrao() { document.execCommand('foreColor', false, corAtual); }
        function salvar() {
            // 1. Salva no celular primeiro (sempre funciona)
            localStorage.setItem('arion_db_v4', JSON.stringify(baralhos));
            localStorage.setItem('meusVestibulares', JSON.stringify(meusVestibulares));
    
    const streakAtual = JSON.parse(localStorage.getItem('arion_streak_data')) || { contagem: 0, ultimaData: null };
            renderizar();
        
            // 2. Se não estiver logado, para por aqui
            if (!usuarioLogado || !window.db) return;
        
            try {
                // 3. Padrão Compat para salvar (Upload)
                const docRef = window.db.collection("usuarios").doc(usuarioLogado.uid);
                
                docRef.set({
                    baralhos: baralhos,
                    ultimaAtualizacao: Date.now(),
                    dadosStreak: streakAtual,
                    meusVestibulares: meusVestibulares,
                }, { merge: true })
                .then(() => console.log("Nuvem atualizada com sucesso (Upload OK)"))
                .catch(e => console.error("Erro ao enviar para nuvem:", e));
                
            } catch (e) {
                console.error("Erro na função salvar:", e);
            }
        }
        
        
        
        function mudarTela(id) {
            document.querySelectorAll('.screen').forEach(s => {
                s.classList.remove('active');
                s.style.transform = ''; 
            });
            const target = document.getElementById(id);
            if(target) target.classList.add('active');
            const nav = document.getElementById('main-nav');
            const header = document.querySelector('.top-header');
            if(id === 'splash-screen' || id === 'login-forced-screen') {
                if(nav) nav.style.display = 'none';
                if(header) header.style.display = 'none';
            } else {
                if(nav) nav.style.display = 'flex';
                if(header) header.style.display = 'flex';
                if(id === 'deck-screen') atualizarNav('nav-decks');
            }
            window.scrollTo(0,0);
        }

        /* ============================================================================
   INTERAÇÕES DE INTERFACE (SCROLL, BOTÕES FLUTUANTES, ETC)
   ============================================================================ */

let lastScrollTop = 0;
document.addEventListener('DOMContentLoaded', () => {
    const deckList = document.getElementById('deck-list');
    
    if (deckList) {
        deckList.addEventListener('scroll', function() {
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
            // Remove o destaque de todos os botões
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active-nav');
            });
            // Destaca o botão atual
            const botaoAtivo = document.getElementById(idAtivo);
            if (botaoAtivo) botaoAtivo.classList.add('active-nav');
            
            // FECHA O MENU AUTOMATICAMENTE APÓS CLICAR (Para o mobile)
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
            let totalNovos = 0;
            let totalRevisao = 0;
            const agora = Date.now();
        
            baralhos.forEach(d => {
                totalNovos += d.cards.filter(c => c.state === 'new' && (d.premium ? c.liberado : true)).length;
                totalRevisao += d.cards.filter(c => c.state !== 'new' && c.rev <= agora && (d.premium ? c.liberado : true)).length;
            });
        
            // GERAL: Padding-right de 45px para compensar a falta do botão ⋮ e alinhar os números
            const btnEstudarTudo = `
                <div class="deck-item study-all" onclick="estudarTudo()" style="background: linear-gradient(315deg,rgb(68, 131, 61),rgb(90, 138, 85)); color: white; margin-bottom: 20px; border: none; cursor: pointer; padding: 25px 45px 25px 15px;border-radius: 18px; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <strong style="font-size: 1.1em;">🔥 Estudar Tudo</strong>
                        <small style="opacity: 1; color: white; white-space: nowrap;">
                            <span style="color: #90caf9; font-weight: bold;">${totalNovos}</span> novos | <span style="color: #a5d6a7; font-weight: bold;">${totalRevisao}</span> revisões
                        </small>
                    </div>
                </div>
            `;
        
            const iconePinVetor = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:5px;"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>`;

            const listaHtml = baralhos.map((b, i) => {
                const n = b.cards.filter(c => c.state === 'new' && (b.premium ? c.liberado : true)).length;
                const r = b.cards.filter(c => c.state !== 'new' && c.rev <= agora && (b.premium ? c.liberado : true)).length;
                const estaFixado = b.fixado === true;
            
                return `
                    <div class="deck-item ${b.premium ? 'premium' : ''}" style="position: relative; margin-top: 25px; margin-bottom: 12px; background: transparent; border: none; padding: 0; min-height: auto; overflow: visible;">
                        
                        <div class="deck-actions" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: space-between; align-items: center; border-radius: 18px; overflow: hidden; z-index: 1;">
                            <div onclick="alternarFixar(${i})" style="background: ${estaFixado ? '#8e8e93' : '#007aff'}; width: 80px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.65rem;">
                                ${estaFixado ? 'DESAFIXAR' : 'FIXAR'}
                            </div>
                            <div style="display:flex; height: 100%;">
                                <div onclick="prepararRenomear(${i})" style="background: #ff9500; width: 75px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.65rem;">EDITAR</div>
                                <div onclick="prepararExclusao(${i})" style="background: #ff3b30; width: 75px; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.65rem;">APAGAR</div>
                            </div>
                        </div>
            
                        ${b.premium ? '<div class="premium-badge" style="position: absolute; top: -10px; left: 15px; z-index: 10;">PREMIUM</div>' : ''}
            
                        <div class="deck-content" 
                             onclick="abrirDetalhes(${i})"
                             ontouchstart="handleSwipeStart(event)" 
                             ontouchmove="handleSwipeMove(event)" 
                             ontouchend="handleSwipeEnd(event)"
                             style="padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; width: 100%; position: relative; z-index: 2; transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); background: var(--primary-green); border-radius: 18px; box-sizing: border-box; ${b.premium ? 'border: 2px solid var(--premium-gold);' : 'border: 1px solid rgba(244, 233, 193, 0.3);'}">
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <strong style="${b.premium ? 'color:var(--premium-gold)' : 'color: white;'}">
                                    ${estaFixado ? iconePinVetor : ''}${b.nome}
                                </strong>
                                <small style="white-space: nowrap; color: white;">
                                    <span style="color: #2185d0; font-weight: bold;">${n}</span> novos 
                                    <span style="color: #ccc; margin: 0 2px;">|</span> 
                                    <span style="color: #21ba45; font-weight: bold;">${r}</span> revisões
                                </small>
                            </div>
                        </div>
                    </div>`;
            }).join('');}

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

        // ========== REVISÃO ESPAÇADA (tudo junto aqui) ==========
        // Config (só dono altera) | Fila/estudo | Virar cartão | Botões | Swipe

        // --- Configuração (não expor na UI; só você altera no código)
        const ANKI = {
            learningSteps: [1, 10],    // minutos (padrão "1m 10m")
            lapseSteps: [10],           // minutos (relearning)
            graduatingInterval: 1,     // dias (Good no último step)
            easyInterval: 4,            // dias (Easy em new/learning)
            startingEase: 2.5,
            easyBonus: 1.3,
            hardInterval: 1.2,         // multiplicador em review
            newInterval: 0.2,          // multiplicador após lapse (20%)
            minEase: 1.3,
            maxInterval: 75   // vestibular: cap em 75 dias
        };

        // --- Fila e tela de estudo (quais cards mostrar, "Estudar agora")
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



        function estudarTudo() {
            let filaGeral = [];
            const agora = Date.now();
        
            // 1. Coleta cards de TODOS os baralhos
            baralhos.forEach(b => {
                const cardsDesteBaralho = b.cards.filter(c => {
                    // Filtra: Novo ou No Prazo de Revisão + Deve estar liberado
                    const isPendente = c.state === 'new' || c.rev <= agora;
                    const isLiberado = b.premium ? c.liberado : true; 
                    return isPendente && isLiberado;
                });
                filaGeral = filaGeral.concat(cardsDesteBaralho);
            });
        
            if (filaGeral.length === 0) {
                alert("Nada para estudar por hoje! Volte amanhã.");
                return;
            }
        
            // 2. Embaralha para o estudo intercalado
            filaGeral.sort(() => Math.random() - 0.5);
        
            // 3. Configura as variáveis globais que seu script já usa
            fila = filaGeral; 
            
            // 4. Interface
            if (document.getElementById('study-container')) document.getElementById('study-container').style.display = 'block';
            if (document.getElementById('finish-area')) document.getElementById('finish-area').style.display = 'none';
        
            mudarTela('study-screen');
            carregarCard();
        }

        
        function iniciarEstudo(i) {
            if (i !== undefined) dIdx = i;
            if (document.getElementById('study-container')) document.getElementById('study-container').style.display = 'block';
            if (document.getElementById('finish-area')) document.getElementById('finish-area').style.display = 'none';
        
            const b = baralhos[dIdx];
            const agora = Date.now();
            fila = b.cards.filter(c => (c.state === 'new' || c.rev <= agora) && (!b.premium || c.liberado));
            
            if(fila.length === 0) {
                mostrarParabens(); 
                return;
            }
            
            mudarTela('study-screen');
            carregarCard();
        }


        
        function carregarCard() {
            const c = fila[0];
            respondido = false;
            document.getElementById('btn-show-answer').style.display = 'block';
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

        // --- Virar cartão (verso + textos De novo / Difícil / Bom / Fácil)
        function virarCard() {
            if(respondido) return;
            respondido = true;
            const c = fila[0];
            document.getElementById('btn-show-answer').style.display = 'none';
            document.getElementById('display-back').innerHTML = c.v;
            document.getElementById('display-back').style.display = 'block';
            document.getElementById('card-divider').style.display = 'block';
            document.getElementById('anki-btns').style.display = 'flex';
            
            const int = c.int || 0;
            const ease = c.ease || ANKI.startingEase;
            const steps = ANKI.learningSteps;

            if (c.state === 'new') {
                // Novo = primeiro step (0): Again 1m, Hard = média 1º e 2º, Good = próximo step, Easy = 4d
                document.getElementById('t0').innerText = "<1m";
                document.getElementById('t1').innerText = (steps.length >= 2 ? Math.round((steps[0] + steps[1]) / 2) : Math.min(1440, Math.round(steps[0] * 1.5))) + "m";
                document.getElementById('t2').innerText = (steps.length >= 2 ? steps[1] + "m" : ANKI.graduatingInterval + "d");
                document.getElementById('t3').innerText = ANKI.easyInterval + "d";
            } else if (c.state === 'learning') {
                const stepsDisplay = (c.prevInt != null) ? ANKI.lapseSteps : steps;
                const step = Math.min(c.step || 0, stepsDisplay.length - 1);
                const againMin = stepsDisplay[0];
                document.getElementById('t0').innerText = "<" + againMin + "m";
                const hardMin = (step === 0 && stepsDisplay.length >= 2) ? Math.round((stepsDisplay[0] + stepsDisplay[1]) / 2) : stepsDisplay[step];
                document.getElementById('t1').innerText = hardMin + "m";
                const isLastStep = step >= stepsDisplay.length - 1;
                document.getElementById('t2').innerText = isLastStep ? (c.prevInt != null ? (Math.max(1, Math.round(c.prevInt * ANKI.newInterval)) + "d") : (ANKI.graduatingInterval + "d")) : (stepsDisplay[step + 1] + "m");
                document.getElementById('t3').innerText = ANKI.easyInterval + "d";
            } else {
                document.getElementById('t0').innerText = "<" + ANKI.lapseSteps[0] + "m";
                document.getElementById('t1').innerText = Math.max(1, Math.round(int * ANKI.hardInterval)) + "d";
                document.getElementById('t2').innerText = Math.max(1, Math.round(int * ease)) + "d";
                document.getElementById('t3').innerText = Math.max(1, Math.round(int * ease * ANKI.easyBonus)) + "d";
            }
        }


        // --- Responder (De novo / Difícil / Bom / Fácil — atualiza rev, int, ease, state)
        function responder(q) {

           let c = fila.shift();

    // ======== CONSTANTES E FUNÇÕES AUXILIARES ========
    const agora = Date.now();
    const dia = 86400000;
    const ls = ANKI.learningSteps;
    const lapses = ANKI.lapseSteps;

    const marcarMinutos = (min) => agora + (min * 60000);
    const marcarDias = (dias) => agora + (dias * dia);

    if (!c.ease) c.ease = ANKI.startingEase;
    if (!c.int) c.int = 0;
    if (!c.step) c.step = 0;
    if (!c.state) c.state = 'new';

    // ======== FUNÇÕES DE ESTADO ========

    function processarNewOuLearning(c, q) {
        const steps = (c.prevInt != null) ? lapses : ls; // relearning usa lapseSteps
        // AGAIN → volta para primeiro passo
        if (q === 0) {
            c.state = 'learning';
            c.step = 0;
            c.rev = marcarMinutos(steps[0]);
            return reenfileirar(c);
        }

        // HARD → Anki: no 1º step = média dos dois primeiros; nos outros = repete o step
        if (q === 1) {
            c.state = 'learning';
            let minHard = steps[c.step];
            if (c.step === 0 && steps.length >= 2) minHard = Math.round((steps[0] + steps[1]) / 2);
            else if (steps.length === 1) minHard = Math.min(1440, Math.round(steps[0] * 1.5));
            c.rev = marcarMinutos(minHard);
            return reenfileirar(c);
        }

        // GOOD → avança passo ou gradua
        if (q === 2) {
            c.step++;
            if (c.step < steps.length) {
                c.state = 'learning';
                c.rev = marcarMinutos(steps[c.step]);
                return reenfileirar(c);
            }
            // Último step: graduar (ou sair do relearning)
            c.state = 'review';
            if (c.prevInt != null) {
                c.int = Math.max(1, Math.round(c.prevInt * ANKI.newInterval));
                delete c.prevInt;
            } else {
                c.int = ANKI.graduatingInterval;
            }
            c.rev = marcarDias(c.int);
            return finalizar();
        }

        // EASY → gradua com easy interval
        if (q === 3) {
            c.state = 'review';
            c.int = ANKI.easyInterval;
            if (c.prevInt != null) delete c.prevInt;
            c.rev = marcarDias(c.int);
            return finalizar();
        }
    }

    function processarReview(c, q) {
        // AGAIN → Lapse: ease -0.2, relearning; ao sair usa newInterval
        if (q === 0) {
            c.ease = Math.max(ANKI.minEase, c.ease - 0.2);
            c.prevInt = c.int;
            c.state = 'learning';
            c.step = 0;
            c.rev = marcarMinutos(lapses[0]);
            return reenfileirar(c);
        }

        // HARD
        if (q === 1) {
            c.ease = Math.max(ANKI.minEase, c.ease - 0.15);
            c.int = Math.max(c.int + 1, Math.round(c.int * ANKI.hardInterval));
        }
        // GOOD
        else if (q === 2) {
            c.int = Math.max(c.int + 1, Math.round(c.int * c.ease));
        }
        // EASY
        else if (q === 3) {
            c.ease += 0.15;
            c.int = Math.max(c.int + 1, Math.round(c.int * c.ease * ANKI.easyBonus));
        }

        c.int = Math.min(c.int, ANKI.maxInterval);
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
    
        if (fila.length > 0) {
            carregarCard();
        } else {
            mostrarParabens(); 
        }
    }

    // ======== DISPATCH (SEPARA POR TIPO DE CARTÃO) ========

    if (c.state === 'new' || c.state === 'learning') {
        return processarNewOuLearning(c, q);
    } else {
        return processarReview(c, q);
    }
    }

    function mostrarParabens() {
        const studyContainer = document.getElementById('study-container');
        if (studyContainer) studyContainer.style.display = 'none';
        
        const finishArea = document.getElementById('finish-area');
        if (finishArea) {
            finishArea.style.display = 'flex';
            atualizarStreak(); // Atualiza a contagem de dias
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 180, // Quantidade de confetes
                    spread: 70,         // Ângulo da explosão
                    origin: { y: 0.6 }, // Altura de onde saem (0.6 é perto do troféu)
                    zIndex: 999,
                    colors: ['#f4e9c1', '#FFD700', '#5bc0de', '#ff7eb9', 'ff0000', '#ffffff', '#22c55e'] // Cores do Árion
                });
            }
        }
    
    }





   /* ============================ ÁREA DE GERENCIADOR DE VESTIBULARES ---======================== */

// 1. Carrega os dados salvos ou começa uma lista vazia (Padronizado para meusVestibulares)


// 2. Função para abrir a tela e mostrar os quadradinhos
function abrirVestibulares() {
    mudarTela('vestibulares-screen');
    renderizarVestibulares();
}

// 3. Função que desenha os quadradinhos na tela
function renderizarVestibulares() {
    const container = document.getElementById('lista-vestibulares');
    if (!container) return;

    // Ordena a lista correta
    meusVestibulares.sort((a, b) => {
        return new Date(a.data) - new Date(b.data);
    });

    container.innerHTML = '';

    meusVestibulares.forEach((v, index) => {
        const hoje = new Date();
        const dataProva = new Date(v.data + "T00:00:00");
        const diff = Math.ceil((dataProva - hoje) / (1000 * 60 * 60 * 24));
        
        const card = document.createElement('div');
        card.className = 'vestibular-card';
        
        const corFinal = v.cor || '#ffffff';

        if (isDark(corFinal)) {
            card.classList.add('dark-mode');
        }
        
        card.style.backgroundColor = corFinal;
        
        card.innerHTML = `
            <button class="btn-remover-vest" onclick="removerVestibular(${index})">×</button>
            <strong>${v.nome}</strong>
            <span class="dias-count">${diff > 0 ? diff : (diff === 0 ? 'HOJE' : '✓')}</span>
            <span class="dias-label">${diff >= 0 ? 'DIAS RESTANTES' : 'FINALIZADA'}</span>
        `;
        
        container.appendChild(card);
    });
}

// 4. Função para adicionar nova prova
function abrirModalVestibular() {
    document.getElementById('modal-vestibular').style.display = 'flex';
    corSelecionada = '#ffffff';
    
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.remove('selected');
        if (dot.style.backgroundColor === 'rgb(255, 255, 255)' || dot.style.backgroundColor === '#ffffff') {
            dot.classList.add('selected');
        }
    });
}

let corSelecionada = '#ffffff'; 

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

    meusVestibulares.push({ 
        nome: nome, 
        data: data, 
        cor: corSelecionada 
    });

    salvar(); // Salva Local e Nuvem
    
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

// 5. Função para remover um vestibular da lista
function removerVestibular(index) {
    meusVestibulares.splice(index, 1);
    salvar(); // Salva Local e Nuvem
    renderizarVestibulares();
}








/// ==========================================
// 4. GESTOS DE TOQUE (SWIPE)
// ==========================================


///=============== FUNÇÃO SWIPE DOS CARTÕES===============
            
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






        // ================swipe de voltar do iPhone===============


//////////////////// GESTO DE VOLTAR (IPHONE) - VERSÃO CORRIGIDA ///////////////////
(function() {
    let touchStartX = 0;
    let initialLeft = 0; 
    let telaAtual = null; 
    let telaFundo = null;
    const bordaSensivel = 40; 
    const distanciaMinima = 100;

    window.addEventListener('touchstart', e => {
        // Bloqueia swipe se o menu sanduíche estiver aberto
        const menu = document.getElementById('main-nav');
        if (menu && menu.classList.contains('show')) return;

        touchStartX = e.changedTouches[0].screenX;
        telaAtual = document.querySelector('.screen.active');

        if (!telaAtual || telaAtual.id === 'deck-screen') {
            telaAtual = null;
            return;
        }

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

        const currentX = e.changedTouches[0].screenX;
        const deslocamento = Math.max(0, currentX - touchStartX);
        const progresso = Math.min(1, deslocamento / window.innerWidth);

        telaAtual.style.transform = `translateX(${deslocamento}px)`;
        telaAtual.style.boxShadow = '-10px 0 20px rgba(0,0,0,0.2)';

        if (telaFundo) {
            telaFundo.style.opacity = 0.5 + (progresso * 0.5);
            telaFundo.style.transform = `scale(${0.95 + (progresso * 0.05)})`;
        }
    }, { passive: true });

    window.addEventListener('touchend', e => {
        if (!telaAtual || touchStartX >= bordaSensivel) return;

        const touchEndX = e.changedTouches[0].screenX;
        const deslocamentoFinal = touchEndX - touchStartX;

        telaAtual.style.transition = 'transform 0.3s ease-out';
        if (telaFundo) telaFundo.style.transition = 'all 0.3s ease-out';
        
        if (deslocamentoFinal > distanciaMinima) {
            telaAtual.style.transform = 'translateX(100vw)'; 
            if (telaFundo) {
                telaFundo.style.opacity = '1';
                telaFundo.style.transform = 'scale(1)';
            }
            
            setTimeout(() => {
                const idAtual = telaAtual.id;
                if (idAtual === 'study-screen') {
                    abrirDetalhes(dIdx);
                } else {
                    mudarTela('deck-screen');
                    atualizarNav('nav-decks');
                }
                
                requestAnimationFrame(() => {
                    resetEstilos(telaAtual);
                    if (telaFundo) resetEstilos(telaFundo);
                    telaAtual = null;
                    telaFundo = null;
                });
            }, 300);
        } else {
            telaAtual.style.transform = 'translateX(0)';
            if (telaFundo) {
                telaFundo.style.opacity = '0.5';
                telaFundo.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    if (telaFundo && !telaFundo.classList.contains('active')) {
                        telaFundo.style.display = 'none';
                        resetEstilos(telaFundo);
                    }
                }, 300);
            }
        }
    }, { passive: true });
})(); // <-- AQUI ESTAVA O ERRO: Faltava fechar a função!

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
    setTimeout(() => {
        el.style.left = '';
        el.style.transition = '';
    }, 0);
}

// ATIVAÇÃO DO MENU SANDUÍCHE
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('menu-toggle');
    const menu = document.getElementById('main-nav');

    if (btn && menu) {
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        };

        document.addEventListener('click', (e) => {
            if (menu.classList.contains('show') && !menu.contains(e.target) && e.target !== btn) {
                menu.classList.remove('show');
            }
        });
        
        menu.querySelectorAll('.nav-btn').forEach(b => {
            b.addEventListener('click', () => menu.classList.remove('show'));
        });
    }
});


// =============================== LÓGICA DE SWIPE PARA VOLTAR ===========================================
let touchStartX = 0;
let touchEndX = 0;
let currentSwipeEl = null;

document.addEventListener('touchstart', e => {
    // Só permite swipe se o menu sanduíche estiver fechado
    const menu = document.getElementById('main-nav');
    if (menu && menu.classList.contains('show')) return;

    touchStartX = e.changedTouches[0].screenX;
    currentSwipeEl = e.target.closest('.screen.active');
}, {passive: true});

document.addEventListener('touchmove', e => {
    if (!currentSwipeEl || touchStartX > 80) return; // Só ativa se começar no canto esquerdo (0-80px)

    let moveX = e.changedTouches[0].screenX - touchStartX;
    if (moveX > 0) {
        currentSwipeEl.style.transform = `translateX(calc(-50% + ${moveX}px))`;
        currentSwipeEl.style.transition = 'none';
    }
}, {passive: true});

document.addEventListener('touchend', e => {
    if (!currentSwipeEl || touchStartX > 80) return;

    touchEndX = e.changedTouches[0].screenX;
    let diff = touchEndX - touchStartX;

    if (diff > 100) {
        // Ação de voltar dependendo da tela atual
        const idAtual = currentSwipeEl.id;
        if (idAtual === 'details-screen' || idAtual === 'store-screen' || idAtual === 'browse-screen' || idAtual === 'create-screen') {
            mudarTela('deck-screen');
        } else if (idAtual === 'study-screen') {
            abrirDetalhes(dIdx);
        } else {
            resetSwipe(currentSwipeEl);
        }
    } else {
        resetSwipe(currentSwipeEl);
    }
    currentSwipeEl = null;
}, {passive: true});

function resetSwipe(el) {
    if (!el) return;
    el.style.transition = 'transform 0.3s ease';
    el.style.transform = 'translateX(-50%)';
}

//=====================================================//
// LÓGICA DE SWIPE PARA ABRIR OPÇÕES
//=======================================================

let swipeStartX = 0;
let currentSwipeX = 0;

function handleSwipeStart(e) {
    swipeStartX = e.touches[0].clientX;
    e.currentTarget.style.transition = 'none';
}

function handleSwipeMove(e) {
    currentSwipeX = e.touches[0].clientX;
    let diff = currentSwipeX - swipeStartX;
    if (diff > 100) diff = 100; // Limite Fixar
    if (diff < -180) diff = -180; // Limite Editar/Apagar
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

function fixarDeck(i) {
    const deck = baralhos.splice(i, 1)[0];
    baralhos.unshift(deck);
    salvar();
    renderizar();
}

// Fecha o swipe se o usuário rolar a tela
document.addEventListener('scroll', fecharTodosSwipes, true);

// Caso use um container com scroll específico (como o deck-list)
const deckListElement = document.getElementById('deck-list');
if (deckListElement) {
    deckListElement.addEventListener('scroll', fecharTodosSwipes);
}

function fecharTodosSwipes() {
    const todosCards = document.querySelectorAll('.deck-content');
    todosCards.forEach(card => {
        if (card.style.transform !== 'translateX(0px)' && card.style.transform !== '') {
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = 'translateX(0px)';
        }
    });
}



// ============================================================================
// BLOCO DE GESTÃO PREMIUM E IMPORTAÇÃO (ANKI .TXT)
// ============================================================================

function importarDeckAdministrador(conteudoTXT, nomeBaralho) {
    // Divide o conteúdo por linhas, removendo as vazias
    const linhas = conteudoTXT.split('\n').filter(l => l.trim() !== "");
    const cardsProcessados = [];

    linhas.forEach(linha => {
        // O formato "Notas em Texto Puro" usa TAB (\t) como separador
        const colunas = linha.split('\t'); 
        
        if (colunas.length >= 3) {
            // Limpa aspas automáticas do Anki e espaços
            const frente = colunas[0].replace(/^"|"$/g, '').trim();
            const verso = colunas[1].replace(/^"|"$/g, '').trim();
            const tagsRaw = colunas[2].replace(/^"|"$/g, '').trim();

            let mod = "Geral";
            let sub = "Diversos";

            // Processa mod:Nome e sub:Nome (troca _ por espaço)
            tagsRaw.split(' ').forEach(t => {
                if(t.startsWith('mod:')) mod = t.replace('mod:', '').replace(/_/g, ' ');
                if(t.startsWith('sub:')) sub = t.replace('sub:', '').replace(/_/g, ' ');
            });

            // Cria o objeto idêntico ao seu banco de dados atual
            cardsProcessados.push({
                f: frente,      // Pergunta
                v: verso,       // Resposta
                rev: 0,         // Pronto para revisão imediata
                int: 0,         // Novo card
                ease: 2.5,      // Ease Factor idêntico ao Anki
                state: 'new',   // Entra no fluxo learningSteps
                rep: 0,
                step: 0,
                liberado: false, // Inicia bloqueado para escolha no painel
                modulo: mod,
                submodulo: sub
            });
        }
    });

    if (cardsProcessados.length > 0) {
        const novoDeck = { 
            nome: nomeBaralho, 
            premium: true, 
            cards: cardsProcessados 
        };
        baralhos.push(novoDeck);
        salvar(); // Persiste no localStorage
        renderizar(); // Atualiza a lista de baralhos
        alert(`Sucesso! ${cardsProcessados.length} cards importados.`);
    } else {
        alert("Erro: Verifique se o arquivo .txt tem Pergunta, Resposta e Tags.");
    }
}

// Função para disparar o seletor de arquivo
function dispararImportacao() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = e => {
        const arquivo = e.target.files[0];
        const leitor = new FileReader();
        leitor.onload = ev => importarDeckAdministrador(ev.target.result, arquivo.name.replace('.txt', ''));
        leitor.readAsText(arquivo);
    };
    input.click();
}
