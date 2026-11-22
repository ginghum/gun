import {test} from 'node:test';import assert from 'node:assert/strict';import {SHOT_STYLES,eventTitle} from '../src/presentation.js';
test('18機銃すべてに異なる射撃演出を割り当てる',()=>{assert.equal(SHOT_STYLES.length,18);assert.equal(new Set(SHOT_STYLES.map(x=>x[0])).size,18);});
test('相手の行動説明には公開済みのラベルだけを使う',()=>{assert.equal(eventTitle({p:1,label:'対応カードをセット'},0,[{}, {char:{name:'ナトリ'}}]),'相手・ナトリ：対応カードをセット');});
