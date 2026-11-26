import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function localJsonPersistencePlugin(): Plugin {
  const registerJsonPost = (
    middlewares: { use: (route: string, fn: (req: any, res: any) => void) => void },
    route: string,
    relTarget: string
  ) => {
    middlewares.use(route, (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }
      let body = '';
      req.on('data', (chunk: Buffer | string) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const target = path.resolve(process.cwd(), relTarget);
          fs.writeFileSync(target, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, path: relTarget }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: String(err) }));
        }
      });
    });
  };

  return {
    name: 'local-json-persistence',
    configureServer(server) {
      registerJsonPost(server.middlewares, '/__save-scene-config', 'src/data/sceneConfig.json');
      registerJsonPost(server.middlewares, '/__save-chart-records', 'src/data/chartRecords.json');
    },
  };
}

export default defineConfig({
  plugins: [react(), localJsonPersistencePlugin()],
  optimizeDeps: {
    exclude: ['swisseph-wasm'],
  },
  server: {
    port: 5178,
    strictPort: false,
  },
});
