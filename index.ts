import { createElement } from "react";
import * as ReactServerDom from "react-server-dom-webpack/server.browser";
import nodePath from "path";

// build server component bundle
await Bun.build({
  target: "bun",
  entrypoints: ["src/index.tsx"],
  outdir: "dist",
});

Bun.serve({
  async fetch(request) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/":
        return new Response("Hello World");
      case "/rsc":
        return new Response(
          ReactServerDom.renderToReadableStream(
            createElement((await import("./dist/index")).default),
            // no client components so far
            {}
          ),
          { headers: { "Content-Type": "text/html" } }
        );
      default:
        if (new Bun.Glob("/dist/*").match(url.pathname)) {
          return new Response(Bun.file(`./${url.pathname}`));
        }
        return new Response("Not Found", { status: 404 });
    }
  },
});
