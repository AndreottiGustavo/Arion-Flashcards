// ========== IDIOMA (Português / English) ==========
var ARION_IDIOMA_KEY = 'arion_idioma';

var i18n = {
    pt: {
        nav_decks: 'Baralhos',
        nav_vestibulares: 'Meus Vestibulares',
        nav_stats: 'Estatísticas',
        nav_browse: 'Painel (Cards)',
        nav_store: 'Baralhos Prontos',
        nav_config: 'Configurações',
        nav_sair: 'Sair',
        screen_decks: 'Meus Baralhos',
        screen_novo_baralho: '+ Novo Baralho',
        screen_estatisticas: 'Estatísticas',
        screen_loja: 'Loja Árion',
        screen_perfil: 'Perfil',
        screen_painel: 'Painel de Cards',
        screen_estudo: 'Estudo',
        screen_criar_flashcards: 'Criar flashcards',
        perfil_aparencia: 'Aparência',
        perfil_claro: 'Claro',
        perfil_escuro: 'Escuro',
        perfil_auto: 'Auto',
        perfil_meta: 'Meta de estudo',
        perfil_meta_label: 'Meta de cards novos por dia',
        perfil_lembrete: 'Lembrete de revisões',
        perfil_lembrete_toggle: 'Lembrete diário',
        perfil_horario: 'Horário',
        perfil_streak: 'Sua sequência',
        perfil_importar_anki: 'Importar do Anki',
        perfil_suporte: 'Suporte e Feedback',
        perfil_idioma: 'Idioma',
        perfil_idioma_pt: 'Português',
        perfil_idioma_en: 'English',
        tema_desc: 'Claro: tema padrão. Escuro: modo noturno (verde mais escuro, ideal para uso à noite). Auto: segue o modo claro/escuro do celular.',
        tab_todos: 'Todos',
        tab_premium: 'Gerenciar Premium',
        search_placeholder: 'Pesquisar nos flashcards...',
        study_novos: 'novos',
        study_revisar: 'revisões',
        study_sair: 'Sair',
        study_voltar_baralhos: 'Voltar aos Baralhos',
        anki_denovo: 'De novo',
        anki_dificil: 'Difícil',
        anki_bom: 'Bom',
        anki_facil: 'Fácil',
        btn_salvar_continuar: 'SALVAR E CONTINUAR',
        placeholder_pergunta: 'Pergunta (Frente)',
        placeholder_resposta: 'Resposta (Verso)',
        col_frente: 'Frente',
        col_verso: 'Verso',
        col_baralho: 'Baralho',
        vestibulares_titulo: 'Calendário de Provas',
        vest_novo: 'Novo Vestibular',
        vest_label_instituicao: 'Nome da Instituição:',
        vest_label_data: 'Data da Prova:',
        vest_cor_card: 'Escolha uma cor para o card:',
        vest_prova: 'Prova (Ex: Enem, UFSC...)',
        vest_data: 'dd/mm/aaaa',
        btn_cancelar: 'Cancelar',
        btn_salvar: 'Salvar',
        btn_confirmar: 'CONFIRMAR',
        modal_titulo: 'Título',
        emoji_escolha: 'Escolha um emoji',
        emoji_placeholder: 'Toque aqui para abrir o teclado',
        emoji_cor_fundo: 'Cor de fundo',
        emoji_usar_foto: 'Usar como foto',
        store_biologia: 'Biologia Completa',
        store_desc: 'Cronograma completo do Ensino Médio separado por módulos.',
        store_assinatura: 'ASSINAR AGORA',
        store_atualizar: 'Já sou assinante – Atualizar conteúdo',
        filtro_ver_arquivados: 'Ver arquivados',
        filtro_ver_ativos: 'Ver ativos',
        estudar_tudo: 'Estudar Tudo',
        dias: 'dias',
        dia: 'dia',
        estude_para_comecar: 'Estude para começar',
        ultimo_estudo: 'Último estudo',
        study_label_novo: 'Novo',
        study_label_revisar: 'A Revisar',
        btn_adicionar_cards: '+ ADICIONAR CARDS',
        btn_adicionar_prova: '+ ADICIONAR NOVA PROVA',
        heatmap_calendario: 'Calendário de estudo (heatmap)',
        heatmap_menos: 'Menos',
        heatmap_mais: 'Mais',
        heatmap_dia_futuro: 'Dia futuro',
        heatmap_nenhum_card: 'Nenhum card revisado',
        heatmap_1_card: '1 card revisado',
        heatmap_n_cards: 'cards revisados',
        study_agora: 'Estudar agora',
        parabens_finalizou: 'Parabéns! Você finalizou os flashcards previstos para hoje',
        voltar_baralhos: 'VOLTAR PARA MEUS BARALHOS',
        stats_progresso_dia: 'Progresso do dia',
        stats_streak: 'Streak',
        stats_cartoes_respondidos: 'Cartões respondidos',
        stats_total_cartoes: 'Total de cartões',
        stats_hoje: 'Hoje',
        stats_revisoes_hoje: 'revisões hoje',
        stats_media_revisoes: 'Média de revisões por dia',
        stats_em_dias_estudo: 'em dias em que você estudou',
        stats_nada_hoje: 'Nada para estudar hoje',
        stats_cards_do_dia: 'cards do dia',
        stats_meta_sua: 'Sua meta:',
        stats_meta_atingida: 'Meta atingida ✓',
        stats_meta_opcional: 'Meta opcional no',
        stats_perfil: 'Perfil',
        mostrar_resposta: 'MOSTRAR RESPOSTA',
        heatmap_weekdays: 'Domingo,Segunda-feira,Terça-feira,Quarta-feira,Quinta-feira,Sexta-feira,Sábado',
        heatmap_months: 'janeiro,fevereiro,março,abril,maio,junho,julho,agosto,setembro,outubro,novembro,dezembro'
    },
    en: {
        nav_decks: 'Decks',
        nav_vestibulares: 'My Exams',
        nav_stats: 'Statistics',
        nav_browse: 'Cards Panel',
        nav_store: 'Ready Decks',
        nav_config: 'Settings',
        nav_sair: 'Sign out',
        screen_decks: 'My Decks',
        screen_novo_baralho: '+ New Deck',
        screen_estatisticas: 'Statistics',
        screen_loja: 'Árion Store',
        screen_perfil: 'Profile',
        screen_painel: 'Cards Panel',
        screen_estudo: 'Study',
        screen_criar_flashcards: 'Create flashcards',
        perfil_aparencia: 'Appearance',
        perfil_claro: 'Light',
        perfil_escuro: 'Dark',
        perfil_auto: 'Auto',
        perfil_meta: 'Study goal',
        perfil_meta_label: 'New cards per day',
        perfil_lembrete: 'Review reminders',
        perfil_lembrete_toggle: 'Daily reminder',
        perfil_horario: 'Time',
        perfil_streak: 'Your streak',
        perfil_importar_anki: 'Import from Anki',
        perfil_suporte: 'Support & Feedback',
        perfil_idioma: 'Language',
        perfil_idioma_pt: 'Português',
        perfil_idioma_en: 'English',
        tema_desc: 'Light: default theme. Dark: night mode. Auto: follow device light/dark.',
        tab_todos: 'All',
        tab_premium: 'Manage Premium',
        search_placeholder: 'Search flashcards...',
        study_novos: 'new',
        study_revisar: 'reviews',
        study_sair: 'Exit',
        study_voltar_baralhos: 'Back to Decks',
        anki_denovo: 'Again',
        anki_dificil: 'Hard',
        anki_bom: 'Good',
        anki_facil: 'Easy',
        btn_salvar_continuar: 'SAVE & CONTINUE',
        placeholder_pergunta: 'Question (Front)',
        placeholder_resposta: 'Answer (Back)',
        col_frente: 'Front',
        col_verso: 'Back',
        col_baralho: 'Deck',
        vestibulares_titulo: 'Exam Calendar',
        vest_novo: 'New Exam',
        vest_label_instituicao: 'Institution name:',
        vest_label_data: 'Exam date:',
        vest_cor_card: 'Choose a color for the card:',
        vest_prova: 'Exam (e.g. SAT, ACT...)',
        vest_data: 'mm/dd/yyyy',
        btn_cancelar: 'Cancel',
        btn_salvar: 'Save',
        btn_confirmar: 'CONFIRM',
        modal_titulo: 'Title',
        emoji_escolha: 'Choose an emoji',
        emoji_placeholder: 'Tap to open keyboard',
        emoji_cor_fundo: 'Background color',
        emoji_usar_foto: 'Use as photo',
        store_biologia: 'Complete Biology',
        store_desc: 'Full high school schedule by modules.',
        store_assinatura: 'SUBSCRIBE NOW',
        store_atualizar: 'I\'m a subscriber – Update content',
        filtro_ver_arquivados: 'View archived',
        filtro_ver_ativos: 'View active',
        estudar_tudo: 'Study All',
        dias: 'days',
        dia: 'day',
        estude_para_comecar: 'Study to get started',
        ultimo_estudo: 'Last study',
        study_label_novo: 'New',
        study_label_revisar: 'To Review',
        btn_adicionar_cards: '+ ADD CARDS',
        btn_adicionar_prova: '+ ADD NEW EXAM',
        heatmap_calendario: 'Study calendar (heatmap)',
        heatmap_menos: 'Less',
        heatmap_mais: 'More',
        heatmap_dia_futuro: 'Future day',
        heatmap_nenhum_card: 'No cards reviewed',
        heatmap_1_card: '1 card reviewed',
        heatmap_n_cards: 'cards reviewed',
        study_agora: 'Study now',
        parabens_finalizou: 'Congratulations! You\'ve completed today\'s scheduled flashcards',
        voltar_baralhos: 'BACK TO MY DECKS',
        stats_progresso_dia: 'Daily progress',
        stats_streak: 'Streak',
        stats_cartoes_respondidos: 'Cards answered',
        stats_total_cartoes: 'Total cards',
        stats_hoje: 'Today',
        stats_revisoes_hoje: 'reviews today',
        stats_media_revisoes: 'Average reviews per day',
        stats_em_dias_estudo: 'on days you studied',
        stats_nada_hoje: 'Nothing to study today',
        stats_cards_do_dia: 'cards today',
        stats_meta_sua: 'Your goal:',
        stats_meta_atingida: 'Goal reached ✓',
        stats_meta_opcional: 'Optional goal in',
        stats_perfil: 'Profile',
        mostrar_resposta: 'SHOW ANSWER',
        heatmap_weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
        heatmap_months: 'January,February,March,April,May,June,July,August,September,October,November,December'
    }
};

function getIdioma() {
    var saved = localStorage.getItem(ARION_IDIOMA_KEY);
    return (saved === 'en' || saved === 'pt') ? saved : 'pt';
}

function setIdioma(lang) {
    if (lang !== 'pt' && lang !== 'en') return;
    localStorage.setItem(ARION_IDIOMA_KEY, lang);
    aplicarIdioma();
}

function t(key) {
    var lang = getIdioma();
    return (i18n[lang] && i18n[lang][key]) ? i18n[lang][key] : (i18n.pt[key] || key);
}

function aplicarIdioma() {
    var lang = getIdioma();
    var strings = i18n[lang] || i18n.pt;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (strings[key] != null) {
            if (el.getAttribute('data-i18n-placeholder') !== null) el.placeholder = strings[key];
            else if (el.getAttribute('data-i18n-title') !== null) el.title = strings[key];
            else el.textContent = strings[key];
        }
    });
    if (typeof atualizarBotoesIdioma === 'function') atualizarBotoesIdioma();
    if (typeof renderizar === 'function') renderizar();
    if (typeof preencherTelaPerfil === 'function') preencherTelaPerfil();
    if (typeof renderEstatisticas === 'function') renderEstatisticas();
    var det = document.getElementById('details-screen');
    if (det && det.classList.contains('active')) {
        var nameEl = document.getElementById('details-deck-name');
        if (nameEl && (nameEl.innerText === 'Estudar Tudo' || nameEl.innerText === 'Study All')) {
            if (typeof abrirDetalhesEstudarTudo === 'function') abrirDetalhesEstudarTudo();
        } else if (typeof dIdx === 'number' && typeof abrirDetalhes === 'function') {
            abrirDetalhes(dIdx);
        }
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicarIdioma);
    } else {
        aplicarIdioma();
    }
}
