// Vercel deployment adapter for Next.js 16
// Vercel Build Output API v3 – single catch-all Node.js function.
// Routes are matched inside the function itself (no NextNodeServer needed).

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

function readNtf(nftPath, projectDir, map) {
  if (!fs.existsSync(nftPath)) return
  const { files } = JSON.parse(fs.readFileSync(nftPath, 'utf8'))
  const dir = path.dirname(nftPath)
  for (const f of files) {
    const abs = path.resolve(dir, f)
    const rel = path.relative(projectDir, abs)
    if (!rel.startsWith('..') && fs.existsSync(abs)) map.set(rel, abs)
  }
}

// Convert a Next.js pathname (/cookbooks/[id]) to a JS regex string
function pathnameToRegex(pathname) {
  const esc = pathname
    .replace(/\[\.\.\.(.+?)\]/g, '(.+)')
    .replace(/\[(.+?)\]/g, '([^/]+)')
    .replace(/\./g, '\\.')
  return `^${esc}(?:\\?.*)?$`
}

// ── adapter ──────────────────────────────────────────────────────────────────

/** @type {import('next').NextAdapter} */
const adapter = {
  name: 'vercel-standalone',

  async onBuildComplete({ distDir, projectDir, outputs }) {
    console.log('[vercel-adapter] Building .vercel/output/ …')

    const outDir = path.join(projectDir, '.vercel', 'output')
    fs.rmSync(outDir, { recursive: true, force: true })
    fs.mkdirSync(outDir, { recursive: true })

    // ── 1. Static assets ────────────────────────────────────────────────────
    copyDir(path.join(distDir, 'static'),    path.join(outDir, 'static', '_next', 'static'))
    copyDir(path.join(projectDir, 'public'), path.join(outDir, 'static'))

    // ── 2. Single catch-all function ─────────────────────────────────────────
    const funcDir = path.join(outDir, 'functions', 'index.func')
    fs.mkdirSync(funcDir, { recursive: true })

    // Collect files – union of all output NTF traces (Map deduplicates)
    const fileMap = new Map()

    // Minimal server runtime
    readNtf(path.join(distDir, 'next-minimal-server.js.nft.json'), projectDir, fileMap)

    const allOutputs = [
      ...(outputs.appPages   || []),
      ...(outputs.appRoutes  || []),
      ...(outputs.pages      || []),
      ...(outputs.pagesApi   || []),
      ...(outputs.middleware ? [outputs.middleware] : []),
    ]

    // Route table embedded into the handler (no NextNodeServer needed)
    const routeEntries = []

    for (const out of allOutputs) {
      if (!out.filePath) continue

      // NTF for this output (Turbopack chunks + app-specific deps)
      readNtf(out.filePath + '.nft.json', projectDir, fileMap)

      // Pre-resolved assets from adapter
      for (const [rel, abs] of Object.entries(out.assets || {})) {
        if (fs.existsSync(abs)) fileMap.set(rel, abs)
      }

      // The compiled handler file itself
      const relFile = path.relative(projectDir, out.filePath)
      fileMap.set(relFile, out.filePath)

      // Only app pages / routes get routes (skip middleware)
      if (out.type !== 'MIDDLEWARE') {
        routeEntries.push({
          regex: pathnameToRegex(out.pathname),
          file:  './' + relFile.replace(/\\/g, '/'),
          pathname: out.pathname,
        })
      }
    }

    // Essential .next/ manifests
    for (const f of [
      'required-server-files.json', 'routes-manifest.json',
      'app-path-routes-manifest.json', 'build-manifest.json',
      'prerender-manifest.json', 'fallback-build-manifest.json',
      'images-manifest.json', 'package.json', 'BUILD_ID',
    ]) {
      const abs = path.join(distDir, f)
      if (fs.existsSync(abs)) fileMap.set(path.join('.next', f), abs)
    }

    // .next/server/ top-level files
    const srvDir = path.join(distDir, 'server')
    if (fs.existsSync(srvDir)) {
      for (const e of fs.readdirSync(srvDir, { withFileTypes: true })) {
        if (!e.isFile()) continue
        if (!e.name.endsWith('.json') && !e.name.endsWith('.js')) continue
        fileMap.set(path.join('.next', 'server', e.name), path.join(srvDir, e.name))
      }
    }

    // project package.json
    const pkgAbs = path.join(projectDir, 'package.json')
    if (fs.existsSync(pkgAbs)) fileMap.set('package.json', pkgAbs)

    // Copy everything
    let copied = 0
    for (const [rel, abs] of fileMap) {
      try { copyFile(abs, path.join(funcDir, rel)); copied++ } catch { /* ignore */ }
    }
    console.log(`[vercel-adapter] Copied ${copied} files into index.func`)

    // ── 3. Handler with embedded routing ─────────────────────────────────────
    const routesJson = JSON.stringify(
      routeEntries.map(r => ({ regex: r.regex, file: r.file, pathname: r.pathname })),
      null, 2
    )

    fs.writeFileSync(path.join(funcDir, 'index.js'), `'use strict'
process.env.NODE_ENV = 'production'
process.chdir(__dirname)

// Boot Next.js node environment
try { require('next/dist/server/node-environment-baseline.js') } catch (e) { console.warn('env-baseline:', e.message) }
try { require('next/dist/server/require-hook.js') }             catch (e) { console.warn('require-hook:', e.message) }
try { require('next/dist/build/adapter/setup-node-env.external.js') } catch (e) { console.warn('setup-node-env:', e.message) }

// Expose request context so lib/supabase/server.ts can read cookies
const { AsyncLocalStorage } = require('async_hooks')
if (!global.__adapterStorage) global.__adapterStorage = new AsyncLocalStorage()

const ROUTES = ${routesJson}

const cache = {}
async function getHandler(file) {
  if (!cache[file]) {
    const mod = require(file)
    cache[file] = mod.handler || mod.default || mod
  }
  return cache[file]
}

module.exports = async function handler(req, res) {
  const raw      = req.url || '/'
  const pathname = raw.split('?')[0] || '/'

  for (const route of ROUTES) {
    if (new RegExp(route.regex).test(pathname)) {
      return global.__adapterStorage.run({ req, res }, async () => {
        try {
          const fn = await getHandler(route.file)
          return await fn(req, res, { requestMeta: { relativeProjectDir: '.' } })
        } catch (err) {
          console.error('[handler]', route.pathname, err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.end('Internal Server Error')
          }
        }
      })
    }
  }

  res.statusCode = 404
  res.end('Not found')
}
`)

    fs.writeFileSync(
      path.join(funcDir, '.vc-config.json'),
      JSON.stringify({ runtime: 'nodejs20.x', handler: 'index.js', launcherType: 'Nodejs', shouldAddHelpers: true }, null, 2)
    )

    // ── 4. Vercel routing config ──────────────────────────────────────────────
    fs.writeFileSync(
      path.join(outDir, 'config.json'),
      JSON.stringify({
        version: 3,
        routes: [
          { src: '^/_next/static/(.+)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
          { handle: 'filesystem' },
          { src: '^/(.*)$', dest: '/index' },
        ],
      }, null, 2)
    )

    console.log(`[vercel-adapter] ✓ 1 function, ${routeEntries.length} routes`)
  },
}

module.exports = adapter
