require('dotenv').config();
const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());
app.use((req,res,next)=>{
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","Content-Type,X-Shopify-Store,X-Shopify-Token");
  res.header("Access-Control-Allow-Methods","POST,GET,OPTIONS");
  if(req.method==="OPTIONS") return res.sendStatus(200);
  next();
});
const CLIENT_ID=process.env.CLIENT_ID||"69e4ac5851c444f2e38360a7cc62d70a";
const CLIENT_SECRET=process.env.CLIENT_SECRET||"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";
const STORE=process.env.STORE||"ven1pi-0t.myshopify.com";
const REDIRECT_URI=process.env.REDIRECT_URI||"https://shopify-proxy-production-7408.up.railway.app/callback";
let accessToken=null;
app.get("/",(req,res)=>{
  if(accessToken) res.redirect("/app");
  else res.send('<html><body style="font-family:sans-serif;padding:40px;background:#0a0a0f;color:white"><h2>Shopify Proxy</h2><a href="/auth"><button style="padding:12px 24px;background:#7c3aed;color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer">Ottieni Token Shopify</button></a></body></html>');
});
app.get("/app",(req,res)=>{
  const t=accessToken||"";
  res.setHeader("Content-Type","text/html");
  res.end([
    '<!DOCTYPE html><html><head><meta charset="UTF-8"/>',
    '<title>Shopify Upload</title>',
    '<style>*{box-sizing:border-box;margin:0;padding:0}',
    'body{background:#0a0a0f;color:#e0e0ff;font-family:Courier New,monospace;display:flex;flex-direction:column;height:100vh}',
    '.hdr{background:#050508;border-bottom:1px solid #1a1a2e;padding:12px 20px;display:flex;align-items:center;justify-content:space-between}',
    '.sidebar{width:260px;border-right:1px solid #1a1a2e;padding:14px;display:flex;flex-direction:column;gap:12px;background:#050508;overflow-y:auto}',
    '.main{flex:1;padding:18px;overflow-y:auto}',
    '.body{display:flex;flex:1;overflow:hidden}',
    'input,select,textarea{width:100%;background:#111;border:1px solid #222;border-radius:6px;color:#e0e0ff;padding:8px 10px;font-family:inherit;font-size:12px;outline:none}',
    'label{font-size:10px;color:#555;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;display:block}',
    '.card{background:#0d0d18;border:1px solid #1a1a2e;border-radius:8px;padding:14px}',
    '.btn-primary{padding:11px 0;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:8px;font-family:inherit;font-weight:900;font-size:11px;letter-spacing:2px;cursor:pointer;text-transform:uppercase;width:100%}',
    '.tabs{display:flex;gap:4px;margin-bottom:16px}',
    '.tab{padding:7px 16px;background:transparent;border:1px solid transparent;border-radius:6px;cursor:pointer;font-family:inherit;font-size:11px;color:#444;font-weight:400}',
    '.tab.active{background:#1a1a2e;border-color:#2a2a4e;color:#7c3aed;font-weight:700}',
    '.dropzone{border:2px dashed #1a1a2e;border-radius:10px;padding:50px 20px;text-align:center;cursor:pointer}',
    '.log-box{background:#0d0d18;border:1px solid #1a1a2e;border-radius:8px;flex:1;display:flex;flex-direction:column;min-height:0}',
    '.log-inner{padding:10px;overflow-y:auto;flex:1;font-size:10px}',
    '.product-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #0f0f1a}',
    '</style></head><body>',
    '<div class="hdr">',
    '<span style="font-weight:900;letter-spacing:3px;text-transform:uppercase;font-size:13px">⬡ Shopify Bulk Upload</span>',
    '<div style="display:flex;gap:16px" id="stats">',
    '<div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#7c3aed" id="statTot">0</div><div style="font-size:9px;color:#444">Tot</div></div>',
    '<div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#22c55e" id="statOk">0</div><div style="font-size:9px;color:#444">OK</div></div>',
    '<div style="text-align:right"><div style="font-size:18px;font-weight:900;color:#ef4444" id="statErr">0</div><div style="font-size:9px;color:#444">Err</div></div>',
    '</div></div>',
    '<div class="body">',
    '<div class="sidebar">',
    '<div class="card">',
    '<label>Store Domain</label><input id="store" placeholder="mystore.myshopify.com" value="'+STORE+'" style="margin-bottom:10px"/>',
    '<label>Access Token</label><input id="token" type="password" placeholder="shpat_..." value="'+t+'"/>',
    '</div>',
    '<button class="btn-primary" onclick="upload()">▲ Upload <span id="uploadCount">0</span> prodotti</button>',
    '<div class="log-box">',
    '<div style="padding:8px 12px;border-bottom:1px solid #1a1a2e;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase">LOG</div>',
    '<div class="log-inner" id="log"><span style="color:#1e1e35">Nessuna attività...</span></div>',
    '</div>',
    '</div>',
    '<div class="main">',
    '<div class="tabs">',
    '<button class="tab active" onclick="showTab(this,\'csv\')">📄 CSV</button>',
    '<button class="tab" onclick="showTab(this,\'manual\')">✏ Manuale</button>',
    '<button class="tab" onclick="showTab(this,\'list\')">📦 Lista (<span id="listCount">0</span>)</button>',
    '</div>',
    '<div id="tab-csv">',
    '<div class="dropzone" onclick="document.getElementById(\'file\').click()" id="drop" ondragover="event.preventDefault();this.style.borderColor=\'#7c3aed\';" ondragleave="this.style.borderColor=\'#1a1a2e\';" ondrop="event.preventDefault();this.style.borderColor=\'#1a1a2e\';handleCSV(event.dataTransfer.files[0])">',
    '<div style="font-size:40px;margin-bottom:12px">📥</div>',
    '<div style="color:#555;margin-bottom:6px">Trascina il CSV qui</div>',
    '<div style="font-size:11px;color:#222">oppure clicca per selezionare</div>',
    '<input id="file" type="file" accept=".csv" style="display:none" onchange="handleCSV(this.files[0])"/>',
    '</div>',
    '<div style="font-size:10px;color:#333;margin-top:10px">Colonne: title, vendor, product_type, tags, price, sku, inventory_quantity, status, description</div>',
    '</div>',
    '<div id="tab-manual" style="display:none">',
    '<div style="background:#0d0d18;border:1px solid #1a1a2e;border-radius:8px">',
    '<div style="padding:10px 14px;border-bottom:1px solid #1a1a2e;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase">AGGIUNGI PRODOTTO</div>',
    '<div style="padding:14px">',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">',
    '<div><label>Titolo *</label><input id="m_title" placeholder="Nome prodotto"/></div>',
    '<div><label>Vendor</label><input id="m_vendor" placeholder="Brand"/></div>',
    '<div><label>Tipo Prodotto</label><input id="m_type" placeholder="Abbigliamento"/></div>',
    '<div><label>Tag</label><input id="m_tags" placeholder="estate, promo"/></div>',
    '<div><label>Prezzo (€)</label><input id="m_price" placeholder="29.99"/></div>',
    '<div><label>SKU</label><input id="m_sku" placeholder="SKU-001"/></div>',
    '<div><label>Quantità</label><input id="m_qty" placeholder="10"/></div>',
    '<div><label>Stato</label><select id="m_status"><option value="ACTIVE">ACTIVE</option><option value="DRAFT">DRAFT</option><option value="ARCHIVED">ARCHIVED</option></select></div>',
    '</div>',
    '<label>Descrizione (HTML)</label>',
    '<textarea id="m_desc" style="resize:vertical;min-height:60px;margin-bottom:12px" placeholder="<p>Descrizione</p>"></textarea>',
    '<button onclick="addManual()" style="padding:9px 18px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border:none;border-radius:6px;font-family:inherit;font-weight:900;font-size:11px;cursor:pointer">+ Aggiungi alla lista</button>',
    '</div></div></div>',
    '<div id="tab-list" style="display:none">',
    '<div style="background:#0d0d18;border:1px solid #1a1a2e;border-radius:8px">',
    '<div style="padding:10px 14px;border-bottom:1px solid #1a1a2e;font-size:9px;color:#555;letter-spacing:2px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center">',
    '<span>LISTA PRODOTTI</span>',
    '<button onclick="clearAll()" style="padding:3px 8px;background:#ef444415;border:1px solid #ef444430;border-radius:4px;color:#ef4444;cursor:pointer;font-family:inherit;font-size:9px">Svuota</button>',
    '</div>',
    '<div id="list" style="padding:10px"><div style="text-align:center;padding:30px;color:#1e1e35;font-size:12px">Nessun prodotto.</div></div>',
    '</div></div>',
    '</div></div>',
    '<script>',
    'var products=[],statuses={};',
    'function showTab(btn,id){',
    '  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));',
    '  btn.classList.add("active");',
    '  ["csv","manual","list"].forEach(t=>document.getElementById("tab-"+t).style.display=t===id?"block":"none");',
    '}',
    'function addLog(msg,type){',
    '  var log=document.getElementById("log");',
    '  var color=type==="error"?"#ef4444":type==="success"?"#22c55e":"#444";',
    '  var d=document.createElement("div");',
    '  d.style.cssText="padding:2px 0;border-bottom:1px solid #0a0a12;color:"+color+";line-height:1.5";',
    '  d.textContent=new Date().toLocaleTimeString("it-IT")+" "+msg;',
    '  if(log.children.length===1&&log.children[0].tagName==="SPAN") log.innerHTML="";',
    '  log.insertBefore(d,log.firstChild);',
    '}',
    'function updateStats(){',
    '  document.getElementById("statTot").textContent=products.length;',
    '  document.getElementById("uploadCount").textContent=products.length;',
    '  document.getElementById("listCount").textContent=products.length;',
    '  var ok=Object.values(statuses).filter(s=>s==="success").length;',
    '  var err=Object.values(statuses).filter(s=>s==="error").length;',
    '  document.getElementById("statOk").textContent=ok;',
    '  document.getElementById("statErr").textContent=err;',
    '}',
    'function renderList(){',
    '  var list=document.getElementById("list");',
    '  if(!products.length){list.innerHTML="<div style=\'text-align:center;padding:30px;color:#1e1e35;font-size:12px\'>Nessun prodotto.</div>";return;}',
    '  list.innerHTML=products.map(function(p,i){',
    '    var s=statuses[i];',
    '    var sc=s==="success"?"#22c55e":s==="error"?"#ef4444":s==="loading"?"#7c3aed":"#444";',
    '    var sl=s==="success"?"✓ OK":s==="error"?"✗ Err":s==="loading"?"⏳":"In attesa";',
    '    return "<div class=\'product-row\'><div style=\'width:26px;height:26px;background:#1a1a2e;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#444;flex-shrink:0\'>"+(i+1)+"</div><div style=\'flex:1;min-width:0\'><div style=\'font-size:12px;color:#e0e0ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\'>"+p.title+"</div><div style=\'font-size:9px;color:#333;margin-top:2px\'>"+(p.vendor?"🏷 "+p.vendor+" ":"")+(p.price?"💶 €"+p.price:"")+"</div></div><span style=\'background:"+(s==="success"?"#0d2e1a":s==="error"?"#2e0d0d":"#1a1a2e")+";color:"+sc+";border:1px solid "+sc+"33;border-radius:4px;padding:2px 7px;font-size:9px;font-weight:700;white-space:nowrap\'>"+sl+"</span><button onclick=\'removeProduct("+i+")' style=\'padding:2px 6px;background:#ef444415;border:1px solid #ef444430;border-radius:4px;color:#ef4444;cursor:pointer;font-family:inherit;font-size:10px\'>✕</button></div>";',
    '  }).join("");',
    '}',
    'function removeProduct(i){products.splice(i,1);delete statuses[i];var ns={};Object.keys(statuses).forEach(function(k){if(k<i)ns[k]=statuses[k];else if(k>i)ns[k-1]=statuses[k];});statuses=ns;renderList();updateStats();}',
    'function clearAll(){products=[];statuses={};renderList();updateStats();}',
    'function addManual(){',
    '  var t=document.getElementById("m_title").value;',
    '  if(!t)return addLog("Titolo obbligatorio","error");',
    '  products.push({title:t,vendor:document.getElementById("m_vendor").value,productType:document.getElementById("m_type").value,tags:document.getElementById("m_tags").value,price:document.getElementById("m_price").value,sku:document.getElementById("m_sku").value,qty:document.getElementById("m_qty").value,status:document.getElementById("m_status").value,desc:document.getElementById("m_desc").value});',
    '  ["m_title","m_vendor","m_type","m_tags","m_price","m_sku","m_qty","m_desc"].forEach(function(id){document.getElementById(id).value="";});',
    '  addLog("\""+t+"\" aggiunto","success");',
    '  document.querySelectorAll(".tab")[2].click();',
    '  renderList();updateStats();',
    '}',
    'function handleCSV(file){',
    '  if(!file)return;',
    '  var r=new FileReader();',
    '  r.onload=function(e){',
    '    var lines=e.target.result.replace(/\r/g,"").split("\n");',
    '    var h=lines[0].split(",").map(function(x){return x.trim().replace(/"/g,"").toLowerCase();});',
    '    var ps=lines.slice(1).map(function(l){',
    '      var v=l.split(",").map(function(x){return x.trim().replace(/"/g,"");});',
    '      var o={};h.forEach(function(k,i){o[k]=v[i]||"";});',
    '      return{title:o.title||"",vendor:o.vendor||"",productType:o.product_type||o.producttype||"",tags:o.tags||"",price:o.price||"0",sku:o.sku||"",qty:o.inventory_quantity||o.qty||"0",status:(o.status||"ACTIVE").toUpperCase(),desc:o.description||o.body_html||""};',
    '    }).filter(function(p){return p.title;});',
    '    if(!ps.length)return addLog("Nessun prodotto trovato","error");',
    '    products=ps;statuses={};',
    '    addLog(ps.length+" prodotti caricati","success");',
    '    document.querySelectorAll(".tab")[2].click();',
    '    renderList();updateStats();',
    '  };',
    '  r.readAsText(file);',
    '}',
    'async function upload(){',
    '  var store=document.getElementById("store").value;',
    '  var token=document.getElementById("token").value;',
    '  if(!store||!token)return addLog("Inserisci store e token!","error");',
    '  if(!products.length)return addLog("Nessun prodotto","error");',
    '  for(var i=0;i<products.length;i++){',
    '    if(statuses[i]==="success")continue;',
    '    statuses[i]="loading";renderList();',
    '    var p=products[i];',
    '    try{',
    '      var res=await fetch("/shopify",{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Store":store,"X-Shopify-Token":token},',
    '        body:JSON.stringify({query:"mutation productCreate($input:ProductInput!){productCreate(input:$input){product{id title}userErrors{field message}}}",',
    '        variables:{input:{title:p.title,descriptionHtml:p.desc,vendor:p.vendor,productType:p.productType,',
    '        tags:p.tags?p.tags.split(",").map(function(t){return t.trim();}):[],status:p.status,',
    '        variants:[{price:p.price||"0",sku:p.sku,inventoryQuantities:[{availableQuantity:parseInt(p.qty)||0,locationId:"gid://shopify/Location/1"}]}]}}})});',
    '      var d=await res.json();',
    '      var ue=d.data&&d.data.productCreate?d.data.productCreate.userErrors:[];',
    '      if(ue.length)throw new Error(ue.map(function(e){return e.message;}).join(", "));',
    '      statuses[i]="success";addLog("Creato: "+p.title,"success");',
    '    }catch(e){statuses[i]="error";addLog("Errore \""+p.title+"\": "+e.message,"error");}',
    '    renderList();updateStats();',
    '    await new Promise(function(r){setTimeout(r,300);});',
    '  }',
    '  addLog("Upload completato!","success");',
    '}',
    '<\/script>',
    '</body></html>'
  ].join(""));
});
app.get("/auth",(req,res)=>{
  const url="https://"+STORE+"/admin/oauth/authorize?client_id="+CLIENT_ID+"&scope=write_products,read_products&redirect_uri="+encodeURIComponent(REDIRECT_URI);
  res.redirect(url);
});
app.get("/callback",async(req,res)=>{
  const code=req.query.code;
  if(!code) return res.send("Errore: nessun codice");
  try{
    const r=await fetch("https://"+STORE+"/admin/oauth/access_token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,code:code})});
    const d=await r.json();
    accessToken=d.access_token;
    res.redirect("/app");
  }catch(e){ res.send("Errore: "+e.message); }
});
app.post("/shopify",async(req,res)=>{
  const token=req.headers["x-shopify-token"]||accessToken;
  const store=req.headers["x-shopify-store"]||STORE;
  if(!token) return res.status(401).json({error:"Token mancante"});
  try{
    const r=await fetch("https://"+store+"/admin/api/2026-01/graphql.json",{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Access-Token":token},body:JSON.stringify(req.body)});
    res.json(await r.json());
  }catch(e){ res.status(500).json({error:e.message}); }
});
const PORT=process.env.PORT||3000;
app.listen(PORT,"0.0.0.0",()=>console.log("Attivo su porta "+PORT));
