/**
 * Teste da lógica de revisão espaçada (SRS) - SEM esperar intervalos reais.
 * Simula o fluxo idêntico ao js/anki-logic.js e verifica estados/intervalos.
 *
 * Rodar: node test-srs.js
 */

const ANKI = {
    learningSteps: [1, 10],
    lapseSteps: [10],
    graduatingInterval: 1,
    easyInterval: 4,
    startingEase: 2.5,
    easyBonus: 1.3,
    hardInterval: 1.2,
    newInterval: 0.2,
    minEase: 1.3,
    maxInterval: 75
};

const DIA_MS = 86400000;
const MINUTO_MS = 60000;

// Respostas: 0=De novo, 1=Difícil, 2=Bom, 3=Fácil
function aplicarResposta(card, q, agora) {
    const ls = ANKI.learningSteps;
    const lapses = ANKI.lapseSteps;
    const marcarMinutos = (min) => agora + (min * MINUTO_MS);
    const marcarDias = (dias) => agora + (dias * DIA_MS);

    if (!card.ease) card.ease = ANKI.startingEase;
    if (card.int == null) card.int = 0;
    if (card.step == null) card.step = 0;
    if (!card.state) card.state = 'new';

    if (card.state === 'new' || card.state === 'learning') {
        const steps = (card.prevInt != null) ? lapses : ls;
        if (q === 0) {
            card.state = 'learning';
            card.step = 0;
            card.rev = marcarMinutos(steps[0]);
            return { reenfileirar: true };
        }
        if (q === 1) {
            card.state = 'learning';
            let minHard = steps[card.step];
            if (card.step === 0 && steps.length >= 2) minHard = Math.round((steps[0] + steps[1]) / 2);
            else if (steps.length === 1) minHard = Math.min(1440, Math.round(steps[0] * 1.5));
            card.rev = marcarMinutos(minHard);
            return { reenfileirar: true };
        }
        if (q === 2) {
            card.step++;
            if (card.step < steps.length) {
                card.state = 'learning';
                card.rev = marcarMinutos(steps[card.step]);
                return { reenfileirar: true };
            }
            card.state = 'review';
            if (card.prevInt != null) {
                card.int = Math.max(1, Math.round(card.prevInt * ANKI.newInterval));
                delete card.prevInt;
            } else {
                card.int = ANKI.graduatingInterval;
            }
            card.rev = marcarDias(card.int);
            card.rep = (card.rep || 0) + 1;
            return { finalizar: true };
        }
        if (q === 3) {
            card.state = 'review';
            card.int = ANKI.easyInterval;
            if (card.prevInt != null) delete card.prevInt;
            card.rev = marcarDias(card.int);
            card.rep = (card.rep || 0) + 1;
            return { finalizar: true };
        }
    }

    // review
    if (q === 0) {
        card.ease = Math.max(ANKI.minEase, card.ease - 0.2);
        card.prevInt = card.int;
        card.state = 'learning';
        card.step = 0;
        card.rev = marcarMinutos(lapses[0]);
        return { reenfileirar: true };
    }
    if (q === 1) {
        card.ease = Math.max(ANKI.minEase, card.ease - 0.15);
        card.int = Math.max(card.int + 1, Math.round(card.int * ANKI.hardInterval));
    } else if (q === 2) {
        card.int = Math.max(card.int + 1, Math.round(card.int * card.ease));
    } else if (q === 3) {
        card.ease += 0.15;
        card.int = Math.max(card.int + 1, Math.round(card.int * card.ease * ANKI.easyBonus));
    }
    card.int = Math.min(card.int, ANKI.maxInterval);
    card.rev = marcarDias(card.int);
    card.rep = (card.rep || 0) + 1;
    return { finalizar: true };
}

function cloneCard(c) {
    return JSON.parse(JSON.stringify(c));
}

function formatRev(rev, agora) {
    const diff = rev - agora;
    if (diff < MINUTO_MS * 60) return (diff / MINUTO_MS).toFixed(0) + ' min';
    if (diff < DIA_MS) return (diff / DIA_MS).toFixed(2) + ' dias';
    return (diff / DIA_MS).toFixed(0) + ' dias';
}

let erros = 0;

function ok(cond, msg) {
    if (!cond) {
        console.error('❌ FALHA:', msg);
        erros++;
        return false;
    }
    console.log('  ✓', msg);
    return true;
}

console.log('========== TESTE 1: Card NOVO → Bom → Bom (graduar 1d) ==========\n');

let agora = Date.now();
let c = { state: 'new', rev: 0, int: 0, ease: 2.5, step: 0, rep: 0 };

// Novo, resposta Bom (q=2): avança para step 1 → rev em 10 min
aplicarResposta(c, 2, agora);
ok(c.state === 'learning' && c.step === 1, `Após 1º Bom: state=learning, step=1`);
const rev10min = c.rev;
ok(Math.abs((rev10min - agora) - 10 * MINUTO_MS) < 1000, `Próxima revisão em 10 min (${formatRev(rev10min, agora)})`);

// "Avançar o tempo" 11 min para o card estar devido de novo
agora = rev10min + MINUTO_MS;
c.rev = rev10min;

// Learning step 1, resposta Bom (q=2): graduar → int=1d, state=review
aplicarResposta(c, 2, agora);
ok(c.state === 'review', `Após 2º Bom: state=review (graduou)`);
ok(c.int === 1, `Intervalo = 1 dia`);
const rev1d = c.rev;
ok(Math.abs((rev1d - agora) - DIA_MS) < 1000, `Próxima revisão em 1 dia (${formatRev(rev1d, agora)})`);

console.log('\n========== TESTE 2: Card em REVIEW (1d) → Bom → deve virar ~2d ==========\n');

agora = rev1d + 1000; // 1 dia depois
c = { state: 'review', rev: rev1d, int: 1, ease: 2.5, step: 0, rep: 1 };
aplicarResposta(c, 2, agora);
// int novo = max(1+1, round(1 * 2.5)) = max(2, 2) = 2
ok(c.int === 2, `Review Bom: int de 1 → 2 dias`);
ok(c.state === 'review', `Continua em review`);
const rev2d = c.rev;
ok(Math.abs((rev2d - agora) - 2 * DIA_MS) < 1000, `Próxima revisão em 2 dias (${formatRev(rev2d, agora)})`);

console.log('\n========== TESTE 3: Card em REVIEW (2d) → Fácil → int sobe mais ==========\n');

agora = rev2d + 1000;
c = { state: 'review', rev: rev2d, int: 2, ease: 2.5, step: 0, rep: 2 };
aplicarResposta(c, 3, agora);
// Easy: ease += 0.15 → 2.65, int = max(3, round(2 * 2.5 * 1.3)) = max(3, 6) = 6
const intEsperado = Math.max(2 + 1, Math.round(2 * 2.5 * ANKI.easyBonus));
ok(c.int === intEsperado, `Review Fácil: int = ${intEsperado} dias`);
ok(c.ease === 2.65, `Ease subiu para 2.65`);

console.log('\n========== TESTE 4: Card NEW → De novo → rev em 1 min ==========\n');

c = { state: 'new', rev: 0, int: 0, ease: 2.5, step: 0, rep: 0 };
agora = Date.now();
aplicarResposta(c, 0, agora);
ok(c.state === 'learning' && c.step === 0, `De novo: learning step 0`);
ok(Math.abs((c.rev - agora) - 1 * MINUTO_MS) < 1000, `Rev em 1 min (learningSteps[0])`);

console.log('\n========== TESTE 5: LAPSE (review → De novo) → relearning 10 min ==========\n');

c = { state: 'review', rev: agora, int: 5, ease: 2.5, step: 0, rep: 3 };
aplicarResposta(c, 0, agora);
ok(c.state === 'learning' && c.step === 0, `Lapse: volta para learning`);
ok(c.prevInt === 5, `prevInt guardado = 5`);
ok(Math.abs((c.rev - agora) - 10 * MINUTO_MS) < 1000, `Relearning: rev em 10 min (lapseSteps[0])`);

// Simular sair do relearning com Good: int = max(1, round(5 * 0.2)) = 1
agora = c.rev + 1000;
c.rev = agora - 1000;
aplicarResposta(c, 2, agora);
ok(c.state === 'review', `Saiu do relearning`);
ok(c.int === 1, `Novo int após lapse = 1 (5 * 0.2)`);
ok(c.prevInt === undefined, `prevInt removido`);

console.log('\n========== TESTE 6: Cap maxInterval (75 dias) ==========\n');

c = { state: 'review', rev: agora, int: 70, ease: 2.5, step: 0, rep: 10 };
aplicarResposta(c, 3, agora); // Easy: int pode passar de 75
ok(c.int <= ANKI.maxInterval, `Intervalo limitado a ${ANKI.maxInterval} dias (obteve ${c.int})`);

console.log('\n========================================');
if (erros > 0) {
    console.log(`\n❌ TOTAL: ${erros} falha(s). Revisar lógica SRS.`);
    process.exit(1);
} else {
    console.log('✅ Todos os testes passaram. Lógica de revisão espaçada consistente.');
}
