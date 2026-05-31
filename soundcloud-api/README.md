# SoundCloud API library listing

This folder contains a small Node.js script that lists the authenticated
SoundCloud user's uploaded songs and albums.

## Requirements

- Node.js 18 or newer (the repository targets Node.js 22)
- A SoundCloud OAuth user access token in `SOUNDCLOUD_ACCESS_TOKEN`

SoundCloud's current API guide documents `https://api.soundcloud.com` as the
base URL and requires authenticated calls to send `Authorization: OAuth ACCESS_TOKEN`.
The script uses `/me/tracks` for songs and `/me/playlists?show_tracks=false` for
album metadata. SoundCloud albums are represented by playlists whose
`playlist_type` is `album`.

## Usage

```bash
SOUNDCLOUD_ACCESS_TOKEN='YOUR_ACCESS_TOKEN' node soundcloud-api/list-library.mjs
```

Write JSON to a file:

```bash
SOUNDCLOUD_ACCESS_TOKEN='YOUR_ACCESS_TOKEN' \
  node soundcloud-api/list-library.mjs --format json --out soundcloud-library.json
```

Write CSV sections to stdout and include non-album playlists:

```bash
SOUNDCLOUD_ACCESS_TOKEN='YOUR_ACCESS_TOKEN' \
  node soundcloud-api/list-library.mjs --format csv --include-playlists
```

## Options

- `--format table|json|csv`: choose output format. Defaults to `table`.
- `--out <path>`: write output to a file instead of stdout.
- `--include-playlists`: include non-album playlists after albums.
- `--help`: print CLI help.
