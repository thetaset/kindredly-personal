import {
  recognizeMediaMetadataUrl,
  refineMediaSubType,
} from "../src/media-metadata.utils";

describe("recognizeMediaMetadataUrl", () => {
  test.each([
    [
      "https://www.audible.com/pd/Project-Hail-Mary-Audiobook/B08G9PRS1K?source_code=x",
      "audible",
      "B08G9PRS1K",
    ],
    [
      "https://www.amazon.com/Project-Hail-Mary-Andy-Weir-ebook/dp/B08FHBV4ZX/ref=x",
      "amazon_books",
      "B08FHBV4ZX",
    ],
    [
      "https://share.libbyapp.com/title/6037516?utm_source=x",
      "libby",
      "6037516",
    ],
    [
      "https://open.spotify.com/intl-de/episode/7makk4oTQel546B0PZlDM5?si=x",
      "spotify",
      "episode:7makk4oTQel546B0PZlDM5",
    ],
    [
      "https://music.amazon.com/albums/B08ABC1234?trackAsin=B08DEF5678",
      "amazon_music",
      "tracks:B08DEF5678",
    ],
    [
      "https://books.apple.com/us/book/a-wrinkle-in-time/id123456789",
      "apple_books",
      "apple_books:123456789",
    ],
    [
      "https://books.google.com/books?id=zyTCAlFPjgYC&printsec=frontcover",
      "google_books",
      "zyTCAlFPjgYC",
    ],
    [
      "https://www.goodreads.com/book/show/1885.Pride_and_Prejudice",
      "goodreads",
      "1885",
    ],
    [
      "https://libro.fm/audiobooks/9781250316776-circe",
      "libro_fm",
      "9781250316776-circe",
    ],
    [
      "https://www.netflix.com/title/81257180?trackId=123",
      "netflix",
      "81257180",
    ],
    [
      "https://www.primevideo.com/detail/0P123456789ABCDEF",
      "prime_video",
      "0P123456789ABCDEF",
    ],
    [
      "https://www.disneyplus.com/movies/encanto/33q7DY1rtHQH",
      "disney_plus",
      "33q7DY1rtHQH",
    ],
    [
      "https://tv.apple.com/us/movie/wolfs/umc.cmc.6v...",
      "apple_tv",
      "umc.cmc.6v...",
    ],
    [
      "https://www.imdb.com/title/tt1375666/?ref_=fn_all_ttl_1",
      "imdb",
      "tt1375666",
    ],
    ["https://www.themoviedb.org/movie/27205-inception", "tmdb", "27205"],
    ["https://letterboxd.com/film/inception/", "letterboxd", "inception"],
    [
      "https://www.crunchyroll.com/watch/GN7UNJX7D/example-episode",
      "crunchyroll",
      "GN7UNJX7D",
    ],
    [
      "https://play.google.com/store/books/details/Project_Hail_Mary?id=abc123",
      "google_play_books",
      "abc123",
    ],
    [
      "https://therokuchannel.roku.com/details/abc-123/example-movie",
      "roku_channel",
      "abc-123",
    ],
  ])("%s recognizes %s", (url, provider, externalId) => {
    expect(recognizeMediaMetadataUrl(url)).toEqual(
      expect.objectContaining({ provider, externalId }),
    );
  });

  it("returns tracking-free canonical URLs", () => {
    expect(
      recognizeMediaMetadataUrl(
        "https://open.spotify.com/track/abc123?si=secret",
      )?.canonicalUrl,
    ).toBe("https://open.spotify.com/track/abc123");
  });

  test.each([
    ["https://www.audible.com/pd/Project-Hail-Mary-Audiobook/B08G9PRS1K", "audiobook"],
    ["https://www.amazon.com/Project-Hail-Mary-Andy-Weir-ebook/dp/B08FHBV4ZX", "book"],
    ["https://share.libbyapp.com/title/6037516", "book"],
    ["https://libro.fm/audiobooks/9781250316776-circe", "audiobook"],
    ["https://open.spotify.com/audiobook/7iHfbu1YPACw6oZPAFJtqe", "audiobook"],
    ["https://open.spotify.com/episode/7makk4oTQel546B0PZlDM5", "podcast"],
    ["https://podcasts.apple.com/us/podcast/example/id123456789", "podcast"],
    ["https://open.spotify.com/track/abc123", "song"],
    ["https://music.amazon.com/albums/B08ABC1234?trackAsin=B08DEF5678", "song"],
    ["https://open.spotify.com/album/abc123", "music"],
    ["https://www.disneyplus.com/movies/encanto/33q7DY1rtHQH", "film"],
    ["https://www.themoviedb.org/movie/27205-inception", "film"],
    ["https://www.disneyplus.com/series/andor/3xsQKWG00GL5", "video_series"],
    ["https://www.themoviedb.org/tv/1399-game-of-thrones", "video_series"],
    ["https://www.netflix.com/title/81257180", "video"],
  ])("%s is a link with the %s item type", (url, subType) => {
    expect(recognizeMediaMetadataUrl(url)?.subType).toBe(subType);
  });

  test.each([
    ["https://www.amazon.com/dp/0593135202", "book"],
    ["https://www.amazon.com/Apple-AirPods-Pro-2nd-Generation/dp/B0CHWRXH8B", undefined],
    ["https://music.apple.com/us/album/abbey-road-2019-mix/1474815798", "music"],
    ["https://music.apple.com/us/album/abbey-road-2019-mix/1474815798?i=1474815801", "song"],
    ["https://music.apple.com/us/song/come-together/1474815801", "song"],
  ])("%s has item type %s", (url, subType) => {
    expect(recognizeMediaMetadataUrl(url)?.subType).toBe(subType);
  });

  it("looks up one Apple Music song by its own id and keeps the album slug as the title hint", () => {
    expect(
      recognizeMediaMetadataUrl(
        "https://music.apple.com/us/album/abbey-road-2019-mix/1474815798?i=1474815801",
      ),
    ).toEqual(
      expect.objectContaining({
        externalId: "apple_music:1474815801",
        canonicalUrl:
          "https://music.apple.com/us/album/abbey-road-2019-mix/1474815798?i=1474815801",
        titleHint: "abbey road 2019 mix",
      }),
    );
    expect(
      recognizeMediaMetadataUrl(
        "https://books.apple.com/us/book/project-hail-mary/id1501225936",
      )?.titleHint,
    ).toBe("project hail mary");
  });

  it("leaves the item type unset when the URL alone cannot tell", () => {
    expect(
      recognizeMediaMetadataUrl("https://spotify.link/abc123")?.subType,
    ).toBeUndefined();
    expect(
      recognizeMediaMetadataUrl("https://www.hoopladigital.com/title/12345")
        ?.subType,
    ).toBeUndefined();
  });

  test.each([
    ["video", "movie", "film"],
    ["video", "series", "video_series"],
    ["video", "tv", "video_series"],
    ["video", undefined, "video"],
    ["music", "track", "song"],
    ["music", "album", "music"],
    ["podcast", "episode", "podcast"],
    ["book", "movie", "book"],
  ] as const)(
    "narrows %s with provider item type %s to %s",
    (subType, providerItemType, expected) => {
      expect(refineMediaSubType(subType, providerItemType)).toBe(expected);
    },
  );

  it("keeps series as a valid provider item type", () => {
    expect(
      recognizeMediaMetadataUrl(
        "https://www.disneyplus.com/series/andor/3xsQKWG00GL5",
      )?.providerItemType,
    ).toBe("series");
  });

  it("does not claim unsupported or malformed URLs", () => {
    expect(
      recognizeMediaMetadataUrl("https://example.com/book/123"),
    ).toBeNull();
    expect(recognizeMediaMetadataUrl("not a url")).toBeNull();
  });
});
