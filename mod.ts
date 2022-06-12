import * as log from "https://deno.land/std/log/mod.ts";
import { IUrlParse, urlParse } from "https://deno.land/x/url_parse/mod.ts";

import * as cheerio from "https://esm.sh/cheerio";

interface YearCount {
  val: number;
  n: number;
  txt: string | undefined;
}

const libId = Deno.args[0];
const pageSize = 75;

const util = {
  encode: (str: string) => {
    return encodeURIComponent(str).replace(/%20/g, "+");
  },
  url: {
    count: urlParse(
      `https://archive.org/details/${libId}&headless=1&facets_xhr=facets&morf=year&output=json`,
    ),
    year: (year: number): IUrlParse => {
      return urlParse(
        `https://archive.org/details/${libId}&and[]=date%3A${year}`,
      );
    },
    page: (year: number, page: number) => {
      return urlParse(
        `https://archive.org/details/${libId}?and%5B%5D=mediatype%3A%22texts%22&and%5B%5D=year%3A%22${year}%22&sort=-week&page=${page}&scroll=1
        `,
      );
    },
    details: (itemId: string): IUrlParse => {
      return urlParse(`https://archive.org/details/${itemId}/`);
    },
  },
};

// Read file
export async function readFile(file: string): Promise<string> {
  const data = await Deno.readFile(file);
  return new TextDecoder("utf-8").decode(data);
}

// Write file
export async function writeFile(file: string, data: string): Promise<void> {
  await Deno.writeFile(file, new TextEncoder().encode(data));
}

// Does file exists
export async function fileExists(file: string): Promise<boolean> {
  try {
    await Deno.stat(file);
    return true;
  } catch (_) {
    return false;
  }
}

// If file exists, return it. otherwise create file from function
export async function cacheOrFetch(
  url: IUrlParse,
): Promise<string> {
  const filePath = `./data/${encodeURIComponent(url.toString())}.html`;

  if (await fileExists(filePath)) {
    return readFile(filePath);
  } else {
    const resp = await fetch(url.toString());
    const data = await resp.text();
    await writeFile(filePath, data);

    return data;
  }
}

// Fetch url and return text
export async function fetchUrl(url: IUrlParse): Promise<string> {
  const text = await cacheOrFetch(url);
  return text;
}

// Get counts from url
export async function getCounts(url: string): Promise<YearCount[]> {
  const res = await fetch(url);
  const json = await res.json();
  const counts: YearCount[] = json.options;

  return counts;
}

log.info("Starting...");

for (const obj of await getCounts(util.url.count.toString())) {
  const year = obj.val;
  const count = obj.n;
  const pages = Math.ceil(count / pageSize);

  log.info(`Year ${year} | count = ${count} | pages = ${pages}`);

  for (let i = 1; i <= pages; i++) {
    const url = util.url.page(year, i);
    const text = await fetchUrl(url);
    const $ = cheerio.load(text);

    const items = $("div.item-ttl > a[href]");
    log.info(`Year ${year} | page ${i} | items = ${items.length}`);

    for (const item of items.toArray()) {
      const loadElement = $(item);
      const itemhref = loadElement.attr("href") as string;
      log.info(`Year ${year} | page ${i} | item = ${itemhref}`);
      const itemId = itemhref.split("/")[-1];

      const itemUrl = util.url.details(itemId);
      const itemText = await fetchUrl(itemUrl);
      const $item = cheerio.load(itemText);
    }
  }
}
