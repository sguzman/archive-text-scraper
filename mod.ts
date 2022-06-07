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

async function fileExists(url: IUrlParse): Promise<boolean> {
  
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
    log.info(`Found item: ${$(item).attr("data-id")}`);
  }
}
