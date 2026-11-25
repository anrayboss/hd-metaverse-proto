import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function saveSceneConfigPlugin(): Plugin {
  return {
    name: 'save-scene-config',
    configureServer(server) {
      server.middlewares.use('/__save-scene-config', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const target = path.resolve(process.cwd(), 'src/data/sceneConfig.json');
            fs.writeFileSync(target, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, path: 'src/data/sceneConfig.json' }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), saveSceneConfigPlugin()],
  server: {
    port: 5178,
    strictPort: false,
  },
});
