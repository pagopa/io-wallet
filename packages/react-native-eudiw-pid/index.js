// This is a workaround to enhance compatibility of the package
// Some builder (i.e. vitest) fails to interpret the main entrypoint of the package when defined in the package.json
// As the default entrypoint is a "index.js" file in the root of the package, by creating this file we do not have to define a "main" field in package.json
//   so that engines don't mess.
// Remember to include such file in the "files" field of package.json aliongside with files in /dist
// eslint-disable-next-line functional/immutable-data
module.exports = require("./dist/index.js");
