const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
const PORT=process.env.PORT||3000, ROOT=path.join(__dirname,'public'), DATA=path.join(__dirname,'data','progress.json');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
function progress(){try{return JSON.parse(fs.readFileSync(DATA,'utf8'))}catch{return {}}}
function save(v){fs.mkdirSync(path.dirname(DATA),{recursive:true});fs.writeFileSync(DATA,JSON.stringify(v,null,2))}
function send(res,status,type,body){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(body)}
const server=http.createServer((req,res)=>{
 const u=url.parse(req.url,true); if(u.pathname==='/api/health')return send(res,200,mime['.json'],JSON.stringify({ok:true,app:'Learning Hub'}));
 if(u.pathname==='/api/progress'){
  if(req.method==='GET')return send(res,200,mime['.json'],JSON.stringify(progress()));
  if(req.method==='POST'){let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{try{const next={...progress(),...JSON.parse(raw||'{}'),updatedAt:new Date().toISOString()};save(next);send(res,200,mime['.json'],JSON.stringify(next))}catch(e){send(res,400,mime['.json'],JSON.stringify({error:'Invalid JSON'}))}});return}
 }
 let pathname=decodeURIComponent(u.pathname);if(pathname==='/')pathname='/index.html';const file=path.join(ROOT,pathname);if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return send(res,404,'text/plain; charset=utf-8','Not found');const ext=path.extname(file);send(res,200,mime[ext]||'application/octet-stream',fs.readFileSync(file));
});
server.listen(PORT,()=>console.log(`Learning Hub running at http://localhost:${PORT}`));
