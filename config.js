// Portal do Regresso: lê (só leitura) os bancos dos bots, que ficam fora da public_html na Hostinger.
import fs from 'node:fs';
import dotenv from 'dotenv';

process.env.TZ = process.env.TZ || 'America/Sao_Paulo';
const BASE = process.env.BOTS_DIR || '/home/u243267678/domains/mrbnexus.com.br';

// Reaproveita as chaves de API do TMDB e da RAWG dos .env do RMDB e do RGDB (não lê tokens)
function lerChave(arquivo, chave) {
    try {
        return fs.existsSync(arquivo) ? dotenv.parse(fs.readFileSync(arquivo))[chave] : undefined;
    } catch {
        return undefined;
    }
}

const config = {
    porta: Number(process.env.PORT || 3000),
    bancos: {
        rmdb: process.env.RMDB_DB || `${BASE}/rmdb-data/servidor.sqlite`,
        rgdb: process.env.RGDB_DB || `${BASE}/rgdb-data/servidor.sqlite`,
        bolao: process.env.BOLAO_DB || `${BASE}/bolao-data/bolao.sqlite`,
        aniv: process.env.ANIV_DB || `${BASE}/aniversario-data/servidor.sqlite`,
        zap: process.env.ZAP_DB || `${BASE}/zap-data/zap.sqlite`,
        gym: process.env.GYM_DB || `${BASE}/gym-data/gym.sqlite`
    },
    fotosGym: process.env.GYM_FOTOS || `${BASE}/gym-data/fotos`,
    // Senha do Gym Rats: o Maique cria /home/u243267678/domains/mrbnexus.com.br/.gym.env com GYM_SENHA=...
    gymSenha: process.env.GYM_SENHA || lerChave(process.env.GYM_ENV || `${BASE}/.gym.env`, 'GYM_SENHA'),
    // cache das capas (TMDB/RAWG) para não buscar de novo a cada reinício
    cacheCapas: process.env.CAPAS_CACHE || `${BASE}/site-data/capas.json`,
    tmdbKey: process.env.TMDB_API_KEY || lerChave(process.env.RMDB_ENV || `${BASE}/.rmdb.env`, 'TMDB_API_KEY'),
    rawgKey: process.env.RAWG_API_KEY || lerChave(process.env.RGDB_ENV || `${BASE}/.rgdb.env`, 'RAWG_API_KEY'),
    links: {
        wrapped: 'https://zap.mrbnexus.com.br/wrapped',
        status: 'https://status.mrbnexus.com.br'
    }
};

console.log(`Config: gym_senha=${config.gymSenha ? 'ok' : 'faltando'} tmdb=${config.tmdbKey ? 'ok' : 'faltando'} rawg=${config.rawgKey ? 'ok' : 'faltando'} ` +
    `bancos=${Object.entries(config.bancos).map(([k, v]) => `${k}:${fs.existsSync(v) ? 'ok' : 'não achei'}`).join(' ')}`);

export default config;
