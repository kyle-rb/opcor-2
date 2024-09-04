import { Application } from '@oak/oak/application';
import { Router } from '@oak/oak/router';
// import configFile from './config.json' with { type: 'json' };

const decoder = new TextDecoder('utf-8');
const configFile = JSON.parse(decoder.decode(Deno.readFileSync('./config.json')));
const tmdbApiToken = configFile.tmdbApiToken;
const streamingHost = configFile.streamingProviderHostname;

const router = new Router();
router.get('/static/:file', async (ctx) => {
  await ctx.send({ root: '.' });
});
router.get('/robots.txt', (ctx) => {
  ctx.response.body = 'User-agent: *\nDisallow: /';
  ctx.response.status = 200;
  ctx.response.type = 'text/plain';
});
router.get('/', (ctx) => {
  ctx.response.body = searchPage();
  ctx.response.status = 200;
  ctx.response.type = 'text/html';
});
router.get('/search', async (ctx) => {
  const params = ctx.request.url.searchParams;
  if (!params.has('q')) {
    ctx.response.body = page(`bad request`, '<h1>400 - bad request</h1>');
    ctx.response.status = 400;
    return;
  }
  const query = params.get('q')!;
  const response = await tmdbFetch('3/search/tv', {
    'query': encodeURIComponent(query),
  });
  const results = response.results;
  if (!results) {
    console.log(response);
    ctx.response.body = page(
      `bad response from server`,
      '<h1>500 - server error</h1>',
    );
    ctx.response.status = 500;
    return;
  }

  ctx.response.body = searchPage(query, results);
  ctx.response.status = 200;
  ctx.response.type = 'text/html';
});
router.get('/play/:id', async (ctx) => {
  const id = ctx.params.id;

  const tmdbData = await tmdbFetch(`3/tv/${id}`);
  const title = tmdbData.name;

  ctx.response.body = page(
    `stream ${title}`,
    `
      <script>
        window.streamingHost = '${streamingHost}';
        window.tmdbData = ${JSON.stringify(tmdbData)};
      </script>
      <script src="/static/client.js"></script>
      <div class="sidebar-container">
        <iframe id="video-player" allowfullscreen></iframe>
        <input type="checkbox" checked id="sidebar-toggle" class="visually-hidden">
        <label for="sidebar-toggle"><img src="/static/menu.svg" alt="open/close sidebar"></label>
        <aside id="sidebar"></aside>
      </div>
  `,
  );
  ctx.response.status = 200;
  ctx.response.type = 'text/html';
});

export const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

function page(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${title}</title>
        <link rel="stylesheet" href="/static/style.css">
        <link rel="icon" href="/static/opcor-2-icon.png">
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;
}

type TmdbResult = {
  id: number;
  name: string;
  poster_path: string;
  first_air_date?: string;
};

function searchPage(query = '', results?: TmdbResult[]): string {
  let resultsContent;
  if (!results) {
    resultsContent = '';
  } else if (results.length === 0) {
    resultsContent = `
      <p>No results found</p>
    `;
  } else {
    resultsContent = results.map((result) => {
      let name = result.name;
      if (result.first_air_date) {
        const year = result.first_air_date.split('-')[0];
        if (year) {
          name += ` (${year})`;
        }
      }

      const poster = result.poster_path
        ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${result.poster_path}`
        : '/static/placeholder.svg';
      return `
        <a href="/play/${result.id}" class="series-card">
          <img src="${poster}" alt="">
          ${name}
        </a>
      `;
    }).join('');
  }
  let title = 'search';
  if (query) {
    title += ' — ' + query;
  }

  return page(
    title,
    `
      <div class="search-container">
        <h1 class="logo-marquee small">
          <img src="/static/opcor-2-logo.svg" alt="Opcor">
          <img src="/static/opcor-2-logo.svg" alt="">
        </h1>
        <form action="/search" method="get">
          <input type="text"
              name="q"
              placeholder="breaking bad or something"
              value="${query}"
              class="search">
          <button type="submit">search</button>
        </form>
        <div class="results">
          ${resultsContent}
        </div>
      </div>
    `,
  );
}

async function tmdbFetch(
  path: string,
  queryParams: Record<string, string> = {},
  headers: Record<string, string> = {},
) {
  const url = buildUrl('api.themoviedb.org', path, {
    'include_adult': 'false',
    'language': 'en-US',
    ...queryParams,
  });
  const allHeaders = {
    'accept': 'application/json',
    'Authorization': `Bearer ${tmdbApiToken}`,
    ...headers,
  };

  const response = await fetch(url, { headers: allHeaders });
  const data = await response.json();
  return data;
}

function buildUrl(
  domain: string,
  path: string,
  queryParams: Record<string, string>,
): string {
  const query = Object.keys(queryParams).map((key: string) => `${key}=${queryParams[key]}`).join(
    '&',
  );
  return `https://${domain}/${path}?${query}`;
}
