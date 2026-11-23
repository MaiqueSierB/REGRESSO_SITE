# Portal do Regresso

Site só de leitura em **regresso.mrbnexus.com.br**: notas de filmes/séries (RMDB) e jogos (RGDB), perfil de cada pessoa, bolão do Brasileirão e torcidas.

- Lê os bancos SQLite dos bots na Hostinger (`/home/u243267678/domains/mrbnexus.com.br/*-data/`), nunca escreve neles.
- Capas e detalhes vêm do TMDB e da RAWG, usando as chaves que já estão em `.rmdb.env` e `.rgdb.env`. Ficam em cache em `site-data/capas.json`.
- Sem login: quem quiser avaliar ou palpitar usa os bots (Discord ou Zap).
- `/health` responde `{ ok: true }` para o monitor.

Rodar: `npm install && npm start` (porta `PORT`, padrão 3000).
