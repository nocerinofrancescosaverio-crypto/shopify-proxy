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

app.get("/",(req,res)=>{
  if(accessToken){ res.redirect("/app"); }
  else { res.send('<h2 style="font-family:sans-serif;padding:40px">Shopify Proxy</h2><a href="/auth"><button style="padding:12px 24px;background:#7c3aed;color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer">Ottieni Token Shopify</button></a>'); }
});

app.get("/app",(req,res)=>{
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Shopify Upload</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"><` + `/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"><` + `/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"><` + `/script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0f;color:#e0e0ff;font-family:'Courier New',monospace}</style>
</head><body><div id="root"></div>
<script type="text/babel">
const{useState,useRef}=React;
function App(){
  const[tab,setTab]=useState("manual");
  const[store,setStore]=useState("");
  const[token,setToken]=useState("");
  const[products,setProducts]=useState([]);
  const[log,setLog]=useState([]);
  const[loading,setLoading]=useState(false);
  const[statuses,setStatuses]=useState({});
  const fileRef=useRef();
  const addLog=(m,t="info")=>setLog(p=>[{m,t,time:new Date().toLocaleTimeString("it-IT")},...p].slice(0,50));
  const[form,setForm]=useState({title:"",vendor:"",productType:"",tags:"",price:"",sku:"",qty:"",status:"ACTIVE",desc:""});
  
  const addProduct=()=>{
    if(!form.title)return addLog("Titolo obbligatorio","error");
    setProducts(p=>[...p,{...form}]);
    setForm({title:"",vendor:"",productType:"",tags:"",price:"",sku:"",qty:"",status:"ACTIVE",desc:""});
    addLog('"'+form.title+'" aggiunto','success');
    setTab("list");
  };

  const handleCSV=f=>{
    if(!f)return;
    const r=new FileReader();
    r.onload=e=>{
      const lines=e.target.result.trim().split("\n");
      const h=lines[0].split(",").map(x=>x.trim().replace(/"/g,"").toLowerCase());
      const ps=lines.slice(1).map(l=>{
        const v=l.split(",").map(x=>x.trim().replace(/"/g,""));
        const o={};h.forEach((k,i)=>o[k]=v[i]||"");
        return{title:o.title||"",vendor:o.vendor||"",productType:o.product_type||o.producttype||"",tags:o.tags||"",price:o.price||"0",sku:o.sku||"",qty:o.inventory_quantity||o.qty||"0",status:(o.status||"ACTIVE").toUpperCase(),desc:o.description||o.body_html||""};
      }).filter(p=>p.title);
      if(!ps.length)return addLog("Nessun prodotto trovato","error");
      setProducts(ps);setStatuses({});addLog(ps.length+" prodotti caricati","success");setTab("list");
    };
    r.readAsText(f);
  };

  const upload=async()=>{
    if(!store||!token)return addLog("Inserisci store e token!","error");
    if(!products.length)return addLog("Nessun prodotto","error");
    setLoading(true);
    for(let i=0;i<products.length;i++){
      if(statuses[i]==="success")continue;
      setStatuses(p=>({...p,[i]:"loading"}));
      const p=products[i];
      try{
        const res=await fetch("/shopify",{
          method:"POST",
          headers:{"Content-Type":"application/json","X-Shopify-Store":store,"X-Shopify-Token":token},
          body:JSON.stringify({
            query:"mutation productCreate($input:ProductInput!){productCreate(input:$input){product{id title}userErrors{field message}}}",
            variables:{input:{title:p.title,descriptionHtml:p.desc,vendor:p.vendor,productType:p.productType,tags:p.tags?p.tags.split(",").map(t=>t.trim()):[],status:p.status,variants:[{price:p.price||"0",sku:p.sku,inventoryQuantities:[{availableQuantity:parseInt(p.qty)||0,locationId:"gid://shopify/Location/1"}]}]}}
          })
        });
        const d=await res.json();
        const ue=d.data?.productCreate?.userErrors||[];
        if(ue.length)throw new Error(ue.map(e=>e.message).join(", "));
        setStatuses(p=>({...p,[i]:"success"}));
        addLog('Creato: '+p.title,"success");
        await new Promise(r=>setTimeout(r,300));
      }catch(e){
        setStatuses(p=>({...p,[i]:"error"}));
        addLog('Errore "'+p.title+'": '+e.message,"error");
      }
    }
    setLoading(false);addLog("Upload completato!","success");
  };

  const s={inp:{width:"100%",background:"#111",border:"1px solid #222",borderRadius:6,color:"#e0e0ff",padding:"8px 10px",fontFamily:"inherit",fontSize:12,outline:"none"},lbl:{fontSize:10,color:"#555",letterSpacing:2,textTransform:"uppercase",marginBottom:4,display:"block"}};
  const ok=Object.values(statuses).filter(x=>x==="success").length;
  const er=Object.values(statuses).filter(x=>x==="error").length;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#050508"}}>
        <span style={{fontWeight:900,letterSpacing:3,textTransform:"uppercase",fontSize:13}}>⬡ Shopify Bulk Upload</span>
        <div style={{display:"flex",gap:16}}>
          {[["Tot","#7c3aed",products.length],["OK","#22c55e",ok],["Err","#ef4444",er]].map(([l,c,v])=>(
            <div key={l} style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:900,color:c,lineHeight:1}}>{v}</div><div style={{fontSize:9,color:"#444"}}>{l}</div></div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{width:260,borderRight:"1px solid #1a1a2e",padding:14,display:"flex",flexDirection:"column",gap:12,background:"#050508",overflowY:"auto"}}>
          <div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8,padding:14}}>
            <label style={s.lbl}>Store Domain</label>
            <input style={{...s.inp,marginBottom:10}} placeholder="mystore.myshopify.com" value={store} onChange={e=>setStore(e.target.value)}/>
            <label style={s.lbl}>Access Token</label>
            <input style={s.inp} type="password" placeholder="shpat_..." value={token} onChange={e=>setToken(e.target.value)}/>
          </div>
          <button onClick={upload} disabled={loading} style={{padding:"11px 0",background:loading?"#1a1a2e":"linear-gradient(135deg,#7c3aed,#4f46e5)",color:loading?"#555":"#fff",border:"none",borderRadius:8,fontFamily:"inherit",fontWeight:900,fontSize:11,letterSpacing:2,cursor:loading?"not-allowed":"pointer",textTransform:"uppercase"}}>
            {loading?"⏳ Caricamento...":"▲ Upload "+products.length+" prodotti"}
          </button>
          <div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8,flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
            <div style={{padding:"8px 12px",borderBottom:"1px solid #1a1a2e",fontSize:9,color:"#555",letterSpacing:2,textTransform:"uppercase"}}>LOG</div>
            <div style={{padding:10,overflowY:"auto",flex:1,fontSize:10}}>
              {!log.length&&<span style={{color:"#1e1e35"}}>Nessuna attività...</span>}
              {log.map((l,i)=><div key={i} style={{padding:"2px 0",borderBottom:"1px solid #0a0a12",color:l.t==="error"?"#ef4444":l.t==="success"?"#22c55e":"#444",lineHeight:1.5}}>{l.time} {l.m}</div>)}
            </div>
          </div>
        </div>
        <div style={{flex:1,padding:18,overflowY:"auto"}}>
          <div style={{display:"flex",gap:4,marginBottom:16}}>
            {[["csv","📄 CSV"],["manual","✏ Manuale"],["list","📦 Lista ("+products.length+")"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} style={{padding:"7px 16px",background:tab===id?"#1a1a2e":"transparent",border:tab===id?"1px solid #2a2a4e":"1px solid transparent",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:11,color:tab===id?"#7c3aed":"#444",fontWeight:tab===id?700:400}}>{lbl}</button>
            ))}
          </div>
          {tab==="csv"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div onClick={()=>fileRef.current.click()} style={{border:"2px dashed #1a1a2e",borderRadius:10,padding:"50px 20px",textAlign:"center",cursor:"pointer"}}>
                <div style={{fontSize:40,marginBottom:12}}>📥</div>
                <div style={{color:"#555",marginBottom:6}}>Trascina il CSV qui</div>
                <div style={{fontSize:11,color:"#222"}}>oppure clicca per selezionare</div>
                <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>handleCSV(e.target.files[0])}/>
              </div>
              <div style={{fontSize:10,color:"#333"}}>Colonne: title, vendor, product_type, tags, price, sku, inventory_quantity, status, description</div>
            </div>
          )}
          {tab==="manual"&&(
            <div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #1a1a2e",fontSize:9,color:"#555",letterSpacing:2,textTransform:"uppercase"}}>AGGIUNGI PRODOTTO</div>
              <div style={{padding:14}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  {[["Titolo *","title","Nome prodotto"],["Vendor","vendor","Brand"],["Tipo Prodotto","productType","Abbigliamento"],["Tag","tags","estate, promo"],["Prezzo (€)","price","29.99"],["SKU","sku","SKU-001"],["Quantità","qty","10"]].map(([l2,k,ph])=>(
                    <div key={k}><label style={s.lbl}>{l2}</label><input style={s.inp} placeholder={ph} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>
                  ))}
                  <div><label style={s.lbl}>Stato</label><select style={s.inp} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option value="ACTIVE">ACTIVE</option><option value="DRAFT">DRAFT</option><option value="ARCHIVED">ARCHIVED</option></select></div>
                </div>
                <label style={s.lbl}>Descrizione (HTML)</label>
                <textarea style={{...s.inp,resize:"vertical",minHeight:60,marginBottom:12}} value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} placeholder="<p>Descrizione</p>"/>
                <button onClick={addProduct} style={{padding:"9px 18px",background:"linear-gradient(135deg,#7c3aed,#4f46e5)",color:"#fff",border:"none",borderRadius:6,fontFamily:"inherit",fontWeight:900,fontSize:11,cursor:"pointer"}}>+ Aggiungi alla lista</button>
              </div>
            </div>
          )}
          {tab==="list"&&(
            <div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #1a1a2e",fontSize:9,color:"#555",letterSpacing:2,textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>LISTA PRODOTTI</span>
                {products.length>0&&<button onClick={()=>{setProducts([]);setStatuses({});}} style={{padding:"3px 8px",background:"#ef444415",border:"1px solid #ef444430",borderRadius:4,color:"#ef4444",cursor:"pointer",fontFamily:"inherit",fontSize:9}}>Svuota</button>}
              </div>
              <div style={{padding:10}}>
                {!products.length&&<div style={{textAlign:"center",padding:30,color:"#1e1e35",fontSize:12}}>Nessun prodotto.</div>}
                {products.map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #0f0f1a"}}>
                    <div style={{width:26,height:26,background:"#1a1a2e",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#444",flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:"#e0e0ff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                      <div style={{fontSize:9,color:"#333",marginTop:2}}>{p.vendor&&<span style={{marginRight:6}}>🏷 {p.vendor}</span>}{p.price&&<span style={{marginRight:6}}>💶 €{p.price}</span>}</div>
                    </div>
                    <span style={{background:statuses[i]==="success"?"#0d2e1a":statuses[i]==="error"?"#2e0d0d":statuses[i]==="loading"?"#1a1a3e":"#1a1a2e",color:statuses[i]==="success"?"#22c55e":statuses[i]==="error"?"#ef4444":statuses[i]==="loading"?"#7c3aed":"#444",border:"1px solid "+(statuses[i]==="success"?"#22c55e33":statuses[i]==="error"?"#ef444433":"#33333344"),borderRadius:4,padding:"2px 7px",fontSize:9,fontWeight:700,whiteSpace:"nowrap"}}>
                      {statuses[i]==="success"?"✓ OK":statuses[i]==="error"?"✗ Err":statuses[i]==="loading"?"⏳":"In attesa"}
                    </span>
                    <button onClick={()=>setProducts(p=>p.filter((_,idx)=>idx!==i))} style={{padding:"2px 6px",background:"#ef444415",border:"1px solid #ef444430",borderRadius:4,color:"#ef4444",cursor:"pointer",fontFamily:"inherit",fontSize:10}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
</script></body></html>`);
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
