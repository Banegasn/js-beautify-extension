if (process.argv.length < 3) { console.error("Usage: node test/benchmark.cjs OLD_BUNDLE [NEW_BUNDLE]"); process.exit(1); }
const fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
function bench(file){
 const source=fs.readFileSync(file,'utf8'); const load=new vm.Script(`(function(require,module,exports){${source}\n})`).runInThisContext();
 const times=[];
 for(let i=0;i<1200;i++){const m={exports:{}}; const start=performance.now();load(name=>name==='vscode'?{}:require(name),m,m.exports);if(i>=200)times.push(performance.now()-start);}
 times.sort((a,b)=>a-b);return {bytes:Buffer.byteLength(source),medianInitializationMs:times[500]};
}
const result={baseline:bench(process.argv[2]),updated:bench(process.argv[3] || 'dist/extension.js'),method:'1000 warm-process bundle initializations after 200 warmups; excludes parsing, activation and first format'};
console.log(JSON.stringify(result, null, 2));
