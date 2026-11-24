// Consultas aos bancos dos bots (sempre só leitura). Tudo que o portal mostra sai daqui.
import fs from 'node:fs';
import Database from 'better-sqlite3';
import config from './config.js';

const abertos = {};
function banco(nome) {
    if (abertos[nome] !== undefined) return abertos[nome];
    const arquivo = config.bancos[nome];
    try {
        abertos[nome] = fs.existsSync(arquivo) ? new Database(arquivo, { readonly: true, fileMustExist: true }) : null;
        abertos[nome]?.pragma('busy_timeout = 5000');
    } catch (e) {
        console.error(`Não abri o banco ${nome}:`, e.message);
        abertos[nome] = null;
    }
    return abertos[nome];
}
const todos = (nome, sql, ...a) => { try { return banco(nome)?.prepare(sql).all(...a) ?? []; } catch { return []; } };
const um = (nome, sql, ...a) => { try { return banco(nome)?.prepare(sql).get(...a); } catch { return undefined; } };

// Cache curto: os bancos mudam pouco e a hospedagem é compartilhada
const cache = new Map();
function lembrar(chave, ms, fn) {
    const c = cache.get(chave);
    if (c && Date.now() - c.quando < ms) return c.valor;
    const valor = fn();
    cache.set(chave, { quando: Date.now(), valor });
    return valor;
}

// ---------- Pessoas ----------
// Nome de cada um: o do vínculo com o Zap (nome do Discord), senão o do bot de aniversários, senão o usuário
export function nomes() {
    return lembrar('nomes', 60_000, () => {
        const m = new Map();
        for (const r of todos('rgdb', 'SELECT user_id, username FROM usuarios')) if (r.username) m.set(r.user_id, r.username);
        for (const r of todos('rmdb', 'SELECT user_id, MAX(username) AS u FROM votos_filmes GROUP BY user_id')) if (r.u && !m.has(r.user_id)) m.set(r.user_id, r.u);
        for (const r of todos('rgdb', 'SELECT user_id, MAX(username) AS u FROM votos_jogos GROUP BY user_id')) if (r.u && !m.has(r.user_id)) m.set(r.user_id, r.u);
        for (const r of todos('bolao', 'SELECT user_id, MAX(username) AS u FROM palpites GROUP BY user_id')) if (r.u && !m.has(r.user_id)) m.set(r.user_id, r.u);
        for (const r of todos('aniv', 'SELECT user_id, name FROM birthdays')) if (r.name) m.set(r.user_id, r.name);
        for (const r of todos('zap', 'SELECT discord_id, nome FROM vinculos WHERE nome IS NOT NULL')) m.set(r.discord_id, r.nome);
        return m;
    });
}
export const nomeDe = id => nomes().get(id) ?? 'Alguém';

export function galera() {
    return lembrar('galera', 60_000, () => {
        const f = new Map(todos('rmdb', 'SELECT user_id, COUNT(*) AS n, AVG(score) AS m FROM votos_filmes GROUP BY user_id').map(r => [r.user_id, r]));
        const j = new Map(todos('rgdb', 'SELECT user_id, COUNT(*) AS n, AVG(score) AS m FROM votos_jogos GROUP BY user_id').map(r => [r.user_id, r]));
        const xp = new Map(todos('rgdb', 'SELECT user_id, xp, level FROM usuarios').map(r => [r.user_id, r]));
        const times = new Map(todos('bolao', 'SELECT discord_id, time_nome FROM times_favoritos').map(r => [r.discord_id, r.time_nome]));
        const pal = new Map(todos('bolao', 'SELECT user_id, COUNT(*) AS n FROM palpites GROUP BY user_id').map(r => [r.user_id, r.n]));
        const ids = new Set([...f.keys(), ...j.keys(), ...pal.keys(), ...times.keys(), ...[...xp.keys()].filter(k => xp.get(k).xp > 0)]);
        return [...ids].map(id => ({
            id, nome: nomeDe(id),
            filmes: f.get(id)?.n ?? 0, mediaFilmes: f.get(id)?.m ?? null,
            jogos: j.get(id)?.n ?? 0, mediaJogos: j.get(id)?.m ?? null,
            nivel: xp.get(id)?.level ?? null, xp: xp.get(id)?.xp ?? 0,
            palpites: pal.get(id) ?? 0, time: times.get(id) ?? null
        })).sort((a, b) => (b.filmes + b.jogos + b.palpites) - (a.filmes + a.jogos + a.palpites));
    });
}

export function pessoa(id) {
    const p = galera().find(x => x.id === id);
    if (!p) return null;
    const votos = (nome, sql) => todos(nome, sql, id);
    return {
        ...p,
        aniversario: um('aniv', 'SELECT birthday FROM birthdays WHERE user_id = ?', id)?.birthday ?? null,
        votosFilmes: votos('rmdb', `SELECT v.movie_id AS id, v.score, a.title, a.server_score AS grupo, a.vote_count AS n
            FROM votos_filmes v JOIN avaliacoes_filmes a ON a.movie_id = v.movie_id WHERE v.user_id = ? ORDER BY v.score DESC, a.server_score DESC`),
        votosJogos: votos('rgdb', `SELECT v.game_id AS id, v.score, a.title, a.server_score AS grupo, a.vote_count AS n
            FROM votos_jogos v JOIN avaliacoes_jogos a ON a.game_id = v.game_id WHERE v.user_id = ? ORDER BY v.score DESC, a.server_score DESC`),
        bolao: rankingBolao().find(r => r.user_id === id) ?? null
    };
}

// ---------- Filmes e jogos ----------
const TIPOS = {
    filme: { banco: 'rmdb', itens: 'avaliacoes_filmes', votos: 'votos_filmes', id: 'movie_id', data: 'timestamp' },
    jogo: { banco: 'rgdb', itens: 'avaliacoes_jogos', votos: 'votos_jogos', id: 'game_id', data: null }
};

export function catalogo(tipo, { q = '', ordem = 'nota' } = {}) {
    const t = TIPOS[tipo];
    const lista = lembrar(`cat:${tipo}`, 60_000, () => todos(t.banco,
        `SELECT ${t.id} AS id, title, server_score AS nota, vote_count AS n${t.data ? `, ${t.data} AS quando` : ''} FROM ${t.itens}`));
    const busca = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const filtrada = busca ? lista.filter(i => i.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(busca)) : [...lista];
    const ordens = {
        nota: (a, b) => b.nota - a.nota || b.n - a.n,
        votos: (a, b) => b.n - a.n || b.nota - a.nota,
        az: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
        piores: (a, b) => a.nota - b.nota || b.n - a.n,
        recentes: (a, b) => String(b.quando ?? '').localeCompare(String(a.quando ?? '')) || b.id - a.id
    };
    return filtrada.sort(ordens[ordem] ?? ordens.nota);
}

export function item(tipo, id) {
    const t = TIPOS[tipo];
    const i = um(t.banco, `SELECT ${t.id} AS id, title, server_score AS nota, vote_count AS n FROM ${t.itens} WHERE ${t.id} = ?`, id);
    if (!i) return null;
    const votos = todos(t.banco, `SELECT user_id, score FROM ${t.votos} WHERE ${t.id} = ? ORDER BY score DESC`, id)
        .map(v => ({ ...v, nome: nomeDe(v.user_id) }));
    const media = votos.length ? votos.reduce((s, v) => s + v.score, 0) / votos.length : null;
    const desvio = votos.length > 1 ? Math.sqrt(votos.reduce((s, v) => s + (v.score - media) ** 2, 0) / votos.length) : 0;
    return { ...i, votos, desvio };
}

export function resumo() {
    return lembrar('resumo', 60_000, () => {
        const f = um('rmdb', 'SELECT COUNT(*) AS itens, (SELECT COUNT(*) FROM votos_filmes) AS votos FROM avaliacoes_filmes') ?? { itens: 0, votos: 0 };
        const j = um('rgdb', 'SELECT COUNT(*) AS itens, (SELECT COUNT(*) FROM votos_jogos) AS votos FROM avaliacoes_jogos') ?? { itens: 0, votos: 0 };
        const minimo = 3;
        const polemico = (tipo) => {
            const t = TIPOS[tipo];
            return todos(t.banco, `SELECT v.${t.id} AS id, a.title, a.server_score AS nota, COUNT(*) AS n,
                AVG(v.score * v.score) - AVG(v.score) * AVG(v.score) AS var
                FROM ${t.votos} v JOIN ${t.itens} a ON a.${t.id} = v.${t.id} GROUP BY v.${t.id} HAVING n >= ? ORDER BY var DESC LIMIT 1`, minimo)[0] ?? null;
        };
        return {
            filmes: f.itens, notasFilmes: f.votos, jogos: j.itens, notasJogos: j.votos,
            pessoas: galera().length, palpites: um('bolao', 'SELECT COUNT(*) AS n FROM palpites')?.n ?? 0,
            topFilmes: catalogo('filme').filter(x => x.n >= 2).slice(0, 8),
            topJogos: catalogo('jogo').filter(x => x.n >= 2).slice(0, 8),
            recentes: catalogo('filme', { ordem: 'recentes' }).slice(0, 8),
            polemicoFilme: polemico('filme'), polemicoJogo: polemico('jogo')
        };
    });
}

// ---------- Bolão ----------
export function temporadaAtual() {
    return um('bolao', 'SELECT MAX(temporada) AS t FROM jogos')?.t ?? null;
}

export function rankingBolao(temporada = temporadaAtual()) {
    if (temporada == null) return [];
    return lembrar(`ranking:${temporada}`, 60_000, () => todos('bolao', `
        SELECT p.user_id, COUNT(*) AS palpites, COALESCE(SUM(p.pontos), 0) AS pontos,
               SUM(CASE WHEN p.pontos = 25 THEN 1 ELSE 0 END) AS exatos,
               SUM(CASE WHEN p.pontos > 0 THEN 1 ELSE 0 END) AS pontuou
        FROM palpites p JOIN jogos j ON j.id = p.jogo_id WHERE j.temporada = ?
        GROUP BY p.user_id ORDER BY pontos DESC, exatos DESC`, temporada)
        .map((r, i) => ({ ...r, posicao: i + 1, nome: nomeDe(r.user_id) })));
}

// Palpites só aparecem depois que o jogo começa (antes, ninguém copia ninguém)
export function jogosBolao() {
    return lembrar('jogosBolao', 30_000, () => {
        const agora = new Date().toISOString();
        const proximos = todos('bolao', `SELECT j.*, (SELECT COUNT(*) FROM palpites p WHERE p.jogo_id = j.id) AS npalpites
            FROM jogos j WHERE j.data_utc >= ? AND j.status NOT IN ('FINISHED','POSTPONED','CANCELLED') ORDER BY j.data_utc LIMIT 10`, agora);
        const recentes = todos('bolao', `SELECT * FROM jogos WHERE data_utc < ? AND status NOT IN ('POSTPONED','CANCELLED')
            ORDER BY data_utc DESC LIMIT 10`, agora).map(j => ({
            ...j,
            palpites: todos('bolao', 'SELECT user_id, gols_casa, gols_fora, pontos FROM palpites WHERE jogo_id = ? ORDER BY pontos DESC', j.id)
                .map(p => ({ ...p, nome: nomeDe(p.user_id) }))
        }));
        return { proximos, recentes };
    });
}

export const tabela = () => lembrar('tabela', 60_000, () => todos('bolao', 'SELECT * FROM tabela ORDER BY posicao'));

export function torcidas() {
    const porTime = new Map();
    for (const r of todos('bolao', 'SELECT discord_id, time_nome FROM times_favoritos')) {
        porTime.set(r.time_nome, [...(porTime.get(r.time_nome) ?? []), { id: r.discord_id, nome: nomeDe(r.discord_id) }]);
    }
    return [...porTime].map(([time, gente]) => ({ time, gente })).sort((a, b) => b.gente.length - a.gente.length || a.time.localeCompare(b.time));
}

// ---------- Gym Rats ----------
const hojeBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
function sequencia(userId) {
    const dias = new Set(todos('gym', 'SELECT dia FROM checkins WHERE user_id = ?', userId).map(r => r.dia));
    const antes = d => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
    let d = dias.has(hojeBR()) ? hojeBR() : antes(hojeBR());
    let n = 0;
    while (dias.has(d)) { n++; d = antes(d); }
    return n;
}
export function cicloDe(dia = hojeBR()) {
    const [a, m, d] = dia.split('-').map(Number);
    const ini = d >= 26 ? new Date(Date.UTC(a, m - 1, 26)) : new Date(Date.UTC(a, m - 2, 26));
    const fim = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() + 1, 25));
    return { inicio: ini.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}
export function gym(inicio) {
    const ciclo = cicloDe(inicio ?? hojeBR());
    const ranking = todos('gym', `SELECT user_id, MAX(nome) AS nome, COUNT(*) AS pontos, MAX(dia) AS ultimo
        FROM checkins WHERE dia BETWEEN ? AND ? GROUP BY user_id ORDER BY pontos DESC, ultimo ASC`, ciclo.inicio, ciclo.fim)
        .map((r, i) => ({ ...r, posicao: i + 1, nome: nomes().get(r.user_id) ?? r.nome, sequencia: sequencia(r.user_id) }));
    const mural = todos('gym', 'SELECT user_id, nome, dia, foto, legenda FROM checkins WHERE foto IS NOT NULL AND dia BETWEEN ? AND ? ORDER BY id DESC LIMIT 48', ciclo.inicio, ciclo.fim)
        .map(c => ({ ...c, nome: nomes().get(c.user_id) ?? c.nome }));
    const ciclos = [...new Set(todos('gym', 'SELECT DISTINCT dia FROM checkins').map(r => cicloDe(r.dia).inicio))].sort().reverse()
        .map(ini => cicloDe(ini));
    if (!ciclos.some(c => c.inicio === ciclo.inicio)) ciclos.unshift(ciclo);
    return { ciclo, ranking, mural, ciclos, treinos: ranking.reduce((s, r) => s + r.pontos, 0) };
}
