// Vercel deployment adapter for Next.js 16
// Uses Vercel Build Output API v3 with per-route serverless functions.
// Each output (appPage / appRoute) becomes its own .func directory,
// which means we NEVER need the full NextNodeServer – we invoke the
// compiled per-route handler directly as the adapter API specifies.

'use strict'
const fs   = require('fs')
const path = require('path')

// ── helpers ──────────────────────────────────────────────────────────────────

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name)
    const d = path.join(dest, e.name)
    if (e.isDirectory()) copyDir(s, d)
    else try { copyFile(s, d) } catch { /* ignore */ }
  }
}

/**
 * Read an NTF trace file and add all referenced absolute paths to the set.
 * Returns a Map<relToProject, absPath>.
 */
function readNtf(nftPath, projectDir) {
  const map = new Map()
  if (!fs.existsSync(nftPath)) return map
  const { files } = JSON.parse(fs.readFileSync(nftPath, 'utf8'))
  const dir = path.dirname(nftPath)
  for (const f of files) {
    const abs = path.resolve(dir, f)
    const rel = path.relative(projectDir, abs)
    if (!rel.startsWith('..') && fs.existsSync(abs)) map.set(rel, abs)
  }
  return map
}

/**
 * Convert a Next.js pathname like /cookbooks/[id] to a Vercel source regex.
 * Also returns the function name (safe for directory names).
 */
function pathnameToFunc(pathname) {
  // Build a safe function dir name
  let name = pathname
    .replace(/^\//, '')              // strip leading /
    .replace(/\[\.\.\.(.+?)\]/g, '_$1_catchall')  // [...slug] → _slug_catchall
    .replace(/\[(.+?)\]/g, '_$1_')  // [id] → _id_
    .replace(/\//g, '--')            // / → --
    || 'index'

  // Build the Vercel route source regex
  let src = pathname
    .replace(/\[\.\.\.(.+?)\]/g, '(.+)')    // [...slug] → (.+)
    .replace(/\[(.+?)\]/g, '([^/]+)')       // [id] → ([^/]+)
    // escape dots, no other special chars expected in pathname
    .replace(/\./g, '\\.')

  src = `^${src}$`

  return { name, src }
}

// ── adapter ──────────────────────────────────────────────────────────────────

/** @type {import('next').NextAdapter} */
const adapter = {
  name: 'vercel-standalone',

  async onBuildComplete({ distDir, projectDir, outputs }) {
    console.log('[vercel-adapter] Building .vercel/output/ ...')

    const outDir = path.join(projectDir, '.vercel', 'output')
    fs.rmSync(outDir, { recursive: true, force: true })
    fs.mkdirSync(outDir, { recursive: true })

    // ── 1. Static assets ────────────────────────────────────────────────────
    copyDir(path.join(distDir, 'static'),   path.join(outDir, 'static', '_next', 'static'))
    copyDir(path.join(projectDir, 'public'), path.join(outDir, 'static'))

    // ── 2. Per-route serverless functions ────────────────────────────────────
    const routes = []   // entries for config.json
    const functionsDir = path.join(outDir, 'functions')

    const vcConfig = JSON.stringify(
      { runtime: 'nodejs20.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: true },
      null, 2
    )

    const allOutputs = [
      ...(outputs.appPages  || []),
      ...(outputs.appRoutes || []),
      ...(outputs.pages     || []),
      ...(outputs.pagesApi  || []),
    ]

    for (const out of allOutputs) {
      if (!out.filePath) continue

      const { name, src } = pathnameToFunc(out.pathname)
      const funcDir = path.join(functionsDir, name + '.func')

      // ── 2a. Collect files via NTF (deduplicated) ─────────────────────────
      // Start with the minimal server runtime (small, ~80 files)
      const fileMap = readNtf(
        path.join(distDir, 'next-minimal-server.js.nft.json'),
        projectDir
      )
      // Add this output's own NTF (Turbopack chunks + app-specific deps)
      for (const [k, v] of readNtf(out.filePath + '.nft.json', projectDir)) {
        fileMap.set(k, v)
      }
      // Add assets the adapter resolved for this output
      for (const [rel, abs] of Object.entries(out.assets || {})) {
        if (fs.existsSync(abs)) fileMap.set(rel, abs)
      }
      // The output file itself
      const relFile = path.relative(projectDir, out.filePath)
      fileMap.set(relFile, out.filePath)

      // ── 2b. Essential .next/ manifests ───────────────────────────────────
      for (const f of [
        'required-server-files.json', 'routes-manifest.json',
        'app-path-routes-manifest.json', 'build-manifest.json',
        'prerender-manifest.json', 'fallback-build-manifest.json',
        'images-manifest.json', 'package.json', 'BUILD_ID',
      ]) {
        const abs = path.join(distDir, f)
        if (fs.existsSync(abs)) fileMap.set(path.join('.next', f), abs)
      }
      // .next/server/ top-level manifests
      const srvDir = path.join(distDir, 'server')
      if (fs.existsSync(srvDir)) {
        for (const e of fs.readdirSync(srvDir, { withFileTypes: true })) {
          if (!e.isFile()) continue
          if (!e.name.endsWith('.json') && !e.name.endsWith('.js')) continue
          const abs = path.join(srvDir, e.name)
          fileMap.set(path.join('.next', 'server', e.name), abs)
        }
      }
      // project package.json
      const pkgAbs = path.join(projectDir, 'package.json')
      if (fs.existsSync(pkgAbs)) fileMap.set('package.json', pkgAbs)

      // ── 2c. Copy to function dir ─────────────────────────────────────────
      fs.mkdirSync(funcDir, { recursive: true })
      let n = 0
      for (const [rel, abs] of fileMap) {
        try { copyFile(abs, path.join(funcDir, rel)); n++ } catch { /* ignore */ }
      }
      console.log(`[vercel-adapter]  ${name} → ${n} files`)

      // ── 2d. Handler (invokes the compiled route handler directly) ─────────
      // Next.js 16 per-route handlers export:
      //   handler(req: IncomingMessage, res: ServerResponse, ctx) => Promise<void>
      const handlerImport = './' + relFile.replace(/\\/g, '/')
      fs.writeFileSync(path.join(funcDir, 'index.js'), `'use strict'
process.env.NODE_ENV = 'production'
process.chdir(__dirname)

// Set up Next.js node env extensions
try { require('next/dist/server/node-environment-baseline.js') } catch {}
try { require('next/dist/server/require-hook.js') } catch {}

const mod = require(${JSON.stringify(handlerImport)})
// The module may export { handler } or export the handler directly
const fn = mod.handler || mod.default || mod

module.exports = async function(req, res) {
  await fn(req, res, { requestMeta: { relativeProjectDir: '.' } })
}
`)

      fs.writeFileSync(path.join(funcDir, '.vc-config.json'), vcConfig)

      // ── 2e. Add route ─────────────────────────────────────────────────────
      routes.push({ src, dest: `/${name}` })
    }

    // ── 3. Middleware function ────────────────────────────────────────────────
    if (outputs.middleware) {
      const mid = outputs.middleware
      const midDir = path.join(functionsDir, 'middleware.func')
      fs.mkdirSync(midDir, { recursive: true })

      const midMap = readNtf(mid.filePath + '.nft.json', projectDir)
      for (const [k, v] of readNtf(path.join(distDir, 'next-minimal-server.js.nft.json'), projectDir)) {
        midMap.set(k, v)
      }
      for (const [rel, abs] of Object.entries(mid.assets || {})) {
        if (fs.existsSync(abs)) midMap.set(rel, abs)
      }
      const relMid = path.relative(projectDir, mid.filePath)
      midMap.set(relMid, mid.filePath)

      for (const [rel, abs] of midMap) {
        try { copyFile(abs, path.join(midDir, rel)) } catch {}
      }

      const midImport = './' + relMid.replace(/\\/g, '/')
      fs.writeFileSync(path.join(midDir, 'index.js'), `'use strict'
process.env.NODE_ENV = 'production'
process.chdir(__dirname)
try { require('next/dist/server/node-environment-baseline.js') } catch {}
try { require('next/dist/server/require-hook.js') } catch {}
const mod = require(${JSON.stringify(midImport)})
const fn = mod.handler || mod.default || mod
module.exports = async function(req, res) {
  await fn(req, res, { requestMeta: { relativeProjectDir: '.' } })
}
`)
      fs.writeFileSync(path.join(midDir, '.vc-config.json'), vcConfig)
    }

    // ── 4. Vercel routing config ──────────────────────────────────────────────
    fs.writeFileSync(
      path.join(outDir, 'config.json'),
      JSON.stringify({
        version: 3,
        routes: [
          // Immutable static chunks
          { src: '^/_next/static/(.+)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
          // Serve public/ files from filesystem first
          { handle: 'filesystem' },
          // Per-route functions (most specific first)
          ...routes.sort((a, b) => b.src.length - a.src.length),
          // Fallback 404
          { src: '^/(.*)$', dest: '/index' },
        ],
      }, null, 2)
    )

    console.log(`[vercel-adapter] ✓ ${routes.length} routes, .vercel/output/ ready`)
  },
}

module.exports = adapter
