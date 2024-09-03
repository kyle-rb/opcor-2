import { Application, Router } from 'https://deno.land/x/oak@v16.1.0/mod.ts';
import configFile from './config.json' with { type: 'json' };

const tmdbApiToken = configFile.tmdbApiToken;
const streamingHost = configFile.streamingProviderHostname;

const clientCss = await Deno.readTextFile('./style.css');
const clientJs = await Deno.readTextFile('./client.js');
const menuSvg = await Deno.readTextFile('./menu.svg');

const router = new Router();
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
      <script>${clientJs}</script>
      <div class="sidebar-container">
        <iframe id="video-player" allowfullscreen></iframe>
        <input type="checkbox" checked id="sidebar-toggle">
        <label for="sidebar-toggle">${menuSvg}</label>
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
        <style>${clientCss}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;
}

function searchPage(
  query = '',
  results?: { id: number; name: string; poster_path: string }[],
): string {
  let resultsContent;
  if (!results) {
    resultsContent = '';
  } else if (results.length === 0) {
    resultsContent = `
      <p>No results found</p>
    `;
  } else {
    resultsContent = results.map((result) => `
        <a href="/play/${result.id}" class="series-card">
          <img src="https://image.tmdb.org/t/p/w600_and_h900_bestv2${result.poster_path}">
          ${result.name}
        </a>
      `).join('');
  }
  let title = 'search';
  if (query) {
    title += ' — ' + query;
  }

  return page(
    title,
    `
      <h1>search</h1>
      <form action="/search" method="get">
        <input type="text" name="q" placeholder="breaking bad or something" value="${query}" class="search">
        <button type="submit">search</button>
      </form>
      ${resultsContent}
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
  const query = Object.keys(queryParams).map((key: string) =>
    `${key}=${queryParams[key]}`
  ).join('&');
  return `https://${domain}/${path}?${query}`;
}
