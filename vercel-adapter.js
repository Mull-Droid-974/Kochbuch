// Minimal Vercel deployment adapter for Next.js 16
// Uses Vercel Build Output API v3
// Bundles only what's actually needed via NTF traces + adapter outputs

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
    if (entry.isDirectory()) copyDir(s, d)
    else try { copyFile(s, d) } catch { /* ignore */ }
  }
}

/**
 * Read an NTF trace file and add all referenced files to the map.
 * Map key = dest rel path (from projectDir), value = absolute src path.
 */
function addNtfTrace(nftPath, projectDir, map) {
  if (!fs.existsSync(nftPath)) return
  const { files } = JSON.parse(fs.readFileSync(nftPath, 'utf8'))
  const nftDir = path.dirname(nftPath)
  for (const relFile of files) {
    const abs = path.resolve(nftDir, relFile)
    const rel = path.relative(projectDir, abs)
    if (!rel.startsWith('..') && fs.existsSync(abs)) {
      map.set(rel, abs)
    }
  }
}

/** @type {import('next').NextAdapter} */
const adapter = {
  name: 'vercel-standalone',

  async onBuildComplete({ distDir, projectDir, outputs }) {
    console.log('[vercel-adapter] Building Vercel output...')

    const outputDir = path.join(projectDir, '.vercel', 'output')
    fs.rmSync(outputDir, { recursive: true, force: true })
    fs.mkdirSync(outputDir, { recursive: true })

    // ── 1. Static assets ──────────────────────────────────────────────────────
    copyDir(path.join(distDir, 'static'), path.join(outputDir, 'static', '_next', 'static'))
    copyDir(path.join(projectDir, 'public'), path.join(outputDir, 'static'))

    // ── 2. Build file map (deduplication via Map) ─────────────────────────────
    const fileMap = new Map() // rel-to-projectDir → absolute src path

    // 2a. Minimal Next.js server runtime
    addNtfTrace(path.join(distDir, 'next-minimal-server.js.nft.json'), projectDir, fileMap)

    // 2b. Middleware/proxy NTF
    addNtfTrace(path.join(distDir, 'server', 'middleware.js.nft.json'), projectDir, fileMap)

    // 2c. All build outputs (appPages, appRoutes, pages, pagesApi, middleware)
    const allOutputs = [
      ...(outputs.appPages   || []),
      ...(outputs.appRoutes  || []),
      ...(outputs.pages      || []),
      ...(outputs.pagesApi   || []),
      ...(outputs.middleware ? [outputs.middleware] : []),
    ]

    for (const out of allOutputs) {
      // The compiled handler file
      if (out.filePath && fs.existsSync(out.filePath)) {
        fileMap.set(path.relative(projectDir, out.filePath), out.filePath)
        // Its own NTF trace (page-specific deps: supabase, anthropic, etc.)
        addNtfTrace(out.filePath + '.nft.json', projectDir, fileMap)
      }

      // Assets already resolved by Next.js for this output
      for (const [rel, abs] of Object.entries(out.assets || {})) {
        if (fs.existsSync(abs)) fileMap.set(rel, abs)
      }
    }

    // 2d. Essential .next/ manifests (routing, config, build info)
    const manifests = [
      'required-server-files.json',
      'routes-manifest.json',
      'app-path-routes-manifest.json',
      'build-manifest.json',
      'prerender-manifest.json',
      'fallback-build-manifest.json',
      'images-manifest.json',
      'package.json',
      'BUILD_ID',
    ]
    for (const f of manifests) {
      const abs = path.join(distDir, f)
      if (fs.existsSync(abs)) fileMap.set(path.join('.next', f), abs)
    }

    // 2e. .next/server/ top-level manifests (JSON + JS, not subdirectories)
    const serverDir = path.join(distDir, 'server')
    if (fs.existsSync(serverDir)) {
      for (const entry of fs.readdirSync(serverDir, { withFileTypes: true })) {
        if (!entry.isFile()) continue
        if (!entry.name.endsWith('.json') && !entry.name.endsWith('.js')) continue
        const abs = path.join(serverDir, entry.name)
        fileMap.set(path.join('.next', 'server', entry.name), abs)
      }
    }

    // 2f. project package.json (Next.js server reads it for module resolution)
    const pkgAbs = path.join(projectDir, 'package.json')
    if (fs.existsSync(pkgAbs)) fileMap.set('package.json', pkgAbs)

    // ── 3. Copy collected files into the function directory ───────────────────
    const funcDir = path.join(outputDir, 'functions', 'index.func')
    fs.mkdirSync(funcDir, { recursive: true })

    let copied = 0
    for (const [rel, abs] of fileMap) {
      try { copyFile(abs, path.join(funcDir, rel)); copied++ } catch { /* ignore */ }
    }
    console.log(`[vercel-adapter] Copied ${copied} files`)

    // ── 4. Request handler ────────────────────────────────────────────────────
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

    fs.writeFileSync(
      path.join(funcDir, '.vc-config.json'),
      JSON.stringify({ runtime: 'nodejs20.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: true }, null, 2)
    )

    // ── 5. Vercel routing config ──────────────────────────────────────────────
    fs.writeFileSync(
      path.join(outputDir, 'config.json'),
      JSON.stringify({
        version: 3,
        routes: [
          { src: '^/_next/static/(.+)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
          { handle: 'filesystem' },
          { src: '^/(.*)$', dest: '/index' },
        ],
      }, null, 2)
    )

    console.log('[vercel-adapter] ✓ .vercel/output/ ready')
  },
}

module.exports = adapter
