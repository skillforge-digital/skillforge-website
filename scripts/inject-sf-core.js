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
  process.stdout.write('inject_sf_core skipped academy_dir_missing\n');
  process.exit(0);
}

const files = walk(academyDir).filter((p) => p.endsWith('.html'));

const sfCoreTag = '<script type="module" src="/assets/sf-core.js"></script>';

let changedFiles = 0;
let totalInsertions = 0;

for (const file of files) {
  const base = path.basename(file);
  if (base === 'gate.html') continue;

  const before = fs.readFileSync(file, 'utf8');
  if (before.includes('/assets/sf-core.js') || before.includes('SkillForgeCore')) continue;

  let after = before;
  if (after.includes('<script type="module" src="/academy/gate.js"></script>')) {
    after = after.replace(
      '<script type="module" src="/academy/gate.js"></script>',
      `${sfCoreTag}\n<script type="module" src="/academy/gate.js"></script>`
    );
  } else if (after.includes('</body>')) {
    after = after.replace('</body>', `${sfCoreTag}\n</body>`);
  } else {
    continue;
  }

  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changedFiles += 1;
    totalInsertions += 1;
  }
}

process.stdout.write(`inject_sf_core changed_files=${changedFiles} insertions=${totalInsertions}\n`);

