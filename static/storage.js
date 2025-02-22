// Progress for all series is saved in a LocalStorage entry is stored in a single 

const progressDataKey = 'progress-data';
const tmdbDataKeyPrefix = 'tmdb-data-';

export function loadProgress(tmdbId) {
  let season = 1;
  let episode = 1;
  const progressDataString = localStorage.getItem(progressDataKey);
  if (progressDataString) {
    try {
      const data = JSON.parse(progressDataString);
      const seriesData = data[tmdbId];
      season = seriesData?.season ?? 1;
      episode = seriesData?.episode ?? 1;
    } catch (_) {
      console.error(e);
    }
  }
  return { season, episode };
}

export function saveProgress(tmdbId, season, episode) {
  const progressDataString = localStorage.getItem(progressDataKey);
  let progressData;
  try {
    progressData = JSON.parse(progressDataString) ?? {};
  } catch (_) {
    progressData = {};
  }

  progressData[tmdbId] = { season, episode, timestamp: Date.now() };
  localStorage.setItem(progressDataKey, JSON.stringify(progressData));
}

export function saveTmdbData(tmdbData) {
  localStorage.setItem(tmdbDataKeyPrefix + tmdbData.id, JSON.stringify(tmdbData));
}


//// Returns an array of items containing ID, episode progress, and tmdbData, most-recent-first.
export function loadHistory() {
  const progressDataString = localStorage.getItem(progressDataKey);
  if (!progressDataString) return [];

  try {
    const data = JSON.parse(progressDataString);
    const ids = Object.keys(data);
    const history = ids.map((id) => {
      const tmdbData = JSON.parse(localStorage.getItem(`${tmdbDataKeyPrefix}${id}`));
      if (!tmdbData) return null;

      return {
        id: id,
        tmdbData: tmdbData,
        season: data[id].season,
        episode: data[id].episode, 
        timestamp: data[id].timestamp,
      };
    }).filter((h) => !!h);
    history.sort((a, b) => b.timestamp - a.timestamp);
    return history.filter((item) => localStorage.getItem(tmdbDataKeyPrefix + item.id));
  } catch (e) {
    console.error(e);
  }
}
