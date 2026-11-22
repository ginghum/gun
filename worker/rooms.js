import {replay,view,VERSION,Invalid} from '../src/engine.js';
const TTL=6*3600000;
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization'}});
const tokenOK=t=>typeof t==='string'&&/^[a-f0-9]{48}$/.test(t);
export async function handle(req,env){if(req.method==='OPTIONS')return reply({});const url=new URL(req.url),parts=url.pathname.replace(/^\/api\/rooms\/?/,'').split('/').filter(Boolean);if(parts[0]==='health')return reply({ok:true,version:VERSION,storage:!!env.BUCKET});try{if(!env.BUCKET)throw Error('部屋ストレージに接続できません');let body={};if(req.method==='POST'){const raw=await req.text();if(raw.length>20000)throw new Invalid('操作データが大きすぎます');body=JSON.parse(raw||'{}');}const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!tokenOK(token))return reply({error:'参加情報を確認できません'},401);
 if(!parts.length&&req.method==='POST'){const config={seed:crypto.getRandomValues(new Uint32Array(1))[0]||1,block:[1,2].includes(body.block)?body.block:null,draft:!!body.draft,draftGunCount:9,openingConfirm:true};for(let i=0;i<30;i++){const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%10000).padStart(4,'0'),key='gun/'+code;const old=await env.BUCKET.get(key);if(old&&(await old.json()).expires>Date.now())continue;const room={code,rev:0,config,events:[],tokens:[token],expires:Date.now()+TTL,seen:[]};if(await env.BUCKET.put(key,JSON.stringify(room),{onlyIf:old?{etagMatches:old.etag}:new Headers({'if-none-match':'*'})}))return reply(roomView(room,0));}return reply({error:'部屋を作れませんでした'},503);}
 const code=parts[0];if(!/^\d{4}$/.test(code||''))throw new Invalid('4桁の部屋番号を入力してください');const key='gun/'+code;
 for(let attempt=0;attempt<5;attempt++){const obj=await env.BUCKET.get(key);if(!obj)return reply({error:'部屋が見つかりません'},404);const room=await obj.json();if(room.expires<Date.now())return reply({error:'部屋の有効期限が切れました'},410);let seat=room.tokens.indexOf(token),changed=false;
 if(parts[1]==='join'&&req.method==='POST'){if(seat<0){if(room.tokens.length>=2)return reply({error:'この部屋は満員です'},409);room.tokens.push(token);seat=1;changed=true;}}
 if(seat<0)return reply({error:'この部屋の参加者ではありません'},403);
 if(['back','surrender'].includes(parts[1])&&req.method==='POST'){
  if(room.seen.includes(body.id))return reply(roomView(room,seat));
  if(body.rev!==room.rev)return reply({...roomView(room,seat),error:'盤面を更新しました。もう一度操作してください'},409);
  const game=replay(room.config,room.events);
  if(room.surrendered!==undefined||game.s.winner!==null)throw new Invalid('この対戦は終了しています');
  if(parts[1]==='back'){if(game.s.phase!=='selection'||game.s.pending?.p!==seat||room.events.at(-1)?.p!==seat)throw new Invalid('相手に公開済みの選択は戻せません');room.events.pop();}
  else {if(game.s.players.length!==2)throw new Invalid('対戦の開始条件がまだ決まっていません');room.surrendered=seat;}
  room.seen.push(body.id);room.seen=room.seen.slice(-100);changed=true;
 }
 if(parts[1]==='action'&&req.method==='POST'){
  if(room.seen.includes(body.id))return reply(roomView(room,seat));
  if(room.tokens.length<2)throw new Invalid('相手の参加を待っています');
  if(body.rev!==room.rev)return reply({...roomView(room,seat),error:'盤面を更新しました。もう一度操作してください'},409);
  const game=replay(room.config,room.events),q=game.s.pending;if(room.surrendered!==undefined||game.s.winner!==null||q?.p!==seat||body.event?.p!==seat||body.event?.key!==q.key)throw new Invalid('あなたの選択ではありません');
  replay(room.config,[...room.events,body.event]);room.events.push(body.event);room.seen.push(body.id);room.seen=room.seen.slice(-100);changed=true;
 }
 if(!changed)return reply(roomView(room,seat));room.rev++;room.expires=Date.now()+TTL;const saved=await env.BUCKET.put(key,JSON.stringify(room),{onlyIf:{etagMatches:obj.etag}});if(saved)return reply(roomView(room,seat));
 }return reply({error:'同時操作がありました。再試行してください'},409);
 }catch(e){return reply({error:e instanceof Invalid||e instanceof SyntaxError?e.message:'対戦処理を完了できませんでした'},e instanceof Invalid||e instanceof SyntaxError?400:500);}}
function roomView(r,seat){const game=r.tokens.length===2?replay(r.config,r.events):null,state=game?view(game,seat):null;
 if(state&&r.surrendered!==undefined){state.winner=1-r.surrendered;state.endReason='サレンダー';state.phase='battle';state.pending=null;state.log.push(state.players[r.surrendered].char.name+'がサレンダー');}
 return {version:VERSION,code:r.code,rev:r.rev,seat,joined:r.tokens.length===2,expires:r.expires,canBack:!!(game&&game.s.phase==='selection'&&game.s.pending?.p===seat&&r.events.at(-1)?.p===seat),config:{block:r.config.block,draft:r.config.draft},state};}
