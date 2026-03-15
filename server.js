require('dotenv').config();
const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());
app.use((req,res,next)=>{
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","Content-Type, X-Shopify-Store, X-Shopify-Token");
  res.header("Access-Control-Allow-Methods","POST, GET, OPTIONS");
  if(req.method==="OPTIONS") return res.sendStatus(200);
  next();
});

const CLIENT_ID = process.env.CLIENT_ID || "69e4ac5851c444f2e38360a7cc62d70a";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "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";
const STORE = process.env.STORE || "ven1pi-0t.myshopify.com";
const REDIRECT_URI = process.env.REDIRECT_URI || "https://shopify-proxy-production-7408.up.railway.app/callback";

let accessToken = null;

const HTML = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Shopify Bulk Upload</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></scr` + `ipt>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></scr` + `ipt>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></scr` + `ipt>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0f;font-family:'DM Mono','Courier New',monospace;color:#e0e0ff}</style>
</head><body><div id="root"></div>
<script type="text/babel">
const{useState,useRef}=React;
const CSV_H=["title","descriptionHtml","vendor","productType","tags","price","sku","inventoryQuantity","status"];
function parseCSV(t){const l=t.trim().split("\n"),h=l[0].split(",").map(x=>x.trim().toLowerCase().replace(/_([a-z])/g,(_,c)=>c.toUpperCase()));return l.slice(1).map(line=>{const v=line.split(",").map(x=>x.trim().replace(/^"|"$/g,""));const o={};h.forEach((x,i)=>o[x]=v[i]||"");return{title:o.title||"",descriptionHtml:o.descriptionHtml||o.description||"",vendor:o.vendor||"",productType:o.productType||o.product_type||"",tags:o.tags||"",status:(o.status||"ACTIVE").toUpperCase(),price:o.price||"0",sku:o.sku||"",inventoryQuantity:o.inventoryQuantity||o.inventory_quantity||"0"};}).filter(p=>p.title);}
function Badge({s}){const m={idle:["#1a1a2e","#444","In attesa"],uploading:["#1a2","#7c3aed","⏳"],success:["#0d2e1a","#22c55e","✓ OK"],error:["#2e0d0d","#ef4444","✗"]};const[bg,c,lbl]=m[s]||m.idle;return<span style={{background:bg,color:c,border:"1px solid "+c+"44",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700}}>{lbl}</span>;}
function App(){
  const[tab,setTab]=useState("csv");
  const[creds,setCreds]=useState({store:"",token:""});
  const[products,setProducts]=useState([]);
  const[manual,setManual]=useState({title:"",descriptionHtml:"",vendor:"",productType:"",tags:"",price:"",sku:"",inventoryQuantity:"",status:"ACTIVE"});
  const[st,setSt]=useState({});
  const[errs,setErrs]=useState({});
  const[loading,setLoading]=useState(false);
  const[log,setLog]=useState([]);
  const[drag,setDrag]=useState(false);
  const fileRef=useRef();
  const addLog=(msg,type="info")=>setLog(p=>[{msg,type,time:new Date().toLocaleTimeString("it-IT")},...p].slice(0,100));
  const handleCSV=f=>{if(!f||!f.name.endsWith(".csv"))return addLog("File non valido","error");const r=new FileReader();r.onload=e=>{try{const p=parseCSV(e.target.result);if(!p.length)return addLog("Nessun prodotto","error");setProducts(p);setSt({});setErrs({});addLog(p.length+" prodotti ✓","success");setTab("list");}catch{addLog("Errore CSV","error");}};r.readAsText(f);};
  const upload=async()=>{
    if(!creds.store||!creds.token)return addLog("Inserisci credenziali!","error");
    if(!products.length)return addLog("Nessun prodotto","error");
    setLoading(true);
    for(let i=0;i<products.length;i++){
      if(st[i]==="success")continue;
      setSt(p=>({...p,[i]:"uploading"}));
      try{
        const res=await fetch("/shopify",{method:"POST",headers:{"Content-Type":"application/json","X-Shopify-Store":creds.store,"X-Shopify-Token":creds.token},body:JSON.stringify({query:"mutation productCreate($input: ProductInput!){productCreate(input:$input){product{id title handle}userErrors{field message}}}",variables:{input:{title:products[i].title,descriptionHtml:products[i].descriptionHtml,vendor:products[i].vendor,productType:products[i].productType,tags:products[i].tags?products[i].tags.split(",").map(t=>t.trim()):[],status:products[i].status,variants:[{price:products[i].price||"0",sku:products[i].sku,inventoryQuantities:[{availableQuantity:parseInt(products[i].inventoryQuantity)||0,locationId:"gid://shopify/Location/1"}]}]}}})});
        const json=await res.json();
        const ue=json.data?.productCreate?.userErrors||[];
        if(ue.length)throw new Error(ue.map(e=>e.field+": "+e.message).join(", "));
        setSt(p=>({...p,[i]:"success"}));addLog('✓ "'+products[i].title+'" creato',"success");
        await new Promise(r=>setTimeout(r,300));
      }catch(e){setSt(p=>({...p,[i]:"error"}));setErrs(p=>({...p,[i]:e.message}));addLog('✗ "'+products[i].title+'": '+e.message,"error");}
    }
    setLoading(false);addLog("Completato!","success");
  };
  const inp={width:"100%",background:"#0d0d18",border:"1px solid #1e1e35",borderRadius:6,color:"#e0e0ff",padding:"8px 10px",fontFamily:"inherit",fontSize:12,outline:"none"};
  const lbl={fontSize:10,color:"#444",letterSpacing:2,textTransform:"uppercase",marginBottom:5,display:"block"};
  const ok=Object.values(st).filter(s=>s==="success").length;
  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#07070f"}}>
        <span style={{fontWeight:900,fontSize:14,letterSpacing:3,textTransform:"uppercase"}}>⬡ Shopify Bulk Upload</span>
        <div style={{display:"flex",gap:20}}>{[["Tot","#7c3aed",products.length],["Ok","#22c55e",ok],["Err","#ef4444",Object.values(st).filter(s=>s==="error").length]].map(([l,c,v])=><div key={l} style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:900,color:c,lineHeight:1}}>{v}</div><div style={{fontSize:9,color:"#333"}}>{l}</div></div>)}</div>
      </div>
      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 60px)"}}>
        <div style={{width:270,borderRight:"1px solid #1a1a2e",padding:16,display:"flex",flexDirection:"column",gap:14,background:"#07070f",overflowY:"auto"}}>
          <div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:10,padding:14}}>
            <label style={lbl}>Store Domain</label>
            <input style={{...inp,marginBottom:10}} placeholder="mystore.myshopify.com" value={creds.store} onChange={e=>setCreds(p=>({...p,store:e.target.value}))}/>
            <label style={lbl}>Access Token</label>
            <input style={inp} type="password" placeholder="shpat_..." value={creds.token} onChange={e=>setCreds(p=>({...p,token:e.target.value}))}/>
          </div>
          <button onClick={upload} disabled={loading} style={{width:"100%",padding:12,background:loading?"#1a1a2e":"linear-gradient(135deg,#7c3aed,#4f46e5)",color:loading?"#444":"#fff",border:"none",borderRadius:8,fontFamily:"inherit",fontWeight:900,fontSize:12,letterSpacing:2,cursor:loading?"not-allowed":"pointer",textTransform:"uppercase"}}>
            {loading?"⏳ Caricamento...":"▲ Upload "+products.length}
          </button>
          <div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:10,flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #1a1a2e",fontSize:10,color:"#555",letterSpacing:2,textTransform:"uppercase"}}>📋 Log</div>
            <div style={{padding:10,overflowY:"auto",flex:1}}>{!log.length&&<span style={{fontSize:10,color:"#1e1e35"}}>Nessuna attività...</span>}{log.map((l,i)=><div key={i} style={{fontSize:10,padding:"3px 0",color:l.type==="error"?"#ef4444":l.type==="success"?"#22c55e":"#333",lineHeight:1.6}}>{l.time} {l.msg}</div>)}</div>
          </div>
        </div>
        <div style={{flex:1,padding:20,overflowY:"auto"}}>
          <div style={{display:"flex",gap:4,marginBottom:18}}>
            {[["csv","📄 CSV"],["manual","✏ Manuale"],["list","📦 Lista ("+products.length+")"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 18px",background:tab===id?"#1a1a2e":"transparent",border:tab===id?"1px solid #2a2a4e":"1px solid transparent",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:12,color:tab===id?"#7c3aed":"#333",fontWeight:tab===id?700:400}}>{label}</button>
            ))}
          </div>
          {tab==="csv"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div onClick={()=>fileRef.current.click()} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handleCSV(e.dataTransfer.files[0]);}} style={{border:"2px dashed "+(drag?"#7c3aed":"#1a1a2e"),borderRadius:10,padding:"60px 30px",textAlign:"center",cursor:"pointer",transition:"all .2s"}}>
              <div style={{fontSize:44,marginBottom:14}}>📥</div>
              <div style={{fontSize:14,color:"#555",marginBottom:8}}>Trascina il CSV qui</div>
              <div style={{fontSize:11,color:"#222"}}>oppure clicca</div>
              <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>handleCSV(e.target.files[0])}/>
            </div>
            <button onClick={()=>{const csv=CSV_H.join(",")+\"\n"+'"Test","<p>Desc</p>","Brand","Tipo","tag1","29.99","SKU-001","10","ACTIVE"';const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="template.csv";a.click();}} style={{padding:"8px 14px",background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:6,color:"#7c3aed",cursor:"pointer",fontFamily:"inherit",fontSize:12,width:"fit-content"}}>⬇ Template CSV</button>
          </div>}
          {tab==="manual"&&<div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:10}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #1a1a2e",fontSize:10,color:"#555",letterSpacing:2,textTransform:"uppercase"}}>✏ Aggiungi Prodotto</div>
            <div style={{padding:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                {[["Titolo *","title","Nome"],["Vendor","vendor","Brand"],["Tipo","productType","Abbigliamento"],["Tag","tags","estate,promo"],["Prezzo","price","29.99"],["SKU","sku","SKU-001"],["Quantità","inventoryQuantity","10"]].map(([l2,k,ph])=>(
                  <div key={k}><label style={lbl}>{l2}</label><input style={inp} placeholder={ph} value={manual[k]} onChange={e=>setManual(p=>({...p,[k]:e.target.value}))}/></div>
                ))}
                <div><label style={lbl}>Stato</label><select style={inp} value={manual.status} onChange={e=>setManual(p=>({...p,status:e.target.value}))}><option value="ACTIVE">ACTIVE</option><option value="DRAFT">DRAFT</option><option value="ARCHIVED">ARCHIVED</option></select></div>
              </div>
              <label style={lbl}>Descrizione HTML</label>
              <textarea style={{...inp,resize:"vertical",minHeight:70,marginBottom:14}} placeholder="<p>Descrizione</p>" value={manual.descriptionHtml} onChange={e=>setManual(p=>({...p,descriptionHtml:e.target.value}))}/>
              <button onClick={()=>{if(!manual.title)return addLog("Titolo obbligatorio","error");setProducts(p=>[...p,{...manual}]);setManual({title:"",descriptionHtml:"",vendor:"",productType:"",tags:"",price:"",sku:"",inventoryQuantity:"",status:"ACTIVE"});addLog('"'+manual.title+'" aggiunto',"success");setTab("list");}} style={{padding:"9px 20px",background:"linear-gradient(135deg,#7c3aed,#4f46e5)",color:"#fff",border:"none",borderRadius:6,fontFamily:"inherit",fontWeight:900,fontSize:12,cursor:"pointer"}}>+ Aggiungi</button>
            </div>
          </div>}
          {tab==="list"&&<div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:10}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #1a1a2e",fontSize:10,color:"#555",letterSpacing:2,textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>📦 Lista</span>
              {products.length>0&&<button onClick={()=>{setProducts([]);setSt({});setErrs({});}} style={{padding:"3px 10px",background:"#ef444415",border:"1px solid #ef444430",borderRadius:4,color:"#ef4444",cursor:"pointer",fontFamily:"inherit",fontSize:10}}>Svuota</button>}
            </div>
            <div style={{padding:12}}>
              {!products.length&&<div style={{textAlign:"center",padding:40,color:"#1e1e35"}}>Nessun prodotto.</div>}
              {products.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #0f0f1a"}}>
                  <div style={{width:28,height:28,background:"#1a1a2e",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#333",flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:"#e0e0ff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.title}</div>
                    <div style={{fontSize:10,color:"#333",marginTop:3}}>{p.vendor&&<span style={{marginRight:8}}>🏷 {p.vendor}</span>}{p.price&&<span style={{marginRight:8}}>💶 €{p.price}</span>}</div>
                    {errs[i]&&<div style={{fontSize:9,color:"#ef4444"}}>{errs[i]}</div>}
                  </div>
                  <Badge s={st[i]||"idle"}/>
                  <button onClick={()=>setProducts(p=>p.filter((_,idx)=>idx!==i))} style={{padding:"3px 7px",background:"#ef444415",border:"1px solid #ef444430",borderRadius:4,color:"#ef4444",cursor:"pointer",fontFamily:"inherit",fontSize:11}}>✕</button>
                </div>
              ))}
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
</script></body></html>`;

app.get("/",(req,res)=>{
  if(accessToken){
    res.redirect("/app");
  } else {
    res.send("<h2>Shopify Proxy</h2><a href='/auth'><button style='padding:12px 24px;background:#7c3aed;color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer'>Ottieni Token Shopify</button></a>");
  }
});

app.get("/app",(req,res)=>res.send(HTML));

app.get("/auth",(req,res)=>{
  const url="https://"+STORE+"/admin/oauth/authorize?client_id="+CLIENT_ID+"&scope=write_products,read_products&redirect_uri="+encodeURIComponent(REDIRECT_URI);
  res.redirect(url);
});

app.get("/callback",async(req,res)=>{
  const code=req.query.code;
  if(!code) return res.send("Errore: nessun codice");
  try{
    const r=await fetch("https://"+STORE+"/admin/oauth/access_token",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,code:code})
    });
    const d=await r.json();
    accessToken=d.access_token;
    console.log("Token:",accessToken);
    res.redirect("/app");
  } catch(e){
    res.send("Errore: "+e.message);
  }
});

app.post("/shopify",async(req,res)=>{
  const token=req.headers["x-shopify-token"]||accessToken;
  const store=req.headers["x-shopify-store"]||STORE;
  if(!token) return res.status(401).json({error:"Vai su /auth prima"});
  try{
    const r=await fetch("https://"+store+"/admin/api/2026-01/graphql.json",{
      method:"POST",
      headers:{"Content-Type":"application/json","X-Shopify-Access-Token":token},
      body:JSON.stringify(req.body)
    });
    const d=await r.json();
    res.json(d);
  } catch(e){
    res.status(500).json({error:e.message});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("Proxy attivo sulla porta "+PORT));
