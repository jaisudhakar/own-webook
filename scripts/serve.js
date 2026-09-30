// Zero-dependency static server for running WeBook in a browser.
// Usage: node scripts/serve.js [port] [--open]   (default port 8080)
//   --open  also opens the book in your default browser
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const args = process.argv.slice(2);
const openBrowser = args.includes('--open');
const port = Number(args.find((a) => /^\d+$/.test(a)) || process.env.PORT || 8080);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json'
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`WeBook is running at ${url}  (Ctrl+C to stop)`);
  if (openBrowser) {
    const cmd = process.platform === 'win32' ? `start "" "${url}"`
      : process.platform === 'darwin' ? `open "${url}"`
      : `xdg-open "${url}"`;
    exec(cmd, (err) => { if (err) console.log(`Open ${url} in your browser.`); });
  }
});
