// ========== AUTENTICAÇÃO (login, logout, inicialização) ==========
function inicializarApp() {
    if (window.auth) {
        window.auth.onAuthStateChanged((user) => {
            const loginScreen = document.getElementById('login-forced-screen');
            const splash = document.getElementById('splash-screen');
            if (user) {
                usuarioLogado = user;
                (async () => {
                    try {
                        const userRef = window.db.collection("usuarios").doc(user.uid);
                        let userDoc = await userRef.get();
                        if (!userDoc.exists) {
                            await userRef.set({ email: user.email, assinante: false, tutorialConcluido: false });
                            userDoc = await userRef.get();
                        }
                        const docAtual = await userRef.get();
                        const dados = docAtual.exists ? docAtual.data() : {};
                        const assinante = dados.assinante === true;
                        const tutorialConcluido = dados.tutorialConcluido === true;
                        localStorage.setItem('arion_assinante', assinante ? 'true' : 'false');
                        localStorage.setItem('arion_tutorial_concluido', tutorialConcluido ? 'true' : 'false');
                        atualizarPerfilMenu(user, assinante);
                        await Promise.all([verificarTutorial(), verificarAtualizacoesPremium()]);
                        await sincronizarComNuvem();
                        if (typeof renderizar === 'function') renderizar();
                    } catch (e) { console.error("Erro ao inicializar utilizador:", e); }
                    setTimeout(() => {
                        if (loginScreen) loginScreen.style.display = 'none';
                        if (splash) splash.style.display = 'none';
                        mudarTela('deck-screen');
                        renderizar();
                    }, 400);
                })();
            } else {
                atualizarPerfilMenu(null);
                if (splash) splash.style.display = 'none';
                if (loginScreen) {
                    loginScreen.style.display = 'flex';
                    loginScreen.style.opacity = '1';
                    loginScreen.style.visibility = 'visible';
                    loginScreen.style.zIndex = '';
                    mudarTela('login-forced-screen');
                }
            }
        });
    } else {
        setTimeout(inicializarApp, 50);
    }
}

async function loginComGoogle() {
    if (typeof firebase === 'undefined') return alert("Erro: Firebase não carregado.");
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        usuarioLogado = result.user;
        const userRef = window.db ? window.db.collection("usuarios").doc(usuarioLogado.uid) : null;
        if (userRef) {
            let userDoc = await userRef.get();
            if (!userDoc.exists) {
                await userRef.set({ email: usuarioLogado.email, assinante: false, tutorialConcluido: false });
                userDoc = await userRef.get();
            }
            const docAtual = await userRef.get();
            const dados = docAtual.exists ? docAtual.data() : {};
            localStorage.setItem('arion_assinante', dados.assinante === true ? 'true' : 'false');
            localStorage.setItem('arion_tutorial_concluido', dados.tutorialConcluido === true ? 'true' : 'false');
            atualizarPerfilMenu(usuarioLogado, dados.assinante === true);
            await Promise.all([verificarTutorial(), verificarAtualizacoesPremium()]);
            await sincronizarComNuvem();
        } else {
            await verificarTutorial();
            await sincronizarComNuvem();
        }
        if (typeof renderizar === 'function') renderizar();
        const loginScreen = document.getElementById('login-forced-screen');
        const splash = document.getElementById('splash-screen');
        if (loginScreen) { loginScreen.style.display = 'none'; loginScreen.style.visibility = 'hidden'; loginScreen.style.zIndex = '-1'; loginScreen.classList.remove('active'); }
        if (splash) { splash.style.display = 'none'; splash.style.visibility = 'hidden'; splash.style.zIndex = '-1'; }
        mudarTela('deck-screen');
        renderizar();
        const nav = document.getElementById('main-nav');
        const header = document.querySelector('.top-header');
        if (nav) nav.style.display = 'flex';
        if (header) header.style.display = 'flex';
        if (typeof atualizarNav === 'function') atualizarNav('nav-decks');
    } catch (error) {
        console.error("Erro no login:", error);
        if (error.code !== 'auth/popup-closed-by-user') alert("Erro ao realizar login com Google.");
    }
}

async function loginComApple() {
    if (typeof firebase === 'undefined' || !firebase.auth) return alert("Erro: Firebase não carregado.");
    const provider = new firebase.auth.OAuthProvider('apple.com');
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        usuarioLogado = result.user;
        const userRef = window.db ? window.db.collection("usuarios").doc(usuarioLogado.uid) : null;
        if (userRef) {
            let userDoc = await userRef.get();
            if (!userDoc.exists) {
                await userRef.set({ email: usuarioLogado.email, assinante: false, tutorialConcluido: false });
                userDoc = await userRef.get();
            }
            const docAtual = await userRef.get();
            const dados = docAtual.exists ? docAtual.data() : {};
            localStorage.setItem('arion_assinante', dados.assinante === true ? 'true' : 'false');
            localStorage.setItem('arion_tutorial_concluido', dados.tutorialConcluido === true ? 'true' : 'false');
            atualizarPerfilMenu(usuarioLogado, dados.assinante === true);
            await Promise.all([verificarTutorial(), verificarAtualizacoesPremium()]);
            await sincronizarComNuvem();
        } else {
            await verificarTutorial();
            await sincronizarComNuvem();
        }
        if (typeof renderizar === 'function') renderizar();
        const loginScreen = document.getElementById('login-forced-screen');
        const splash = document.getElementById('splash-screen');
        if (loginScreen) { loginScreen.style.display = 'none'; loginScreen.style.visibility = 'hidden'; loginScreen.style.zIndex = '-1'; loginScreen.classList.remove('active'); }
        if (splash) { splash.style.display = 'none'; splash.style.visibility = 'hidden'; splash.style.zIndex = '-1'; }
        mudarTela('deck-screen');
        renderizar();
        const nav = document.getElementById('main-nav');
        const header = document.querySelector('.top-header');
        if (nav) nav.style.display = 'flex';
        if (header) header.style.display = 'flex';
        if (typeof atualizarNav === 'function') atualizarNav('nav-decks');
    } catch (error) {
        console.error("Erro no login Apple:", error);
        if (error.code !== 'auth/popup-closed-by-user') alert("Erro ao logar com Apple. Verifique se o provedor está ativo no console do Firebase.");
    }
}

async function deslogar() {
    try {
        await window.auth.signOut();
        usuarioLogado = null;
        atualizarPerfilMenu(null);
        const loginScreen = document.getElementById('login-forced-screen');
        if (loginScreen) { loginScreen.style.display = 'flex'; loginScreen.style.visibility = 'visible'; loginScreen.style.zIndex = ''; }
        mudarTela("login-forced-screen");
    } catch (e) { console.error("Erro ao deslogar:", e); }
}
