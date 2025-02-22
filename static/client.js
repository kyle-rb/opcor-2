// Client-side script
document.addEventListener('DOMContentLoaded', init);

function init() {
  const tmdbData = window.tmdbData;
  const streamingHost = window.streamingHost;
  const iframe = document.getElementById('video-player');
  const sidebar = document.getElementById('sidebar');

  if (!(tmdbData && streamingHost && iframe && sidebar)) {
    console.error('could not find required elements', {
      tmdbData,
      iframe,
      sidebar,
    });
    return;
  }

  const title = document.createElement('h1');
  title.classList.add('series-title');
  title.textContent = tmdbData.name;
  sidebar.appendChild(title);

  // Build season number=>info map.
  const seasons = {};
  for (const season of tmdbData.seasons) {
    if (season.season_number !== 0) {
      seasons[season.season_number] = season;
    }
  }

  const tmdbId = tmdbData.id;
  const seasonPicker = document.createElement('select');
  seasonPicker.classList.add('season-picker');
  for (const season of Object.values(seasons)) {
    seasonPicker.appendChild(option(season.season_number, season.name));
  }
  sidebar.appendChild(seasonPicker);

  const episodePicker = document.createElement('select');
  episodePicker.classList.add('episode-picker');
  sidebar.appendChild(episodePicker);
  const updateEpisodePicker = () => {
    const season = seasons[seasonPicker.value];
    episodePicker.innerHTML = '';
    for (let i = 1; i <= season.episode_count; i++) {
      episodePicker.appendChild(option(i, i));
    }
  };

  const savedProgress = loadProgress(tmdbId);
  seasonPicker.value = savedProgress.season;
  updateEpisodePicker();
  episodePicker.value = savedProgress.episode;

  const onEpisodeChange = () => {
    const embedPath = `https://${streamingHost}/embed/tv`;
    const season = seasonPicker.value;
    const episode = episodePicker.value;
    iframe.src = `${embedPath}?tmdb=${tmdbId}&season=${season}&episode=${episode}`;

    saveProgress(tmdbId, +seasonPicker.value, +episodePicker.value);
  };
  onEpisodeChange();

  seasonPicker.addEventListener('change', () => {
    updateEpisodePicker();
    episodePicker.value = 1;
    onEpisodeChange();
  });
  episodePicker.addEventListener('change', onEpisodeChange);

  const nextButton = document.createElement('button');
  nextButton.classList.add('next');
  nextButton.textContent = 'next ->';
  sidebar.appendChild(nextButton);
  nextButton.addEventListener('click', () => {
    const season = +seasonPicker.value;
    const episode = +episodePicker.value;

    // If last episode (1-indexed)
    if (episode === seasons[season].episode_count) {
      if (seasons[season + 1]) {
        seasonPicker.value = season + 1;
        updateEpisodePicker();
        episodePicker.value = 1;
      } else {
        window.alert('last episode :(');
      }
    } else {
      episodePicker.value = episode + 1;
    }
    onEpisodeChange();
  });

  const searchLink = document.createElement('a');
  searchLink.href = '/';
  const footer = document.createElement('footer');
  footer.appendChild(searchLink);
  footer.appendChild(document.createTextNode(`
    all streams are hosted by ${streamingHost}.
    no copyrighted material is stored on opcor servers.
    adblocker recommended.
  `));
  sidebar.appendChild(footer);
}

function option(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}


