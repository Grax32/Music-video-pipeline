#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';

const API_BASE_URL = 'https://api.soundcloud.com';
const DEFAULT_LIMIT = 200;

const HELP = `List your SoundCloud songs and albums.

Usage:
  SOUNDCLOUD_ACCESS_TOKEN=... node soundcloud-api/list-library.mjs [options]

Options:
  --format table|json|csv    Output format. Default: table.
  --out <path>               Write output to a file instead of stdout.
  --include-playlists        Include non-album playlists after the albums list.
  --help                     Show this help message.

Authentication:
  This script calls authenticated /me endpoints, so SOUNDCLOUD_ACCESS_TOKEN must
  be a user access token from SoundCloud OAuth. The API expects the header
  "Authorization: OAuth ACCESS_TOKEN".
`;

function parseArgs(argv) {
  const options = {
    format: 'table',
    out: undefined,
    includePlaylists: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--include-playlists') {
      options.includePlaylists = true;
    } else if (arg === '--format') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--format requires one of: table, json, csv');
      }
      options.format = value;
      index += 1;
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length);
    } else if (arg === '--out') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--out requires a file path');
      }
      options.out = value;
      index += 1;
    } else if (arg.startsWith('--out=')) {
      options.out = arg.slice('--out='.length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!['table', 'json', 'csv'].includes(options.format)) {
    throw new Error('--format must be one of: table, json, csv');
  }

  return options;
}

function normalizeToken(rawToken) {
  return rawToken.replace(/^OAuth\s+/i, '').replace(/^Bearer\s+/i, '').trim();
}

async function soundCloudFetch(pathOrUrl, token) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json; charset=utf-8',
      Authorization: `OAuth ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SoundCloud API request failed (${response.status} ${response.statusText}) for ${url}: ${body}`);
  }

  return response.json();
}

async function fetchCollection(path, token) {
  const separator = path.includes('?') ? '&' : '?';
  let nextUrl = `${path}${separator}linked_partitioning=true&limit=${DEFAULT_LIMIT}`;
  const items = [];

  while (nextUrl) {
    const page = await soundCloudFetch(nextUrl, token);

    if (Array.isArray(page)) {
      items.push(...page);
      nextUrl = undefined;
    } else {
      items.push(...(page.collection ?? []));
      nextUrl = page.next_href;
    }
  }

  return items;
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) {
    return '';
  }

  const totalSeconds = Math.round(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function songFromTrack(track) {
  return {
    id: track.id,
    title: track.title ?? '',
    duration: formatDuration(track.duration),
    duration_ms: track.duration,
    created_at: formatDate(track.created_at),
    release_date: track.release_date ?? '',
    genre: track.genre ?? '',
    sharing: track.sharing ?? '',
    permalink_url: track.permalink_url ?? '',
  };
}

function albumFromPlaylist(playlist) {
  return {
    id: playlist.id,
    title: playlist.title ?? '',
    track_count: playlist.track_count ?? playlist.tracks?.length ?? '',
    duration: formatDuration(playlist.duration),
    duration_ms: playlist.duration,
    created_at: formatDate(playlist.created_at),
    release_date: playlist.release_date ?? '',
    genre: playlist.genre ?? '',
    sharing: playlist.sharing ?? '',
    playlist_type: playlist.playlist_type ?? '',
    permalink_url: playlist.permalink_url ?? '',
  };
}

function isAlbum(playlist) {
  return String(playlist.playlist_type ?? '').toLowerCase() === 'album';
}

function toCsv(rows, columns) {
  const escapeCell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(',')),
  ].join('\n');
}

function tableSection(title, rows, columns) {
  const lines = [`${title} (${rows.length})`];

  if (rows.length === 0) {
    lines.push('  No items found.');
    return lines.join('\n');
  }

  rows.forEach((row, index) => {
    const summary = columns
      .map(([label, key]) => `${label}: ${row[key] ?? ''}`)
      .join(' | ');
    lines.push(`${String(index + 1).padStart(3, ' ')}. ${summary}`);
  });

  return lines.join('\n');
}

function renderOutput(data, format, includePlaylists) {
  if (format === 'json') {
    return `${JSON.stringify(data, null, 2)}\n`;
  }

  if (format === 'csv') {
    const sections = [
      '# Songs',
      toCsv(data.songs, ['id', 'title', 'duration', 'created_at', 'release_date', 'genre', 'sharing', 'permalink_url']),
      '',
      '# Albums',
      toCsv(data.albums, ['id', 'title', 'track_count', 'duration', 'created_at', 'release_date', 'genre', 'sharing', 'playlist_type', 'permalink_url']),
    ];

    if (includePlaylists) {
      sections.push(
        '',
        '# Other playlists',
        toCsv(data.playlists, ['id', 'title', 'track_count', 'duration', 'created_at', 'release_date', 'genre', 'sharing', 'playlist_type', 'permalink_url']),
      );
    }

    return `${sections.join('\n')}\n`;
  }

  const sections = [
    `SoundCloud library for ${data.user.username} (${data.user.permalink_url})`,
    '',
    tableSection('Songs', data.songs, [
      ['Title', 'title'],
      ['Duration', 'duration'],
      ['Created', 'created_at'],
      ['URL', 'permalink_url'],
    ]),
    '',
    tableSection('Albums', data.albums, [
      ['Title', 'title'],
      ['Tracks', 'track_count'],
      ['Duration', 'duration'],
      ['Created', 'created_at'],
      ['URL', 'permalink_url'],
    ]),
  ];

  if (includePlaylists) {
    sections.push(
      '',
      tableSection('Other playlists', data.playlists, [
        ['Title', 'title'],
        ['Tracks', 'track_count'],
        ['Type', 'playlist_type'],
        ['URL', 'permalink_url'],
      ]),
    );
  }

  return `${sections.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  const rawToken = process.env.SOUNDCLOUD_ACCESS_TOKEN;
  if (!rawToken) {
    throw new Error('Set SOUNDCLOUD_ACCESS_TOKEN to a SoundCloud user OAuth access token. Run with --help for details.');
  }

  const token = normalizeToken(rawToken);
  const [user, tracks, playlists] = await Promise.all([
    soundCloudFetch('/me', token),
    fetchCollection('/me/tracks', token),
    fetchCollection('/me/playlists?show_tracks=false', token),
  ]);

  const albumPlaylists = playlists.filter(isAlbum);
  const otherPlaylists = playlists.filter((playlist) => !isAlbum(playlist));
  const data = {
    generated_at: new Date().toISOString(),
    user: {
      id: user.id,
      username: user.username,
      permalink_url: user.permalink_url,
    },
    songs: tracks.map(songFromTrack),
    albums: albumPlaylists.map(albumFromPlaylist),
    playlists: options.includePlaylists ? otherPlaylists.map(albumFromPlaylist) : undefined,
  };

  const output = renderOutput(data, options.format, options.includePlaylists);

  if (options.out) {
    await writeFile(options.out, output, 'utf8');
    process.stderr.write(`Wrote SoundCloud library to ${options.out}\n`);
  } else {
    process.stdout.write(output);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
