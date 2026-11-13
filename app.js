const KEY="mh-dashboard-theme";
const $=s=>document.querySelector(s);
let links=[],category=window.matchMedia("(max-width: 700px)").matches?"Mobile":"Desktop",editing=false,editId=null,timer,setupPin=false,editAccessResolver=null;
const host=url=>{try{return new URL(url).hostname}catch{return url}};
const valid=url=>{try{return ["http:","https:"].includes(new URL(url).protocol)}catch{return false}};
async function api(path,method="GET",body){
  const r=await fetch("/api/"+path,{method,credentials:"same-origin",headers:{"content-type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch{}
  if(!r.ok)throw Error(d.error||("Request failed ("+r.status+"): "+raw.slice(0,220)));
  return d;
}
async function save(){await api("bookmarks","PUT",links)}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>el.classList.remove("show"),2400)}
function render(){
  $("#mobile-view").classList.toggle("active",category==="Mobile");
  $("#desktop-view").classList.toggle("active",category==="Desktop");
  $("#mobile-view").setAttribute("aria-pressed",String(category==="Mobile"));
  $("#desktop-view").setAttribute("aria-pressed",String(category==="Desktop"));
  const items=links.filter(x=>x.category===category),grid=$("#grid");grid.innerHTML="";grid.classList.toggle("editing",editing);
  items.forEach(item=>{
    const a=document.createElement("a");a.className="bookmark";a.href=item.url;a.target="_blank";a.rel="noopener noreferrer";
    const icon=document.createElement("span");icon.className="favicon";icon.textContent=item.name[0].toUpperCase();
    const img=document.createElement("img");img.src="https://www.google.com/s2/favicons?domain="+encodeURIComponent(host(item.url))+"&sz=64";img.alt="";img.onerror=()=>img.remove();img.onload=()=>{icon.textContent="";icon.append(img)};
    const copy=document.createElement("span");copy.className="bookmark-copy";const name=document.createElement("span");name.className="bookmark-name";name.textContent=item.name;copy.append(name);
    const actions=document.createElement("span");actions.className="edit-actions";
    const edit=document.createElement("button");edit.className="mini";edit.type="button";edit.textContent="✎";edit.title="Edit";edit.onclick=e=>{e.preventDefault();e.stopPropagation();openForm(item.id)};
    const del=document.createElement("button");del.className="mini";del.type="button";del.textContent="×";del.title="Delete";del.onclick=async e=>{e.preventDefault();e.stopPropagation();if(!confirm("Remove "+item.name+"?"))return;const old=links;links=links.filter(x=>x.id!==item.id);try{await save();render();toast("Removed")}catch(err){links=old;render();toast(err.message)}};
    actions.append(edit,del);a.append(icon,copy,actions);if(editing)a.onclick=e=>e.preventDefault();grid.append(a);
  });
  if(editing){
    const add=document.createElement("button");add.type="button";add.className="bookmark add-bookmark";add.innerHTML='<span class="add-plus">＋</span><span class="bookmark-name">Add link</span>';add.onclick=()=>openForm();grid.append(add);
  }
  $("#empty").classList.toggle("hidden",items.length>0||editing);
  $("#edit").textContent=editing?"Done":"Edit links";
}
function openForm(id=null){
  editId=id;const item=links.find(x=>x.id===id);$("#dialog-title").textContent=item?"Edit link":"Add link";
  $("#name").value=item?.name||"";$("#url").value=item?.url||"";$("#category").value=item?.category||category;
  $("#editor").showModal();$("#name").focus();
}
function closeForm(){$("#editor").close();editId=null}
function finishEditAccess(allowed){$("#pin-dialog").close();const resolve=editAccessResolver;editAccessResolver=null;if(resolve)resolve(allowed)}
async function ensureEditAccess(){
  const s=await api("auth/status");if(s.authenticated)return true;
  setupPin=!s.configured;$("#pin-dialog-title").textContent=setupPin?"Create PIN":"Enter PIN";
  $("#pin-submit").textContent=setupPin?"Set PIN":"Unlock";$("#pin-input").value="";$("#pin-error").textContent="";
  $("#pin-dialog").showModal();$("#pin-input").focus();
  return new Promise(resolve=>{editAccessResolver=resolve});
}
function theme(t){document.documentElement.dataset.theme=t;localStorage.setItem(KEY,t)}
$("#mobile-view").onclick=()=>{category="Mobile";render()};
$("#desktop-view").onclick=()=>{category="Desktop";render()};
$("#google-search").onsubmit=e=>{e.preventDefault();const q=$("#search-query").value.trim();if(q)location.href="https://www.google.com/search?q="+encodeURIComponent(q)};
$("#add").onclick=async()=>{try{if(await ensureEditAccess())openForm()}catch(err){toast(err.message)}};
$("#edit").onclick=async()=>{if(!editing){try{if(!await ensureEditAccess())return}catch(err){toast(err.message);return}}editing=!editing;render()};
$("#pin-auth-form").onsubmit=async e=>{
  e.preventDefault();$("#pin-submit").disabled=true;
  try{await api(setupPin?"auth/setup":"auth/login","POST",{pin:$("#pin-input").value});finishEditAccess(true)}
  catch(err){$("#pin-error").textContent=err.message}
  finally{$("#pin-submit").disabled=false}
};
$("#pin-cancel").onclick=()=>finishEditAccess(false);$("#pin-close").onclick=()=>finishEditAccess(false);$("#pin-dialog").oncancel=e=>{e.preventDefault();finishEditAccess(false)};
$("#bookmark-form").onsubmit=async e=>{
  e.preventDefault();const name=$("#name").value.trim();let url=$("#url").value.trim();
  if(!url.startsWith("http://")&&!url.startsWith("https://"))url="https://"+url;
  if(!name||!valid(url)){toast("Enter a valid name and URL");return}
  const item={id:editId||crypto.randomUUID(),name,url,category:$("#category").value};
  const old=links;if(editId)links=links.map(x=>x.id===editId?item:x);else links.push(item);
  try{await save();category=item.category;render();closeForm();toast("Saved")}
  catch(err){links=old;render();toast(err.message)}
};
$("#cancel").onclick=closeForm;$("#close").onclick=closeForm;$("#editor").onclick=e=>{if(e.target===$("#editor"))closeForm()};
$("#theme").onclick=()=>theme(document.documentElement.dataset.theme==="dark"?"light":"dark");
async function start(){
  try{
    const d=await api("bookmarks");
    links=(d.bookmarks||[]).map(x=>({...x,category:x.category==="Daily"?"Mobile":"Desktop"}));
    render();
  }catch(err){toast(err.message);$("#empty").classList.remove("hidden");$("#empty").textContent="Unable to load bookmarks: "+err.message}
}
theme(localStorage.getItem(KEY)||"dark");start();
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
window.addEventListener("error",e=>{const el=$("#empty");if(el){el.textContent="Dashboard error: "+(e.message||"Unable to start");el.classList.remove("hidden")}});
