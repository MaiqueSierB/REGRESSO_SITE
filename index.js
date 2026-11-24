// Portal do Regresso (regresso.mrbnexus.com.br): só leitura dos bancos dos bots.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import config from './config.js';
import * as d from './dados.js';
import { completar } from './capas.js';
import * as p from './paginas.js';

const POR_PAGINA = 60;

// ---------- Login do Gym Rats (senha do grupo) ----------
// O cookie é uma assinatura da senha: trocar a senha no .gym.env desloga todo mundo.
const DIAS_LOGIN = 30;
const assinatura = () => crypto.createHmac('sha256', config.gymSenha).update('gym-rats-v1').digest('hex');
const iguais = (a, b) => {
    const x = crypto.createHash('sha256').update(String(a)).digest();
    const y = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(x, y);
};
function logadoGym(req) {
    if (!config.gymSenha) return false;
    const c = (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith('gym='));
    return Boolean(c) && iguais(c.slice(4), assinatura());
}
// Limite de tentativas: 8 a cada 15 min por IP
const tentativas = new Map();
function bloqueado(ip) {
    const agora = Date.now();
    const t = (tentativas.get(ip) ?? []).filter(x => agora - x < 15 * 60_000);
    tentativas.set(ip, t);
    return t.length >= 8;
}
async function lerCorpo(req) {
    let corpo = '';
    for await (const parte of req) { corpo += parte; if (corpo.length > 2_000) break; }
    return new URLSearchParams(corpo);
}

async function rota(url) {
    const partes = url.pathname.split('/').filter(Boolean);
    const q = url.searchParams;

    if (!partes.length) {
        const r = d.resumo();
        await Promise.all([completar('filme', [...r.topFilmes, ...r.recentes]), completar('jogo', r.topJogos)]);
        return p.paginaInicio(r, d.rankingBolao(), d.jogosBolao().proximos);
    }
    const [a, b] = partes;
    if ((a === 'filmes' || a === 'jogos') && !b) {
        const tipo = a === 'filmes' ? 'filme' : 'jogo';
        const ordem = q.get('ordem') || 'nota';
        const todos = d.catalogo(tipo, { q: q.get('q') || '', ordem });
        const pagina = Math.max(1, Number(q.get('p')) || 1);
        const itens = todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
        await completar(tipo, itens);
        return p.paginaCatalogo(tipo, itens, { q: q.get('q') || '', ordem, pagina, total: todos.length });
    }
    if ((a === 'filme' || a === 'jogo') && /^\d+$/.test(b ?? '')) {
        const i = d.item(a, Number(b));
        if (!i) return null;
        await completar(a, [i], 6_000);
        return p.paginaItem(a, i);
    }
    if (a === 'galera' && !b) return p.paginaGalera(d.galera());
    if (a === 'galera' && b) {
        const pessoa = d.pessoa(decodeURIComponent(b));
        if (!pessoa) return null;
        const media = (lista, campo) => {
            const v = lista.filter(x => x[campo] != null);
            return v.length ? v.reduce((s, x) => s + x[campo], 0) / v.length : null;
        };
        const g = d.galera();
        return p.paginaPessoa(pessoa, media(g, 'mediaFilmes'), media(g, 'mediaJogos'));
    }
    if (a === 'bolao' && !b) return p.paginaBolao(d.temporadaAtual(), d.rankingBolao(), d.jogosBolao(), d.tabela());
    if (a === 'torcidas' && !b) return p.paginaTorcidas(d.torcidas());
    if (a === 'gym' && !b) {
        const ciclo = /^\d{4}-\d{2}-\d{2}$/.test(q.get('ciclo') ?? '') ? q.get('ciclo') : undefined;
        return p.paginaGym(d.gym(ciclo));
    }
    return null;
}

function enviarHtml(res, status, html, privado = false) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': privado ? 'private, no-store' : 'public, max-age=60' });
    res.end(html);
}

http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
        if (url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: true, bot: 'Portal do Regresso' }));
        }
        if (url.pathname === '/robots.txt') {
            // Só o robô do AdSense pode ler (para escolher anúncios); buscadores bloqueados (nomes e notas da galera)
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            return res.end('User-agent: Mediapartners-Google\nAllow: /\n\nUser-agent: *\nDisallow: /\n');
        }
        // ----- Gym Rats: tudo atrás da senha -----
        if (url.pathname === '/gym/entrar' && req.method === 'POST') {
            const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
            if (!config.gymSenha) return enviarHtml(res, 200, p.paginaLoginGym({ semSenha: true }));
            if (bloqueado(ip)) return enviarHtml(res, 429, p.paginaLoginGym({ erro: 'Muitas tentativas. Espera uns minutos.' }));
            const senha = (await lerCorpo(req)).get('senha') ?? '';
            if (!iguais(senha, config.gymSenha)) {
                tentativas.get(ip).push(Date.now());
                return enviarHtml(res, 401, p.paginaLoginGym({ erro: 'Senha errada.' }));
            }
            res.writeHead(303, { Location: '/gym', 'Set-Cookie': `gym=${assinatura()}; Path=/; Max-Age=${DIAS_LOGIN * 86400}; HttpOnly; Secure; SameSite=Lax` });
            return res.end();
        }
        if (url.pathname === '/gym/sair') {
            res.writeHead(303, { Location: '/', 'Set-Cookie': 'gym=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' });
            return res.end();
        }
        if (url.pathname.startsWith('/gym') && !logadoGym(req)) {
            if (url.pathname !== '/gym') { res.writeHead(403); return res.end(); }
            return enviarHtml(res, 200, p.paginaLoginGym({ semSenha: !config.gymSenha }), true);
        }
        // Fotos do Gym Rats (só nomes gerados pelo bot: AAAA-MM-DD-hex.jpg)
        const foto = url.pathname.match(/^\/gym\/foto\/(\d{4}-\d{2}-\d{2}-[a-f0-9]{12}\.jpg)$/);
        if (foto) {
            const arquivo = path.join(config.fotosGym, foto[1]);
            if (!fs.existsSync(arquivo)) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' });
            return fs.createReadStream(arquivo).pipe(res);
        }
        const html = await rota(url);
        enviarHtml(res, html ? 200 : 404, html ?? p.pagina404(), url.pathname.startsWith('/gym'));
    } catch (e) {
        console.error('Erro na página', url.pathname, e);
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Deu erro aqui. Tenta de novo daqui a pouco.');
    }
}).listen(config.porta, () => console.log(`Portal do Regresso na porta ${config.porta}`));
