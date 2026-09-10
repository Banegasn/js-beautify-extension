if (process.argv.length < 4) { console.error("Usage: node test/compare-corpus.cjs OLD_ENGINE SOURCE_REPO [SOURCE_REPO...]"); process.exit(1); }
const fs=require('node:fs'),cp=require('node:child_process');
const old=require(require('node:path').resolve(process.argv[2])),current=require('js-beautify');
const options={templating:['angular'],indent_handlebars:true,wrap_attributes:'preserve',wrap_line_length:140,indent_size:4};
const report={total:0,changes:{},examples:[]};
for(const root of process.argv.slice(3)) {
 const paths=cp.execFileSync('rg',['--files',root,'-g','*.html','-g','*.ts','-g','*.js','-g','*.css','-g','*.scss'],{maxBuffer:20e6}).toString().trim().split('\n');
 for(const path of paths) {
  const kind=path.endsWith('.html')?'html':/\.(css|scss)$/.test(path)?'css':'js';
  const input=fs.readFileSync(path,'utf8');if(input.length>200000)continue;
  const a=old[kind](input,options),b=current[kind](input,options);report.total++;
  if(a!==b){report.changes[kind]=(report.changes[kind]||0)+1;if(report.examples.length<8)report.examples.push(path);}
 }
}
console.log(JSON.stringify(report, null, 2));
if (Object.keys(report.changes).length) process.exitCode = 1;
