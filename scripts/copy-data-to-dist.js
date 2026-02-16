const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source directory not found: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
      console.log(`  ✓ ${entry}`);
    }
  }
}

const src = path.resolve(__dirname, "..", "data");
const dest = path.resolve(__dirname, "..", "dist", "data");

console.log("📦 Copying datasets to dist...");
copyDir(src, dest);
console.log(`✅ Datasets copied: ${src} -> ${dest}`);
