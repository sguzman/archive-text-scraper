import * as log from "https://deno.land/std@0.142.0/log/mod.ts";
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

function _page(n: number): IUrlParse {
  const url = urlParse({
    protocol: "https",
    hostname: "archive.org",
    pathname: `/details/${Deno.args[0]}`,
    query: [{
      key: "and[]",
      value: `mediatype: "texts"`,
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

  return url;
}

const start: Response = await fetch(library().toString());
const html: string = await start.text();

const $ = cheerio.load(html);
const resultCount: number = parseInt(
  $("div.results_count").text().trim().split("\n").map((s) => s.trim())[0],
  10,
);
log.info(resultCount);
