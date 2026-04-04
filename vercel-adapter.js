// Minimal Vercel deployment adapter for Next.js 16
// Generates .vercel/output/ using the Vercel Build Output API v3
// Uses NTF trace files (.nft.json) to bundle only required dependencies

'use strict'
const fs = require('fs')
const path = require('path')

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(s, d)
    } else {
      try { copyFile(s, d) } catch { /* ignore */ }
    }
  }
}

/** @type {import('next').NextAdapter} */
const adapter = {
  name: 'vercel-standalone',

  async onBuildComplete({ distDir, projectDir }) {
    console.log('[vercel-adapter] Building Vercel output...')

    const outputDir = path.join(projectDir, '.vercel', 'output')
    fs.rmSync(outputDir, { recursive: true, force: true })
    fs.mkdirSync(outputDir, { recursive: true })

    // ── 1. Static assets ──────────────────────────────────────────────────────
    // .next/static → .vercel/output/static/_next/static
    copyDir(path.join(distDir, 'static'), path.join(outputDir, 'static', '_next', 'static'))
    // public/ → .vercel/output/static/
    copyDir(path.join(projectDir, 'public'), path.join(outputDir, 'static'))

    // ── 2. Serverless function ────────────────────────────────────────────────
    const funcDir = path.join(outputDir, 'functions', 'index.func')
    fs.mkdirSync(funcDir, { recursive: true })

    // 2a. Copy .next build output (server-side) into funcDir/.next/
    //     Skip: cache (huge), static (already served above)
    const nextDest = path.join(funcDir, '.next')
    fs.mkdirSync(nextDest, { recursive: true })
    for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
      if (entry.name === 'cache' || entry.name === 'static') continue
      const src = path.join(distDir, entry.name)
      const dest = path.join(nextDest, entry.name)
      if (entry.isDirectory()) {
        copyDir(src, dest)
      } else {
        try { copyFile(src, dest) } catch { /* ignore */ }
      }
    }

    // 2b. Copy traced dependencies via next-server.js.nft.json
    //     This is the minimal set of files needed to run the Next.js server.
    const nftPath = path.join(distDir, 'next-server.js.nft.json')
    if (fs.existsSync(nftPath)) {
      const { files } = JSON.parse(fs.readFileSync(nftPath, 'utf8'))
      const nftDir = path.dirname(nftPath) // = distDir

      let copied = 0
      for (const relFile of files) {
        const absFile = path.resolve(nftDir, relFile)
        const relToProject = path.relative(projectDir, absFile)
        if (relToProject.startsWith('..')) continue // outside project root
        const dest = path.join(funcDir, relToProject)
        if (fs.existsSync(absFile)) {
          try {
            copyFile(absFile, dest)
            copied++
          } catch { /* ignore */ }
        }
      }
      console.log(`[vercel-adapter] Copied ${copied} traced dependencies`)
    } else {
      console.warn('[vercel-adapter] WARNING: next-server.js.nft.json not found, copying full node_modules')
      copyDir(path.join(projectDir, 'node_modules'), path.join(funcDir, 'node_modules'))
    }

    // 2c. Copy package.json (Next.js server needs it)
    const pkgSrc = path.join(projectDir, 'package.json')
    if (fs.existsSync(pkgSrc)) {
      copyFile(pkgSrc, path.join(funcDir, 'package.json'))
    }

    // 2d. Write the request handler
    fs.writeFileSync(
      path.join(funcDir, 'index.js'),
      `'use strict'
process.env.NODE_ENV = 'production'
process.chdir(__dirname)

const { default: NextNodeServer } = require('next/dist/server/next-server')
const conf = require('./.next/required-server-files.json').config

let _handler
async function getHandler() {
  if (_handler) return _handler
  const server = new NextNodeServer({ dir: __dirname, dev: false, conf })
  _handler = server.getRequestHandler()
  return _handler
}

module.exports = async function handler(req, res) {
  const h = await getHandler()
  await h(req, res)
}
`
    )

    // 2e. Write Vercel function metadata
    fs.writeFileSync(
      path.join(funcDir, '.vc-config.json'),
      JSON.stringify(
        { runtime: 'nodejs20.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: true },
        null, 2
      )
    )

    // ── 3. Vercel routing config ──────────────────────────────────────────────
    fs.writeFileSync(
      path.join(outputDir, 'config.json'),
      JSON.stringify(
        {
          version: 3,
          routes: [
            { src: '^/_next/static/(.+)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
            { handle: 'filesystem' },
            { src: '^/(.*)$', dest: '/index' },
          ],
        },
        null, 2
      )
    )

    console.log('[vercel-adapter] ✓ .vercel/output/ created')
  },
}

module.exports = adapter
