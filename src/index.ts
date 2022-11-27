import { chartRequest } from './DataCompiler'

import http from 'http'
import fs from 'fs'
import urlUtil from 'url'
const hostname = '127.0.0.1'
const port = 3215
const cwd = process.cwd()

function main (): void {
  const server = http.createServer((req: any, res: any) => {
    res.statusCode = 200

    console.log('URL=' + req.url)
    const urlinfo = urlUtil.parse(req.url, true)

    const URL: string = urlinfo.pathname == null ? '' : urlinfo.pathname
    const args = urlinfo.query

    if (URL == '/') {
      const data: string = index().toString()
      res.setHeader('Content-Type', 'text/html')
      res.write(data)

      res.end('\n')
    } else if (URL.startsWith('/file/')) {
      const filename: string = URL.substring('/file/'.length)

      if (filename.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css')
      } else if (filename.endsWith('.js')) {
        res.setHeader('Content-Type', 'text/javascript')
      } else {
        res.setHeader('Content-Type', 'text/plain')
      }

      const data = fs.readFileSync(cwd + '/static/' + filename)
      res.write(data)

      res.end('\n')
    } else if (URL == '/getGraph.json') {
      const ticker = String(args.ticker)
      const data = String(args.data)

      const listdata: string[][] = JSON.parse(decodeURIComponent(data))

      const promises = chartRequest(ticker, listdata)
      for (const prom_ of promises) {
        prom_.then((buffer: Buffer) => {
          res.write(buffer)
          res.end('')
        })
      }
    } else if (URL == '/favicon.ico') {
      res.end('\n')
    } else {
      throw new Error('Unknown query')
    }
  })

  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`)
  })
}

function index (): Buffer {
  return fs.readFileSync(cwd + '/static/index.html')
}

main()
