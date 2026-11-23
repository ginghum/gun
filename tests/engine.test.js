import {test} from 'node:test';import assert from 'node:assert/strict';
import {Game,replay,view,CS,GS} from '../src/engine.js';
function ready(){const g=new Game({seed:42});g.s.players=[g.makePlayer({char:'c0',guns:['g0','g1'],skill:0},0),g.makePlayer({char:'c1',guns:['g3','g4'],skill:0},1)];g.s.phase='battle';g.s.turn=1;return g;}
test('全12銃士・18機銃・各20枚',()=>{assert.equal(CS.length,12);assert.equal(GS.length,18);for(const g of GS)assert.equal(g.cards.reduce((s,c)=>s+c.count,0),20);for(const c of CS)assert.equal(c.skills.length,3);});
test('先手・初期ドロー・再現性',()=>{const c={seed:52,cpu:1,lineups:[{char:'c0',guns:['g0','g1'],skill:0},{char:'c1',guns:['g3','g4'],skill:0}]};const g=replay(c,[]);assert.equal(g.s.active,0);const ev=[{p:g.s.pending.p,key:g.s.pending.key,value:g.s.pending.options[0].value}];const a=replay(c,ev),b=replay(c,ev);assert.deepEqual(a.s,b.s);assert.equal(a.player(0).hand.length,3);});
test('ダブルバレットの発数と実物枚数',()=>{const g=ready(),a=g.player(0),c=a.decks[0].find(c=>c.name==='ダブルバレット');g.remove(a.decks[0],[c]);assert(g.load(0,c,true,0));assert.equal(g.ammoCount(a.guns[0]),2);assert.equal(a.guns[0].ammo.length,1);assert(!g.load(0,{...c,uid:'other'},true,0));});
test('両方の山札が0枚になった瞬間に敗北',()=>{const g=ready();g.player(0).decks=[[],[]];g.check();assert.equal(g.s.winner,1);});
test('裏向き機銃を追加コストに参照しない',()=>{const g=ready();g.player(0).guns[1].up=false;assert.equal(g.s.winner,null);assert(g.player(0).decks[1].length);assert(!g.extraAvailable(0,'轟雷砲'));});
test('スナイプは重複',()=>{const g=ready();g.effect(0,'スナイプ');g.effect(0,'スナイプ');assert.equal(g.player(0).temp.snipe,2);});
test('手札・山札・伏せ対応・V・技能を秘匿',()=>{const g=ready();g.player(1).hand=g.player(1).decks[0].splice(0,3);g.player(1).responses=g.player(1).decks[0].splice(0,1);g.player(1).voltage=g.player(1).decks[0].splice(0,1);const v=view(g,0);assert.equal(v.players[1].hand.length,0);assert.equal(v.players[1].handCount,3);assert.equal(v.players[1].decks,undefined);assert.equal(v.players[1].skill,null);assert.equal(v.players[1].responses[0].name,'セット対応');assert.equal(v.players[1].voltage[0].name,'ボルテージ');});
test('偽造・余分な操作は拒否',()=>{const c={seed:1};const g=replay(c);assert.throws(()=>replay(c,[{p:g.s.pending.p,key:g.s.pending.key,value:'g999'}]));assert.throws(()=>replay(c,[{p:1,key:'forged',value:0}]));});
test('候補選出の①②・①②②①と重複なし',()=>{const c={seed:44,draft:true,block:1};let events=[],g;for(let i=0;i<6;i++){g=replay(c,events);const q=g.s.pending;events.push({p:q.p,key:q.key,value:q.options[0].value});}g=replay(c,events);const l=g.s.draft.lineups;assert.equal(new Set(l.flatMap(x=>x.guns)).size,4);assert.notEqual(l[0].char,l[1].char);assert.equal(l[0].guns.length,2);assert.equal(l[1].guns.length,2);});
test('5ターン進展なしで引き分け',()=>{const g=ready();for(const a of g.s.players){a.char.name='ヒバナ';a.char.hand=0;}g.beginTurn=()=>{g.s.turn++;};g.turnStartMoves=g.moves;for(let i=0;i<5;i++)g.endTurn();assert.equal(g.s.winner,'draw');});
test('シード付き36試合を完走・全ゾーンのカード保存',()=>{for(let seed=1;seed<=36;seed++){const c={seed,cpu:1,lineups:[{char:CS[(seed-1)%12].id,guns:[GS[(seed-1)%18].id,GS[seed%18].id],skill:(seed-1)%3},{char:CS[seed%12].id,guns:[GS[(seed+4)%18].id,GS[(seed+9)%18].id],skill:seed%3}]};let events=[],g,done=false;for(let i=0;i<1200;i++){g=replay(c,events);for(const p of g.s.players){if(g.s.pending?.title!=='メインフェイズ'&&g.s.winner===null)continue;const cards=[...p.hand,...p.discard,...p.voltage,...p.functions,...p.responses,...p.decks.flat(),...p.guns.flatMap(g=>g.ammo)];assert.equal(cards.length,40,'card count seed '+seed+' step '+i);assert.equal(new Set(cards.map(c=>c.uid)).size,40,'duplicate seed '+seed+' step '+i);}if(g.s.winner!==null){done=true;break;}const q=g.s.pending;assert(q,'seed '+seed+' step '+i);events.push({p:q.p,key:q.key,value:g.ai(q)});}assert(done,'試合が完走しない seed '+seed);}});
function scripted(){const g=ready();g.ask=(p,t,opts,{min=1,max=1}={})=>{const values=opts.map(o=>typeof o==='object'&&'value'in o?o.value:o);if(t.includes('対応'))return values.includes('pass')?'pass':values[0];if(t.includes('枚数'))return values.at(-1);return max>1||min===0?values.slice(0,max):values[0];};return g;}
test('ロックはダウンフェイズの補充に追随する',()=>{const g=scripted();g.player(1).char={...CS.find(c=>c.name==='ロック')};g.draw(0,3,true,0);g.drain();assert.equal(g.player(1).hand.length,3);});
test('技能36種に未登録処理がない',()=>{for(const char of CS)for(let k=0;k<3;k++){const g=scripted(),a=g.player(0);a.char=structuredClone(char);a.skill=k;a.voltage.push(...a.decks[0].splice(0,16));a.hand.push(...a.decks[1].splice(0,2));assert.doesNotThrow(()=>g.skill(0,{hit:4,p:1,kind:'fire'}),char.skills[k].name);}});
test('すべての行動・対応に処理がある',()=>{const defs=Object.values((awaitDummy()));function awaitDummy(){return Object.fromEntries(GS.flatMap(g=>g.cards.map(c=>[c.name,c])));}for(const c of defs){if(!['行動','対応'].includes(c.type))continue;const g=scripted(),a=g.player(0);const oc=g.ocName(c.name);if(oc){a.guns[0].def=GS.find(g=>g.name===oc);}a.hand.push(...a.decks[0].splice(0,6));a.voltage.push(...a.decks[1].splice(0,5));assert.doesNotThrow(()=>c.type==='行動'?g.effect(0,c.name):g.responseEffect(0,{...c,owner:0,origin:'g0',uid:'test',face:false},{hit:5,p:1,kind:'fire',gi:0,n:3}),c.name);}});
test('表向き静音貫通弾は捨て札でも射撃HITに加算',()=>{const g=scripted(),a=g.player(0),c={uid:'static',name:'静音貫通弾',origin:'g0',owner:0,face:true};a.guns[0].ammo=[c];g.fire(0,0);assert.equal(g.player(1).life,28);assert(a.discard.includes(c));});
test('ヒダルのHIT0射撃はショックを付与しない',()=>{const g=scripted(),a=g.player(0);a.guns[0].def=GS.find(g=>g.name==='ヒダル');a.guns[0].ammo=a.decks[0].splice(0,3);g.player(1).temp.zeroHit=true;g.fire(0,0);assert.equal(g.player(1).shock,0);});
test('不撓不屈はライフ11以上では有効にならない',()=>{const g=scripted();g.effect(0,'不撓不屈');assert.equal(g.player(0).flags.protectUntil,undefined);g.player(0).life=10;g.effect(0,'不撓不屈');g.player(0).life=0;g.check();assert.equal(g.s.winner,null);});
test('公開行動フィードは裏向き装填・対応セットの名前を漏らさない',()=>{const g=ready(),a=g.player(0),c=a.decks[0].shift();g.load(0,c,false,0);const e=g.s.feed.at(-1);assert.equal(e.type,'load');assert.equal(e.name,null);assert(!e.label.includes(c.name));const publicState=view(g,1);assert.equal(publicState.feed.at(-1).name,null);});
test('新CPU戦は銃士・機銃が人間側と重複しない',()=>{for(let seed=1;seed<=30;seed++){const config={seed,cpu:1,exclusiveCpu:true,openingConfirm:true};let events=[];for(let i=0;i<8;i++){const g=replay(config,events);if(g.s.phase==='opening'){const [a,b]=g.s.players;assert.notEqual(a.char.id,b.char.id);assert(a.guns.every(x=>b.guns.every(y=>x.id!==y.id)));break;}const q=g.s.pending;events.push({p:q.p,key:q.key,value:q.options[0].value});}}});
test('開始条件確認が終わるまで初期手札を配らない・技能は非公開',()=>{const config={seed:3,openingConfirm:true,lineups:[{char:'c0',guns:['g0','g1'],skill:0},{char:'c5',guns:['g3','g4'],skill:0}]};let g=replay(config);assert.equal(g.s.phase,'opening');assert.equal(g.s.players[1].life,40);assert(g.s.players.every(p=>p.hand.length===0));assert.equal(view(g,0).players[1].skill,null);let events=[];for(let i=0;i<2;i++){const q=g.s.pending;events.push({p:q.p,key:q.key,value:'ready'});g=replay(config,events);}assert.equal(g.s.phase,'battle');});
test('自由編成の途中状態は自分だけに公開',()=>{const config={seed:5};let g=replay(config),q=g.s.pending;g=replay(config,[{p:0,key:q.key,value:'c0'}]);assert.equal(view(g,0).selection[0].char,'c0');assert.equal(view(g,1).selection[0],null);});
test('新規ドラフトは各分類3丁の計9丁・旧設定は6丁のまま再現',()=>{for(const block of [null,1,2]){const g=replay({seed:42,draft:true,draftGunCount:9,block});assert.equal(g.s.draft.guns.length,9);assert.equal(new Set(g.s.draft.guns.map(g=>g.id)).size,9);for(const kind of ['ライト','ヘビー','スペシャル'])assert.equal(g.s.draft.guns.filter(g=>g.kind===kind).length,3);}assert.equal(replay({seed:42,draft:true}).s.draft.guns.length,6);});
test('山札選択はドロー・ボルテージ・装填・捨て札の目的を表示する',()=>{for(const [fn,word] of [[g=>g.draw(0,1),'ドロー'],[g=>g.toVoltage(0,1),'ボルテージへ'],[g=>g.deckLoad(0,1),'装填へ'],[g=>g.mill(0,1),'捨て札へ']]){const g=ready();assert.throws(()=>fn(g));assert(g.s.pending.title.includes(word),g.s.pending.title);}});
test('ドロー・ランダム手札破棄・山札破棄を公開枚数だけで演出する',()=>{const g=scripted();g.draw(1,4,false,0);g.randomDiscard(1,2);g.mill(1,1,0);const feed=g.s.feed;assert.equal(feed.find(e=>e.type==='draw').frame.players[1].handCount,4);const discard=feed.find(e=>e.type==='discard');assert.equal(discard.count,2);assert.equal(discard.reason,'ランダム');assert.equal(discard.frame.players[1].handCount,2);const mill=feed.find(e=>e.type==='mill');assert.equal(mill.count,1);for(const e of [discard,mill]){assert(!('name'in e));assert(!('cards'in e));}assert.equal(g.player(1).discard.length,3);});
test('バーン・ショックの増減とバーンHITを独立した履歴に残す',()=>{const g=scripted();g.counter(0,'burn',2);g.counter(0,'shock',4);g.counter(0,'shock',-3);g.beginTurn();assert.equal(g.player(0).life,24);assert.deepEqual(g.s.feed.filter(e=>e.type==='shock').map(e=>[e.amount,e.total]),[[4,4],[-3,1]]);const burnHits=g.s.feed.filter(e=>e.type==='hit'&&e.kind==='burn');assert.equal(burnHits.length,2);assert.deepEqual(burnHits.map(e=>e.frame.players[0].life),[27,24]);assert.equal(g.s.feed.find(e=>e.type==='burn').frame.players[0].burn,2);});
test('装填・行動・技能・対応・山札を止める銃弾は制限対象と期間を通知する',()=>{const g=scripted(),attack={hit:3};for(const name of ['パラライズバレット','フリーズバレット','ポイズンバレット','エコーバレット','昏倒弾','ステルスバレット'])g.bullet(0,{name},attack);const events=g.s.feed.filter(e=>e.type==='restriction');assert.deepEqual(events.map(e=>e.restriction),['noAction','noBasicLoad','poison','noSkill','noEffectLoad','noResponse']);assert(events.every(e=>e.p===1&&e.scope));assert.equal(g.player(1).flags.noActionNext,true);assert.equal(attack.noResponse,true);});
test('CPUの新選出は銃士に合う銃と二丁の補完性を評価し、旧履歴の方式も維持する',async()=>{const {gunSynergyScore}=await import('../src/engine.js');assert(gunSynergyScore('c6',GS.find(g=>g.id==='g9'))>gunSynergyScore('c6',GS.find(g=>g.id==='g14')));assert(gunSynergyScore('c5',GS.find(g=>g.id==='g1'),['g14'])>gunSynergyScore('c5',GS.find(g=>g.id==='g16'),['g14']));const g=new Game({cpuSynergy:true,seed:5});g.s.selection=[null,{char:'c6',guns:[]}];const q={p:1,title:'左の機銃を選択',min:1,max:1,options:['g14','g9'].map(value=>({value}))};assert.equal(g.ai(q),'g9');});
test('機銃選択の候補は盤面上のプレイヤーと左右位置に結びつく',()=>{const g=ready();assert.throws(()=>g.gun(1,'対象の機銃',()=>true,0));assert.deepEqual(g.s.pending.options.map(o=>o.targetGun),[{p:1,gi:0},{p:1,gi:1}]);});
test('通常装填の残り枠を通常・制限・無制限・効果専用で計算し履歴にも保持する',async()=>{const {basicLoadRemaining,publicFrame}=await import('../src/engine.js');const g=ready(),a=g.player(0),gun=a.guns[0];assert.equal(basicLoadRemaining(a,gun),2);gun.loaded=1;assert.equal(basicLoadRemaining(a,gun),1);a.temp.noBasicLoad=true;assert.equal(basicLoadRemaining(a,gun),0);delete a.temp.noBasicLoad;a.temp.rapid=true;assert.equal(basicLoadRemaining(a,gun),'∞');assert.equal(publicFrame(g.s).players[0].guns[0].basicRemaining,'∞');const effectOnly={id:'g16',def:GS.find(g=>g.id==='g16'),loaded:0};assert.equal(basicLoadRemaining(a,effectOnly),0);});
test('同一の吸熱機構が大量誘発しても順番確認せず1件ずつ回復する',()=>{const g=ready(),a=g.player(0);for(let i=0;i<15;i++)g.trigger(0,'吸熱機構','heal',0,1);const life=a.life;g.drain();assert.equal(g.s.pending,null);assert.equal(a.life,life+15);assert.equal(g.s.feed.filter(e=>e.type==='heal').length,15);assert.equal(g.triggers.length,0);});
test('同名でも対象・数値が違う場合と異なる効果は順番を選択する',()=>{for(const t of [{owner:0,name:'吸熱機構',type:'heal',target:1,n:1},{owner:0,name:'吸熱機構',type:'heal',target:0,n:2},{owner:0,name:'別効果',type:'heal',target:0,n:1}]){const g=ready();g.trigger(0,'吸熱機構','heal',0,1);g.triggers.push(t);assert.throws(()=>g.drain());assert.equal(g.s.pending.title,'同時発生効果の処理順');assert.equal(g.s.pending.options.length,2);}});
test('自動回復から別の効果が誘発したら順番確認を再開する',()=>{const g=ready();g.player(0).flags.hate=true;for(let i=0;i<3;i++)g.trigger(0,'吸熱機構','heal',0,1);assert.throws(()=>g.drain());assert.equal(g.s.pending.title,'同時発生効果の処理順');assert(g.s.pending.options.some(o=>o.label==='HATE EATER'));assert.equal(g.s.feed.filter(e=>e.type==='heal').length,1);});
test('同一効果の旧選択履歴を消費し、新しい履歴の後続選択キーも保つ',()=>{for(const legacy of [false,true]){const g=ready();const key='choice:'+g.seq;if(legacy)g.events=[{p:0,key,value:1}];g.trigger(0,'吸熱機構','heal',0,1);g.trigger(0,'吸熱機構','heal',0,1);g.drain();assert.equal(g.cursor,legacy?1:0);assert.throws(()=>g.ask(0,'次の選択',[1,2]));assert.equal(g.s.pending.key,'choice:'+(Number(key.split(':')[1])+1));}});
test('両者の同一誘発はターンプレイヤー側から処理する',()=>{const g=ready();g.s.active=1;for(const p of [0,1,0,1])g.trigger(p,'吸熱機構','heal',p,1);g.drain();assert.deepEqual(g.s.feed.filter(e=>e.type==='heal').map(e=>e.p),[1,1,0,0]);});
test('基礎射撃威力の表示用計算は射撃本体と共通で、各段階を区別する',async()=>{const {baseShotHit}=await import('../src/engine.js');assert.equal(baseShotHit('コダマ',8),0);assert.equal(baseShotHit('エンラ',0),0);assert.equal(baseShotHit('エンラ',2),3);assert.equal(baseShotHit('エンラ',3),5);assert.equal(baseShotHit('ヌエ',6),14);assert.equal(baseShotHit('キヨヒメ',5),0);assert.equal(baseShotHit('ロクロ',2),3);});
test('先手初ターンは二丁合計1射撃、連射・効果射撃でも超えない',()=>{const g=scripted();g.config.firstTurnShotLimit=true;const a=g.player(0);a.guns.forEach(x=>{x.ammo=a.decks[0].splice(0,4);x.ammo.forEach(c=>c.face=false);});assert(g.canFire(0,0));g.fire(0,0);assert.equal(a.counts.shots,1);assert(!g.canFire(0,1));a.temp.rapid=true;g.fire(0,1,true);assert.equal(a.counts.shots,1);g.s.turn=2;assert(g.canFire(0,1));});
test('おすすめ編成は12銃士を網羅し、対戦相手の銃士と銃は重複しない',async()=>{const {recommendedLineups}=await import('../src/engine.js');const chars=new Set();for(let seed=0;seed<144;seed++){const ls=recommendedLineups(seed),g=new Game();ls.forEach(l=>{g.validateLineup(l);assert(l.guns.some(id=>GS.find(g=>g.id===id).kind==='ライト'));});chars.add(ls[0].char);assert.notEqual(ls[0].char,ls[1].char);assert(ls[0].guns.every(id=>!ls[1].guns.includes(id)));}assert.equal(chars.size,12);});

test('ドラフト9候補は複数シード・各使用範囲で分類3種類ずつ',()=>{for(const block of [null,1,2])for(let seed=1;seed<=60;seed++){const g=replay({seed,draft:true,draftGunCount:9,block});for(const kind of ['ライト','ヘビー','スペシャル'])assert.equal(new Set(g.s.draft.guns.filter(g=>g.kind===kind).map(g=>g.id)).size,3);}});


test('エコ＋キヨヒメは新編成の全入口で選択不可、他銃士と旧対戦は再現可能',()=>{
 const bad={char:'c8',guns:['g7','g9'],skill:0};
 assert.throws(()=>new Game({enforceBannedCombo:true}).validateLineup(bad),/エコとキヨヒメ/);
 assert.doesNotThrow(()=>new Game().validateLineup(bad));
 const cfg={seed:7,enforceBannedCombo:true},g=replay(cfg),q=g.s.pending;
 const next=replay(cfg,[{p:q.p,key:q.key,value:'c8'}]);
 assert(!next.s.pending.options.some(o=>o.value==='g7'));
 const other=replay(cfg,[{p:q.p,key:q.key,value:'c0'}]);
 assert(other.s.pending.options.some(o=>o.value==='g7'));
 assert.throws(()=>replay({...cfg,lineups:[bad]}),/エコとキヨヒメ/);
});
test('自由・ドラフトの両CPUと全使用範囲のおすすめ編成で禁止組合せを生成しない',async()=>{
 const {recommendedLineups}=await import('../src/engine.js');
 for(const block of [null,1,2])for(let seed=1;seed<=120;seed++){
  const cfg={seed,block,enforceBannedCombo:true,cpuSynergy:true},g=new Game(cfg);
  for(const l of recommendedLineups(seed,block)){g.validateLineup(l);assert(l.guns.some(id=>GS.find(x=>x.id===id).kind==='ライト'));}
  for(const draft of [false,true]){let events=[];
   for(let step=0;step<14;step++){
    const game=replay({...cfg,draft,draftGunCount:9,openingConfirm:true},events),q=game.s.pending;
    if(game.s.phase==='opening'){for(const p of game.s.players)assert(p.char.id!=='c8'||p.guns.every(g=>g.id!=='g7'));break;}
    const line=(game.s.draft?.lineups||game.s.selection)?.[q.p];
    if(q.title.includes('機銃を選択')&&line?.char==='c8')assert(!q.options.some(o=>o.value==='g7'));
    events.push({p:q.p,key:q.key,value:game.ai(q)});
    if(step===13)assert.fail('selection did not finish');
   }
  }
 }
});

test('自由編成は相手を待たず最後まで選択し、非公開情報を守って合流する',()=>{
 const config={seed:41,parallelSelection:true,openingConfirm:true,enforceBannedCombo:true},events=[];
 let g=replay(config);assert(g.s.pendings[0]&&g.s.pendings[1]);
 const otherKey=view(g,0).pending.key;
 for(let i=0;i<4;i++){const q=view(g,1).pending;assert.equal(q.p,1);events.push({p:1,key:q.key,value:q.options[0].value});g=replay(config,events);}
 assert.equal(view(g,0).pending.key,otherKey);assert.equal(view(g,0).selection[1],null);
 assert.equal(view(g,1).pending.options.length,0);
 for(let i=0;i<4;i++){const q=view(g,0).pending;events.push({p:0,key:q.key,value:q.options[0].value});g=replay(config,events);}
 assert.equal(g.s.phase,'opening');assert(g.s.pendings[0]&&g.s.pendings[1]);
 const q=view(g,1).pending;events.push({p:1,key:q.key,value:'ready'});g=replay(config,events);assert.deepEqual(g.s.ready,[false,true]);assert(g.s.players.every(p=>p.hand.length===0));
 const q0=view(g,0).pending;events.push({p:0,key:q0.key,value:'ready'});g=replay(config,events);assert.equal(g.s.phase,'battle');
 assert.deepEqual(replay(config,events).s,g.s);
});

test('ドラフトの選出後は技能と配置を並行選択し、相手の配置確定は秘匿する',()=>{
 const config={seed:42,draft:true,draftGunCount:9,parallelSelection:true},events=[];let g=replay(config);
 while(!g.s.pendings){const q=g.s.pending;events.push({p:q.p,key:q.key,value:q.options[0].value});g=replay(config,events);}
 const original=[...view(g,0).draft.lineups[1].guns];
 for(let i=0;i<2;i++){const q=view(g,1).pending;events.push({p:1,key:q.key,value:i?1:0});g=replay(config,events);}
 assert.deepEqual(view(g,0).draft.lineups[1].guns,original);assert.equal(view(g,0).draft.lineups[1].skill,undefined);
 for(let i=0;i<2;i++){const q=view(g,0).pending;events.push({p:0,key:q.key,value:0});g=replay(config,events);}
 assert.equal(g.s.phase,'battle');assert.deepEqual(g.s.players[1].guns.map(g=>g.id),original.reverse());
});
