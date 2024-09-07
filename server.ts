import { Application } from '@oak/oak/application';
import { Router } from '@oak/oak/router';

const streamingHost = Deno.env.get('OPCOR_HOSTNAME');
const tmdbApiToken = Deno.env.get('OPCOR_TMDB_TOKEN');

if (!tmdbApiToken) {
  throw new Error('OPCOR_TMDB_TOKEN is not set');
} else if (!streamingHost) {
  throw new Error('OPCOR_HOSTNAME is not set');
}

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
  const response = await tmdbFetch('3/search/multi', {
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
router.get('/tv/:id', async (ctx) => {
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
router.get('/movie/:id', async (ctx) => {
  const id = ctx.params.id;
  const tmdbData = await tmdbFetch(`3/movie/${id}`);
  const title = tmdbData.title;

  ctx.response.body = page(
    `stream ${title}`,
    `
    <div class="sidebar-container">
      <iframe
        id="video-player"
        src="https://${streamingHost}/embed/movie?tmdb=${id}"
        allowfullscreen>
      </iframe>
      <input type="checkbox" checked id="sidebar-toggle" class="visually-hidden">
      <label for="sidebar-toggle"><img src="/static/menu.svg" alt="open/close sidebar"></label>
      <aside id="sidebar">
        <h1 class="series-title">${tmdbData.title}</h1>
      </aside>
    </div>
    `,
  );
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());
await app.listen({ port: 8000 });

//// Helper functions

function page(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  name?: string;
  title?: string;
  media_type: string;
  poster_path: string;
  first_air_date?: string;
  release_date?: string;
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
      let title: string;
      let releaseDate: string | undefined;
      let icon: string;
      let iconAlt: string;

      if (result.media_type === 'tv') {
        title = result.name!;
        releaseDate = result.first_air_date;
        icon = 'tv.svg';
        iconAlt = 'TV show';
      } else if (result.media_type === 'movie') {
        title = result.title!;
        releaseDate = result.release_date;
        icon = 'movie.svg';
        iconAlt = 'Movie';
      } else {
        // Unknown/other type; skip this search result
        return '';
      }

      if (releaseDate) {
        const year = releaseDate.split('-')[0];
        if (year) {
          name += ` (${year})`;
        }
      }

      const poster = result.poster_path
        ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${result.poster_path}`
        : '/static/placeholder.svg';

      return `
        <a href="/${result.media_type}/${result.id}" class="series-card" title="${title}">
          <img src="${poster}" alt="" class="poster">
          <div class="title">${title}</div>
          <img src="/static/${icon}" alt="${iconAlt}" class="icon">
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
