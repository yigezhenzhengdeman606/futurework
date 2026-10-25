import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAmount,validateImage} from '../public/reimbursement.js';
test('reimbursement only accepts actual positive amounts up to CNY 1',()=>{
  assert.equal(validateAmount('0.05'),'0.05');assert.equal(validateAmount('1'),'1.00');
  for(const v of ['0','-1','1.01','0.001','','NaN','1e0'])assert.throws(()=>validateAmount(v));
});
test('upload checks size and actual image signature, rejecting SVG and renamed content',async()=>{
  await validateImage(new File([new Uint8Array([137,80,78,71,13,10,26,10])],'qr.png',{type:'image/png'}));
  await assert.rejects(()=>validateImage(new File(['<script>bad</script>'],'qr.png',{type:'image/png'})));
  await assert.rejects(()=>validateImage(new File(['<svg/>'],'qr.svg',{type:'image/svg+xml'})));
  await assert.rejects(()=>validateImage(new File([new Uint8Array(5*1024*1024+1)],'large.png',{type:'image/png'})));
  await assert.rejects(()=>validateImage(null));
});
