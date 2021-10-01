# Lyrics scraper
A tool for mass-downloading finnish song lyrics

## Introduction
Nowadays you can search online and find lyrics for almost any song. However, it's difficult to find big catalogues of finnish song lyrics to be used in e.g. text processing & machine learning applications.

With this tool you can scrape [https://lyrics.fi/](https://lyrics.fi/) to mass-download song lyrics.

## Usage
The site [https://lyrics.fi/.all](https://lyrics.fi/.all) lists many finnish song lyrics.

`yarn fetch-range [startPage] [endPage]` fetches all song lyrics from that site's pages between `startPage` and `endPage` (inclusive) and stores them in `songData` folder grouped under the artist.
