import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(root).filter((p) => p.endsWith('.html'));

let changedFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replaceAll('3.93$.502', '3.93-.502');
  if (after !== before) {
    const count = (before.match(/3\.93\$\.\d+/g) || []).length;
    totalReplacements += count;
    fs.writeFileSync(file, after, 'utf8');
    changedFiles += 1;
  }
}

process.stdout.write(`fixed_youtube_svg changed_files=${changedFiles} replacements=${totalReplacements}\n`);

