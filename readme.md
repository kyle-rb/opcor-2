# Opcor 2

Demo app for recording tv series progress and streaming

## Running

### Prereqs

- [Deno](https://docs.deno.com/runtime/)

### Download

```sh
git clone https://github.com/kyle-rb/opcor-2.git
```

### Configure

Create a `config.json` file with a
[TMDB API token](https://developer.themoviedb.org/reference/intro/getting-started) (for searches and
series metadata) and a host URL that can redirect to streams.

```json
{
  "tmdbApiToken": "xxxxx.yyyyy.zzzzz",
  "streamingProviderHostname": "example.com"
}
```

### Run

```sh
deno task start
```

and access the app at <http://localhost:8000> (configured in `local-server.ts`).

## License

[CC0](https://creativecommons.org/public-domain/cc0/); no rights reserved. Do whatever you want,
with or without attribution.

## TODO

- features
  - prev button
  - history in search/home page
  - movies
  - episode info
- cleanup
  - Lit + TypeScript client
  - keyboard focus management
  - iframe sandboxing (player breaks if I include it)
  - sidebar a11y (aria-expanded)
