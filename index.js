// Portal do Regresso (regresso.mrbnexus.com.br): só leitura dos bancos dos bots.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import config from './config.js';
import * as d from './dados.js';
import { completar } from './capas.js';
import * as p from './paginas.js';

const POR_PAGINA = 60;

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
        const mes = /^\d{4}-\d{2}$/.test(q.get('mes') ?? '') ? q.get('mes') : undefined;
        return p.paginaGym(d.gym(mes));
    }
    return null;
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
        // Fotos do Gym Rats (só nomes gerados pelo bot: AAAA-MM-DD-hex.jpg)
        const foto = url.pathname.match(/^\/gym\/foto\/(\d{4}-\d{2}-\d{2}-[a-f0-9]{12}\.jpg)$/);
        if (foto) {
            const arquivo = path.join(config.fotosGym, foto[1]);
            if (!fs.existsSync(arquivo)) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
            return fs.createReadStream(arquivo).pipe(res);
        }
        const html = await rota(url);
        res.writeHead(html ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' });
        res.end(html ?? p.pagina404());
    } catch (e) {
        console.error('Erro na página', url.pathname, e);
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Deu erro aqui. Tenta de novo daqui a pouco.');
    }
}).listen(config.porta, () => console.log(`Portal do Regresso na porta ${config.porta}`));
