// ========== PERFIL E AVATAR (foto, emoji picker, tela de perfil) ==========
function corFundoPadraoParaEmoji(emoji) {
    if (!emoji) return PALETA_CORES_EMOJI[0];
    let hash = 0;
    for (let i = 0; i < emoji.length; i++) hash = ((hash << 5) - hash) + emoji.charCodeAt(i) | 0;
    return PALETA_CORES_EMOJI[Math.abs(hash) % PALETA_CORES_EMOJI.length];
}

/** Retorna o objeto da foto custom (emoji+cor ou null) ou se for imagem data URL, a string. */
function getFotoPerfilObjeto() {
    const raw = localStorage.getItem('arion_foto_perfil_custom');
    if (!raw) return null;
    if (raw.startsWith('data:')) return { tipo: 'imagem', url: raw };
    try {
        const obj = JSON.parse(raw);
        if (obj && (obj.t === 'emoji' || obj.tipo === 'emoji')) return { t: 'emoji', e: obj.e || obj.emoji, c: obj.c || obj.corFundo || corFundoPadraoParaEmoji(obj.e || obj.emoji) };
        return null;
    } catch (_) {}
    return { t: 'emoji', e: raw, c: corFundoPadraoParaEmoji(raw) };
}

function getFotoPerfilAtual(user) {
    const custom = getFotoPerfilObjeto();
    if (custom && custom.t === 'emoji') {
        const emoji = custom.e || '😀';
        const cor = (custom.c || corFundoPadraoParaEmoji(emoji)).replace('#', '%23');
        return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="' + (custom.c || PALETA_CORES_EMOJI[0]) + '"/><text y=".9em" x="50" text-anchor="middle" font-size="52" fill="%230a3d3a">' + emoji + '</text></svg>');
    }
    if (custom && custom.url) return custom.url;
    if (user && user.photoURL && user.photoURL.trim()) return user.photoURL;
    return AVATAR_PLACEHOLDER;
}

let _emojiPickerSelecionado = { emoji: null, cor: null };

function extrairPrimeiroEmoji(str) {
    const t = (str || '').trim();
    if (!t) return null;
    const primeiro = [...t][0];
    return primeiro || t.charAt(0) || null;
}

function abrirEmojiPicker() {
    const overlay = document.getElementById('emoji-picker-overlay');
    const inputEmoji = document.getElementById('emoji-picker-input');
    const corSection = document.getElementById('emoji-picker-cor');
    const cores = document.getElementById('emoji-picker-cores');
    const preview = document.getElementById('emoji-picker-preview');
    const inputCor = document.getElementById('emoji-picker-input-cor');
    const btnConfirmar = document.getElementById('emoji-picker-confirmar');
    const btnCancelar = document.getElementById('emoji-picker-cancelar');
    if (!overlay || !inputEmoji) return;

    _emojiPickerSelecionado = { emoji: null, cor: PALETA_CORES_EMOJI[0] };
    inputEmoji.value = '';
    inputEmoji.placeholder = 'Toque aqui para abrir o teclado';
    corSection.style.display = 'block';
    preview.textContent = '';
    preview.style.display = 'flex';
    preview.style.backgroundColor = _emojiPickerSelecionado.cor;

    function atualizarEmoji() {
        const emoji = extrairPrimeiroEmoji(inputEmoji.value);
        if (emoji) {
            _emojiPickerSelecionado.emoji = emoji;
            if (!_emojiPickerSelecionado.cor) _emojiPickerSelecionado.cor = corFundoPadraoParaEmoji(emoji);
            inputCor.value = _emojiPickerSelecionado.cor;
            preview.style.backgroundColor = _emojiPickerSelecionado.cor;
            preview.textContent = emoji;
        } else {
            preview.textContent = '';
            preview.style.backgroundColor = _emojiPickerSelecionado.cor;
        }
    }

    inputEmoji.oninput = inputEmoji.onkeyup = atualizarEmoji;

    cores.innerHTML = '';
    var corCustomLabel = document.createElement('label');
    corCustomLabel.className = 'emoji-cor-btn emoji-cor-btn-mais';
    corCustomLabel.title = 'Outra cor';
    corCustomLabel.textContent = '+';
    corCustomLabel.htmlFor = 'emoji-picker-input-cor';
    cores.appendChild(corCustomLabel);

    inputCor.oninput = () => {
        _emojiPickerSelecionado.cor = inputCor.value;
        if (preview) preview.style.backgroundColor = inputCor.value;
        cores.querySelectorAll('.emoji-cor-btn:not(.emoji-cor-btn-mais)').forEach(b => b.classList.remove('emoji-cor-ativo'));
    };

    PALETA_CORES_EMOJI.forEach(cor => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emoji-cor-btn';
        btn.style.backgroundColor = cor;
        btn.title = cor;
        btn.onclick = () => {
            _emojiPickerSelecionado.cor = cor;
            inputCor.value = cor;
            if (preview) preview.style.backgroundColor = cor;
            cores.querySelectorAll('.emoji-cor-btn').forEach(b => b.classList.remove('emoji-cor-ativo'));
            btn.classList.add('emoji-cor-ativo');
        };
        cores.appendChild(btn);
    });

    btnConfirmar.onclick = () => {
        const emoji = _emojiPickerSelecionado.emoji || extrairPrimeiroEmoji(inputEmoji.value);
        if (!emoji) return;
        const payload = { t: 'emoji', e: emoji, c: _emojiPickerSelecionado.cor || corFundoPadraoParaEmoji(emoji) };
        localStorage.setItem('arion_foto_perfil_custom', JSON.stringify(payload));
        salvar();
        if (usuarioLogado) atualizarPerfilMenu(usuarioLogado, localStorage.getItem('arion_assinante') === 'true');
        preencherTelaPerfil();
        overlay.style.display = 'none';
    };

    btnCancelar.onclick = () => { overlay.style.display = 'none'; };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };
    const box = document.querySelector('.emoji-picker-box');
    if (box) box.onclick = (e) => e.stopPropagation();

    overlay.style.display = 'flex';
    setTimeout(() => inputEmoji.focus(), 300);
}

function atualizarPerfilMenu(user, assinante) {
    const img = document.getElementById('foto-perfil-menu');
    const nomeEl = document.getElementById('nome-usuario-menu');
    const wrap = document.getElementById('menu-profile-foto-wrap');
    if (!img || !nomeEl || !wrap) return;
    if (user && (user.photoURL || user.displayName)) {
        img.src = getFotoPerfilAtual(user);
        img.onerror = function() { this.src = AVATAR_PLACEHOLDER; this.onerror = null; };
        nomeEl.textContent = (user.displayName && user.displayName.trim()) ? user.displayName : (user.email || 'Usuário');
        nomeEl.style.display = '';
        if (assinante === true) {
            wrap.classList.add('premium');
            let badge = wrap.querySelector('.menu-profile-premium-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'menu-profile-premium-badge';
                badge.textContent = 'Premium';
                wrap.appendChild(badge);
            }
        } else {
            wrap.classList.remove('premium');
            const badge = wrap.querySelector('.menu-profile-premium-badge');
            if (badge) badge.remove();
        }
    } else {
        img.src = AVATAR_PLACEHOLDER;
        img.onerror = null;
        nomeEl.textContent = '';
        nomeEl.style.display = 'none';
        wrap.classList.remove('premium');
        const badge = wrap.querySelector('.menu-profile-premium-badge');
        if (badge) badge.remove();
    }
}

function agendarLembreteDiario(horario, ativo) {
    if (!ativo || !horario) return;
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        window.Capacitor.Plugins.LocalNotifications.schedule({
            notifications: [{
                id: 1,
                title: 'Árion Flashcards',
                body: 'Hora de revisar seus cards!',
                schedule: { at: new Date(new Date().toDateString() + ' ' + horario).getTime(), every: 'day' }
            }]
        }).catch(() => {});
    }
}

function abrirSuporteEmail() {
    const nome = (usuarioLogado && (usuarioLogado.displayName || usuarioLogado.email)) ? (usuarioLogado.displayName || usuarioLogado.email) : 'Usuário';
    const assunto = 'Suporte Árion - Usuário: ' + encodeURIComponent(nome);
    const corpo = encodeURIComponent('Olá equipe Árion, estou entrando em contato pois...');
    window.location.href = 'mailto:arion.discursivas@gmail.com?subject=' + assunto + '&body=' + corpo;
}

function preencherTelaPerfil() {
    const nomeEl = document.getElementById('perfil-nome');
    const emailEl = document.getElementById('perfil-email');
    const fotoImg = document.getElementById('perfil-foto-img');
    const fotoEmoji = document.getElementById('perfil-foto-emoji');
    const wrap = document.getElementById('perfil-foto-wrap');
    const metaInput = document.getElementById('perfil-meta-diaria');
    const horarioInput = document.getElementById('perfil-horario-lembrete');
    const lembreteToggle = document.getElementById('perfil-lembrete-ativo');
    const streakValor = document.getElementById('perfil-streak-valor');
    const streakSub = document.getElementById('perfil-streak-sub');

    if (usuarioLogado) {
        if (nomeEl) nomeEl.textContent = (usuarioLogado.displayName && usuarioLogado.displayName.trim()) ? usuarioLogado.displayName : (usuarioLogado.email || 'Usuário');
        if (emailEl) {
            emailEl.textContent = usuarioLogado.email || '';
            emailEl.style.display = usuarioLogado.email ? '' : 'none';
        }
    } else {
        if (nomeEl) nomeEl.textContent = 'Usuário';
        if (emailEl) emailEl.style.display = 'none';
    }

    const custom = getFotoPerfilObjeto();
    const inner = document.getElementById('perfil-foto-inner');
    if (fotoImg && wrap) {
        if (custom && custom.t === 'emoji') {
            const emoji = custom.e || '😀';
            const cor = custom.c || corFundoPadraoParaEmoji(emoji);
            if (fotoEmoji) {
                fotoEmoji.textContent = emoji;
                fotoEmoji.style.display = 'block';
            }
            fotoImg.style.display = 'none';
            if (inner) inner.style.backgroundColor = cor;
        } else if (custom && custom.url) {
            fotoImg.src = custom.url;
            fotoImg.style.display = '';
            if (fotoEmoji) fotoEmoji.style.display = 'none';
            if (inner) inner.style.backgroundColor = '';
        } else {
            fotoImg.src = getFotoPerfilAtual(usuarioLogado);
            fotoImg.style.display = '';
            if (fotoEmoji) fotoEmoji.style.display = 'none';
            if (inner) inner.style.backgroundColor = '';
        }
        fotoImg.onerror = function() { this.src = AVATAR_PLACEHOLDER; this.onerror = null; };
    }

    if (metaInput) metaInput.value = localStorage.getItem('arion_meta_diaria') || '';
    if (horarioInput) horarioInput.value = localStorage.getItem('arion_horario_lembrete') || '';
    if (lembreteToggle) lembreteToggle.checked = localStorage.getItem('arion_lembrete_ativo') === 'true';

    const streakData = JSON.parse(localStorage.getItem('arion_streak_data')) || { contagem: 0, ultimaData: null };
    if (streakValor) streakValor.textContent = streakData.contagem + ' ' + (streakData.contagem === 1 ? 'dia' : 'dias');
    if (streakSub) streakSub.textContent = streakData.ultimaData ? 'Último estudo: ' + streakData.ultimaData : 'Estude para começar';
}
