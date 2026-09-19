/* Does a dictionary hold these exact keys?

       node tools/locales/haskey.js de "All" "Website features"
*/
const fs = require('fs');
const path = require('path');

const code = process.argv[2] || 'de';
const src = fs.readFileSync(
  path.join(__dirname, '..', '..', 'assets', 'i18n', code + '.js'), 'utf8');

const have = new Set();
for (const m of src.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)) {
  have.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
}

for (const want of process.argv.slice(3)) {
  console.log((have.has(want) ? 'HAVE' : 'MISS').padEnd(5) + JSON.stringify(want));
}
