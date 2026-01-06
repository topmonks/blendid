import fs from "node:fs";
import DefaultRegistry from "undertaker-registry";
import revReplace from "gulp-rev-rewrite";
import projectPath from "../../lib/projectPath.mjs";

export class RevUpdateJsRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
    const codeDir = (pathConfig.javascripts || pathConfig.esbuild)?.dest ?? "";
    this.paths = {
      codeDir,
      src: projectPath(pathConfig.dest, codeDir, "**", "*.js"),
      dest: projectPath(pathConfig.dest, codeDir),
      manifest: projectPath(pathConfig.dest, "rev-manifest.json")
    };
  }
  init({ task, src, dest }) {
    if (!(this.config.javascripts || this.config.esbuild)) return;
    task("update-js", (done) => {
      if (!fs.existsSync(this.paths.dest)) {
        return done();
      }
      const relativePath = (s) => s.replace(this.paths.codeDir, ".");
      const manifest = fs.existsSync(this.paths.manifest)
        ? fs.readFileSync(this.paths.manifest)
        : null;
      return src(this.paths.src, { allowEmpty: true })
        .pipe(
          revReplace({
            manifest,
            modifyUnreved: relativePath,
            modifyReved: relativePath
          })
        )
        .pipe(dest(this.paths.dest));
    });
  }
}
