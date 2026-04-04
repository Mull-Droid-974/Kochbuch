// Minimal Vercel deployment adapter for Next.js 16
// Generates .vercel/output/ using the Vercel Build Output API v3

'use strict'
const fs = require('fs')
const path = require('path')

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  let entries
  try {
    entries = fs.readdirSync(src, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true })
        fs.copyFileSync(srcPath, destPath)
      } catch {
        // ignore individual file errors
      }
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

    // ── 1. Static assets ─────────────────────────────────────────────────────
    // .next/static → .vercel/output/static/_next/static  (immutable chunks)
    const nextStaticSrc = path.join(distDir, 'static')
    if (fs.existsSync(nextStaticSrc)) {
      copyDir(nextStaticSrc, path.join(outputDir, 'static', '_next', 'static'))
    }

    // public/ → .vercel/output/static/  (favicon, images, etc.)
    const publicSrc = path.join(projectDir, 'public')
    if (fs.existsSync(publicSrc)) {
      copyDir(publicSrc, path.join(outputDir, 'static'))
    }

    // ── 2. Serverless function ────────────────────────────────────────────────
    const standaloneDir = path.join(distDir, 'standalone')
    if (!fs.existsSync(standaloneDir)) {
      throw new Error(
        '[vercel-adapter] .next/standalone not found – did "output: standalone" take effect?'
      )
    }

    const funcDir = path.join(outputDir, 'functions', 'index.func')
    fs.mkdirSync(funcDir, { recursive: true })

    // Copy standalone contents into the function directory.
    // Skip .next/static (already served as static asset above).
    for (const entry of fs.readdirSync(standaloneDir, { withFileTypes: true })) {
      const src = path.join(standaloneDir, entry.name)
      const dest = path.join(funcDir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name === '.next') {
          // Copy .next but omit the static subfolder to avoid duplication
          fs.mkdirSync(dest, { recursive: true })
          for (const sub of fs.readdirSync(src, { withFileTypes: true })) {
            if (sub.name === 'static') continue
            const subSrc = path.join(src, sub.name)
            const subDest = path.join(dest, sub.name)
            if (sub.isDirectory()) {
              copyDir(subSrc, subDest)
            } else {
              fs.mkdirSync(path.dirname(subDest), { recursive: true })
              fs.copyFileSync(subSrc, subDest)
            }
          }
        } else {
          copyDir(src, dest)
        }
      } else {
        fs.copyFileSync(src, dest)
      }
    }

    // Write the request handler that Vercel invokes for every HTTP request
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

    // Vercel function metadata
    fs.writeFileSync(
      path.join(funcDir, '.vc-config.json'),
      JSON.stringify(
        {
          runtime: 'nodejs20.x',
          handler: 'index.js',
          launcherType: 'Nodejs',
          shouldAddHelpers: true,
        },
        null,
        2
      )
    )

    // ── 3. Routing config ─────────────────────────────────────────────────────
    fs.writeFileSync(
      path.join(outputDir, 'config.json'),
      JSON.stringify(
        {
          version: 3,
          routes: [
            // Immutable hashed assets
            {
              src: '^/_next/static/(.+)$',
              headers: { 'cache-control': 'public, max-age=31536000, immutable' },
              continue: true,
            },
            // Serve files from /static/ before hitting the function
            { handle: 'filesystem' },
            // Everything else → Next.js handler
            { src: '^/(.*)$', dest: '/index' },
          ],
        },
        null,
        2
      )
    )

    console.log('[vercel-adapter] ✓ .vercel/output/ created successfully')
  },
}

module.exports = adapter
