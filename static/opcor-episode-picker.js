import {} from './lit/lit-core.min.js';
import {LitElement, html, css, repeat, when} from './lit/lit-all.min.js';
import {loadProgress, saveProgress, saveTmdbData} from './storage.js';

class OpcorEpisodePicker extends LitElement {
  static get properties() {
    return {
      selectedSeason: {type: Number},
      selectedEpisode: {type: Number},
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        max-width: 100%;
      }

      button,
      select,
      input {
        border: 1px solid var(--bg-alt-color);
        padding: 0 4px;
        font-size: inherit;
        font-weight: inherit;
        color: var(--bg-color);
      }

      button,
      select {
        border-radius: 6px;
        color: var(--bg-color);
        background: var(--fg-alt-color);
      }

      button.next,
      button.prev {
        display: block;
        margin: 8px 0;
      }

      select {
        margin-right: 8px;
      }
  `;
  }

  constructor() {
    super();

    this.tmdbData = globalThis.tmdbData;
    this.streamingHost = globalThis.streamingHost;
    this.iframe = document.getElementById('video-player');

    if (!(this.tmdbData?.seasons && this.streamingHost && this.iframe)) {
      console.error('could not find required elements', {
        tmdbData,
        iframe,
        sidebar,
      });
      return;
    }

    this.seasonsByNumber = {};
    for (const season of tmdbData.seasons) {
      if (season.season_number !== 0) {
        this.seasonsByNumber[season.season_number] = season;
      }
    }

    const progress = loadProgress(this.tmdbData.id);
    this.selectedSeason = progress.season ?? 1;
    this.selectedEpisode = progress.episode ?? 1;

    this.updatePlayer();
    saveTmdbData(this.tmdbData);
  }

  render() {
    const currentSeason =
        this.tmdbData.seasons.find((s) => s.season_number === this.selectedSeason);
    const episodes = Array(currentSeason.episode_count).fill().map((_, i) => i + 1);

    return html`
      <select
          class="season-picker"
          @change=${this.onSeasonChange}>
        ${repeat(
            this.tmdbData.seasons,
            (s) => s.season_number,
            (s) => when(s.season_number > 0, () => html`
          <option value=${s.season_number} ?selected=${s.season_number === this.selectedSeason}>
            ${s.name}
          </option>
        `))}
      </select>

      <select
          class="episode-picker"
          @change=${this.onEpisodeChange}>
        ${repeat(
            episodes,
            (e) => e,
            (e) => html`
          <option value=${e} ?selected=${e === this.selectedEpisode}>${e}</option>
        `)}
      </select>

      <button class="next" @click=${this.onNextClicked}>
        next ->
      </button>
    `;
  }

  onSeasonChange = (event) => {
    this.selectedSeason = +event.target.value;
    this.selectedEpisode = 1;
    this.updatePlayer();
  }

  onEpisodeChange = (event) => {
    this.selectedEpisode = +event.target.value;
    this.updatePlayer();
  }

  onNextClicked() {
    // If last episode of the season (1-indexed)
    if (this.selectedEpisode === this.seasonsByNumber[this.selectedSeason].episode_count) {
      // If next season exists
      if (this.seasonsByNumber[this.selectedSeason + 1]) {
        this.selectedSeason += 1;
        this.selectedEpisode = 1;
      } else {
        globalThis.alert('last episode :(');
      }
    } else {
      this.selectedEpisode += 1;
    }

    this.updatePlayer();
  }

  updatePlayer = () => {
    const embedPath = `https://${streamingHost}/embed/tv`;
    const id = this.tmdbData.id;
    const season = this.selectedSeason;
    const episode = this.selectedEpisode;
    this.iframe.src = `${embedPath}?tmdb=${id}&season=${season}&episode=${episode}`;
    // this.iframe.src = `data:text/html,season=${season}, episode=${episode}`;
    this.iframe.style.background = 'white';

    saveProgress(this.tmdbData.id, this.selectedSeason, this.selectedEpisode);
  };
}

customElements.define('opcor-episode-picker', OpcorEpisodePicker);
