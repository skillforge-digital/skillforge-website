import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const academyDir = path.join(root, 'academy');

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

if (!fs.existsSync(academyDir)) {
  process.stdout.write('fix_gate_src skipped academy_dir_missing\n');
  process.exit(0);
}

const files = walk(academyDir).filter((p) => p.endsWith('.html'));

let changedFiles = 0;
let totalReplacements = 0;

const pattern = /<script\s+type="module"\s+src="(\.\/|\.\.\/|\.\.\/\.\.\/|\.\.\/\.\.\/\.\.\/)gate\.js"><\/script>/g;

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const matches = before.match(pattern);
  const after = before.replace(pattern, '<script type="module" src="/academy/gate.js"></script>');
  if (after !== before) {
    totalReplacements += matches ? matches.length : 0;
    fs.writeFileSync(file, after, 'utf8');
    changedFiles += 1;
  }
}

process.stdout.write(`fix_gate_src changed_files=${changedFiles} replacements=${totalReplacements}\n`);

