const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const SRC = __dirname
const DIST = path.join(__dirname, 'dist')
const FAVICON = path.join(SRC, '..', 'favicon-donkey.png')
const ICONS_SRC = path.join(SRC, 'icons')

const EXCLUDE = new Set(['dist', 'build.js', 'package.json', 'package-lock.json', 'node_modules', '.DS_Store', 'icons'])

// ── Icon generation ──────────────────────────────────────────────────────────

async function generateIcons() {
  if (!fs.existsSync(FAVICON)) {
    throw new Error('favicon-donkey.png not found at project root')
  }
  fs.mkdirSync(ICONS_SRC, { recursive: true })
  for (const size of [16, 32]) {
    const dest = path.join(ICONS_SRC, `icon${size}.png`)
    await sharp(FAVICON).resize(size, size).png().toFile(dest)
    console.log(`  icon${size}.png (resized)`)
  }
  for (const size of [48, 128]) {
    const dest = path.join(ICONS_SRC, `icon${size}.png`)
    fs.copyFileSync(FAVICON, dest)
    console.log(`  icon${size}.png (original)`)
  }
}

// ── File copy ────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE.has(entry.name)) continue
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

function copyIcons(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const size of [16, 32, 48, 128]) {
    const file = `icon${size}.png`
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file))
  }
}

// ── Build ────────────────────────────────────────────────────────────────────

async function build() {
  console.log('donkey build starting...')

  console.log('\ngenerating icons from favicon-donkey.png:')
  await generateIcons()

  console.log('\ncopying to dist/')
  fs.rmSync(DIST, { recursive: true, force: true })
  copyDir(SRC, DIST)
  copyIcons(ICONS_SRC, path.join(DIST, 'icons'))

  console.log('\ndist/ is ready — load donkey-extension/dist as an unpacked Chrome extension.')
}

build().catch(err => { console.error(err.message); process.exit(1) })
