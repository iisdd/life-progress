import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'

const KEEP_DAYS = 90
const DATE = /^\d{4}-\d{2}-\d{2}$/

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res: ServerResponse, code: number, body: unknown) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function prune(snapDir: string) {
  const files = fs
    .readdirSync(snapDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
  for (const extra of files.slice(KEEP_DAYS)) {
    fs.unlinkSync(path.join(snapDir, extra))
  }
}

function listSnaps(snapDir: string) {
  prune(snapDir)
  const files = fs
    .readdirSync(snapDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8')))
}

export function localDataPlugin(): Plugin {
  return {
    name: 'local-data',
    configureServer(server) {
      const dir = path.join(server.config.root, 'data')
      const snapDir = path.join(dir, 'snaps')
      fs.mkdirSync(snapDir, { recursive: true })
      const current = path.join(dir, 'current.json')

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (!url.startsWith('/api/')) {
          next()
          return
        }

        try {
          if (url === '/api/state' && req.method === 'GET') {
            if (!fs.existsSync(current)) {
              send(res, 404, { ok: false })
              return
            }
            send(res, 200, JSON.parse(fs.readFileSync(current, 'utf8')))
            return
          }
          if (url === '/api/state' && req.method === 'PUT') {
            const data = JSON.parse(await readBody(req))
            fs.writeFileSync(current, JSON.stringify(data, null, 2), 'utf8')
            send(res, 200, { ok: true, path: 'data/current.json' })
            return
          }
          if (url === '/api/snaps' && req.method === 'GET') {
            send(res, 200, { days: listSnaps(snapDir) })
            return
          }
          const one = url.match(/^\/api\/snaps\/(\d{4}-\d{2}-\d{2})$/)
          if (one && req.method === 'PUT' && DATE.test(one[1])) {
            const data = JSON.parse(await readBody(req))
            const file = path.join(snapDir, `${one[1]}.json`)
            fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
            send(res, 200, { days: listSnaps(snapDir) })
            return
          }
          send(res, 404, { ok: false })
        } catch (err) {
          send(res, 500, { ok: false, error: String(err) })
        }
      })
    },
  }
}
