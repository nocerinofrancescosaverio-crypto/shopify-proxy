require('dotenv').config();
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
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
  if(accessToken){
    res.send("<h2>Proxy attivo!</h2><p>Token attivo</p><p><a href='/app'><button style='padding:12px 24px;background:#7c3aed;color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer'>Apri interfaccia upload</button></a></p>");
  } else {
    res.send("<h2>Shopify Proxy</h2><a href='/auth'><button style='padding:12px 24px;background:#7c3aed;color:white;border:none;border-radius:6px;font-size:16px;cursor:pointer'>Ottieni Token Shopify</button></a>");
  }
});

app.get("/app",(req,res)=>{
  const htmlPath = path.join(__dirname, "app.html");
  if(fs.existsSync(htmlPath)){
    res.sendFile(htmlPath);
  } else {
    res.status(404).send("app.html non trovato");
  }
});

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
