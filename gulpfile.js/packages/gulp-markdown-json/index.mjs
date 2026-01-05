import path from "node:path";
import through from "through2";
import PluginError from "plugin-error";
import replaceExt from "replace-ext";

const PLUGIN_NAME = "gulp-markdown-json";

export default function gulpMarkdownJson(options = {}) {
  const { renderer } = options;

  if (!renderer || typeof renderer.parse !== "function") {
    throw new PluginError(
      PLUGIN_NAME,
      "A renderer with a parse method is required"
    );
  }

  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, "Streaming not supported"));
    }

    try {
      const contents = file.contents.toString();

      // Extract front matter if present (YAML between --- delimiters)
      let frontMatter = {};
      let markdown = contents;

      const fmMatch = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (fmMatch) {
        // Simple YAML parsing for common front matter patterns
        const yamlContent = fmMatch[1];
        markdown = fmMatch[2];

        yamlContent.split(/\r?\n/).forEach((line) => {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim();
            let value = line.substring(colonIdx + 1).trim();

            // Remove surrounding quotes if present
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1);
            }

            // Try to parse as number or boolean
            if (value === "true") value = true;
            else if (value === "false") value = false;
            else if (!isNaN(value) && value !== "") value = Number(value);

            frontMatter[key] = value;
          }
        });
      }

      // Parse markdown to HTML
      const body = renderer.parse(markdown);
      const basename = path.basename(file.path, path.extname(file.path));

      // Create JSON output
      const result = {
        ...frontMatter,
        slug: basename,
        body
      };

      file.contents = Buffer.from(JSON.stringify(result, null, 2));
      file.path = replaceExt(file.path, ".json");

      cb(null, file);
    } catch (err) {
      cb(new PluginError(PLUGIN_NAME, err, { fileName: file.path }));
    }
  });
}
