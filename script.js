const $ = id => document.getElementById(id);
const details = {
 Plastic:['Пластик','🧴','Проверьте маркировку и местные правила приёма пластика.'],
 Paper:['Бумага','📄','Чистую сухую бумагу можно сдать в макулатуру.'],
 Metal:['Металл','🥫','Пустую металлическую упаковку можно сдать в пункт приёма металла.'],
 Glass:['Стекло','🍾','Пустую стеклянную тару сдавайте в пункт приёма стекла.'],
 Other:['Другое','❓','Уточните материал и местные правила утилизации.']
};
let model=null,current=null,url=null,history=[];
try { const h=JSON.parse(localStorage.getItem('ecoHistory')||'[]'); if(Array.isArray(h)) history=h.filter(x=>details[x.category]); } catch(e) { console.warn(e); }
// Готовая обученная модель SmartWaste-AI, автор AetherCore4.
// Три класса: Plastic, Paper, Metal. Файлы загружаются с публичного CDN.
const MODEL_BASE = 'https://cdn.jsdelivr.net/gh/AetherCore4/SmartWaste-AI@main/Model/';
async function init(){
 try {
  if(typeof tmImage==='undefined') throw Error('Не загрузилась библиотека Teachable Machine');
  $('status').textContent='⏳ Загружаем готовую нейросеть (нужен интернет)...';
  model=await tmImage.load(MODEL_BASE+'model.json',MODEL_BASE+'metadata.json');
  $('status').textContent='✅ AI готов! Модель определяет пластик, бумагу и металл.';
  $('scan').disabled=!$('photo').files.length;
 }catch(e){
  $('status').textContent='⚠️ Модель не загрузилась. Проверь интернет или CDN и обнови страницу.';
  console.error(e);
 }
}
$('photo').addEventListener('change',()=>{
 current=null;$('result').hidden=true;$('save').disabled=true;
 if(url)URL.revokeObjectURL(url);url=null;
 const file=$('photo').files[0];
 if(!file){$('preview').hidden=true;$('scan').disabled=true;return;}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
  $('status').textContent='Нужен JPG, PNG или WEBP';$('photo').value='';$('preview').hidden=true;$('scan').disabled=true;return;
 }
 url=URL.createObjectURL(file);$('preview').src=url;$('preview').hidden=false;
 $('scan').disabled=!model;
 if(model)$('status').textContent='Фото готово к анализу.';
});
const materialNames={Plastic:'Пластик',Paper:'Бумага',Metal:'Металл',Glass:'Стекло',Other:'Другое'};
function setMaterial(category){
 current={category,detected:current?.detected||'предмет'};
 const d=details[category];$('symbol').textContent=d[1];$('category').textContent=d[0];
 $('advice').textContent=d[2];$('save').disabled=false;
 $('status').textContent='Категория исправлена вручную. Можно сохранить результат.';
}
function materialChoices(){
 const area=$('materialButtons');area.replaceChildren();
 for(const key of Object.keys(materialNames)){
  const b=document.createElement('button');b.className='secondary';b.textContent=materialNames[key];
  b.addEventListener('click',()=>setMaterial(key));area.append(b);
 }
 $('materialPicker').hidden=false;
}
$('scan').addEventListener('click',async()=>{
 if(!model||!$('preview').complete||!$('preview').naturalWidth)return;
 $('scan').disabled=true;$('save').disabled=true;$('status').textContent='🔍 Анализируем материал...';
 try{
  const predictions=await model.predict($('preview'));
  const best=predictions.sort((a,b)=>b.probability-a.probability)[0];
  if(!best)throw Error('Пустой ответ модели');
  const accepted=best.probability>=0.70 && ['Plastic','Paper','Metal'].includes(best.className);
  $('result').hidden=false;
  $('confidence').textContent='Оценка модели: '+Math.round(best.probability*100)+'% (не гарантия точности)';
  if(accepted){
    current={category:best.className,detected:best.className};
    const d=details[best.className];
    $('symbol').textContent=d[1];$('category').textContent=d[0];$('advice').textContent=d[2];
    $('save').disabled=false;
    $('status').textContent='✅ AI предложил категорию. Проверь результат перед сохранением.';
  }else{
    current={category:null,detected:best.className};
    $('symbol').textContent='❓';$('category').textContent='Неуверенный результат';
    $('advice').textContent='Сделай фото на простом фоне или укажи материал вручную.';
    $('status').textContent='⚠️ Модель не уверена в ответе.';
  }
  materialChoices();
 }catch(e){$('status').textContent='Ошибка анализа. Проверь интернет и консоль браузера.';console.error(e);}
 finally{$('scan').disabled=false;}
});
$('save').addEventListener('click',()=>{
 if(!current||!current.category)return;
 history.unshift({category:current.category,date:new Date().toLocaleString('ru-RU')});
 try{localStorage.setItem('ecoHistory',JSON.stringify(history));}catch(e){console.warn(e);}
 $('save').disabled=true;$('status').textContent='⭐ +10 игровых EcoPoints';render();
});
$('clear').addEventListener('click',()=>{if(!confirm('Очистить историю?'))return;history=[];try{localStorage.removeItem('ecoHistory');}catch(e){}render();});
function render(){
 $('total').textContent=history.length;$('points').textContent=history.length*10;$('chart').replaceChildren();
 for(const key of Object.keys(details)){
  const count=history.filter(x=>x.category===key).length;
  const row=document.createElement('div');row.className='bar';
  const label=document.createElement('div');label.className='bar-label';
  const left=document.createElement('span');left.textContent=details[key][0];
  const right=document.createElement('span');right.textContent=count;label.append(left,right);
  const track=document.createElement('div');track.className='track';
  const fill=document.createElement('div');fill.className='fill';fill.style.width=(history.length?count/history.length*100:0)+'%';track.append(fill);row.append(label,track);$('chart').append(row);
 }
 $('history').replaceChildren();if(!history.length)$('history').textContent='Пока нет сканирований';
 for(const item of history.slice(0,10)){
  const row=document.createElement('div');row.className='history-row';
  const name=document.createElement('span');name.textContent=details[item.category][0];
  const date=document.createElement('span');date.textContent=item.date;row.append(name,date);$('history').append(row);
 }
}
render();init();
