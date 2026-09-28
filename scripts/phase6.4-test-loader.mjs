import { readFileSync } from 'node:fs';
import ts from 'typescript';
export function loadTs(path, dependencies) {
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(
    (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
      return dependencies[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}
export function frontendApi() {
  const config = loadTs('lib/apiConfig.ts', {
    'expo-constants': { __esModule: true, default: {} },
    'react-native': { Platform: { OS: 'web' } },
  });
  const client = loadTs('services/api/client.ts', { '@/lib/apiConfig': config });
  const api = loadTs('services/api/backendApi.ts', { '@/services/api/client': client });
  return { config, client, api };
}
