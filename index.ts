import { createElement } from "react";
import * as ReactServerDom from "react-server-dom-webpack/server.browser";
import nodePath from "path";

const clientEntrypoints = new Set<string>();
const clientManifest: Record<string, unknown> = {};

// build server components and get references to client component files
await Bun.build({
  target: "bun",
  entrypoints: ["src/index.tsx"],
  outdir: "dist",
  plugins: [
    {
      name: "resolve-client-imports",
      setup(build) {
        build.onResolve({ filter: /^.\// }, async ({ importer, path }) => {
          if (importer.includes("node_modules")) return;

          const absolutePath = nodePath.join(
            import.meta.dir,
            `${path.replace("./", "./src/")}.tsx`
          );

          if (
            (await Bun.file(absolutePath).text()).startsWith('"use client"')
          ) {
            // client component
            clientEntrypoints.add(absolutePath);
            return { path, external: true };
          }
          // server component
          return { path: absolutePath };
        });
      },
    },
  ],
});

const csr = await Bun.build({
  target: "browser",
  // maybe we don't need it
  splitting: true,
  entrypoints: [
    ...clientEntrypoints,
    nodePath.resolve(import.meta.dirname, "src", "_client.tsx"),
  ],
});

const transpiler = new Bun.Transpiler({
  loader: "tsx",
});

await Promise.all(
  csr.outputs.map(async (output) => {
    const path = nodePath.resolve(import.meta.dirname, "dist", output.path);

    const content = await output.text();

    const exports = transpiler.scan(content).exports;

    if (output.kind !== "entry-point" || exports.length === 0) {
      return Bun.write(path, content);
    }

    const refs = exports.map((e) => {
      const name =
        e === "default" ? `${nodePath.parse(output.path).name}_${e}` : e;
      clientManifest[`${path}#${name}`] = {
        id: `/dist/${output.path.replace("./", "")}`,
        name: e,
        async: true,
        chunks: [],
      };

      return `${name}.$$id="${path}#${name}";
    ${name}.$$typeof=Symbol.for("react.client.reference");`;
    });

    const code = `${content}
  ${refs.join("\n\n")}`;
    return Bun.write(path, code);
  })
);

Bun.serve({
  async fetch(request) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/":
        return new Response(
          `
<!DOCTYPE html>
<html>
<head>
  <title>React DG</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/dist/_client.js"></script>
</body>
</html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      case "/rsc":
        return new Response(
          ReactServerDom.renderToReadableStream(
            createElement((await import("./dist/index")).default),
            clientManifest
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
