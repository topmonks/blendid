import { minify } from "html-minifier-terser";
import through from "through2";
import PluginError from "plugin-error";

const PLUGIN_NAME = "gulp-htmlmin";

export default function gulpHtmlmin(options = {}) {
  return through.obj(async function (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, "Streaming not supported"));
    }

    try {
      const contents = file.contents.toString();
      const minified = await minify(contents, options);
      file.contents = Buffer.from(minified);
      cb(null, file);
    } catch (err) {
      cb(new PluginError(PLUGIN_NAME, err, { fileName: file.path }));
    }
  });
}
