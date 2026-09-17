import { readFileSync } from 'node:fs';
import ts from 'typescript';
export function loadProviderTs(path, dependencies={}) {
 const module={exports:{}};
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(name=>{if(!(name in dependencies))throw new Error(`Unexpected import ${name}`);return dependencies[name];},module,module.exports);
 return module.exports;
}
