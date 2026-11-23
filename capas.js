// Capas e detalhes (ano, gêneros, sinopse) do TMDB e da RAWG. Os bancos dos bots não guardam isso.
// Cache em memória + arquivo (sobrevive a reinícios); erro de rede não entra no cache.
import fs from 'node:fs';
import path from 'node:path';
import config from './config.js';

let cache = {};
try { cache = JSON.parse(fs.readFileSync(config.cacheCapas, 'utf8')); } catch { /* começa vazio */ }

let salvarDepois = null;
function salvar() {
    clearTimeout(salvarDepois);
    salvarDepois = setTimeout(() => {
        try {
            fs.mkdirSync(path.dirname(config.cacheCapas), { recursive: true });
            fs.writeFileSync(config.cacheCapas, JSON.stringify(cache));
        } catch (e) {
            console.error('Cache de capas:', e.message);
        }
    }, 2_000);
}

const normal = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

async function json(url) {
    const r = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

async function buscarFilme(id, titulo) {
    if (!config.tmdbKey) return null;
    // O id do RMDB pode ser de filme ou de série: confere pelo título
    const achados = [];
    for (const tipo of ['movie', 'tv']) {
        const r = await json(`https://api.themoviedb.org/3/${tipo}/${id}?api_key=${config.tmdbKey}&language=pt-BR`);
        if (r) achados.push({
            titulo: r.title || r.name,
            capa: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
            fundo: r.backdrop_path ? `https://image.tmdb.org/t/p/w1280${r.backdrop_path}` : null,
            ano: (r.release_date || r.first_air_date || '').slice(0, 4) || null,
            generos: (r.genres ?? []).map(g => g.name).slice(0, 3),
            sinopse: r.overview || null,
            serie: tipo === 'tv',
            link: `https://www.themoviedb.org/${tipo}/${id}`
        });
    }
    return achados.find(a => normal(a.titulo) === normal(titulo)) ?? achados[0] ?? null;
}

async function buscarJogo(id) {
    if (!config.rawgKey) return null;
    const r = await json(`https://api.rawg.io/api/games/${id}?key=${config.rawgKey}`);
    if (!r) return null;
    return {
        capa: r.background_image?.replace('/media/games/', '/media/crop/600/400/games/') ?? null,
        fundo: r.background_image ?? null,
        ano: (r.released || '').slice(0, 4) || null,
        generos: (r.genres ?? []).map(g => g.name).slice(0, 3),
        sinopse: (r.description_raw || '').split('\n')[0].slice(0, 600) || null,
        plataformas: (r.parent_platforms ?? []).map(p => p.platform.name).slice(0, 5),
        link: `https://rawg.io/games/${r.slug ?? id}`
    };
}

export const infoDe = (tipo, id) => cache[`${tipo}:${id}`] ?? null;

// Garante as informações de uma lista de itens, com limite de tempo: o que faltar entra na próxima visita
export async function completar(tipo, itens, limiteMs = 4_000) {
    const faltando = itens.filter(i => !(`${tipo}:${i.id}` in cache));
    if (!faltando.length) return;
    const fila = [...faltando];
    const trabalhador = async () => {
        for (let i = fila.shift(); i; i = fila.shift()) {
            try {
                cache[`${tipo}:${i.id}`] = tipo === 'filme' ? await buscarFilme(i.id, i.title) : await buscarJogo(i.id);
                salvar();
            } catch { /* erro de rede: tenta de novo depois */ }
        }
    };
    await Promise.race([Promise.all([1, 2, 3, 4].map(trabalhador)), new Promise(r => setTimeout(r, limiteMs))]);
}
