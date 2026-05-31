import fs from 'fs';
import path from 'path';

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else if (filepath.endsWith('.astro')) {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const files = walkSync('src/pages');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('client:only="react"')) {
    content = content.replace(/client:only="react"/g, 'client:load');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated client:only to client:load in ${file}`);
  }
}
