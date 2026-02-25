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

var CROP_TAMANHO = 280;

/** Abre o overlay de crop circular; ao concluir chama callback(dataUrlCropped). */
function abrirCropFoto(dataUrl, callback) {
    var overlay = document.getElementById('perfil-crop-overlay');
    var img = document.getElementById('perfil-crop-img');
    var wrap = document.getElementById('perfil-crop-img-wrap');
    var circulo = document.getElementById('perfil-crop-circulo');
    var btnCancelar = document.getElementById('perfil-crop-cancelar');
    var btnConfirmar = document.getElementById('perfil-crop-confirmar');
    if (!overlay || !img || !wrap || !circulo) {
        if (callback) callback(dataUrl);
        return;
    }
    var cropState = {
        dataUrl: dataUrl,
        scale: 1,
        initX: 0,
        initY: 0,
        offsetX: 0,
        offsetY: 0,
        imgW: 0,
        imgH: 0,
        callback: callback
    };

    img.onload = function () {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        if (!w || !h) return;
        var scale = Math.max(CROP_TAMANHO / w, CROP_TAMANHO / h);
        var dispW = w * scale;
        var dispH = h * scale;
        cropState.imgW = w;
        cropState.imgH = h;
        cropState.scale = scale;
        cropState.initX = (CROP_TAMANHO - dispW) / 2;
        cropState.initY = (CROP_TAMANHO - dispH) / 2;
        cropState.offsetX = 0;
        cropState.offsetY = 0;
        img.style.width = dispW + 'px';
        img.style.height = dispH + 'px';
        img.style.left = cropState.initX + 'px';
        img.style.top = cropState.initY + 'px';
        atualizarCropTransform(wrap, cropState);
    };

    img.src = dataUrl;
    overlay.style.display = 'flex';

    function atualizarCropTransform(wrapper, state) {
        wrapper.style.transform = 'translate(' + state.offsetX + 'px, ' + state.offsetY + 'px)';
    }

    function onDragStart(e) {
        e.preventDefault();
        var startX = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
        var startY = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
        var startOX = cropState.offsetX;
        var startOY = cropState.offsetY;
        function onMove(ev) {
            var x = (ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX);
            var y = (ev.touches && ev.touches[0] ? ev.touches[0].clientY : ev.clientY);
            cropState.offsetX = startOX + (x - startX);
            cropState.offsetY = startOY + (y - startY);
            atualizarCropTransform(wrap, cropState);
        }
        function onEnd() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove, { passive: false });
            document.removeEventListener('touchend', onEnd);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    wrap.onmousedown = onDragStart;
    wrap.ontouchstart = onDragStart;

    function fecharCrop() {
        overlay.style.display = 'none';
        wrap.onmousedown = null;
        wrap.ontouchstart = null;
    }

    btnCancelar.onclick = function () {
        fecharCrop();
        if (cropState.callback) cropState.callback(null);
    };

    btnConfirmar.onclick = function () {
        var dataUrlCropped = exportarCropCircular(cropState);
        fecharCrop();
        if (cropState.callback && dataUrlCropped) cropState.callback(dataUrlCropped);
    };
}

/** Gera data URL da região circular atual do crop. */
function exportarCropCircular(cropState) {
    if (!cropState || !cropState.dataUrl || !cropState.imgW || !cropState.imgH) return null;
    var img = document.getElementById('perfil-crop-img');
    if (!img || !img.complete) return null;
    var canvas = document.createElement('canvas');
    canvas.width = CROP_TAMANHO;
    canvas.height = CROP_TAMANHO;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    var scale = cropState.scale;
    var sx = -(cropState.initX + cropState.offsetX) / scale;
    var sy = -(cropState.initY + cropState.offsetY) / scale;
    var size = CROP_TAMANHO / scale;
    ctx.beginPath();
    ctx.arc(CROP_TAMANHO / 2, CROP_TAMANHO / 2, CROP_TAMANHO / 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, size, size, 0, 0, CROP_TAMANHO, CROP_TAMANHO);
    return canvas.toDataURL('image/jpeg', 0.92);
}

/** Comprime imagem (data URL) para caber no Firebase (< ~100k). Redimensiona e usa JPEG. */
function comprimirImagemPerfil(dataUrl, callback) {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
        callback(dataUrl || '');
        return;
    }
    const maxLado = 400;
    let qualidade = 0.82;
    const img = new Image();
    img.onload = function () {
        let w = img.width;
        let h = img.height;
        if (w > maxLado || h > maxLado) {
            if (w > h) {
                h = Math.round((h * maxLado) / w);
                w = maxLado;
            } else {
                w = Math.round((w * maxLado) / h);
                h = maxLado;
            }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            callback(dataUrl);
            return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        let result = canvas.toDataURL('image/jpeg', qualidade);
        while (result.length > 95000 && qualidade > 0.3) {
            result = canvas.toDataURL('image/jpeg', qualidade -= 0.1);
        }
        callback(result);
    };
    img.onerror = function () { callback(dataUrl); };
    img.src = dataUrl;
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
        if (usuarioLogado) {
            atualizarPerfilMenu(usuarioLogado, localStorage.getItem('arion_assinante') === 'true');
            atualizarFotoMenuSuspenso();
        }
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

/** Atualiza a foto no menu suspenso (hamburger) a partir do localStorage/Firebase. Chamar sempre após trocar a foto. */
function atualizarFotoMenuSuspenso() {
    const img = document.getElementById('foto-perfil-menu');
    if (!img || !usuarioLogado) return;
    const novaUrl = getFotoPerfilAtual(usuarioLogado);
    img.src = '';
    img.src = novaUrl;
    img.onerror = function() { this.src = AVATAR_PLACEHOLDER; this.onerror = null; };
}

function atualizarPerfilMenu(user, assinante) {
    const img = document.getElementById('foto-perfil-menu');
    const nomeEl = document.getElementById('nome-usuario-menu');
    const wrap = document.getElementById('menu-profile-foto-wrap');
    if (!img || !nomeEl || !wrap) return;
    if (user && (user.photoURL || user.displayName)) {
        const url = getFotoPerfilAtual(user);
        img.src = '';
        img.src = url;
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

var _lembretePWAIntervalId = null;

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

/** Para PWA: verifica a cada minuto se é o horário do lembrete e mostra notificação (quando o app está aberto ou em segundo plano). */
function iniciarLembretePWA() {
    if (_lembretePWAIntervalId) {
        clearInterval(_lembretePWAIntervalId);
        _lembretePWAIntervalId = null;
    }
    var ativo = localStorage.getItem('arion_lembrete_ativo') === 'true';
    var horario = (localStorage.getItem('arion_horario_lembrete') || '').trim();
    if (!ativo || !horario) return;

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        agendarLembreteDiario(horario, true);
        return;
    }

    if (!('Notification' in window)) return;

    function verificarENotificar() {
        if (localStorage.getItem('arion_lembrete_ativo') !== 'true') return;
        var h = localStorage.getItem('arion_horario_lembrete') || '';
        var now = new Date();
        var HH = String(now.getHours()).padStart(2, '0');
        var MM = String(now.getMinutes()).padStart(2, '0');
        var agora = HH + ':' + MM;
        if (h.substring(0, 5) !== agora) return;
        var hoje = now.toDateString();
        if (localStorage.getItem('arion_lembrete_ultimo_dia') === hoje) return;
        if (Notification.permission === 'granted') {
            try {
                new Notification('Árion Flashcards', {
                    body: 'Hora de revisar seus cards!',
                    icon: 'icone app.png',
                    tag: 'arion-lembrete'
                });
                localStorage.setItem('arion_lembrete_ultimo_dia', hoje);
            } catch (e) {}
        }
    }

    if (Notification.permission === 'granted') {
        verificarENotificar();
        _lembretePWAIntervalId = setInterval(verificarENotificar, 60000);
        return;
    }
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(function (perm) {
            if (perm === 'granted') {
                verificarENotificar();
                _lembretePWAIntervalId = setInterval(verificarENotificar, 60000);
            }
        });
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

function initPerfilFotoEditar() {
    const btnEditar = document.getElementById('perfil-btn-editar-foto');
    const menu = document.getElementById('perfil-foto-menu');
    const opcaoTrocar = document.getElementById('perfil-opcao-trocar');
    const opcaoEmoji = document.getElementById('perfil-opcao-emoji');
    const opcaoConta = document.getElementById('perfil-opcao-conta');
    const inputFile = document.getElementById('perfil-input-file');
    const wrap = document.getElementById('perfil-foto-wrap');
    if (!btnEditar || !menu) return;

    btnEditar.addEventListener('click', function (e) {
        e.stopPropagation();
        const visivel = menu.style.display === 'block' || menu.style.display === 'flex';
        menu.style.display = visivel ? 'none' : 'block';
    });

    function fecharMenu() {
        menu.style.display = 'none';
    }

    document.addEventListener('click', function (e) {
        if (menu.style.display !== 'none' && wrap && !wrap.contains(e.target)) fecharMenu();
    });

    if (opcaoTrocar && inputFile) {
        opcaoTrocar.addEventListener('click', function () {
            fecharMenu();
            inputFile.click();
        });
    }

    if (inputFile) {
        inputFile.addEventListener('change', function () {
            const file = inputFile.files && inputFile.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = function () {
                const dataUrl = reader.result;
                abrirCropFoto(dataUrl, function (dataUrlCropped) {
                    if (!dataUrlCropped) {
                        inputFile.value = '';
                        return;
                    }
                    comprimirImagemPerfil(dataUrlCropped, function (dataUrlComprimida) {
                        localStorage.setItem('arion_foto_perfil_custom', dataUrlComprimida);
                        if (typeof salvar === 'function') salvar();
                        if (usuarioLogado) {
                            atualizarPerfilMenu(usuarioLogado, localStorage.getItem('arion_assinante') === 'true');
                            atualizarFotoMenuSuspenso();
                        }
                        preencherTelaPerfil();
                    });
                });
            };
            reader.readAsDataURL(file);
            inputFile.value = '';
        });
    }

    if (opcaoEmoji) {
        opcaoEmoji.addEventListener('click', function () {
            fecharMenu();
            abrirEmojiPicker();
        });
    }

    if (opcaoConta) {
        opcaoConta.addEventListener('click', function () {
            fecharMenu();
            localStorage.removeItem('arion_foto_perfil_custom');
            if (typeof salvar === 'function') salvar();
            if (usuarioLogado) {
                atualizarPerfilMenu(usuarioLogado, localStorage.getItem('arion_assinante') === 'true');
                atualizarFotoMenuSuspenso();
            }
            preencherTelaPerfil();
        });
    }
}

function initPerfilPreferencias() {
    var metaInput = document.getElementById('perfil-meta-diaria');
    var horarioInput = document.getElementById('perfil-horario-lembrete');
    var lembreteToggle = document.getElementById('perfil-lembrete-ativo');

    function persistirMeta() {
        if (!metaInput) return;
        localStorage.setItem('arion_meta_diaria', metaInput.value || '');
        if (typeof salvar === 'function') salvar();
    }
    function persistirLembrete() {
        if (lembreteToggle) localStorage.setItem('arion_lembrete_ativo', lembreteToggle.checked ? 'true' : 'false');
        if (horarioInput) localStorage.setItem('arion_horario_lembrete', horarioInput.value || '');
        if (typeof salvar === 'function') salvar();
        iniciarLembretePWA();
    }

    if (metaInput) {
        metaInput.addEventListener('change', persistirMeta);
        metaInput.addEventListener('blur', persistirMeta);
    }
    if (horarioInput) horarioInput.addEventListener('change', persistirLembrete);
    if (lembreteToggle) lembreteToggle.addEventListener('change', persistirLembrete);

    iniciarLembretePWA();
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initPerfilFotoEditar();
            initPerfilPreferencias();
        });
    } else {
        initPerfilFotoEditar();
        initPerfilPreferencias();
    }
}
