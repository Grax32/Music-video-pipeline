export type CatalogReleaseKind = "album" | "song";

export interface CatalogRelease {
  id: string;
  kind: CatalogReleaseKind;
  title: string;
  releaseDate: string;
}

export interface CatalogAlbum extends CatalogRelease {
  kind: "album";
  artistName?: string;
}

export interface CatalogSong extends CatalogRelease {
  kind: "song";
  albumId?: string;
  artistName?: string;
}

export interface CatalogReleaseViewModel {
  id: string;
  kind: CatalogReleaseKind;
  title: string;
  releaseDate: string;
  href?: string;
  isComingSoon: boolean;
  bannerText?: "Coming Soon";
}

export interface CatalogReleaseDisplayOptions {
  now?: Date;
}

export interface FeaturedAlbumViewModel extends CatalogReleaseViewModel {
  kind: "album";
  href: string;
}

const COMING_SOON_BANNER_TEXT = "Coming Soon" as const;

export function isFutureReleaseDate(
  releaseDate: string,
  options: CatalogReleaseDisplayOptions = {},
): boolean {
  const releaseTime = Date.parse(releaseDate);
  if (Number.isNaN(releaseTime)) {
    throw new Error(`Invalid release date: ${releaseDate}`);
  }

  return releaseTime > (options.now ?? new Date()).getTime();
}

export function createCatalogReleaseViewModel(
  release: CatalogRelease,
  options: CatalogReleaseDisplayOptions = {},
): CatalogReleaseViewModel {
  const isComingSoon = isFutureReleaseDate(release.releaseDate, options);

  return {
    id: release.id,
    kind: release.kind,
    title: release.title,
    releaseDate: release.releaseDate,
    isComingSoon,
    bannerText: isComingSoon ? COMING_SOON_BANNER_TEXT : undefined,
  };
}

export function createAlbumHref(albumId: string): string {
  if (!albumId) {
    throw new Error("Album id is required to build an album screen link");
  }

  return `/albums/${encodeURIComponent(albumId)}`;
}

export function createFeaturedAlbumViewModel(
  album: CatalogAlbum,
  options: CatalogReleaseDisplayOptions = {},
): FeaturedAlbumViewModel {
  return {
    ...createCatalogReleaseViewModel(album, options),
    kind: "album",
    href: createAlbumHref(album.id),
  };
}
