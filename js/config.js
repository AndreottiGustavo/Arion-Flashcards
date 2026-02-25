// ========== CONFIGURAÇÕES E ESTADO GLOBAL (Árion) ==========
const meuUIDAdmin = 'DYQ7xDOhJXVa93n7T7dzDhlCgDg2';
const TUTORIAL_DECK_NOME = "🚀 Tutorial Rápido – Aprenda usar o Árion em 1min!";
let meusVestibulares = JSON.parse(localStorage.getItem('meusVestibulares')) || [];
let baralhos = [];
let dIdx = 0, fila = [], respondido = false, cardVirado = false, veioDeEstudarTudo = false;
let corAtual = "#ff0000";
let onboardingFeito = localStorage.getItem('arion_onboarding') === 'true';
let usuarioLogado = null;

// Placeholder: avatar "bonequinho" quando não há foto (Google/Apple) ou falha no carregamento
const AVATAR_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="38" r="18" fill="rgba(244,233,193,0.5)"/><path d="M20 92c0-20 22-30 30-30s30 10 30 30" fill="rgba(244,233,193,0.4)"/></svg>');

// Paleta de cores sólidas que combinam com emojis (estilo WhatsApp)
const PALETA_CORES_EMOJI = ['#FFE4B5', '#FFDAB9', '#E6E6FA', '#B0E0E6', '#98FB98', '#F0E68C', '#FFB6C1', '#DDA0DD', '#87CEEB', '#F5DEB3', '#D8BFD8', '#FFA07A', '#AFEEEE', '#E0BBE4', '#F7DC6F', '#D5F5E3', '#FADBD8', '#D6EAF8'];
