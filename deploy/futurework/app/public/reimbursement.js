const email = '3473280583@qq.com';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateAmount(raw) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw Error('请填写最多两位小数的 CNY 金额');
  const amount = Number(raw);
  if (amount < 0.01 || amount > 1) throw Error('仅可申请实际消费金额，范围为 CNY 0.01–1.00');
  return amount.toFixed(2);
}
export async function validateImage(file) {
  if (!file || !file.size || file.size > 5 * 1024 * 1024) throw Error('请选择不超过 5 MB 的图片');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const jpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  const webp = String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if (!(file.type==='image/png' && png || file.type==='image/jpeg' && jpeg || file.type==='image/webp' && webp)) throw Error('文件内容与图片类型不符，请上传 PNG、JPG 或 WebP');
}
const readImage = file => new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('图片读取失败，请重新选择'));reader.readAsDataURL(file);});

if (typeof document !== 'undefined') {
  const dialog = document.querySelector('#reimburse-dialog');
  const form = document.querySelector('#reimburse-form');
  const qr = document.querySelector('#reimburse-qr');
  const receipt = document.querySelector('#reimburse-receipt');
  const status = document.querySelector('#reimburse-status');
  const preview = document.querySelector('#reimburse-preview');
  const mail = document.querySelector('#reimburse-email');
  let previewURL;
  let opener;
  let version = 0;
  let busy = false;
  const reset = () => {
    version++;
    form.reset(); status.textContent=''; mail.hidden=true; mail.removeAttribute('href'); preview.hidden=true; preview.removeAttribute('src');
    if(previewURL) URL.revokeObjectURL(previewURL);
    previewURL=null;
  };
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-reimburse]');
    if (!button) return;
    opener=button; reset(); dialog.showModal();
  });
  const close=()=>{dialog.close();reset();opener?.focus();};
  document.querySelector('#reimburse-close').addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  form.addEventListener('input',()=>{version++;mail.hidden=true;mail.removeAttribute('href');status.textContent='';});
  qr.addEventListener('change',async()=>{
    const file=qr.files[0];const current=++version;
    preview.hidden=true;
    if(previewURL)URL.revokeObjectURL(previewURL);
    try{await validateImage(file);if(current!==version)return;previewURL=URL.createObjectURL(file);preview.src=previewURL;preview.hidden=false;}catch(error){if(current===version){qr.value='';status.textContent=error.message;}}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy || !form.reportValidity())return;
    busy=true;const button=form.querySelector('button[type=submit]');button.disabled=true;
    const current=version;
    try{
      const amount=validateAmount(document.querySelector('#reimburse-amount').value);
      const method=document.querySelector('#reimburse-method').value;
      if(!['微信','支付宝','Touch ’n Go'].includes(method))throw Error('请选择收款方式');
      const files=[qr.files[0],receipt.files[0]];
      await Promise.all(files.map(validateImage));
      const images=await Promise.all(files.map(readImage));
      if(current!==version||!dialog.open)return;
      const id=`FW-${crypto.randomUUID()}`;
      const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Futurework 体验费用申请</title><body><h1>Futurework 一次体验报销申请</h1><p>申请编号：${id}</p><p>生成时间：${escape(new Date().toISOString())}</p><p>实际消费金额：CNY ${amount}（最高 1 元）</p><p>收款方式：${escape(method)}</p><p>待人工审核，未付款；请核实实际消费及是否重复申请。</p><h2>本人收款码</h2><img width="360" alt="收款码" src="${images[0]}"><h2>API 实际消费凭证</h2><img width="600" alt="消费凭证" src="${images[1]}"></body></html>`;
      const filename=`${id}.html`;
      const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      const subject=`Futurework 一次 AI 体验报销 ${id}`;
      const body=`申请编号：${id}\n实际消费：CNY ${amount}\n收款方式：${method}\n\n请手动附上刚下载的 ${filename}（包含收款码和消费凭证）再发送。\n我确认仅申请一次体验的实际费用，请审核。`;
      mail.href=`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;mail.hidden=false;
      status.textContent=`申请材料已生成（${filename}），尚未提交。请点击“打开邮件申请”，手动附加该文件并发送至 ${email}；也可在网页邮箱中发送。下载不代表审核通过或已付款。`;
    }catch(error){status.textContent=error.message;}finally{busy=false;button.disabled=false;}
  });
}
