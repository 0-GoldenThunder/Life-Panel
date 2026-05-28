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
  // We can keep index.astro as client:load if we want the login screen to SSR,
  // but if the user wants to eliminate ALL hydration errors, it's safer to just 
  // make all highly dynamic components client:only. 
  // We'll skip index.astro just to be safe so the initial load is snappy.
  if (file.endsWith('index.astro')) continue;

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('client:load')) {
    content = content.replace(/client:load/g, 'client:only="react"');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated client:load to client:only="react" in ${file}`);
  }
}
