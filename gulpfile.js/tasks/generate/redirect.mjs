import module from "node:module";
import DefaultRegistry from "undertaker-registry";
import File from "vinyl";
import gulp_mode from "gulp-mode";
import htmlmin from "../../packages/gulp-htmlmin/index.mjs";
import streamArray from "stream-array";
import through from "through2";
import nunjucksRender from "gulp-nunjucks-render";
import projectPath from "../../lib/projectPath.mjs";
import cloneDeep from "lodash-es/cloneDeep.js";
import handleErrors from "../../lib/handleErrors.mjs";

const mode = gulp_mode();
const require = module.createRequire(import.meta.url);

function createFile(item, { host, route }) {
  const [originalUrl, targetUrl] = route(item);
  const path = originalUrl.endsWith("/")
    ? originalUrl + "index.html"
    : originalUrl;
  return new File({
    path,
    contents: Buffer.from(
      [
        `<!DOCTYPE html>`,
        `<meta charset=utf-8>`,
        `<title>This page has been moved</title>`,
        `<meta name=robots content=noindex>`,
        `<meta http-equiv=refresh content="0;url={{host}}{{targetUrl}}">`,
        `<link rel=canonical href="{{host}}{{targetUrl}}">`,
        `<script>window.location.replace(new URL("{{targetUrl}}", "{{host}}"));</script>`,
        `<p>This page has been moved to <a href="{{host}}{{targetUrl}}">{{host}}{{targetUrl}}</a>`
      ].join("")
    ),
    data: { host, targetUrl }
  });
}

export class GenerateRedirectsRegistry extends DefaultRegistry {
  #ownTasks = new Set();
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  ownTasks() {
    return Array.from(this.#ownTasks);
  }

  init({ task, parallel, dest }) {
    if (!this.config.generate.redirects) return;

    const config = cloneDeep(this.config.html);

    function generateRedirect(sourcePath, destPath, col) {
      const generateRedirectsTask = () =>
        streamArray(require(sourcePath))
          .pipe(
            through.obj(function (item, enc, done) {
              const file = createFile(item, col);
              this.push(file);
              done();
            })
          )
          .pipe(nunjucksRender(config.nunjucksRender))
          .on("error", handleErrors)
          .pipe(mode.production(htmlmin(config.htmlmin)))
          .pipe(dest(destPath));
      generateRedirectsTask.displayName = `generate-redirects-${col.collection}`;
      return generateRedirectsTask;
    }

    function* createTasks(collections, pathConfig) {
      const dataPath = projectPath(pathConfig.src, pathConfig.data.src);
      const destPath = projectPath(pathConfig.dest, pathConfig.html.dest);
      for (const col of collections) {
        const sourcePath = projectPath(dataPath, `${col.collection}.json`);
        yield generateRedirect(sourcePath, destPath, col);
      }
    }

    task(
      "generate-redirect",
      parallel(
        Array.from(createTasks(this.config.generate.redirects, this.pathConfig))
      )
    );
    this.#ownTasks.add("generate-redirect");
  }
}
