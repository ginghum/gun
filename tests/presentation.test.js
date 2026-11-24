import {test} from 'node:test';import assert from 'node:assert/strict';import {SHOT_STYLES,eventTitle} from '../src/presentation.js';
test('18機銃すべてに異なる射撃演出を割り当てる',()=>{assert.equal(SHOT_STYLES.length,18);assert.equal(new Set(SHOT_STYLES.map(x=>x[0])).size,18);});
test('相手の行動説明には公開済みのラベルだけを使う',()=>{assert.equal(eventTitle({p:1,label:'対応カードをセット'},0,[{}, {char:{name:'ナトリ'}}]),'相手・ナトリ：対応カードをセット');});

test('公開演出フレームは枚数と数値だけを保持し、元状態の変化で過去フレームが変わらない',async()=>{const {Game,publicFrame}=await import('../src/engine.js');const g=new Game({seed:5}),a=g.makePlayer({char:'c0',guns:['g0','g1'],skill:2},0);g.s.players=[a];a.hand.push(a.decks[0].shift());a.responses.push(a.decks[1].shift());a.voltage.push(a.decks[0].shift());const frame=publicFrame(g.s),json=JSON.stringify(frame);for(const key of ['name','origin','uid','skill','text'])assert(!json.includes('"'+key+'"'));assert.equal(frame.players[0].handCount,1);assert.equal(frame.players[0].zones.responses,1);a.life=1;a.decks[0].pop();assert.equal(frame.players[0].life,30);assert.equal(frame.players[0].deckCounts[0],18);});

test('説明を読む時間を確保し、一時停止・手動送りで順番に再生する',async t=>{const {TablePresentation,eventDuration,eventExplanation}=await import('../src/presentation.js');t.mock.timers.enable({apis:['setTimeout']});const prior=globalThis.document;globalThis.document={querySelector:()=>null,body:{classList:{add(){},remove(){}}}};try{const p=new TablePresentation(),played=[];p.effect=e=>played.push(e.id);p.update({seat:0,players:[],feed:[],feedSeq:0});const first={id:1,p:0,type:'fire',gun:'g0',label:'射撃',amount:5},second={id:2,p:1,type:'hit',label:'3HIT',amount:3};p.update({seat:0,players:[],feed:[first,second],feedSeq:2});assert.deepEqual(played,[1]);assert(eventDuration(first)>=2000&&eventDuration(first)<3500);t.mock.timers.tick(1000);p.pause();t.mock.timers.tick(10000);assert.deepEqual(played,[1]);p.advance();assert.deepEqual(played,[1,2]);assert.equal(p.paused,true);assert.match(eventExplanation(first),/宣言時 5HIT/);p.advance();assert.equal(p.playing,false);p.reset();}finally{globalThis.document=prior;}});
test('非公開行動の演出はカード名を表示せず装填・ドロー・セットを区別する',async()=>{const {concealedActionHTML}=await import('../src/presentation.js');for(const type of ['load','draw','set']){const html=concealedActionHTML({type,gun:'g0',count:3,name:'秘密のカード',label:'秘密のカード'});assert(!html.includes('秘密のカード'));assert(!html.includes('card-back'));assert(html.includes({load:'通常弾を装填',draw:'3枚ドロー',set:'対応をセット'}[type]));}});
test('通常技能と対応技能だけ確認対象とし、編成時の技能選択や支払いには挟まない',async()=>{const {isSkillActivation}=await import('../src/presentation.js');assert(isSkillActivation({type:'skill'},{title:'メインフェイズ',key:'main:1'}));assert(isSkillActivation('skill',{title:'相手の射撃に対応',key:'response:2'}));for(const [v,q] of [[0,{title:'技能を秘密に選択'}],[3,{title:'支払うVを指定'}],['pass',{key:'response:2'}],[{type:'play'},{title:'メインフェイズ'}]])assert(!isSkillActivation(v,q));});
test('全操作制限と行動・機能・対応・ドロー・破棄に別々のSVGを持つ',async()=>{const {EFFECT_KINDS,effectSVG,effectKind}=await import('../src/effects.js'),{RESTRICTIONS}=await import('../src/engine.js');for(const kind of ['action','function','ability','response','dealt','received','burn','shock','draw','discard','mill',...Object.keys(RESTRICTIONS).map(x=>'restriction-'+x)]){assert(EFFECT_KINDS.includes(kind),kind);assert.match(effectSVG(kind),/<svg/);}assert.equal(new Set(EFFECT_KINDS.map(effectSVG)).size,EFFECT_KINDS.length);assert.equal(effectKind({type:'play',cardType:'機能'}),'function');assert.equal(effectKind({type:'hit',p:1,from:0},0),'dealt');assert.equal(effectKind({type:'hit',p:0,from:1},0),'received');});
test('タップ送りは自動再生を維持し、一時停止中は停止を維持する',async t=>{const {TablePresentation,eventDuration}=await import('../src/presentation.js');t.mock.timers.enable({apis:['setTimeout']});const prior=globalThis.document;globalThis.document={querySelector:()=>null,body:{classList:{add(){},remove(){}}}};try{const p=new TablePresentation(),played=[];let idle=0;p.onIdle=()=>idle++;p.effect=e=>played.push(e.id);p.update({seat:0,players:[],feed:[],feedSeq:0});idle=0;const events=[1,2,3].map(id=>({id,p:0,type:'draw',count:1,label:'ドロー'}));p.update({seat:0,players:[],feed:events,feedSeq:3});assert(p.fastForward());assert.equal(p.paused,false);assert.deepEqual(played,[1,2]);t.mock.timers.tick(eventDuration(events[1]));assert.deepEqual(played,[1,2,3]);p.pause();assert(p.fastForward());assert.equal(p.paused,true);assert.equal(p.playing,false);assert.equal(idle,1);assert.equal(p.fastForward(),false);t.mock.timers.tick(10000);assert.equal(idle,1);p.reset();}finally{globalThis.document=prior;}});
test('ドローと手札破棄の表示は移動方向と枚数を示し、非公開カード名を使わない',async()=>{const {eventCueHTML}=await import('../src/presentation.js');for(const type of ['draw','discard']){const html=eventCueHTML({type,p:1,count:2,gun:'g0',frame:{players:[{}, {handCount:3}]}},0);assert.match(html,/手札/);assert.match(html,/2枚/);assert.match(html,/3枚/);assert.match(html,/<svg/);}assert.match(eventCueHTML({type:'restriction',p:1,restriction:'noDraw',scope:'このターン',label:'ドロー不可'},0),/このターン/);});
test('自分の通常装填だけ待機を省き、反応ダメージと相手装填は手札をロックする',async()=>{const {TablePresentation}=await import('../src/presentation.js');const prior=globalThis.document,hand={inert:false};globalThis.document={querySelector:()=>null,querySelectorAll:()=>[hand],body:{classList:{add(){},remove(){}}}};try{const p=new TablePresentation();p.effect=()=>{};p.update({seat:0,players:[],feed:[],feedSeq:0});p.update({seat:0,players:[],feed:[{id:1,p:0,type:'load',basic:true}],feedSeq:1});assert.equal(p.playing,false);assert.equal(hand.inert,false);p.paused=true;p.update({seat:0,players:[],feed:[{id:2,p:0,type:'hit',amount:3}],feedSeq:2});assert.equal(p.playing,true);assert.equal(hand.inert,true);p.skip();assert.equal(hand.inert,false);p.update({seat:0,players:[],feed:[{id:3,p:1,type:'load',basic:true}],feedSeq:3});assert.equal(p.playing,true);p.reset();}finally{globalThis.document=prior;}});
test('技能支払いの自動選択は必要枚数だけを選び、他の選択には適用しない',async()=>{const {automaticPaymentIndices}=await import('../src/presentation.js');assert.deepEqual(automaticPaymentIndices({title:'支払うボルテージ',min:3,options:[0,1,2,3,4]}),[0,1,2]);assert.deepEqual(automaticPaymentIndices({title:'支払うボルテージ',min:1,options:[0,1]}),[0]);assert.deepEqual(automaticPaymentIndices({title:'捨てる手札',min:1,options:[0,1]}),[]);assert.deepEqual(automaticPaymentIndices({title:'支払うボルテージ',min:3,options:[0]}),[]);});
test('射撃・技能・OC・特殊技・HITを別の大型SVG演出に割り当てる',async()=>{const {spectacleKind,spectacleSVG}=await import('../src/presentation.js');for(const [e,kind]of [[{type:'fire'},'fire'],[{type:'skill'},'skill'],[{type:'stop',overclock:true},'overclock'],[{type:'play',name:'轟雷砲'},'special'],[{type:'hit'},'hit']]){assert.equal(spectacleKind(e),kind);const svg=spectacleSVG(kind,true);assert.match(svg,/<svg/);assert.match(svg,/burst-wave/);}assert.equal(spectacleKind({type:'load'}),null);});


test('マリガン・山札・対応・技能確認の待機理由を直前の演出より優先する',async()=>{
 const {TablePresentation,pendingNarration}=await import('../src/presentation.js');
 const elements=Object.fromEntries(['#table-action','#event-mark','#action-explanation'].map(k=>[k,{textContent:'',innerHTML:''}])),previous=globalThis.document;
 globalThis.document={querySelector:s=>elements[s]||null,body:{classList:{remove(){},add(){}}}};
 const s={seat:0,winner:null,players:[{char:{name:'キルコ'}},{char:{name:'ナトリ'}}],pending:{p:0,title:'開始時に引き直す手札',key:'choice:1',min:0,max:4}};
 try{const p=new TablePresentation();p.state=s;p.last={type:'draw',p:1,label:'5枚ドロー',count:5};p.restore();
  assert.match(elements['#table-action'].textContent,/自分・キルコ：マリガン/);assert.match(elements['#action-explanation'].textContent,/0枚/);
  p.playing=true;p.restore();assert.match(elements['#table-action'].textContent,/相手・ナトリ：5枚ドロー/);
  p.playing=false;s.pending.title='使用する山札を選択（ボルテージへ）';p.restore();assert.match(elements['#table-action'].textContent,/ボルテージへ/);
  s.pending.key='response:2';assert.equal(pendingNarration(s).kind,'response');
  assert.match(pendingNarration(s,{key:'response:2'}).title,/技能の発動確認/);
  s.pending={p:1,title:'相手が効果を選択中',options:[]};assert(!JSON.stringify(pendingNarration(s)).includes('5枚ドロー'));
 }finally{globalThis.document=previous;}
});


test('相手の待機理由は種類だけ公開し、カード・技能名や選択肢を漏らさない',async()=>{
 const {Game,view}=await import('../src/engine.js'),{pendingNarration}=await import('../src/presentation.js');
 const g=new Game();g.s.players=[g.makePlayer({char:'c0',guns:['g0','g1'],skill:0},0),g.makePlayer({char:'c3',guns:['g3','g9'],skill:0},1)];g.s.phase='battle';
 for(const [title,key,reason]of [['開始時に引き直す手札','choice:1','マリガン'],['使用する山札を選択（ドロー）','choice:2','山札の選択'],['秘密の技能名','response:3','対応の選択']]){
  g.s.pending={p:1,title,key,options:[{label:'秘密のカード',value:'secret'}],min:1,max:1};
  const s=view(g,0),shown=pendingNarration(s);assert.match(shown.title,new RegExp(reason));assert.equal(s.pending.options.length,0);assert(!JSON.stringify(s.pending).includes('秘密'));assert(!JSON.stringify(shown).includes('秘密'));
 }
});

test('手番の表示色と自分・相手の区別は解決中のフレームに追随する',async()=>{
 const {turnAppearance}=await import('../src/presentation.js'),{emblem}=await import('../src/logos.js');
 const state={seat:0,players:[{char:{id:'c0',name:'ヒバナ'}},{char:{id:'c4',name:'アマタ'}}]};
 assert.deepEqual(turnAppearance({active:0,turn:1},state),{color:'#d8f6ff',label:'自分のターン / 第1ターン / ヒバナ'});
 const next=turnAppearance({active:1,turn:2},state);assert.equal(next.color,'#f28b53');assert.match(next.label,/相手のターン/);assert(!emblem('character','c0').includes('<title>'));
});
