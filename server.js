// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Create plain HTTP server
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Attach Socket.io
  const io = new Server(httpServer);

  // Import our socket server logic
  // We dynamically import it because it's compiled as a module inside the Next app
  // or because ts-node is not running here, so we must rely on Node natively.
  // Wait, Next.js 'app' doesn't compile ts files for Node runtime easily if we just require src/lib/socket.
  // Actually, wait! The prompt says: "import and register all socket event handlers from src/lib/socket/socketServer.ts"
  // Let's use dynamic import since we are in ES modules era or require if it's CJS. But Next.js uses TS. 
  // Node doesn't natively execute TS imports unless we use ts-node or tsx or next compiles it.
  // To load a TS file in a raw Node.js script, we can register ts-node, or dynamically import if Node 22 supports it.
  // Let me just require('ts-node/register') or create the socketServer as standard JS? 
  // The prompt explicitly states: "import and register all socket event handlers from src/lib/socket/socketServer.ts".
  // Let me require the compiled output, or just use tsx?
  // Let's use dynamically evaluated require with tsx, but let's just create socketServer.ts and see if Node loads it natively via esbuild-register/ts-node. 
  // Next.js package exposes some helpers but not direct TS execution. We might have to install `ts-node` or `tsx`? 
  // Actually, we can just use `npm i tsx` or `ts-node` globally or locally, OR we can write socketServer.ts and just compile it, OR Next.js doesn't actually compile server files like that natively.
  // Let me just `require('ts-node/register')` if present, but wait, maybe I should just write `src/lib/socket/socketServer.ts` and use `ts-node` to run server.js?
  // Wait, I can just write socketServer as a TS file, and in `server.js` I can just use Next's experimental `server.js` support, but wait! Next handles requests. We are running `node server.js`.
  // To require TS from JS: I'll use `require('dotenv').config()` then dynamic import? No, node natively doesn't compile TS.
  // Wait, if I change `"dev": "node --import tsx server.js"`? The prompt asked explicitly: `"dev" to "node server.js"`. So it must be exactly exactly that.
  // If we run `node server.js`, we can't `require('./src/lib/socket/socketServer.ts')` unless node understands TS. Next.js 14 doesn't magically make `node` understand TS.
  // BUT we can just do a dynamic import of the compiled version... wait, in dev there is no compiled version of server files standalone!
  // Wait, if I do `require('ts-node/register/transpile-only')` it will work if `ts-node` is installed. 
  // Let me install `tsx` or `ts-node` and do `require('tsx/cjs')` at the top.
  // OR I can just rename it to `socketServer.ts` but inside write plain JS if Next complains? No, prompt says ".ts".
  // Actually, let me install `ts-node` just in case. 
  require('tsx/cjs');
  const { initSocketServer } = require('./src/lib/socket/socketServer');
  initSocketServer(io);

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
