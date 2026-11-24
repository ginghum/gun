import {test} from 'node:test';import assert from 'node:assert/strict';import {handle} from '../worker/rooms.js';
class MemoryBucket{map=new Map();async get(k){const v=this.map.get(k);return v?{etag:String(v.rev),json:async()=>JSON.parse(v.text)}:null;}async put(k,text,options={}){const old=this.map.get(k);if(options.onlyIf?.etagMatches!==undefined&&String(old?.rev)!==options.onlyIf.etagMatches)return null;if(options.onlyIf instanceof Headers&&options.onlyIf.get('if-none-match')==='*'&&old)return null;this.map.set(k,{text,rev:(old?.rev||0)+1});return {etag:String((old?.rev||0)+1)};}}
function req(path,token,body){return new Request('https://game.test/api/rooms'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
test('4桁作成・参加・秘匿・不正操作・重複送信・再接続・競合更新',async()=>{const env={BUCKET:new MemoryBucket()},a='a'.repeat(48),b='b'.repeat(48),x='c'.repeat(48);let r=await handle(req('',a,{draft:true}),env);assert.equal(r.status,200);let d=await r.json();assert.match(d.code,/^\d{4}$/);const code=d.code;assert.equal(d.joined,false);r=await handle(req('/'+code+'/join',b,{}),env);assert.equal(r.status,200);d=await r.json();assert(d.joined);assert(!JSON.stringify(d).includes('tokens'));let qa=await (await handle(req('/'+code,a),env)).json(),qb=await (await handle(req('/'+code,b),env)).json();const seat=qa.state.pending.p,t=seat===0?a:b,other=seat===0?b:a,q=(seat===0?qa:qb).state.pending;assert.equal((seat===0?qb:qa).state.pending.options.length,0);assert.equal((await handle(req('/'+code,x),env)).status,403);assert.equal((await handle(req('/'+code+'/action',other,{rev:d.rev,id:'bad',event:{p:seat,key:q.key,value:q.options[0].value}}),env)).status,400);const body={rev:d.rev,id:'one',event:{p:seat,key:q.key,value:q.options[0].value}};r=await handle(req('/'+code+'/action',t,body),env);assert.equal(r.status,200);const after=await r.json();r=await handle(req('/'+code+'/action',t,body),env);assert.equal((await r.json()).rev,after.rev);body.id='stale';assert.equal((await handle(req('/'+code+'/action',t,body),env)).status,409);const resumed=await (await handle(req('/'+code,t),env)).json();assert.deepEqual(resumed.state,after.state);});
test('非公開選択だけ1つ戻る・相手手番では巻き戻せない・相手ターン中もサレンダー可能',async()=>{const env={BUCKET:new MemoryBucket()},tokens=['a'.repeat(48),'b'.repeat(48)];let d=await (await handle(req('',tokens[0],{}),env)).json();const code=d.code;await handle(req('/'+code+'/join',tokens[1],{}),env);d=await (await handle(req('/'+code,tokens[0]),env)).json();let q=d.state.pending;let r=await handle(req('/'+code+'/action',tokens[0],{id:'pick',rev:d.rev,event:{p:0,key:q.key,value:q.options[0].value}}),env);d=await r.json();assert(d.canBack);r=await handle(req('/'+code+'/back',tokens[0],{id:'back',rev:d.rev}),env);d=await r.json();assert.equal(d.state.pending.title,'銃士を選択');assert.equal(d.canBack,false);for(let i=0;i<20;i++){const current=await (await handle(req('/'+code,tokens[0]),env)).json();if(current.state.phase==='opening'){d=current;break;}const seat=current.state.pending.p,own=await (await handle(req('/'+code,tokens[seat]),env)).json(),q=own.state.pending;const res=await handle(req('/'+code+'/action',tokens[seat],{id:'choose'+i,rev:own.rev,event:{p:seat,key:q.key,value:q.options[0].value}}),env);assert.equal(res.status,200);}assert.equal(d.state.phase,'opening');r=await handle(req('/'+code+'/back',tokens[0],{id:'late',rev:d.rev}),env);assert.equal(r.status,400);r=await handle(req('/'+code+'/surrender',tokens[1],{id:'surrender',rev:d.rev}),env);d=await r.json();assert.equal(r.status,200);assert.equal(d.state.winner,0);assert.equal(d.state.endReason,'サレンダー');assert.equal(d.state.pending,null);const resumed=await (await handle(req('/'+code,tokens[0]),env)).json();assert.equal(resumed.state.winner,0);r=await handle(req('/'+code+'/action',tokens[0],{id:'after',rev:d.rev,event:{p:0,key:'ready',value:'ready'}}),env);assert.equal(r.status,400);});


test('対人部屋もエコ＋キヨヒメの偽造選択を拒否する',async()=>{
 const env={BUCKET:new MemoryBucket()},tokens=['d'.repeat(48),'e'.repeat(48)];
 let d=await (await handle(req('',tokens[0],{enforceBannedCombo:false}),env)).json();const code=d.code;
 await handle(req('/'+code+'/join',tokens[1],{}),env);
 d=await (await handle(req('/'+code,tokens[0]),env)).json();let q=d.state.pending;
 d=await (await handle(req('/'+code+'/action',tokens[0],{id:'echo',rev:d.rev,event:{p:0,key:q.key,value:'c8'}}),env)).json();q=d.state.pending;
 assert(!q.options.some(o=>o.value==='g7'));
 const r=await handle(req('/'+code+'/action',tokens[0],{id:'illegal-kiyohime',rev:d.rev,event:{p:0,key:q.key,value:'g7'}}),env);
 assert.equal(r.status,400);
});

test('同じ部屋の両者が合意すると編成から再試合し、旧操作・重複送信では再開始しない',async()=>{
 for(const draft of [false,true]){
 const env={BUCKET:new MemoryBucket()},ts=['1'.repeat(48),'2'.repeat(48)];
 let d=await(await handle(req('',ts[0],{draft}),env)).json();const code=d.code;
 await handle(req('/'+code+'/join',ts[1],{}),env);
 for(let i=0;i<20;i++){
  d=await(await handle(req('/'+code,ts[0]),env)).json();if(d.state.phase==='opening')break;
  const p=d.state.pending.p,own=await(await handle(req('/'+code,ts[p]),env)).json(),q=own.state.pending;
  await handle(req('/'+code+'/action',ts[p],{id:'select'+i,rev:d.rev,event:{p,key:q.key,value:q.options[0].value}}),env);
 }
 let r=await handle(req('/'+code+'/rematch',ts[0],{id:'early',round:0}),env);assert.equal(r.status,400);
 d=await(await handle(req('/'+code+'/surrender',ts[1],{id:'surrender',rev:d.rev}),env)).json();
 const rev=d.rev,oldKey='ready:0';
 d=await(await handle(req('/'+code+'/rematch',ts[0],{id:'want0',round:0,rev}),env)).json();assert.equal(d.state.winner,0);assert.deepEqual(d.rematch,[true,false]);
 const resumed=await(await handle(req('/'+code,ts[1]),env)).json();assert.deepEqual(resumed.rematch,[true,false]);
 d=await(await handle(req('/'+code+'/rematch-cancel',ts[0],{id:'cancel',round:0}),env)).json();assert.deepEqual(d.rematch,[false,false]);
 await handle(req('/'+code+'/rematch',ts[0],{id:'want-again',round:0}),env);
 d=await(await handle(req('/'+code+'/rematch',ts[1],{id:'want1',round:0,rev}),env)).json();
 assert.equal(d.code,code);assert.equal(d.round,1);assert.equal(d.joined,true);assert.equal(d.state.phase,'selection');assert.equal(d.state.winner,null);assert.equal(d.config.draft,draft);
 const roundRev=d.rev;
 d=await(await handle(req('/'+code+'/rematch',ts[1],{id:'want1',round:0}),env)).json();assert.equal(d.rev,roundRev);
 r=await handle(req('/'+code+'/rematch',ts[0],{id:'stale',round:0}),env);assert.equal(r.status,409);
 r=await handle(req('/'+code+'/action',ts[0],{id:'old-action',rev,event:{p:0,key:oldKey,value:'ready'}}),env);assert.equal(r.status,409);
 d=await(await handle(req('/'+code,ts[0]),env)).json();const actor=d.state.pending.p;d=await(await handle(req('/'+code,ts[actor]),env)).json();const q=d.state.pending,value=draft?q.options.at(-1).value:'c1';
 r=await handle(req('/'+code+'/action',ts[actor],{id:'new-char',rev:d.rev,event:{p:actor,key:q.key,value}}),env);assert.equal(r.status,200);
 d=await r.json();if(!draft)assert.equal(d.state.selection[actor].char,value);
}
});

test('同時編成の更新は相手側の更新番号が進んでも受理し、自分だけを巻き戻せる',async()=>{
 const env={BUCKET:new MemoryBucket()},ts=['3'.repeat(48),'4'.repeat(48)];let d=await(await handle(req('',ts[0],{}),env)).json();const code=d.code;
 await handle(req('/'+code+'/join',ts[1],{}),env);
 const states=await Promise.all(ts.map(t=>handle(req('/'+code,t),env).then(r=>r.json())));
 assert(states.every((d,p)=>d.state.pending.p===p));
 const bodies=states.map((d,p)=>({id:'parallel'+p,rev:d.rev,round:d.round,event:{p,key:d.state.pending.key,value:p?'c1':'c0'}}));
 const rs=await Promise.all(ts.map((t,p)=>handle(req('/'+code+'/action',t,bodies[p]),env)));assert(rs.every(r=>r.status===200));
 d=await(await handle(req('/'+code,ts[0]),env)).json();assert.equal(d.state.selection[0].char,'c0');assert.equal(d.state.selection[1],null);
 d=await(await handle(req('/'+code+'/back',ts[0],{id:'own-back',rev:d.rev}),env)).json();assert.equal(d.state.pending.title,'銃士を選択');
 const other=await(await handle(req('/'+code,ts[1]),env)).json();assert.equal(other.state.selection[1].char,'c1');
 assert.equal((await handle(req('/'+code+'/action',ts[0],{...bodies[0],id:'wrong-round',round:99}),env)).status,409);
});

test('対人のおすすめ編成は両者に合法な編成を配り、秘匿・再接続・再試合を維持する',async()=>{
 const env={BUCKET:new MemoryBucket()},tokens=['a'.repeat(48),'b'.repeat(48)];
 const created=await (await handle(req('',tokens[0],{recommended:true}),env)).json(),path='/'+created.code;
 let second=await (await handle(req(path+'/join',tokens[1],{}),env)).json(),first=await (await handle(req(path,tokens[0]),env)).json();
 assert.equal(first.config.recommended,true);assert.equal(first.state.phase,'opening');assert.equal(first.state.config.cpu,undefined);
 for(const [p,d] of [first,second].entries()){assert.equal(d.state.players[p].guns.length,2);assert(d.state.players[p].guns.some(g=>g.def.kind==='ライト'));assert.equal(d.state.players[1-p].skill,null);}
 assert.notEqual(first.state.players[0].char.id,first.state.players[1].char.id);
 assert.deepEqual((await (await handle(req(path,tokens[0]),env)).json()).state,first.state);
 await handle(req(path+'/surrender',tokens[0],{id:'stop',rev:first.rev}),env);
 for(let p=0;p<2;p++){const r=await handle(req(path+'/rematch',tokens[p],{id:'again'+p,round:0}),env);assert.equal(r.status,200);}
 first=await (await handle(req(path,tokens[0]),env)).json();assert.equal(first.round,1);assert.equal(first.config.recommended,true);assert.equal(first.state.phase,'opening');assert.equal(first.state.pending.title,'開始条件を確認');
});
