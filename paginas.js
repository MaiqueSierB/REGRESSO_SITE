// HTML das páginas do portal (renderizado no servidor, sem framework).
import config from './config.js';
import { infoDe } from './capas.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n1 = v => (v == null ? '—' : Number(v).toFixed(1));
const corNota = v => (v == null ? 'var(--fraco)' : v >= 8 ? 'var(--verde)' : v >= 6 ? 'var(--amarelo)' : 'var(--vermelho)');
const iniciais = nome => esc(String(nome).replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?');
const corDe = id => `hsl(${[...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 65% 55%)`;
const avatar = (p, tam = 44) => `<span class="av" style="--c:${corDe(p.id ?? p.user_id)};width:${tam}px;height:${tam}px;font-size:${tam * 0.38}px">${iniciais(p.nome)}</span>`;
const quando = iso => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Anúncio (AdSense): um bloco só, no rodapé de todas as páginas. Bloco "Money" (responsivo).
const ADSENSE_CLIENTE = 'ca-pub-3476040476227672';
const ADSENSE_BLOCO = process.env.ADSENSE_BLOCO || '7564930340';
const scriptAnuncio = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENTE}" crossorigin="anonymous"></script>`;
const blocoAnuncio = `<div class="anuncio"><small>Publicidade · ajuda a manter os bots no ar</small>
<ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENTE}" data-ad-slot="${ADSENSE_BLOCO}" data-ad-format="auto" data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;

const CSS = `
.anuncio{max-width:1120px;margin:0 auto 8px;padding:0 20px;overflow:hidden}.anuncio small{display:block;color:var(--fraco);font-size:12px;margin-bottom:6px}
:root{--fundo:#0d0c12;--card:#17151f;--card2:#1f1c2a;--linha:#2a2638;--texto:#f1eff7;--fraco:#9a95ad;
--a1:#7b2ff7;--a2:#f107a3;--a3:#ff8a00;--verde:#2fd27a;--amarelo:#f5c043;--vermelho:#ff5d6c}
*{box-sizing:border-box;margin:0}html{background:var(--fundo)}
body{color:var(--texto);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.45;min-height:100vh}
a{color:inherit;text-decoration:none}img{display:block;max-width:100%}
.topo{position:sticky;top:0;z-index:10;background:rgba(13,12,18,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--linha)}
.topo .in{max-width:1120px;margin:0 auto;display:flex;align-items:center;gap:20px;padding:12px 20px;overflow-x:auto}
.logo{font-weight:900;letter-spacing:.12em;font-size:18px;background:linear-gradient(90deg,var(--a1),var(--a2),var(--a3));-webkit-background-clip:text;background-clip:text;color:transparent;white-space:nowrap}
.nav{display:flex;gap:4px}.nav a{padding:7px 12px;border-radius:999px;color:var(--fraco);font-size:15px;white-space:nowrap}
.nav a:hover,.nav a.on{background:var(--card2);color:var(--texto)}
main{max-width:1120px;margin:0 auto;padding:28px 20px 60px}
.hero{border-radius:28px;padding:44px 32px;background:radial-gradient(120% 140% at 0% 0%,rgba(123,47,247,.55),transparent 55%),radial-gradient(120% 140% at 100% 100%,rgba(241,7,163,.45),transparent 55%),var(--card);margin-bottom:28px;position:relative;overflow:hidden}
.hero h1{font-size:clamp(40px,8vw,84px);font-weight:900;line-height:.95;letter-spacing:-.02em}
.hero p{color:#d8d3ea;max-width:560px;margin-top:14px;font-size:18px}
.nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:28px}
.num{background:rgba(0,0,0,.28);border-radius:16px;padding:14px 16px}.num b{display:block;font-size:30px;font-weight:900}.num span{color:#cfc9e2;font-size:14px}
h2{font-size:24px;font-weight:800;margin:34px 0 14px;display:flex;align-items:baseline;gap:12px}h2 a{font-size:14px;color:var(--fraco);font-weight:600;margin-left:auto}
.grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px}
.grade.jogos{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.capa{position:relative;border-radius:14px;overflow:hidden;background:var(--card2);aspect-ratio:2/3;transition:transform .15s}
.jogos .capa{aspect-ratio:3/2}.capa:hover{transform:translateY(-3px)}
.capa img{width:100%;height:100%;object-fit:cover}
.capa .sem{display:flex;align-items:center;justify-content:center;height:100%;padding:12px;text-align:center;font-weight:700;color:var(--fraco)}
.nota{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.78);border-radius:10px;padding:3px 8px;font-weight:900;font-size:15px}
.tit{font-weight:700;font-size:14px;margin-top:8px;line-height:1.25}.sub{color:var(--fraco);font-size:13px}
.card{background:var(--card);border:1px solid var(--linha);border-radius:18px;padding:18px}
.duas{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
table{width:100%;border-collapse:collapse;font-size:15px}td,th{padding:9px 8px;text-align:left;border-bottom:1px solid var(--linha)}th{color:var(--fraco);font-weight:600;font-size:13px}
td.n{text-align:right;font-variant-numeric:tabular-nums}tr:last-child td{border-bottom:0}
.av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--c);color:#fff;font-weight:900;flex:none}
.pessoa{display:flex;align-items:center;gap:12px}.pessoa b{font-weight:700}
.gente{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.gente .card{display:flex;gap:14px;align-items:center;transition:border-color .15s}.gente .card:hover{border-color:var(--a1)}
.tag{display:inline-block;background:var(--card2);border:1px solid var(--linha);border-radius:999px;padding:3px 10px;font-size:13px;color:#d9d4ea;margin:2px 4px 2px 0}
.barra{height:8px;background:var(--card2);border-radius:99px;overflow:hidden;flex:1}.barra i{display:block;height:100%;border-radius:99px}
.voto{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--linha)}.voto:last-child{border:0}.voto .v{width:46px;text-align:right;font-weight:900}
.detalhe{display:grid;grid-template-columns:minmax(180px,260px) 1fr;gap:28px;align-items:start}
.detalhe .capa{aspect-ratio:auto}.fundo{position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;opacity:.12;filter:blur(2px)}
.grande{font-size:64px;font-weight:900;line-height:1}
form.busca{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
form.busca input,form.busca select{background:var(--card);border:1px solid var(--linha);color:var(--texto);border-radius:12px;padding:11px 14px;font-size:15px}
form.busca input{flex:1;min-width:200px}form.busca button{background:linear-gradient(90deg,var(--a1),var(--a2));color:#fff;border:0;border-radius:12px;padding:11px 18px;font-weight:800;font-size:15px;cursor:pointer}
.jogo{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--linha)}.jogo:last-child{border:0}
.jogo .c{text-align:right;font-weight:700}.jogo .f{font-weight:700}.jogo .pl{font-weight:900;font-size:20px;text-align:center;min-width:70px}
.palp{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px}.palp span{font-size:13px;background:var(--card2);border-radius:8px;padding:3px 8px}
.pt25{outline:1px solid var(--verde)}.pt0{opacity:.6}
.vazio{color:var(--fraco);padding:10px 0}
.mural{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}.mural figure{margin:0;background:var(--card);border-radius:14px;overflow:hidden;border:1px solid var(--linha)}
.mural img{width:100%;aspect-ratio:1;object-fit:cover}.mural figcaption{padding:8px 10px;font-size:13px}.mural figcaption b{display:block;font-size:14px}
footer{max-width:1120px;margin:0 auto;padding:24px 20px 40px;color:var(--fraco);font-size:13px;display:flex;gap:16px;flex-wrap:wrap;border-top:1px solid var(--linha)}
@media(max-width:640px){.detalhe{grid-template-columns:1fr}.detalhe .capa{max-width:220px}.hero{padding:30px 20px}.grade{grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px}}
`;

const NAV = [['/', 'Início'], ['/filmes', 'Filmes'], ['/jogos', 'Jogos'], ['/galera', 'Galera'], ['/bolao', 'Bolão'], ['/gym', 'Gym Rats'], ['/torcidas', 'Torcidas']];

export function layout(titulo, atual, corpo, { fundo } = {}) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} · Regresso</title><meta name="robots" content="noindex"><meta name="theme-color" content="#0d0c12">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='%237b2ff7'/><text x='32' y='45' font-size='38' font-family='Arial' font-weight='900' fill='white' text-anchor='middle'>R</text></svg>">
<style>${CSS}</style>${scriptAnuncio}</head><body>
${fundo ? `<div class="fundo" style="background-image:url('${esc(fundo)}')"></div>` : ''}
<header class="topo"><div class="in"><a class="logo" href="/">REGRESSO</a><nav class="nav">
${NAV.map(([h, t]) => `<a href="${h}"${atual === h ? ' class="on"' : ''}>${t}</a>`).join('')}
<a href="${config.links.wrapped}">Wrapped</a></nav></div></header>
<main>${corpo}</main>
${blocoAnuncio}
<footer><span>Dados dos bots do Regresso (RMDB, RGDB, bolão), atualizados a cada minuto.</span>
<a href="${config.links.status}">Status dos bots</a><span>Capas: TMDB e RAWG.</span></footer>
</body></html>`;
}

// Cartão de filme/jogo com capa e nota do grupo
function cartao(tipo, i) {
    const info = infoDe(tipo, i.id);
    const img = info?.capa ? `<img src="${esc(info.capa)}" alt="" loading="lazy">` : `<div class="sem">${esc(i.title)}</div>`;
    return `<a href="/${tipo}/${i.id}"><div class="capa">${img}<span class="nota" style="color:${corNota(i.nota)}">${n1(i.nota)}</span></div>
<div class="tit">${esc(i.title)}</div><div class="sub">${i.n} nota${i.n === 1 ? '' : 's'}${info?.ano ? ` · ${info.ano}` : ''}</div></a>`;
}

const grade = (tipo, itens) => (itens.length
    ? `<div class="grade${tipo === 'jogo' ? ' jogos' : ''}">${itens.map(i => cartao(tipo, i)).join('')}</div>`
    : '<p class="vazio">Nada por aqui ainda.</p>');

// ---------- Páginas ----------
export function paginaInicio(r, ranking, proximos) {
    const corpo = `
<section class="hero"><h1>Regresso</h1><p>Tudo que a galera avalia, palpita e discute nos bots — filmes, séries, jogos, bolão do Brasileirão e as torcidas.</p>
<div class="nums">
<div class="num"><b>${r.notasFilmes + r.notasJogos}</b><span>notas dadas</span></div>
<div class="num"><b>${r.filmes}</b><span>filmes e séries</span></div>
<div class="num"><b>${r.jogos}</b><span>jogos</span></div>
<div class="num"><b>${r.pessoas}</b><span>pessoas</span></div>
<div class="num"><b>${r.palpites}</b><span>palpites no bolão</span></div></div></section>
<h2>Filmes mais bem avaliados <a href="/filmes">ver todos →</a></h2>${grade('filme', r.topFilmes)}
<h2>Jogos mais bem avaliados <a href="/jogos">ver todos →</a></h2>${grade('jogo', r.topJogos.slice(0, 6))}
<div class="duas" style="margin-top:34px">
<div class="card"><h2 style="margin-top:0">Bolão <a href="/bolao">completo →</a></h2>${tabelaRanking(ranking.slice(0, 5))}</div>
<div class="card"><h2 style="margin-top:0">Próximos jogos</h2>${proximos.length ? proximos.slice(0, 5).map(j => `<div class="jogo"><span class="c">${esc(j.casa)}</span><span class="pl" style="font-size:14px;color:var(--fraco)">${quando(j.data_utc)}</span><span class="f">${esc(j.fora)}</span></div>`).join('') : '<p class="vazio">Sem jogos marcados.</p>'}</div>
</div>
${r.polemicoFilme || r.polemicoJogo ? `<h2>O que mais dividiu a galera</h2><div class="duas">
${[['filme', r.polemicoFilme], ['jogo', r.polemicoJogo]].filter(([, x]) => x).map(([t, x]) => `<a class="card" href="/${t}/${x.id}"><div class="sub">${t === 'filme' ? 'Filme/série' : 'Jogo'} mais polêmico</div>
<div style="font-size:22px;font-weight:800;margin:4px 0">${esc(x.title)}</div><div class="sub">média ${n1(x.nota)} · notas variando ±${n1(Math.sqrt(Math.max(0, x.var)))}</div></a>`).join('')}</div>` : ''}
<h2>Avaliados por último <a href="/filmes?ordem=recentes">ver mais →</a></h2>${grade('filme', r.recentes)}`;
    return layout('Início', '/', corpo);
}

const ORDENS = { filme: [['nota', 'Melhor nota'], ['votos', 'Mais notas'], ['recentes', 'Mais recentes'], ['piores', 'Piores'], ['az', 'A–Z']],
    jogo: [['nota', 'Melhor nota'], ['votos', 'Mais notas'], ['piores', 'Piores'], ['az', 'A–Z']] };

export function paginaCatalogo(tipo, itens, { q, ordem, pagina, total }) {
    const nomeT = tipo === 'filme' ? 'Filmes e séries' : 'Jogos';
    const qs = p => `?${new URLSearchParams({ ...(q ? { q } : {}), ordem, ...(p > 1 ? { p } : {}) })}`;
    const paginas = Math.ceil(total / 60);
    const corpo = `<h2 style="margin-top:0">${nomeT} <span class="sub">${total} no total</span></h2>
<form class="busca"><input name="q" value="${esc(q)}" placeholder="Buscar ${tipo === 'filme' ? 'filme ou série' : 'jogo'}…">
<select name="ordem">${ORDENS[tipo].map(([v, t]) => `<option value="${v}"${v === ordem ? ' selected' : ''}>${t}</option>`).join('')}</select><button>Buscar</button></form>
${grade(tipo, itens)}
${paginas > 1 ? `<p style="margin-top:24px;display:flex;gap:10px;justify-content:center">${pagina > 1 ? `<a class="tag" href="${qs(pagina - 1)}">← anterior</a>` : ''}<span class="sub">página ${pagina} de ${paginas}</span>${pagina < paginas ? `<a class="tag" href="${qs(pagina + 1)}">próxima →</a>` : ''}</p>` : ''}`;
    return layout(nomeT, tipo === 'filme' ? '/filmes' : '/jogos', corpo);
}

export function paginaItem(tipo, i) {
    const info = infoDe(tipo, i.id) ?? {};
    const img = info.capa ? `<img src="${esc(info.capa)}" alt="">` : `<div class="sem" style="aspect-ratio:2/3">${esc(i.title)}</div>`;
    const corpo = `<div class="detalhe"><div class="capa">${img}</div><div>
<div class="sub">${tipo === 'filme' ? (info.serie ? 'Série' : 'Filme') : 'Jogo'}${info.ano ? ` · ${info.ano}` : ''}</div>
<h1 style="font-size:clamp(28px,5vw,46px);font-weight:900;line-height:1.05;margin:6px 0 12px">${esc(i.title)}</h1>
${(info.generos ?? []).map(g => `<span class="tag">${esc(g)}</span>`).join('')}${(info.plataformas ?? []).map(g => `<span class="tag">${esc(g)}</span>`).join('')}
<div style="display:flex;gap:28px;align-items:flex-end;margin:22px 0">
<div><div class="grande" style="color:${corNota(i.nota)}">${n1(i.nota)}</div><div class="sub">nota do Regresso</div></div>
<div><div style="font-size:28px;font-weight:900">${i.n}</div><div class="sub">nota${i.n === 1 ? '' : 's'}</div></div>
${i.votos.length > 1 ? `<div><div style="font-size:28px;font-weight:900">±${n1(i.desvio)}</div><div class="sub">${i.desvio >= 1.5 ? 'dividiu a galera' : 'quase consenso'}</div></div>` : ''}</div>
${info.sinopse ? `<p style="color:#d6d1e6;max-width:640px">${esc(info.sinopse)}</p>` : ''}
${info.link ? `<p style="margin-top:12px"><a class="sub" href="${esc(info.link)}" target="_blank" rel="noopener">ver no ${tipo === 'filme' ? 'TMDB' : 'RAWG'} ↗</a></p>` : ''}
<h2>Quem deu quanto</h2><div class="card">${i.votos.map(v => `<div class="voto"><a class="pessoa" href="/galera/${esc(v.user_id)}">${avatar({ id: v.user_id, nome: v.nome }, 34)}<b>${esc(v.nome)}</b></a>
<div class="barra"><i style="width:${v.score * 10}%;background:${corNota(v.score)}"></i></div><span class="v" style="color:${corNota(v.score)}">${n1(v.score)}</span></div>`).join('')}</div>
</div></div>`;
    return layout(i.title, tipo === 'filme' ? '/filmes' : '/jogos', corpo, { fundo: info.fundo });
}

export function paginaGalera(lista) {
    const corpo = `<h2 style="margin-top:0">A galera <span class="sub">${lista.length} pessoas</span></h2><div class="gente">
${lista.map(p => `<a class="card" href="/galera/${esc(p.id)}">${avatar(p, 54)}<div><b style="font-size:17px">${esc(p.nome)}</b>
<div class="sub">${p.filmes} filmes · ${p.jogos} jogos${p.nivel ? ` · nível ${p.nivel}` : ''}</div>${p.time ? `<div class="sub">❤️ ${esc(p.time)}</div>` : ''}</div></a>`).join('')}</div>`;
    return layout('Galera', '/galera', corpo);
}

const lista = (tipo, votos) => (votos.length ? votos.map(v => `<a class="voto" href="/${tipo}/${v.id}"><span style="flex:1">${esc(v.title)}</span>
<span class="sub">grupo ${n1(v.grupo)}</span><span class="v" style="color:${corNota(v.score)}">${n1(v.score)}</span></a>`).join('') : '<p class="vazio">Nada ainda.</p>');

export function paginaPessoa(p, mediaGrupoFilmes, mediaGrupoJogos) {
    const compara = (m, g) => (m == null || g == null ? '' : Math.abs(m - g) < 0.3 ? 'na média do grupo'
        : m < g ? `${n1(g - m)} mais exigente que o grupo` : `${n1(m - g)} mais bonzinho que o grupo`);
    const corpo = `<section class="hero" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">${avatar(p, 96)}
<div><h1 style="font-size:clamp(34px,6vw,60px)">${esc(p.nome)}</h1><p style="margin-top:8px">${[p.time ? `❤️ ${esc(p.time)}` : '', p.aniversario ? `🎂 ${p.aniversario.replace('-', '/')}` : '', p.nivel ? `⚡ nível ${p.nivel} nos games` : ''].filter(Boolean).join(' · ')}</p></div>
<div class="nums" style="flex-basis:100%">
<div class="num"><b>${p.filmes}</b><span>filmes · média ${n1(p.mediaFilmes)}</span></div>
<div class="num"><b>${p.jogos}</b><span>jogos · média ${n1(p.mediaJogos)}</span></div>
<div class="num"><b>${p.bolao ? `${p.bolao.pontos}` : '—'}</b><span>${p.bolao ? `pts no bolão · ${p.bolao.posicao}º` : 'bolão'}</span></div>
<div class="num"><b>${p.bolao?.exatos ?? 0}</b><span>placares exatos</span></div></div></section>
<div class="duas">
<div class="card"><h2 style="margin-top:0">Filmes e séries</h2><p class="sub" style="margin-bottom:8px">${compara(p.mediaFilmes, mediaGrupoFilmes)}</p>${lista('filme', p.votosFilmes.slice(0, 15))}
${p.votosFilmes.length > 15 ? `<p class="sub" style="margin-top:8px">+ ${p.votosFilmes.length - 15} outros</p>` : ''}</div>
<div class="card"><h2 style="margin-top:0">Jogos</h2><p class="sub" style="margin-bottom:8px">${compara(p.mediaJogos, mediaGrupoJogos)}</p>${lista('jogo', p.votosJogos.slice(0, 15))}
${p.votosJogos.length > 15 ? `<p class="sub" style="margin-top:8px">+ ${p.votosJogos.length - 15} outros</p>` : ''}</div></div>
<p style="margin-top:24px"><a class="tag" href="${config.links.wrapped}/${esc(p.id)}">🎁 Ver o Wrapped de ${esc(p.nome)}</a></p>`;
    return layout(p.nome, '/galera', corpo);
}

function tabelaRanking(ranking) {
    if (!ranking.length) return '<p class="vazio">Ninguém palpitou ainda.</p>';
    return `<table><tr><th>#</th><th>Quem</th><th class="n">Pts</th><th class="n">Exatos</th><th class="n">Palpites</th></tr>
${ranking.map(r => `<tr><td>${r.posicao <= 3 ? ['🥇', '🥈', '🥉'][r.posicao - 1] : r.posicao}</td><td><a class="pessoa" href="/galera/${esc(r.user_id)}">${avatar({ id: r.user_id, nome: r.nome }, 28)}${esc(r.nome)}</a></td>
<td class="n"><b>${r.pontos}</b></td><td class="n">${r.exatos}</td><td class="n">${r.palpites}</td></tr>`).join('')}</table>`;
}

export function paginaBolao(temporada, ranking, { proximos, recentes }, tabela) {
    const jogoFeito = j => `<div class="jogo"><span class="c">${esc(j.casa)}</span><span class="pl">${j.gols_casa != null ? `${j.gols_casa} x ${j.gols_fora}` : `<span style="font-size:13px;color:var(--fraco)">${['IN_PLAY', 'PAUSED'].includes(j.status) ? 'ao vivo' : 'sem placar'}</span>`}</span><span class="f">${esc(j.fora)}</span>
${j.palpites.length ? `<div class="palp">${j.palpites.map(p => `<span class="${p.pontos === 25 ? 'pt25' : p.pontos === 0 ? 'pt0' : ''}">${esc(p.nome)} ${p.gols_casa}x${p.gols_fora}${p.pontos != null ? ` · <b>${p.pontos}</b>` : ''}</span>`).join('')}</div>` : ''}</div>`;
    const corpo = `<h2 style="margin-top:0">Bolão do Brasileirão ${temporada ?? ''}</h2>
<div class="duas"><div class="card"><h2 style="margin-top:0">Classificação</h2>${tabelaRanking(ranking)}
<p class="sub" style="margin-top:10px">Exato 25 · vencedor + gols do vencedor 18 · saldo 15 · gols do perdedor 12 · vencedor 10</p></div>
<div class="card"><h2 style="margin-top:0">Próximos jogos</h2>${proximos.length ? proximos.map(j => `<div class="jogo"><span class="c">${esc(j.casa)}</span>
<span class="pl" style="font-size:13px;color:var(--fraco)">${quando(j.data_utc)}<br>${j.npalpites} palpite${j.npalpites === 1 ? '' : 's'}</span><span class="f">${esc(j.fora)}</span></div>`).join('')
        : '<p class="vazio">Sem jogos marcados.</p>'}<p class="sub" style="margin-top:10px">Os palpites aparecem quando o jogo começa. Palpite pelo Discord (/palpitar) ou no Zap (!palpite).</p></div></div>
<h2>Últimos jogos</h2><div class="card">${recentes.length ? recentes.map(jogoFeito).join('') : '<p class="vazio">Nada ainda.</p>'}</div>
${tabela.length ? `<h2>Tabela do Brasileirão</h2><div class="card" style="overflow-x:auto"><table><tr><th>#</th><th>Time</th><th class="n">P</th><th class="n">J</th><th class="n">V</th><th class="n">E</th><th class="n">D</th><th class="n">SG</th></tr>
${tabela.map(t => `<tr><td>${t.posicao}</td><td><b>${esc(t.time)}</b></td><td class="n"><b>${t.pontos}</b></td><td class="n">${t.jogos}</td><td class="n">${t.vitorias}</td><td class="n">${t.empates}</td><td class="n">${t.derrotas}</td><td class="n">${t.saldo}</td></tr>`).join('')}</table></div>` : ''}`;
    return layout('Bolão', '/bolao', corpo);
}

export function paginaTorcidas(lista) {
    const total = lista.reduce((s, t) => s + t.gente.length, 0);
    const corpo = `<h2 style="margin-top:0">Torcidas <span class="sub">${total} pessoa${total === 1 ? '' : 's'} com time</span></h2>
${lista.length ? `<div class="duas">${lista.map(t => `<div class="card"><div style="display:flex;align-items:baseline;gap:10px"><b style="font-size:20px">${esc(t.time)}</b><span class="sub">${t.gente.length}</span></div>
<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">${t.gente.map(p => `<a class="pessoa" href="/galera/${esc(p.id)}">${avatar(p, 30)}<span>${esc(p.nome)}</span></a>`).join('')}</div></div>`).join('')}</div>`
        : '<p class="vazio">Ninguém escolheu time ainda.</p>'}
<p class="sub" style="margin-top:18px">Escolha o seu com /meutime no Discord ou !meutime no Zap — só jogos desses times geram aviso de gol.</p>`;
    return layout('Torcidas', '/torcidas', corpo);
}

export const pagina404 = () => layout('Não encontrado', '', '<div class="card"><h2 style="margin-top:0">Não achei essa página 🤔</h2><p><a class="tag" href="/">Voltar ao início</a></p></div>');

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = m => `${MESES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;
export function paginaGym(g) {
    const dia = d => d.split('-').reverse().slice(0, 2).join('/');
    const corpo = `<section class="hero"><h1>Gym Rats</h1><p>1 treino por dia, com foto = 1 ponto. O ranking zera todo mês e o campeão é anunciado no dia 1.</p>
<div class="nums"><div class="num"><b>${g.treinosMes}</b><span>treinos em ${esc(nomeMes(g.mes))}</span></div>
<div class="num"><b>${g.ranking.length}</b><span>pessoas treinando</span></div>
<div class="num"><b>${g.ranking[0] ? esc(g.ranking[0].nome) : '—'}</b><span>liderando</span></div></div></section>
${g.meses.length > 1 ? `<p style="margin-bottom:10px">${g.meses.map(m => `<a class="tag" href="/gym?mes=${m}"${m === g.mes ? ' style="border-color:var(--a1)"' : ''}>${esc(nomeMes(m))}</a>`).join('')}</p>` : ''}
<div class="card"><h2 style="margin-top:0">Ranking de ${esc(nomeMes(g.mes))}</h2>${g.ranking.length ? `<table><tr><th>#</th><th>Quem</th><th class="n">Treinos</th><th class="n">Sequência</th></tr>
${g.ranking.map(r => `<tr><td>${r.posicao <= 3 ? ['🥇', '🥈', '🥉'][r.posicao - 1] : r.posicao}</td><td><a class="pessoa" href="/galera/${esc(r.user_id)}">${avatar({ id: r.user_id, nome: r.nome }, 28)}${esc(r.nome)}</a></td>
<td class="n"><b>${r.pontos}</b></td><td class="n">${r.sequencia >= 2 ? `🔥 ${r.sequencia}` : r.sequencia ? '1' : '—'}</td></tr>`).join('')}</table>`
        : '<p class="vazio">Ninguém treinou ainda neste mês.</p>'}
<p class="sub" style="margin-top:10px">Marque o treino com /treino (foto) no Discord ou mandando a foto com !treino no Zap.</p></div>
<h2>Mural</h2>${g.mural.length ? `<div class="mural">${g.mural.map(c => `<figure><img src="/gym/foto/${esc(c.foto)}" alt="" loading="lazy">
<figcaption><b>${esc(c.nome)}</b><span class="sub">${dia(c.dia)}${c.legenda ? ` · ${esc(c.legenda)}` : ''}</span></figcaption></figure>`).join('')}</div>`
        : '<p class="vazio">Sem fotos ainda.</p>'}`;
    return layout('Gym Rats', '/gym', corpo);
}
