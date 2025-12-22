
const panels = {};
['products','orders','users','promos','projects','editor'].forEach(id=>{
  panels[id]=document.getElementById('panel-'+id);
});

async function loadModule(name){
  if(panels[name].dataset.loaded) return;
  const html = await fetch(`./modules/${name}/${name}.html`).then(r=>r.text());
  panels[name].innerHTML = html;
  const mod = await import(`./modules/${name}/${name}.js`);
  mod.init(panels[name]);
  panels[name].dataset.loaded = 'true';
}

document.querySelectorAll('.tab').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('section').forEach(s=>s.classList.add('hidden'));
    panels[btn.dataset.tab].classList.remove('hidden');
    loadModule(btn.dataset.tab);
  };
});

loadModule('products');
