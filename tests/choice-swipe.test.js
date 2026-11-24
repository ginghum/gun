import test from 'node:test';
import assert from 'node:assert/strict';
import {installChoiceSwipe} from '../src/presentation.js';

test('選択肢のスワイプは往復・端でも誤決定せず、タップと縦移動は妨げない',()=>{
 const listeners={},panel={classList:{contains:()=>true},setPointerCapture(){},addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
 let page=0,picks=0;
 const emit=(type,x,y=0)=>{const e={pointerId:1,button:0,clientX:x,clientY:y,target:{closest:()=>true},preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};for(const f of listeners[type]||[])f(e);if(type==='click'&&!e.stopped)picks++;return e;};
 const install=()=>installChoiceSwipe(panel,d=>{page=Math.max(0,Math.min(1,page+d));install();});install();
 emit('pointerdown',150);emit('pointermove',50);emit('pointerup',50);assert.equal(page,1);assert.ok(emit('click',50).defaultPrevented);assert.equal(picks,0);
 emit('pointerdown',150);emit('pointermove',50);emit('pointerup',50);assert.equal(page,1);emit('click',50);assert.equal(picks,0);
 emit('pointerdown',50);emit('pointermove',150);emit('pointerup',150);assert.equal(page,0);emit('click',150);assert.equal(picks,0);
 assert.equal(listeners.pointerdown.length,1,'再描画でイベントを重複登録しない');
 const other={...panel,addEventListener(type,fn){(other.listeners[type]??=[]).push(fn);},listeners:{}};installChoiceSwipe(other,()=>assert.fail('タップ・縦移動・キャンセルでは切り替えない'));
 const send=(type,x,y=0)=>{const e={pointerId:1,button:0,clientX:x,clientY:y,target:{closest:()=>true},preventDefault(){this.prevented=true;},stopImmediatePropagation(){}};for(const f of other.listeners[type]||[])f(e);return e;};
 send('pointerdown',50);send('pointerup',50);assert.ok(!send('click',50).prevented);
 send('pointerdown',50);send('pointermove',55,80);send('pointerup',55,80);
 send('pointerdown',50);send('pointermove',150);send('pointercancel',150);send('pointerup',150);
});


test('タッチの暗黙キャプチャが選択ボタンから親へ移ってもスワイプを継続する',()=>{
 const listeners={},button={closest:()=>true};let pages=0;
 const panel={classList:{contains:()=>true},addEventListener(t,f){(listeners[t]??=[]).push(f);},setPointerCapture(){emit('lostpointercapture',button);}};
 const emit=(type,target=button,x=150)=>{const e={target,pointerType:'touch',pointerId:7,isPrimary:true,button:0,clientX:x,clientY:100,preventDefault(){},stopImmediatePropagation(){}};for(const f of listeners[type]||[])f(e);};
 installChoiceSwipe(panel,d=>pages+=d);
 emit('pointerdown');emit('pointermove',button,60);emit('pointerup',panel,60);assert.equal(pages,1);
 emit('pointerdown');emit('pointermove',button,60);emit('lostpointercapture',panel,60);emit('pointerup',panel,60);assert.equal(pages,1,'親自体のキャプチャ喪失時はキャンセルする');
});

test('選出・カード一覧・説明の操作面を切り替えても、外側や無効な画面ではページを動かさない',()=>{
 const listeners={};let active=true,pages=0;
 const panel={classList:{contains:()=>active},setPointerCapture(){},addEventListener(t,f){(listeners[t]??=[]).push(f);}};
 const swipe=selector=>{const target={closest:s=>s===selector};for(const [type,x] of [['pointerdown',150],['pointermove',50],['pointerup',50]])for(const f of listeners[type]||[])f({target,pointerId:1,button:0,clientX:x,clientY:100,preventDefault(){}});};
 for(const selector of ['.choices','#catalog-content','.reader-body']){installChoiceSwipe(panel,()=>pages++,selector);swipe(selector);}
 assert.equal(pages,3);swipe('.choices');assert.equal(pages,3,'古い画面の操作面は反応しない');
 active=false;swipe('.reader-body');assert.equal(pages,3);assert.equal(listeners.pointerdown.length,1);
});
