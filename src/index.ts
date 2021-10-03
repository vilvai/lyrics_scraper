import fetch, { Response } from "node-fetch";
import * as txml from "txml";
import fs from "fs";

import type { tNode } from "txml";

const ROOT_URL = "https://lyrics.fi";
const OUTPUT_FOLDER = "songData";
const MAX_FILENAME_LENGTH = 100;

const fetchSongUrlsFromPage = async (
  url: string,
  page?: number
): Promise<string[]> => {
  const pageUrl = page ? `${url}?page=${page}` : url;

  const response = await fetch(pageUrl);
  const text = await response.text();

  const dom = txml.parse(text);
  const tBodyElement: any = txml.simplifyLostLess(
    txml.filter(dom, (node: tNode) => node.tagName.toLowerCase() === "tbody")
  );

  const trElements = tBodyElement.tbody[0].tr;

  // Page doesn't contain songs
  if (trElements.length < 2) return [];

  const urls: string[] = trElements
    .map((element: any) => element.td[0].a[0]["_attributes"].href)
    .filter(
      (url: string) =>
        !url.includes("//") && url.includes("/") && url.split("/")[1] !== ""
    );

  return urls;
};

const fetchSongDataFromUrl = async (
  url: string
): Promise<{ lyrics: string[]; moods: string[] }> => {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error(
      `Failed to fetch song data from url: ${url}. Full error: ${error}`
    );
    return { lyrics: [], moods: [] };
  }

  try {
    const text = await response.text();

    const textWithoutBrokenBrTags = text.replace("</br>", "");

    const dom = txml.parse(textWithoutBrokenBrTags);

    const lyricsElement = (
      txml.simplify(
        txml.filter(
          dom,
          (node: tNode) =>
            (node.attributes as Record<string, unknown>)?.class === "lyrics"
        )
      ) as any
    ).div.p;

    const moodElement: any = txml.simplifyLostLess(
      txml.filter(
        dom,
        (node: tNode) =>
          (node.attributes as Record<string, unknown>)?.class === "mood"
      )
    );

    let moods: string[] = [];

    if (moodElement.div) {
      moods = moodElement.div[0].a.map(
        (node: any) => node["_attributes"].title
      );
    }

    return {
      lyrics:
        typeof lyricsElement === "string" ? [lyricsElement] : lyricsElement,
      moods,
    };
  } catch (error) {
    console.error(
      `Failed to parse song data for url: ${url}. Full error: ${error}`
    );
    return { lyrics: [], moods: [] };
  }
};

const fetchAllSongsDataFromPage = async (page: number) => {
  console.log(`Fetching data from page ${page}`);

  const songUrls = await fetchSongUrlsFromPage(`${ROOT_URL}/.all`, page);

  console.log(`Fetching ${songUrls.length} songs data`);

  const fetchingStartTime = performance.now();

  const dataForSongs = await Promise.all(
    songUrls.map((songUrl) => fetchSongDataFromUrl(`${ROOT_URL}${songUrl}`))
  );

  const fetchingEndTime = performance.now();
  console.info(
    `Fetched ${songUrls.length} songs data in %dms`,
    fetchingEndTime - fetchingStartTime
  );

  console.log(`Writing ${songUrls.length} songs data`);

  const writingStartTime = performance.now();

  dataForSongs.forEach(({ lyrics, moods }, i) => {
    const truncatedSongUrl =
      songUrls[i].length > MAX_FILENAME_LENGTH
        ? songUrls[i]
            .split("/")
            .map((x) => x.slice(0, MAX_FILENAME_LENGTH / 2))
            .join("/")
        : songUrls[i];
    fs.mkdirSync(`${OUTPUT_FOLDER}${truncatedSongUrl}`, { recursive: true });
    fs.writeFileSync(
      `${OUTPUT_FOLDER}${truncatedSongUrl}/lyrics.txt`,
      lyrics.join("\n\n")
    );
    fs.writeFileSync(
      `${OUTPUT_FOLDER}${truncatedSongUrl}/moods.txt`,
      moods.join("\n")
    );
  });
  const writingEndTime = performance.now();
  console.info(
    `Wrote ${songUrls.length} songs data in %dms`,
    writingEndTime - writingStartTime
  );
};

const fetchSongDataBetweenPages = async (
  startPage: number,
  endPage: number
) => {
  for (let page = startPage; page < endPage; page++) {
    await fetchAllSongsDataFromPage(page);
  }
};

const [startPage, endPage] = process.argv.slice(2, 4).map(Number);

if (!Number.isInteger(startPage) || !Number.isInteger(endPage)) {
  console.error(
    'Wrong arguments. Usage: "yarn fetch-range [startPage] [endPage]", e.g. "yarn fetch-range 1 5"'
  );
  process.exit(1);
}

fetchSongDataBetweenPages(startPage, endPage);
