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

Set the following environment variables to provide settings:

- `OPCOR_TMDB_TOKEN`:
  [TMDB API token](https://developer.themoviedb.org/reference/intro/getting-started) (for searches
  and series metadata)
- `OPCOR_HOSTNAME`: a host URL that can redirect to streams.

```sh
OPCOR_TMDB_TOKEN="xxxxx.yyyyy.zzzzz",
OPCOR_HOSTNAME="example.com"
```

### Run

```sh
deno task start
```

and access the app at <http://localhost:8000> (configured in `server.ts`).

## License

### Icons

`menu.svg`, `tv.svg`, and `movie.svg` are from [Google Fonts](https://fonts.google.com/icons) via
the [Apache License](https://github.com/google/material-design-icons?tab=Apache-2.0-1-ov-file).

### All other assets

All other assets and code are committed to the public domain via the
[CC0](https://creativecommons.org/public-domain/cc0/) license; no rights reserved. Do whatever you
want, with or without attribution.

## TODO

- features
  - prev button
  - history in search/home page
  - episode info
- cleanup
  - Lit + TypeScript client
  - keyboard focus management
  - iframe sandboxing (player breaks if I include it)
  - sidebar a11y (aria-expanded)
