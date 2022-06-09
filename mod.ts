import * as log from "https://deno.land/std/log/mod.ts";
import { IUrlParse, urlParse } from "https://deno.land/x/url_parse/mod.ts";

// ----------------------------------------------------------------------------

import * as cheerio from "https://esm.sh/cheerio";

// ----------------------------------------------------------------------------

log.info(`Received library: ${Deno.args[0]}`);

function library(): IUrlParse {
  const url = urlParse({
    protocol: "https",
    hostname: "archive.org",
    pathname: `/details/${Deno.args[0]}`,
  });

  return url;
}

function link(text: string): IUrlParse {
  const url = urlParse({
    protocol: "https",
    hostname: "archive.org",
    pathname: `/details/${text}`,
  });

  return url;
}

function page(n: number): IUrlParse {
  const url = urlParse({
    protocol: "https",
    hostname: "archive.org",
    pathname: `/details/${Deno.args[0]}`,
    query: [{
      key: "and[]",
      value: `mediatype:"texts"`,
    }, {
      key: "sort",
      value: "-week",
    }, {
      key: "page",
      value: `${n}`,
    }, {
      key: "scroll",
      value: "1",
    }],
  });

  log.info(`Built ${url.toString()}`);
  return url;
}

async function _exists(filename: string): Promise<boolean> {
  try {
    await Deno.stat(filename);
    // successful, file or directory must exist
    return true;
  } catch (_error) {
    // error, file or directory must not exist
    return false;
  }
}

async function _get(url: IUrlParse): Promise<string> {
  const response = await fetch(url.toString());
  const text = await response.text();
  return text;
}

async function _save(filename: string, text: string): Promise<void> {
  const file = await Deno.open(filename, {
    create: true,
    write: true,
    truncate: true,
  });

  await Deno.writeAll(file, new TextEncoder().encode(text));
  await file.close();
}

async function readFile(filename: string): Promise<string> {
  const file = await Deno.open(filename);
  const text = await Deno.readAll(file);
  await file.close();
  return text.toString();
}

async function cache(url: IUrlParse): Promise<string> {
  const filePath = url.pathname;

  if (filePath && typeof filePath === "string") {
    const fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
    const fullFilePath = `./data/details/${fileName}.html`;

    const exists = await _exists(fullFilePath);

    if (exists) {
      return await readFile(fullFilePath);
    } else {
      log.info(`Fetching ${fileName}`);
      const text = await _get(url);
      await _save(fullFilePath, text);
      return text;
    }
  }

  return "";
}

const start: Response = await fetch(library().toString());
const html: string = await start.text();

const $ = cheerio.load(html);
const resultCount: number = parseInt(
  $("div.results_count").text().trim().split("\n").map((s) => s.trim())[0]
    .replace(",", ""),
  10,
);

log.info(`Found ${resultCount} results`);

const pages: number = Math.ceil(resultCount / 75);
log.info(`Found ${pages} pages`);

for (let i = 1; i < pages; ++i) {
  log.info(`Fetching page ${i}`);

  const body: Response = await fetch(page(i).toString());
  const text: string = await body.text();
  const doc = cheerio.load(text);

  const items = doc("[data-id]");
  const itemArray = items.toArray();

  for (const item of itemArray) {
    const u = $(item).attr("data-id");
    if (u) {
      const url = link(u);
      const text = await cache(url);
      log.info(`Cached ${url.toString()}`);
    }
  }
}
