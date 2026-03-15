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

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const STORE = process.env.STORE;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3000/callback";

let accessToken = null;

app.get("/",(req,res)=>{
  if(accessToken){
    res.send(`<h2>Proxy attivo con token!</h2><p style="font-family:monospace;word-break:break-all;background:#eee;padding:12px">${accessToken}</p>`);
  } else {
    res.send(`<h2>Shopify Proxy</h2><a href="/auth"><button style="padding:12px 24px;background:#7c3aed;color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer">Ottieni Token Shopify</button></a>`);
  }
});

app.get("/auth",(req,res)=>{
  const url=`https://${STORE}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=write_products,read_products&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(url);
});

app.get("/callback",async(req,res)=>{
  const{code}=req.query;
  if(!code) return res.send("Errore: nessun codice");
  try{
    const r=await fetch(`https://${STORE}/admin/oauth/access_token`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,code})
    });
    const d=await r.json();
    accessToken=d.access_token;
    console.log("Token:",accessToken);
    res.send(`<h2>Token ottenuto!</h2><p style="font-family:monospace;word-break:break-all;background:#eee;padding:12px">${accessToken}</p><p>Copia questo token nell'interfaccia!</p>`);
  } catch(e){
    res.send("Errore: "+e.message);
  }
});

app.post("/shopify",async(req,res)=>{
  const token=req.headers["x-shopify-token"]||accessToken;
  const store=req.headers["x-shopify-store"]||STORE;
  if(!token) return res.status(401).json({error:"Vai su /auth prima"});
  try{
    const r=await fetch(`https://${store}/admin/api/2026-01/graphql.json`,{
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

app.listen(3000,()=>console.log("Proxy OAuth attivo su http://localhost:3000"));
