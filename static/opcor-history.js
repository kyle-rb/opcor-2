import { LitElement, html, css, repeat } from './lit/lit-all.min.js';
import { loadHistory } from './storage.js';

class OpcorHistory extends LitElement {
  static get properties() {
    return {};
  }

  constructor() {
    super();

    this.history = loadHistory().filter((_, i) => i < 20); // TODO: look into loading more.
  }

  render() {
    return html`
      <link rel="stylesheet" href="/static/style.css">
      <div class="history">
        ${repeat(this.history, (h) => this._renderSeriesCard(h))}
      </div>
    `;
  }

  _renderSeriesCard(series) {
    let title;
    let releaseDate;
    let icon;
    let iconAlt;
    let mediaType;

    if (series.tmdbData.name) {
      title = series.tmdbData.name;
      releaseDate = series.tmdbData.first_air_date;
      icon = 'tv.svg';
      iconAlt = 'TV show';
      mediaType = 'tv';
    } else if (series.tmdbData.title) {
      title = series.tmdbData.title;
      releaseDate = series.tmdbData.release_date;
      icon = 'movie.svg';
      iconAlt = 'Movie';
      mediaType = 'movie'
    } else {
      // Unknown/other type; skip this search result
      console.error('fail');
      return '';
    }
    const year = releaseDate.split('-')[0];
    if (year) {
      title += ` (${year})`;
    }
    const poster = series.tmdbData.poster_path
      ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${series.tmdbData.poster_path}`
      : '/static/img/placeholder.svg';

    return html`
      <a href="/${mediaType}/${series.id}" class="series-card" title="${title}">
        <img src="${poster}" alt="" class="poster">
        <div class="title">${title}</div>
        <img src="/static/img/${icon}" alt="${iconAlt}" class="icon">
      </a>
    `;
  }
}

customElements.define('opcor-history', OpcorHistory);
