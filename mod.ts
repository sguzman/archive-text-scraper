import * as log from "https://deno.land/std@0.142.0/log/mod.ts";
import { IUrlParse, urlParse } from "https://deno.land/x/url_parse/mod.ts";

// ----------------------------------------------------------------------------

import cheerio from "https://esm.sh/cheerio";

// ----------------------------------------------------------------------------

const lib = Deno.args[0];
log.info(`Received library: ${lib}`);

function page(n: number): IUrlParse {
  const url = urlParse({
    protocol: "https",
    hostname: "archive.org",
    pathname: `/details/${lib}`,
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

