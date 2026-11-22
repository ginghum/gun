import {mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
const files=['index.html','styles.css','src/app.js','src/engine.js','src/data.js'];let assets={};for(const f of files)assets['/'+f]=await readFile(f,'utf8');assets['/']=assets['/index.html'];
const clean=s=>s.replace(/^import .*?;\n/gm,'').replace(/^export \{.*?\};?\n/gm,'').replace(/export (?=(?:const|class|function|async function))/g,'');
const bundle=clean(await readFile('src/data.js','utf8'))+'\nconst CS=CHARACTERS,GS=GUNS;\n'+clean(await readFile('src/engine.js','utf8'))+'\n'+clean(await readFile('worker/rooms.js','utf8'))+'\nconst assets='+JSON.stringify(assets)+';\n'+clean(await readFile('worker/index.js','utf8'));
await writeFile('dist/server/index.js',bundle);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
