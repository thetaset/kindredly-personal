import{u as Ge,o as Xe,d as Ye}from"./vue-routerB3G8mEcT.js";import{c as $,a as _,d as ve,e as Q,V as h,D as Ne,w as fe,O as De,l as I,r as Y,v as o,s as P,q as m,f as g,P as z,i as K,u,F as ce,N as be,X as x,Q as pe,k as Qe,a5 as Ze,ae as et}from"./@vueCtd8-HiN.js";import{aF as Ae,a8 as tt,h as nt,w as lt,a7 as we}from"../kindredapp.js";import{A as st}from"./AIChatBLS7kVbH.js";import{j as ot,L as it,_ as Pe}from"./appLifecycle.storeDV-_C-2q.js";import{E as oe,H as Te,a as at,l as rt,h as dt,b as ut,c as ct,k as pt,j as mt,s as ft,d as vt,e as gt}from"./@codemirrorCSyLSpY1.js";import{c as l}from"./@lezerDh5WpArN.js";import{ag as yt,u as ht}from"./shared.routerCtEwi7HW.js";import{c as Re,d as Le}from"./scopedSettings.storeD_Za_Fcf.js";import"./@capacitorBG_K_yge.js";import"./ProfileImageD-1G7e1k.js";import"./PopCollectionSelectorBGbxQQtH.js";import"./ai_lookup_utilszDX_hcwM.js";import"./@panzoomCD_ascQE.js";import"./browserTabsC3A_Jl9U.js";import"./uuidCtRu48qb.js";import"./ItemTargetAudiences.vue_vue_type_style_index_0_langLGtArKCl.js";import"./markedJKvyS0Pp.js";import"./vue-zoomableBLXd2R8g.js";import"./@mozillaBrJfp29b.js";import"./vue-advanced-cropperCGrSeOzG.js";import"./@popperjsCMBiYTiD.js";import"./StoreManager10vlrVI-.js";import"./capacitor-voice-recorderB9cXHgDc.js";import"./get-blob-durationDUCDev_n.js";import"./regenerator-runtimeCcLl7eFE.js";import"./jszipB8mI1PDt.js";import"./vue3-toastifyBpmUfSCL.js";import"./useSignoutcbwf31FN.js";import"./BMsgModalBzkoEAoV.js";import"./dexie2jmnBxhj.js";import"./cheeriooB1Ban_v.js";import"./domutilsCSs4Yu05.js";import"./dom-serializerCAKihyU5.js";import"./domelementtypeDeL8KIEa.js";import"./entitiesBSSQ2igZ.js";import"./domhandler61xZxFyn.js";import"./cheerio-selectDk27CJ-3.js";import"./css-selectCH737BbO.js";import"./boolbaseBVMPG_4Y.js";import"./css-whatMv3Umv1t.js";import"./nth-checkDgFjABJy.js";import"./parse5C7aI1ke4.js";import"./parse5-htmlparser2-tree-adapterT7rzP1WZ.js";import"./htmlparser2Yb576asZ.js";import"./bootstrap-vue-nextET8i0Hhm.js";import"./@vueuserLFXRxTI.js";import"./vue-plugin-load-scriptXwA-LyvJ.js";import"./aiAgentApprovals.storeDW8-25U-.js";import"./@marijnDXwl3gUT.js";import"./style-modBc2inJdb.js";import"./w3c-keynameVcq4gwWv.js";const R=_(null),ne=_([]),S=_(null),L=_(""),q=_(""),ie=_(!1),ae=_(!1),W=_(""),me=_(new Map),je=_(!1);function Be(){const Z=$(()=>{var a;return(a=S.value)==null?void 0:a.id}),B=$(()=>{var a;return(a=S.value)==null?void 0:a.filename}),t=$(()=>{var a;return(a=R.value)==null?void 0:a._id}),n=$(()=>L.value!==q.value);function F(a,r,d){me.value.has(a)||me.value.set(a,[]);const w=me.value.get(a);w.length>0&&w[w.length-1].content===r||(w.push({timestamp:Date.now(),content:r,label:d}),w.length>50&&w.shift())}function A(a){return me.value.get(a)||[]}async function V(a){var r,d,w,C;ie.value=!0,W.value="",(r=R.value)!=null&&r._id&&R.value._id!==a&&(S.value=null,L.value="",q.value="");try{const f=await nt({itemId:a,detailsOnly:!0});if(!(f!=null&&f.details))throw new Error("Item not found");return R.value=f.details,ne.value=((C=(w=(d=R.value)==null?void 0:d.attachments)==null?void 0:w.entries)==null?void 0:C.filter(O=>O.fileType==="obj/js"))||[],ie.value=!1,!0}catch(f){return console.error("Error loading item:",f),W.value=f instanceof Error?f.message:"Failed to load item",ie.value=!1,!1}}async function X(a){console.log(`Loading file content: ${a.filename}, attachmentId: ${a.id}, fileId: ${a.fileId}`);try{const r=await tt(a.fileId,!1,void 0);if(!r||r==="null"||r==="")return console.warn("File has no content yet, initializing as empty"),L.value=`// Empty file
`,q.value=`// Empty file
`,!0;const d=JSON.parse(r);return d.code!==void 0?(L.value=d.code||`// Empty file
`,q.value=d.code||`// Empty file
`,F(a.id,d.code,"Loaded from server"),!0):(console.warn("No code property in file data, initializing as empty"),L.value=`// Empty file
`,q.value=`// Empty file
`,!0)}catch(r){return console.error("Error loading file content:",r),r instanceof Error&&(r.message.includes("not found")||r.message.includes("User file not found"))?(console.warn("File ID is stale or file not found - cannot load content"),W.value="File not found - may need to reload",!1):(console.warn("Unknown error loading file, initializing as empty"),L.value=`// Empty file
`,q.value=`// Empty file
`,W.value=r instanceof Error?r.message:"Failed to load file",!1)}}async function k(a){S.value&&L.value&&F(S.value.id,L.value,"Before switching files"),S.value=a;const r=await X(a);return console.log(`Selected file: ${a.filename}, loaded: ${r}`),r}function i(a,r){if(!S.value){console.error("Cannot update code: no file selected");return}L.value!==a&&F(S.value.id,L.value,"Before update"),L.value=a,r&&F(S.value.id,a,r),console.log(`Code updated for ${S.value.filename}, unsaved: ${n.value}`)}async function N(){var w,C;if(!S.value||!R.value)return console.error("No file selected or item not loaded"),!1;const a=ne.value.find(f=>{var O;return f.id===((O=S.value)==null?void 0:O.id)});if(!a)return console.error(`File ${S.value.filename} does not belong to current item ${R.value._id}`),W.value="File does not belong to current item. Please reload.",!1;const r=a.fileId;ae.value=!0;const d=S.value.filename;try{F(S.value.id,L.value,"Saved");const f={code:L.value},O=await Ae(R.value,f,S.value.filename,"obj/js",r);if(console.log("File saved successfully",O),O&&typeof O=="object"&&O.fileId){if(console.log(`File ${d} - Old fileId: ${r}, New fileId: ${O.fileId}`),S.value={...S.value,...O},q.value=L.value,F(S.value.id,L.value,"Saved with new fileId"),(w=R.value)!=null&&w._id){await V(R.value._id);const M=ne.value.find(H=>{var J;return H.id===((J=S.value)==null?void 0:J.id)});M&&(S.value=M)}}else if((C=R.value)!=null&&C._id){await V(R.value._id);const M=ne.value.find(H=>H.filename===d);M?(console.log(`File ${d} - Reloaded with fileId: ${M.fileId}`),S.value=M,q.value=L.value,F(M.id,L.value,"After save reload")):console.error(`Could not find file ${d} after reload!`)}return ae.value=!1,!0}catch(f){return console.error("Error saving file:",f),W.value=f instanceof Error?f.message:"Failed to save file",ae.value=!1,!1}}async function j(a){var r,d;if(!R.value)return console.error("Item not loaded"),!1;try{return await ot("/item/attachment/remove",{itemId:R.value._id,attachmentId:a.id}),await it.refreshQuick(),console.log("File deleted successfully"),((r=S.value)==null?void 0:r.id)===a.id&&(S.value=null,L.value="",q.value=""),(d=R.value)!=null&&d._id&&await V(R.value._id),!0}catch(w){return console.error("Error deleting file:",w),W.value=w instanceof Error?w.message:"Failed to delete file",!1}}function c(a){L.value=a.content,S.value&&F(S.value.id,a.content,"Reverted")}async function b(a,r=""){var d;if(!R.value)return console.error("Item not loaded"),!1;try{if(ne.value.find(f=>f.filename===a))return console.warn(`File ${a} already exists`),W.value=`File ${a} already exists`,!1;const C={code:r};return await Ae(R.value,C,a,"obj/js"),console.log(`File created successfully: ${a}`),(d=R.value)!=null&&d._id&&await V(R.value._id),!0}catch(w){return console.error("Error creating file:",w),W.value=w instanceof Error?w.message:"Failed to create file",!1}}function v(){R.value=null,ne.value=[],S.value=null,L.value="",q.value="",ie.value=!1,ae.value=!1,W.value=""}return{item:$(()=>R.value),jsFiles:$(()=>ne.value),selectedFile:$(()=>S.value),codeInput:$(()=>L.value),lastSavedContent:$(()=>q.value),hasUnsavedChanges:n,loading:$(()=>ie.value),saving:$(()=>ae.value),error:$(()=>W.value),currentFileId:Z,currentFileName:B,itemId:t,simpleMode:$(()=>je.value),codeInputRef:L,simpleModeRef:je,loadItem:V,loadFileContent:X,selectFile:k,updateCode:i,saveFile:N,deleteFile:j,createFile:b,revertToVersion:c,getFileHistory:A,addToHistory:F,reset:v}}const Me=ve({__name:"AppCreatorChat",props:{agentMode:{type:Boolean}},setup(Z){const B=Z,t=Be();async function n(k){const i=F();return!i||!k?null:await new Promise(N=>{let j=!1;const c=setTimeout(()=>{v({sessionId:i,requestId:k,success:!1,timedOut:!0,errors:[{message:"Run timed out (no response)"}]})},6500),b=()=>{window.removeEventListener("app-creator-run-result",a),clearTimeout(c)},v=r=>{j||(j=!0,b(),N(r))},a=r=>{const d=r==null?void 0:r.detail;d&&d.sessionId===i&&d.requestId===k&&v(d)};window.addEventListener("app-creator-run-result",a),window.dispatchEvent(new CustomEvent("app-creator-run-request",{detail:{sessionId:i,requestId:k,timeoutMs:6e3}}))})}function F(){const k=t.itemId.value;return k?`APP_EDITOR_${k}`:null}const A=$(()=>t.selectedFile.value?{text:`Context: ${t.selectedFile.value.filename}`,icon:"file-code",warning:t.hasUnsavedChanges.value?"(unsaved changes)":void 0}:{text:"No file selected - select a file in the editor first",icon:"exclamation-triangle",warning:"required"});function V(){var i,N,j,c,b,v,a,r,d;return{appContext:{selectedFile:t.selectedFile.value?{filename:t.selectedFile.value.filename,id:t.selectedFile.value.id}:null,currentCode:t.codeInputRef.value,allFiles:t.jsFiles.value.map(w=>({filename:w.filename,id:w.id})),hasUnsavedChanges:t.hasUnsavedChanges.value},includedInfo:[{_id:(i=t.item.value)==null?void 0:i._id,name:(N=t.item.value)==null?void 0:N.name,type:"item_app",description:"JavaScript App Development",currentFile:(j=t.selectedFile.value)==null?void 0:j.filename,code:t.codeInputRef.value},{_id:`APP_SANDBOX_RUNTIME_${((c=t.item.value)==null?void 0:c._id)||"unknown"}`,name:"App Sandbox: Runtime Notes (read this first)",type:"app_api_reference",description:"Key sandbox runtime/bridge constraints and common gotchas when developing apps.",code:["Runtime:","- Apps run in an <iframe sandbox> without allow-same-origin (opaque origin).","- Dev: sandbox module requests may show Origin: null; Vite dev server allows this.","","Host API bridge:","- Use window.kindredly.* APIs (refState/net) instead of direct host imports.","- Calls go through postMessage and are token-gated by the host; treat as async RPC.","- Host API responses should NOT cause your UI to rerender/reset; only rerun when host sends run-code.","","Debugging:","- Compile/runtime errors should surface in the host UI with richer details (location/context).",'- If you see "waiting for sandbox to load", suspect base-path/asset URL issues in sandbox.html.'].join(`
`)},{_id:`APP_SANDBOX_DOS_DONTS_${((b=t.item.value)==null?void 0:b._id)||"unknown"}`,name:"App Sandbox: Do's and Don'ts",type:"app_api_reference",description:"Checklist for writing sandbox app code that runs reliably in this environment.",code:["DO:","- Render into the existing #app element (document.getElementById('app')).","- Wrap your app in an IIFE (or async IIFE) so it runs immediately.","- Keep code self-contained (no external bundling assumptions).","- Use host APIs for privileged actions:","    - await kindredly.refState.* for local persistence","    - await kindredly.sharedRefState.* for server-backed persistence (permissioned)","    - await kindredly.net.fetchJson(...) for network","    - await kindredly.files.* to read this item's attachments","- Handle permissions/errors: wrap host API calls in try/catch and show a user-friendly message.","- Keep Ref State values JSON-serializable (objects/arrays/primitives).","- When using net.fetchJson: check res.ok, handle non-2xx, and show status/body info.","- Treat sandbox.html as read-only context provided by the host.","","DON'T:","- Don't use ESM imports (import ... from ...) inside app code; it runs via compiled IIFE + new Function.","- Don't assume cookies/auth headers are sent on net.fetchJson (credentials are omitted).","- Don't rely on window.parent / cross-origin access directly; use window.kindredly.* instead.","- Don't store huge blobs in Ref State; keep it compact JSON.","- Don't create or edit .html files (including sandbox.html). The host provides sandbox.html; only modify JS/CSS/assets.","","GOOD DEFAULT SKELETON:","(async () => {","  const app = document.getElementById('app')","  if (!app) return","  app.innerHTML = '<h3>Hello</h3>'","  // await kindredly.refState.set('k','v',{ scope:'user', namespace:'demo' })","})().catch(err => {","  const app = document.getElementById('app')","  if (app) app.textContent = String(err?.message || err)","})"].join(`
`)},{_id:`APP_API_REFSTATE_${((v=t.item.value)==null?void 0:v._id)||"unknown"}`,name:"App Host API: Ref State",type:"app_api_reference",description:"Use window.kindredly.refState for local persistent state (no prompts).",code:["Available in sandboxed apps:",'  await kindredly.refState.get(key, { scope: "user"|"account", namespace })',"  await kindredly.refState.set(key, value, { scope, namespace })","  await kindredly.refState.delete(key, { scope, namespace })","  const { entries } = await kindredly.refState.list({ scope, namespace, limit })","","Notes:","- No permission prompts; data is stored locally and scoped to this item + namespace.",'- scope="user" vs scope="account" are local namespaces only (not shared across devices).',"- Values must be JSON-serializable (objects/arrays/primitives).","- Primitives/arrays are supported: host wraps/unwraps values for server JSON + encryption compatibility."].join(`
`)},{_id:`APP_API_SHARED_REFSTATE_${((a=t.item.value)==null?void 0:a._id)||"unknown"}`,name:"App Host API: Shared Ref State",type:"app_api_reference",description:"Use window.kindredly.sharedRefState for server-backed persistent state (permissioned).",code:["Available in sandboxed apps:",'  await kindredly.sharedRefState.get(key, { scope: "user"|"account", namespace })',"  await kindredly.sharedRefState.set(key, value, { scope, namespace })","  await kindredly.sharedRefState.delete(key, { scope, namespace })","  const { entries } = await kindredly.sharedRefState.list({ scope, namespace, limit })","","Notes:","- First call prompts the user to allow access (prompt-on-first-use).",'- scope="account" is shared across users in the account.',"- Values must be JSON-serializable (objects/arrays/primitives)."].join(`
`)},{_id:`APP_API_NET_${((r=t.item.value)==null?void 0:r._id)||"unknown"}`,name:"App Host API: Network",type:"app_api_reference",description:"Use window.kindredly.net.fetchJson for permissioned remote API calls (e.g., weather).",code:["Available in sandboxed apps:",'  const res = await kindredly.net.fetchJson("https://api.open-meteo.com/v1/forecast?...", { timeoutMs })',"  if (!res.ok) throw new Error(`HTTP ${res.status}`)","  console.log(res.json)","","Notes:","- First call prompts the user to allow that hostname (prompt-on-first-use).","- Requests do not send cookies (credentials omitted).","- Only https:// is allowed (http:// allowed only for localhost)."].join(`
`)},{_id:`APP_API_FILES_${((d=t.item.value)==null?void 0:d._id)||"unknown"}`,name:"App Host API: Files (Item Attachments)",type:"app_api_reference",description:"Read this item's attachments (no prompts; same-item only).",code:["Available in sandboxed apps:","  const { files } = await kindredly.files.list({ prefix })",'  const text = await kindredly.files.readText("data.json")','  const json = await kindredly.files.readJson("data.json")','  const dataUrl = await kindredly.files.readDataUrl("image.png")','  const { bytes, fileType } = await kindredly.files.readBytes("archive.zip")','  const { entries } = await kindredly.files.zipList("archive.zip")','  const entryText = await kindredly.files.zipReadText("archive.zip", "path/in/zip.txt")','  const { bytes: entryBytes } = await kindredly.files.zipReadBytes("archive.zip", "path/in/zip.bin")',"","Notes:","- The host resolves filenames only within the current item attachments.","- readText/readJson are decoded/parsed by the host (app code does not decode base64).","- readBytes/zipReadBytes return Uint8Array via built-in decoding helpers."].join(`
`)}]}}async function X({type:k,data:i}){var N,j;console.log("🎭 AppCreatorChat handleEditorAction called:",{type:k,hasData:!!i,dataKeys:i?Object.keys(i):[]});try{if(k==="UPDATE_CODE"){console.log("🎭 Processing UPDATE_CODE action");const c=(i==null?void 0:i.requestId)||(i==null?void 0:i.__requestId);if(!i||!i.code){console.error("❌ UPDATE_CODE missing code data");return}if(!t.selectedFile.value){console.error("❌ UPDATE_CODE called but no file is selected");return}const b=String((i==null?void 0:i.filename)||t.selectedFile.value.filename||"").trim();if(b.toLowerCase().endsWith(".html")){const v=`Blocked: HTML files are read-only in this environment (including sandbox.html). Refusing to modify ${b}.`;console.warn(v),c&&window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:c,success:!1,actionType:k,actionResult:{success:!1,error:v,filename:b},appContext:{selectedFile:t.selectedFile.value?{filename:t.selectedFile.value.filename,id:t.selectedFile.value.id}:null,currentCode:t.codeInputRef.value,allFiles:t.jsFiles.value.map(a=>({filename:a.filename,id:a.id})),hasUnsavedChanges:t.hasUnsavedChanges.value}}}));return}if(i.filename&&t.selectedFile.value.filename!==i.filename&&console.warn(`⚠️ File mismatch: expected ${i.filename}, but ${t.selectedFile.value.filename} is selected`),console.log("🎭 Updating code, length:",i.code.length),t.updateCode(i.code,i.explanation||"AI update"),console.log("🎭 Saving file..."),await t.saveFile(),console.log("✅ File saved successfully"),c){const v=B.agentMode?await n(c):null;window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:c,success:!0,actionType:k,actionResult:{success:!0,filename:(N=t.selectedFile.value)==null?void 0:N.filename,runResult:v},appContext:{selectedFile:t.selectedFile.value?{filename:t.selectedFile.value.filename,id:t.selectedFile.value.id}:null,currentCode:t.codeInputRef.value,allFiles:t.jsFiles.value.map(a=>({filename:a.filename,id:a.id})),hasUnsavedChanges:t.hasUnsavedChanges.value}}}))}}else if(k==="PATCH_CODE"){if(!t.selectedFile.value){console.error("❌ PATCH_CODE called but no file is selected");return}const c=(i==null?void 0:i.requestId)||(i==null?void 0:i.__requestId),b=String((i==null?void 0:i.filename)||t.selectedFile.value.filename||"").trim();if(b.toLowerCase().endsWith(".html")){const C=`Blocked: HTML files are read-only in this environment (including sandbox.html). Refusing to modify ${b}.`;console.warn(C),c&&window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:c,success:!1,actionType:k,actionResult:{success:!1,error:C,filename:b},appContext:{selectedFile:t.selectedFile.value?{filename:t.selectedFile.value.filename,id:t.selectedFile.value.id}:null,currentCode:t.codeInputRef.value,allFiles:t.jsFiles.value.map(f=>({filename:f.filename,id:f.id})),hasUnsavedChanges:t.hasUnsavedChanges.value}}}));return}const v=i==null?void 0:i.edits;if(!Array.isArray(v)||v.length===0){console.error("❌ PATCH_CODE missing edits array"),c&&window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:c,success:!1,actionType:k,actionResult:{success:!1,error:"PATCH_CODE requires edits[]"}}}));return}const a=(C,f,O,M)=>{M<1&&(M=1);let H=0,J=-1;for(let re=0;re<M;re++){if(J=C.indexOf(f,H),J===-1)return{updated:C,replaced:0};H=J+f.length}return{updated:C.slice(0,J)+O+C.slice(J+f.length),replaced:1}};let r=t.codeInputRef.value||"",d=0;const w=[];for(const C of v){const f=String((C==null?void 0:C.find)||""),O=String((C==null?void 0:C.replace)??"");if(f)if(C!=null&&C.all){const M=r.split(f).length-1;if(M===0){w.push(f);continue}r=r.split(f).join(O),d+=M}else{const M=typeof(C==null?void 0:C.occurrence)=="number"?C.occurrence:1,H=a(r,f,O,M);if(H.replaced===0){w.push(f);continue}r=H.updated,d+=H.replaced}}if(w.length>0){const C=`Could not find ${w.length} edit target(s) in the current file.`;console.error("❌ PATCH_CODE failed:",C),c&&window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:c,success:!1,actionType:k,actionResult:{success:!1,error:C,missingFinds:w},appContext:{selectedFile:t.selectedFile.value?{filename:t.selectedFile.value.filename,id:t.selectedFile.value.id}:null,currentCode:t.codeInputRef.value,allFiles:t.jsFiles.value.map(f=>({filename:f.filename,id:f.id})),hasUnsavedChanges:t.hasUnsavedChanges.value}}}));return}if(t.updateCode(r,i.explanation||"AI patch"),await t.saveFile(),c){const C=B.agentMode?await n(c):null;window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:c,success:!0,actionType:k,actionResult:{success:!0,filename:(j=t.selectedFile.value)==null?void 0:j.filename,replaced:d,runResult:C},appContext:{selectedFile:t.selectedFile.value?{filename:t.selectedFile.value.filename,id:t.selectedFile.value.id}:null,currentCode:t.codeInputRef.value,allFiles:t.jsFiles.value.map(f=>({filename:f.filename,id:f.id})),hasUnsavedChanges:t.hasUnsavedChanges.value}}}))}}else if(k==="CREATE_FILE"){if(!i||!i.filename){console.error("CREATE_FILE missing filename data");return}const c=(i==null?void 0:i.requestId)||(i==null?void 0:i.__requestId),b=String(i.filename||"").trim();if(b.toLowerCase().endsWith(".html")){const r=`Blocked: HTML files are read-only in this environment (including sandbox.html). Refusing to create ${b}.`;console.warn(r),c&&window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:c,success:!1,actionType:k,actionResult:{success:!1,error:r,filename:b},appContext:{selectedFile:t.selectedFile.value?{filename:t.selectedFile.value.filename,id:t.selectedFile.value.id}:null,currentCode:t.codeInputRef.value,allFiles:t.jsFiles.value.map(d=>({filename:d.filename,id:d.id})),hasUnsavedChanges:t.hasUnsavedChanges.value}}}));return}const v=i.code||`// New file
`;if(await t.createFile(i.filename,v)){await new Promise(d=>setTimeout(d,100));const r=t.jsFiles.value.find(d=>d.filename===i.filename);if(r&&(await t.selectFile(r),t.updateCode(v,"File created with content"),await t.saveFile(),c)){const d=B.agentMode?await n(c):null;window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:c,success:!0,actionType:k,actionResult:{success:!0,filename:i.filename,runResult:d},appContext:{selectedFile:t.selectedFile.value?{filename:t.selectedFile.value.filename,id:t.selectedFile.value.id}:null,currentCode:t.codeInputRef.value,allFiles:t.jsFiles.value.map(w=>({filename:w.filename,id:w.id})),hasUnsavedChanges:t.hasUnsavedChanges.value}}}))}}}}catch(c){console.error("Error handling editor action:",c);const b=(i==null?void 0:i.requestId)||(i==null?void 0:i.__requestId);b&&window.dispatchEvent(new CustomEvent("app-editor-action-applied",{detail:{sessionId:F(),requestId:b,success:!1,actionType:k,actionResult:{success:!1,error:c instanceof Error?c.message:"Unknown error"}}}))}}return(k,i)=>(h(),Q(st,{mode:"app-editor","session-id":F(),"context-provider":V,"context-info":A.value,"agent-mode":B.agentMode,onEditorAction:X},null,8,["session-id","context-info","agent-mode"]))}}),bt=ve({__name:"CodeEditor",props:{modelValue:{},placeholder:{}},emits:["update:modelValue"],setup(Z,{emit:B}){const t=Z,n=B,F=_(null);let A=null;const V=$(()=>yt.uiMode==="dark"),X=oe.theme({"&":{height:"100%",fontSize:"14px",backgroundColor:"#19191b",color:"#e8e8e8"},".cm-content":{caretColor:"#4b8fcf",padding:"10px 0"},".cm-cursor, .cm-dropCursor":{borderLeftColor:"#4b8fcf"},"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":{backgroundColor:"#23293580"},".cm-activeLine":{backgroundColor:"#1a1f2a80"},".cm-gutters":{backgroundColor:"#121214",color:"#6e7681",border:"none"},".cm-activeLineGutter":{backgroundColor:"#1a1f2a"},".cm-lineNumbers .cm-gutterElement":{minWidth:"3em",textAlign:"right",paddingRight:"8px"},".cm-scroller":{overflow:"auto",fontFamily:"'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace"}},{dark:!0}),k=Te.define([{tag:l.keyword,color:"#ff66cc"},{tag:[l.name,l.deleted,l.character,l.propertyName,l.macroName],color:"#e8e8e8"},{tag:[l.function(l.variableName),l.labelName],color:"#66ccff"},{tag:[l.color,l.constant(l.name),l.standard(l.name)],color:"#66ffff"},{tag:[l.definition(l.name),l.separator],color:"#e8e8e8"},{tag:[l.typeName,l.className,l.number,l.changed,l.annotation,l.modifier,l.self,l.namespace],color:"#cc66ff"},{tag:[l.operator,l.operatorKeyword,l.url,l.escape,l.regexp,l.link,l.special(l.string)],color:"#66ff99"},{tag:[l.meta,l.comment],color:"#6e7681",fontStyle:"italic"},{tag:l.strong,fontWeight:"bold"},{tag:l.emphasis,fontStyle:"italic"},{tag:l.strikethrough,textDecoration:"line-through"},{tag:l.link,color:"#4b8fcf",textDecoration:"underline"},{tag:l.heading,fontWeight:"bold",color:"#ff66cc"},{tag:[l.atom,l.bool,l.special(l.variableName)],color:"#ccff66"},{tag:[l.processingInstruction,l.string,l.inserted],color:"#9933ff"},{tag:l.invalid,color:"#dc3545"}]),i=oe.theme({"&":{height:"100%",fontSize:"14px",backgroundColor:"#ffffff",color:"#24292e"},".cm-content":{caretColor:"#0969da",padding:"10px 0"},".cm-cursor, .cm-dropCursor":{borderLeftColor:"#0969da"},"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":{backgroundColor:"#b6d7ff"},".cm-activeLine":{backgroundColor:"#f6f8fa"},".cm-gutters":{backgroundColor:"#f6f8fa",color:"#57606a",border:"none"},".cm-activeLineGutter":{backgroundColor:"#e8eaed"},".cm-lineNumbers .cm-gutterElement":{minWidth:"3em",textAlign:"right",paddingRight:"8px"},".cm-scroller":{overflow:"auto",fontFamily:"'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace"}},{dark:!1}),N=Te.define([{tag:l.keyword,color:"#d73a49"},{tag:[l.name,l.deleted,l.character,l.propertyName,l.macroName],color:"#24292e"},{tag:[l.function(l.variableName),l.labelName],color:"#6f42c1"},{tag:[l.color,l.constant(l.name),l.standard(l.name)],color:"#005cc5"},{tag:[l.definition(l.name),l.separator],color:"#24292e"},{tag:[l.typeName,l.className,l.number,l.changed,l.annotation,l.modifier,l.self,l.namespace],color:"#005cc5"},{tag:[l.operator,l.operatorKeyword,l.url,l.escape,l.regexp,l.link,l.special(l.string)],color:"#032f62"},{tag:[l.meta,l.comment],color:"#6a737d",fontStyle:"italic"},{tag:l.strong,fontWeight:"bold"},{tag:l.emphasis,fontStyle:"italic"},{tag:l.strikethrough,textDecoration:"line-through"},{tag:l.link,color:"#0969da",textDecoration:"underline"},{tag:l.heading,fontWeight:"bold",color:"#005cc5"},{tag:[l.atom,l.bool,l.special(l.variableName)],color:"#005cc5"},{tag:[l.processingInstruction,l.string,l.inserted],color:"#032f62"},{tag:l.invalid,color:"#dc3545"}]),j=c=>at.create({doc:c||"",extensions:[rt(),dt(),ut(),ct(),pt.of([...vt,...gt]),mt({typescript:!0}),V.value?X:i,ft(V.value?k:N),oe.updateListener.of(b=>{if(b.docChanged){const v=b.state.doc.toString();n("update:modelValue",v)}})]});return Ne(()=>{if(!F.value)return;const c=j(t.modelValue);A=new oe({state:c,parent:F.value}),fe(()=>t.modelValue,b=>{A&&b!==A.state.doc.toString()&&A.dispatch({changes:{from:0,to:A.state.doc.length,insert:b||""}})}),fe(V,()=>{if(!A||!F.value)return;const b=A.state.doc.toString();A.destroy();const v=j(b);A=new oe({state:v,parent:F.value})})}),De(()=>{A&&(A.destroy(),A=null)}),(c,b)=>(h(),I("div",{ref_key:"editorRef",ref:F,class:"code-editor-wrapper"},null,512))}}),wt=Pe(bt,[["__scopeId","data-v-ee84d25f"]]),Ct={class:"app-creator-wrapper bw-background"},kt={class:"border-bottom px-3 py-2 d-flex align-items-center justify-content-between gap-2"},Et={class:"text-truncate"},Ft={class:"d-flex align-items-center gap-2 flex-shrink-0"},It={class:"btn-group",role:"group","aria-label":"App Creator navigation"},xt={key:0},St={key:0},_t={class:"btn-group",role:"group","aria-label":"App Creator actions"},At={key:2},Tt={key:0},Rt={key:0},Lt={key:0,class:"ms-1"},jt={class:"d-flex app-creator-container"},Mt={key:0,class:"flex-fill d-flex align-items-center justify-content-center"},$t={class:"text-center"},Nt={key:1,class:"flex-fill p-4"},Dt={class:"alert alert-danger"},Pt={key:0,class:"border-end d-none d-md-block file-browser-sidebar"},Bt={class:"d-flex justify-content-between align-items-center p-3 border-bottom"},Ot={class:"list-group list-group-flush"},Ut=["onClick"],Vt=["onClick","title"],Ht={key:0,class:"p-3 text-muted small"},zt={class:"flex-fill d-flex flex-column editor-section"},Jt={key:0,class:"flex-fill d-flex flex-column overflow-hidden"},Kt={key:0,class:"flex-fill d-flex flex-column overflow-hidden preview-container"},qt={class:"preview-header border-bottom p-2 wb-background"},Wt={class:"d-flex align-items-center justify-content-between"},Gt={class:"flex-fill overflow-hidden"},Xt={key:1,class:"flex-fill d-flex flex-column align-items-center justify-content-center p-4 text-center"},Yt={class:"d-flex gap-2"},Qt={class:"mt-5 d-flex gap-4 text-muted small"},Zt={key:0},en={key:1,class:"flex-fill code-editor-container"},tn={key:3,class:"border-start ai-chat-panel bw-background"},nn={class:"d-flex align-items-center justify-content-between w-100"},ln={class:"d-flex align-items-center"},sn={key:0,class:"text-muted text-center p-4"},on={key:1,class:"list-group"},an={class:"flex-fill"},rn={class:"d-flex justify-content-between align-items-center mb-1"},dn={class:"fw-bold"},un={class:"text-muted"},cn={class:"mb-0 small text-muted",style:{"max-height":"100px",overflow:"hidden"}},pn={class:"ms-3"},mn={class:"mb-3"},fn=["onKeydown"],vn={class:"bottom-bar"},gn={class:"d-flex align-items-center justify-content-between px-3"},yn={class:"d-flex align-items-center gap-3 text-muted small"},hn={key:0},bn={key:1},$e=!0,wn=`// Weather demo app (uses kindredly.net.fetchJson + kindredly.refState)
// - First run will prompt for network + ref state permissions.
// - Stores your last location in Ref State (scope: user).

(async () => {
  const NAMESPACE = 'weatherDemo'
  const app = document.getElementById('app')
  if (!app) return

  const escapeHtml = (s) => String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

  const render = (html) => {
    app.innerHTML = html
  }

  const defaultLoc = { label: 'Austin, TX', lat: 30.2672, lon: -97.7431 }
  let saved = null
  try {
    saved = await kindredly.refState.get('location', { scope: 'user', namespace: NAMESPACE })
  } catch (e) {
    // If permission denied, the host will throw; we'll still show UI.
    console.warn('refState.get(location) failed:', e)
  }
  const loc = (saved && typeof saved === 'object') ? saved : defaultLoc

  render([
    '<div class="p-3">',
    '  <h3 class="mb-2">Weather Demo</h3>',
    '  <p class="text-muted">Uses <code>kindredly.net.fetchJson</code> to call Open‑Meteo and <code>kindredly.refState</code> to remember your location.</p>',
    '  <div class="mb-2">',
    '    <label class="form-label">Label</label>',
    '    <input id="label" class="form-control" value="' + escapeHtml(loc.label || '') + '" />',
    '  </div>',
    '  <div class="row g-2 mb-2">',
    '    <div class="col">',
    '      <label class="form-label">Latitude</label>',
    '      <input id="lat" class="form-control" value="' + escapeHtml(loc.lat) + '" />',
    '    </div>',
    '    <div class="col">',
    '      <label class="form-label">Longitude</label>',
    '      <input id="lon" class="form-control" value="' + escapeHtml(loc.lon) + '" />',
    '    </div>',
    '  </div>',
    '  <div class="d-flex gap-2 mb-3">',
    '    <button id="save" class="btn btn-outline-secondary">Save location</button>',
    '    <button id="fetch" class="btn btn-primary">Fetch weather</button>',
    '  </div>',
    '  <pre id="out" class="bg-light border rounded p-2">Ready.</pre>',
    '</div>',
  ].join('\\n'))

  const out = document.getElementById('out')
  const setOut = (text) => { if (out) out.textContent = String(text) }

  const readLoc = () => {
    const label = (document.getElementById('label')?.value || '').trim()
    const lat = Number((document.getElementById('lat')?.value || '').trim())
    const lon = Number((document.getElementById('lon')?.value || '').trim())
    return { label: label || 'Custom', lat, lon }
  }

  document.getElementById('save')?.addEventListener('click', async () => {
    const nextLoc = readLoc()
    await kindredly.refState.set('location', nextLoc, { scope: 'user', namespace: NAMESPACE })
    setOut('Saved location to Ref State.')
  })

  document.getElementById('fetch')?.addEventListener('click', async () => {
    const nextLoc = readLoc()
    if (!Number.isFinite(nextLoc.lat) || !Number.isFinite(nextLoc.lon)) {
      setOut('Please enter valid numbers for lat/lon.')
      return
    }

    setOut('Loading...')
    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + encodeURIComponent(String(nextLoc.lat))
      + '&longitude=' + encodeURIComponent(String(nextLoc.lon))
      + '&current=temperature_2m,wind_speed_10m'
      + '&timezone=auto'
    const res = await kindredly.net.fetchJson(url, { timeoutMs: 8000 })
    if (!res.ok) {
      throw new Error('HTTP ' + String(res.status))
    }
    setOut(JSON.stringify(res.json?.current || res.json, null, 2))
  })
})().catch(err => {
  console.error(err)
  const app = document.getElementById('app')
  if (app) app.textContent = String(err?.message || err)
})
`,Cn=`// Swear Jar demo app (simplified + reliable)
// - Renders immediately
// - Uses kindredly.refState for local persistence (no prompts)

(() => {
  const NAMESPACE = 'swearJar'
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML =
    '<div>'
    + '<h3>Swear Jar</h3>'
    + '<p>Simple counter with optional Ref State persistence.</p>'
    + '<p id="sjStatus"><small>Loading…</small></p>'
    + '<p>Count: <strong id="sjCount">0</strong> <span id="sjFace" aria-hidden="true">🙂</span></p>'
    + '<p>'
    + '  <button id="sjAdd" type="button">Add +1</button>'
    + '  <button id="sjReset" type="button">Reset</button>'
    + '</p>'
    + '<hr />'
    + '<p><small>Tip: if Ref State permission is denied, the counter still works locally.</small></p>'
    + '</div>'

  let count = 0
  const countEl = document.getElementById('sjCount')
  const faceEl = document.getElementById('sjFace')
  const statusEl = document.getElementById('sjStatus')

  const setStatus = (t) => { if (statusEl) statusEl.textContent = String(t || '') }
  const render = () => {
    if (countEl) countEl.textContent = String(count)
    if (faceEl) faceEl.textContent = '😮'
    setTimeout(() => { if (faceEl) faceEl.textContent = '🙂' }, 450)
  }

  const tryPersist = async () => {
    try {
      await kindredly.refState.set('count', count, { scope: 'user', namespace: NAMESPACE })
      setStatus('Saved.')
    } catch (e) {
      console.warn('refState.set failed:', e)
      setStatus('Not saved (error)')
    }
  }

  document.getElementById('sjAdd')?.addEventListener('click', async () => {
    count += 1
    render()
    await tryPersist()
  })

  document.getElementById('sjReset')?.addEventListener('click', async () => {
    count = 0
    render()
    await tryPersist()
  })

  // Load saved value in background
  setStatus('Loading saved count…')
  Promise.resolve()
    .then(async () => {
      const stored = await kindredly.refState.get('count', { scope: 'user', namespace: NAMESPACE })
      if (typeof stored === 'number' && Number.isFinite(stored)) count = stored
      render()
      setStatus('Ready.')
    })
    .catch((e) => {
      console.warn('refState.get failed:', e)
      render()
      setStatus('Ready (failed to load saved state).')
    })
})()
`,kn=`// Hello demo app (minimal sanity check)
// - No Ref State, no Net API

(() => {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML =
    '<div class="p-3">'
    + '<div class="fw-bold mb-2">Hello from Kindredly Apps</div>'
    + '<div class="text-muted mb-3">If you can see this, the sandbox compiled + ran your code.</div>'
    + '<button id="btn" type="button" class="btn btn-primary btn-sm">Click me</button>'
    + '<span class="ms-2">Count: <strong id="count">0</strong></span>'
    + '</div>'

  let count = 0
  const countEl = document.getElementById('count')
  document.getElementById('btn')?.addEventListener('click', () => {
    count += 1
    if (countEl) countEl.textContent = String(count)
  })
})()
`,En=`// Counter demo app (local state only)
(() => {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML =
    '<div>'
    + '<h3>Counter</h3>'
    + '<p>Local state only (no host APIs).</p>'
    + '<p>Count: <strong id="c">0</strong></p>'
    + '<p><button id="inc" type="button">+1</button> <button id="dec" type="button">-1</button></p>'
    + '</div>'
  let n = 0
  const el = document.getElementById('c')
  const render = () => { if (el) el.textContent = String(n) }
  document.getElementById('inc')?.addEventListener('click', () => { n += 1; render() })
  document.getElementById('dec')?.addEventListener('click', () => { n -= 1; render() })
  render()
})()
`,Fn=`// Ref State KV demo (tests persistence)
(async () => {
  const app = document.getElementById('app')
  if (!app) return
  const ns = 'testKV'

  app.innerHTML =
    '<div>'
    + '<h3>Ref State KV</h3>'
    + '<p><small>This app reads/writes a single key in Ref State.</small></p>'
    + '<p>Status: <span id="st">Idle</span></p>'
    + '<p><label>Key <input id="k" value="hello" /></label></p>'
    + '<p><label>Value <input id="v" value="world" /></label></p>'
    + '<p><button id="load" type="button">Load</button> <button id="save" type="button">Save</button></p>'
    + '<pre id="out"></pre>'
    + '</div>'

  const st = (t) => { const el = document.getElementById('st'); if (el) el.textContent = String(t) }
  const out = (t) => { const el = document.getElementById('out'); if (el) el.textContent = String(t || '') }
  const getKey = () => (document.getElementById('k')?.value || 'hello')
  const getVal = () => (document.getElementById('v')?.value || '')

  document.getElementById('load')?.addEventListener('click', async () => {
    st('Loading…')
    try {
      const v = await kindredly.refState.get(getKey(), { scope: 'user', namespace: ns })
      out(JSON.stringify(v, null, 2))
      st('Loaded')
    } catch (e) {
      console.warn(e)
      out(String(e?.message || e))
      st('Failed')
    }
  })

  document.getElementById('save')?.addEventListener('click', async () => {
    st('Saving…')
    try {
      await kindredly.refState.set(getKey(), getVal(), { scope: 'user', namespace: ns })
      st('Saved')
    } catch (e) {
      console.warn(e)
      out(String(e?.message || e))
      st('Failed')
    }
  })
})().catch(e => console.error(e))
`,In=`// Net fetchJson demo (tests hostname permission + networking)
(async () => {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML =
    '<div>'
    + '<h3>Net fetchJson</h3>'
    + '<p><small>Fetches JSON from a URL via kindredly.net.fetchJson.</small></p>'
    + '<p><label>URL <input id="u" value="https://api.github.com/zen" /></label></p>'
    + '<p><button id="go" type="button">Fetch</button></p>'
    + '<pre id="out"></pre>'
    + '</div>'

  const out = (t) => { const el = document.getElementById('out'); if (el) el.textContent = String(t || '') }
  document.getElementById('go')?.addEventListener('click', async () => {
    out('Loading…')
    const url = String(document.getElementById('u')?.value || '')
    try {
      const res = await kindredly.net.fetchJson(url, { timeoutMs: 8000 })
      out(JSON.stringify(res, null, 2))
    } catch (e) {
      console.warn(e)
      out(String(e?.message || e))
    }
  })
})().catch(e => console.error(e))
`,xn=`// Timer demo app (no host APIs)
(() => {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = '<div><h3>Timer</h3><p>Seconds: <strong id="t">0</strong></p><p><button id="stop" type="button">Stop</button></p></div>'
  const tEl = document.getElementById('t')
  let s = 0
  const id = setInterval(() => {
    s += 1
    if (tEl) tEl.textContent = String(s)
  }, 1000)
  document.getElementById('stop')?.addEventListener('click', () => {
    clearInterval(id)
  })
})()
`,Sn=`// Console demo app (verifies sandbox-console bridge)
(() => {
  const app = document.getElementById('app')
  if (!app) return
  app.innerHTML = '<div><h3>Console Test</h3><p>Open DevTools console; this app logs a few messages.</p><p><button id="log" type="button">Log now</button></p></div>'
  console.log('console-test: log')
  console.warn('console-test: warn')
  console.error('console-test: error (expected)')
  document.getElementById('log')?.addEventListener('click', () => {
    console.log('console-test: button clicked at', new Date().toISOString())
  })
})()
`,_n=ve({__name:"AppCreator",props:{itemId:{}},setup(Z){const{confirmModal:B}=ht(),{isMobile:t}=lt(),n=Be(),F=Ge(),A=Z,V=_(""),X=_(""),k=_(null),i=_(null),N=_([]),j=_([]);let c=null;const b=_(!1),v=_("auto"),a=_(!1),r=_([]),d=_(!1),w=$(()=>{var s,e;return((e=(s=n==null?void 0:n.item)==null?void 0:s.value)==null?void 0:e.name)||"App"}),C=$(()=>{var e;const s=((e=n.selectedFile.value)==null?void 0:e.filename)||"Files";return n.hasUnsavedChanges.value?`${s} ●`:s});function f(s){n.simpleModeRef.value=s==="preview"}const O=$(()=>d.value?"chevron-right":"chevron-left"),M=_(!1),H=_(""),J=_(null);async function re(){if(await n.loadItem(A.itemId)&&(n.jsFiles.value.find(T=>T.filename==="run.js"||T.filename.toLowerCase()==="run.js")||(console.log("run.js not found, creating it..."),await n.createFile("run.js",""),await n.loadItem(A.itemId)),n.jsFiles.value.length>0)){const y=n.jsFiles.value.find(D=>D.filename==="run.js"||D.filename.toLowerCase()==="run.js")||n.jsFiles.value[0];if(!await n.selectFile(y)&&(console.warn("Failed to select file, reloading item..."),await n.loadItem(A.itemId),n.jsFiles.value.length>0)){const D=n.jsFiles.value.find(U=>U.filename===y.filename);D&&await n.selectFile(D)}}}async function Ce(s){var e;n.hasUnsavedChanges.value&&!await B(`You have unsaved changes in ${(e=n.selectedFile.value)==null?void 0:e.filename}. Switch anyway?`,{title:"Unsaved Changes",okTitle:"Switch Anyway",cancelTitle:"Cancel",okVariant:"warning"})||await n.selectFile(s)}async function ge(){await n.saveFile()}async function Oe(){await F.push(`/item/${A.itemId}`)}function ke(){n.selectedFile.value&&(r.value=n.getFileHistory(n.selectedFile.value.id),a.value=!0)}async function Ue(s){await B("Are you sure you want to revert to this version? Current unsaved changes will be lost.",{title:"Revert to Previous Version",okTitle:"Revert",cancelTitle:"Cancel",okVariant:"warning"})&&(n.revertToVersion(s),a.value=!1)}async function Ve(s){await B(`Are you sure you want to delete "${s.filename}"? This action cannot be undone.`,{title:"Delete File",okTitle:"Delete",cancelTitle:"Cancel",okVariant:"danger"})&&await n.deleteFile(s)}function Ee(){H.value="",M.value=!0,setTimeout(()=>{var s;(s=J.value)==null||s.focus()},100)}async function ye(){if(!H.value.trim())return;let s=H.value.trim();if(s.endsWith(".js")||(s+=".js"),n.jsFiles.value.some(y=>y.filename===s)){alert(`File "${s}" already exists!`);return}if(await n.createFile(s,`// New file
`)){M.value=!1,H.value="";const y=n.jsFiles.value.find(E=>E.filename===s);y&&await n.selectFile(y)}}async function ee(s){var D;const e=n.jsFiles.value.find(U=>U.filename==="run.js"||U.filename.toLowerCase()==="run.js");if(!e||!await B("This will overwrite run.js with a demo template and save it. Continue?",{title:"Try Demo App",okTitle:"Overwrite run.js",cancelTitle:"Cancel",okVariant:"warning"})||n.hasUnsavedChanges.value&&!await B(`You have unsaved changes in ${(D=n.selectedFile.value)==null?void 0:D.filename}. They will be lost if you overwrite run.js. Continue?`,{title:"Unsaved Changes",okTitle:"Continue",cancelTitle:"Cancel",okVariant:"warning"}))return;await n.selectFile(e);const y=s==="weather"?wn:s==="swearJar"?Cn:s==="hello"?kn:s==="counter"?En:s==="refStateKV"?Fn:s==="netFetch"?In:s==="timer"?xn:Sn;n.updateCode(y,"Loaded demo template"),await n.saveFile()||await B(n.error.value||"Failed to save demo template.",{title:"Save Failed",okTitle:"OK",cancelTitle:"",okVariant:"warning"}),await de()}const Fe=$(()=>n.simpleMode.value);async function de(){console.log("Running code..."),V.value=n.codeInputRef.value||"",Fe.value||(b.value=!0,v.value="auto")}function He(s,e,T=6e3){s&&(k.value=s,i.value=e,N.value=[],j.value=[],c&&(clearTimeout(c),c=null),X.value=n.codeInputRef.value||"",c=setTimeout(()=>{const y=k.value;y&&(window.dispatchEvent(new CustomEvent("app-creator-run-result",{detail:{sessionId:i.value,requestId:y,success:!1,timedOut:!0,logs:N.value.slice(-30),errors:j.value.slice(-10)}})),k.value=null)},T))}function ze(s){const e=k.value;if(e&&!(s!=null&&s.runId&&s.runId!==e)){if((s==null?void 0:s.type)==="sandbox-console"){const T=String(s.level||"log"),y=Array.isArray(s.args)?s.args.map(D=>String(D)).slice(0,20):[String(s.args||"")],E=typeof s.ts=="number"?s.ts:Date.now();N.value.push({level:T,args:y.map(D=>D.slice(0,500)),ts:E}),N.value.length>60&&N.value.splice(0,N.value.length-60);return}if((s==null?void 0:s.type)==="sandbox-error"){const T=s.kind?String(s.kind):void 0,y=String(s.message||"Sandbox error"),E=s.stack?String(s.stack):void 0,D=typeof s.ts=="number"?s.ts:Date.now(),U=s.details&&typeof s.details=="object"?s.details:null,se=U&&typeof U.line=="number"?(()=>{const le=`Location: line ${U.line}, col ${typeof U.column=="number"?U.column:"?"}${U.text?`
Error: ${U.text}`:""}`,ue=Array.isArray(U.context)?U.context.slice(0,7).map(G=>`  ${String((G==null?void 0:G.line)||"").padStart(4," ")} | ${String((G==null?void 0:G.text)||"")}`).join(`
`):"";return`${le}${ue?`
${ue}`:""}`})():"";j.value.push({kind:T,message:(se?`${y}

${se}`:y).slice(0,2e3),stack:E==null?void 0:E.slice(0,4e3),ts:D}),j.value.length>20&&j.value.splice(0,j.value.length-20);return}if((s==null?void 0:s.type)==="sandbox-run-complete"){c&&(clearTimeout(c),c=null);const T=!!s.success;window.dispatchEvent(new CustomEvent("app-creator-run-result",{detail:{sessionId:i.value,requestId:e,success:T,timedOut:!1,durationMs:typeof s.durationMs=="number"?s.durationMs:void 0,logs:N.value.slice(-30),errors:j.value.slice(-10)}})),k.value=null}}}function Ie(s){const e=(s==null?void 0:s.detail)||{},T=String(e.requestId||""),y=e.sessionId?String(e.sessionId):null,E=typeof e.timeoutMs=="number"?e.timeoutMs:6e3;T&&He(T,y,E)}function Je(){v.value==="fit"?v.value="auto":v.value="fit"}function Ke(){v.value==="fullscreen"?v.value="auto":v.value="fullscreen"}function xe(s){s.key==="Escape"&&(v.value==="fullscreen"||v.value==="fit"?(v.value="auto",s.preventDefault(),s.stopPropagation()):b.value&&(b.value=!1))}function Se(s){(s.metaKey||s.ctrlKey)&&s.key==="s"&&(s.preventDefault(),ge())}function _e(s){n.hasUnsavedChanges.value&&(s.preventDefault(),s.returnValue="")}function qe(s){const e=new Date(s),T=new Date,y=T.getTime()-s;if(y<6e4)return"Just now";if(y<36e5){const E=Math.floor(y/6e4);return`${E} minute${E>1?"s":""} ago`}if(y<864e5){const E=Math.floor(y/36e5);return`${E} hour${E>1?"s":""} ago`}return e.toDateString()===T.toDateString()?`Today at ${e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:e.toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}Xe(async()=>n.hasUnsavedChanges.value?await B("You have unsaved changes. Leave without saving?",{title:"Unsaved Changes",okTitle:"Leave",cancelTitle:"Stay",okVariant:"warning"}):!0);async function We(){n.simpleModeRef.value=await Re("appCreator.simpleMode",{defaultValue:!1}),d.value=await Re("appCreator.showAIChat",{defaultValue:!1})}return Ne(()=>{document.addEventListener("keydown",xe),document.addEventListener("keydown",Se),window.addEventListener("beforeunload",_e),window.addEventListener("app-creator-run-request",Ie),We(),re()}),fe(()=>n.simpleMode.value,s=>{Le("appCreator.simpleMode",s),s&&(d.value=!0,String(n.codeInputRef.value||"").trim()&&de())}),fe(d,s=>{Le("appCreator.showAIChat",s)}),De(()=>{document.removeEventListener("keydown",xe),document.removeEventListener("keydown",Se),window.removeEventListener("beforeunload",_e),window.removeEventListener("app-creator-run-request",Ie),c&&(clearTimeout(c),c=null)}),(s,e)=>{const T=Y("b-icon"),y=Y("b-button"),E=Y("b-dropdown-item"),D=Y("b-dropdown-divider"),U=Y("b-dropdown"),se=Y("b-spinner"),le=Y("b-dropdown-header"),ue=Y("b-offcanvas"),G=Y("b-modal");return h(),I("div",Ct,[o("div",kt,[m(y,{variant:"link",class:"p-0 text-decoration-none fw-semibold d-inline-flex align-items-center",onClick:Oe,title:`Back to ${w.value}`},{default:g(()=>[m(T,{icon:"chevron-left",class:"me-2"}),o("span",Et,z(w.value),1)]),_:1},8,["title"]),o("div",Ft,[o("div",It,[m(y,{size:"sm",variant:u(n).simpleMode.value?"outline-primary":"primary",onClick:e[0]||(e[0]=p=>f("code")),title:"Code"},{default:g(()=>[o("i",{class:K(["bi bi-code-slash",u(t)?"":"me-1"])},null,2),u(t)?P("",!0):(h(),I("span",xt,"Code"))]),_:1},8,["variant"]),m(y,{size:"sm",variant:u(n).simpleMode.value?"primary":"outline-primary",onClick:e[1]||(e[1]=p=>f("preview")),title:"Preview"},{default:g(()=>[o("i",{class:K(["bi bi-eye",u(t)?"":"me-1"])},null,2),u(t)?P("",!0):(h(),I("span",St,"Preview"))]),_:1},8,["variant"])]),(u(t)||u(n).simpleMode.value)&&u(n).jsFiles.value.length>0?(h(),Q(U,{key:0,size:"sm",variant:"outline-secondary",text:C.value,boundary:"viewport"},{default:g(()=>[(h(!0),I(ce,null,be(u(n).jsFiles.value,p=>{var te;return h(),Q(E,{key:p.id,active:((te=u(n).selectedFile.value)==null?void 0:te.id)===p.id,onClick:he=>Ce(p)},{default:g(()=>[x(z(p.filename),1)]),_:2},1032,["active","onClick"])}),128)),m(D),m(E,{onClick:Ee},{default:g(()=>[...e[26]||(e[26]=[o("i",{class:"bi bi-plus me-2"},null,-1),x(" Add file ",-1)])]),_:1})]),_:1},8,["text"])):P("",!0),e[46]||(e[46]=o("div",{class:"vr"},null,-1)),o("div",_t,[m(y,{onClick:ge,variant:"success",size:"sm",disabled:!u(n).hasUnsavedChanges.value||u(n).saving.value,title:"Save"},{default:g(()=>[u(n).saving.value?(h(),Q(se,{key:0,small:"",class:"me-1"})):(h(),I("i",{key:1,class:K(["bi bi-save",u(t)?"":"me-1"])},null,2)),u(t)?P("",!0):(h(),I("span",At,"Save"))]),_:1},8,["disabled"]),u(t)?P("",!0):(h(),Q(y,{key:0,onClick:ke,variant:"outline-secondary",size:"sm",disabled:!u(n).selectedFile.value,title:"History"},{default:g(()=>[o("i",{class:K(["bi bi-clock-history",u(t)?"":"me-1"])},null,2),u(t)?P("",!0):(h(),I("span",Tt,"History"))]),_:1},8,["disabled"]))]),m(y,{onClick:de,variant:"primary",size:"sm",disabled:!u(n).codeInputRef.value||!u(n).codeInputRef.value.trim(),title:"Run"},{default:g(()=>[o("i",{class:K(["bi bi-play-fill",u(t)?"":"me-1"])},null,2),u(t)?P("",!0):(h(),I("span",Rt,"Run"))]),_:1},8,["disabled"]),e[47]||(e[47]=o("div",{class:"vr"},null,-1)),m(y,{onClick:e[2]||(e[2]=p=>d.value=!d.value),variant:d.value?"success":"outline-success",size:"sm",title:"Toggle AI Assistant"},{default:g(()=>[m(T,{icon:"robot",class:K(u(t)?"":"me-1")},null,8,["class"]),o("i",{class:K(["bi ms-1",`bi-${O.value}`])},null,2),u(t)?P("",!0):(h(),I("span",Lt,"AI"))]),_:1},8,["variant"]),m(U,{size:"sm",variant:"outline-secondary",boundary:"viewport",title:"Menu","no-caret":"",right:"",toggleClass:"p-1"},{"button-content":g(()=>[...e[27]||(e[27]=[o("i",{class:"bi bi-three-dots-vertical"},null,-1)])]),default:g(()=>[m(le,null,{default:g(()=>[...e[28]||(e[28]=[x("View",-1)])]),_:1}),m(E,{active:!u(n).simpleMode.value,onClick:e[3]||(e[3]=p=>f("code"))},{default:g(()=>[...e[29]||(e[29]=[o("i",{class:"bi bi-code-slash me-2"},null,-1),x(" Code view ",-1)])]),_:1},8,["active"]),m(E,{active:u(n).simpleMode.value,onClick:e[4]||(e[4]=p=>f("preview"))},{default:g(()=>[...e[30]||(e[30]=[o("i",{class:"bi bi-eye me-2"},null,-1),x(" Preview view ",-1)])]),_:1},8,["active"]),m(D),m(le,null,{default:g(()=>[...e[31]||(e[31]=[x("Actions",-1)])]),_:1}),m(E,{disabled:!u(n).hasUnsavedChanges.value||u(n).saving.value,onClick:ge},{default:g(()=>[...e[32]||(e[32]=[o("i",{class:"bi bi-save me-2"},null,-1),x(" Save current file ",-1)])]),_:1},8,["disabled"]),m(E,{disabled:!u(n).selectedFile.value,onClick:ke},{default:g(()=>[...e[33]||(e[33]=[o("i",{class:"bi bi-clock-history me-2"},null,-1),x(" View file history ",-1)])]),_:1},8,["disabled"]),m(E,{disabled:!u(n).codeInputRef.value||!u(n).codeInputRef.value.trim(),onClick:de},{default:g(()=>[...e[34]||(e[34]=[o("i",{class:"bi bi-play-fill me-2"},null,-1),x(" Run app ",-1)])]),_:1},8,["disabled"]),m(E,{onClick:e[5]||(e[5]=p=>d.value=!d.value)},{default:g(()=>[e[35]||(e[35]=o("i",{class:"bi bi-robot me-2"},null,-1)),x(" "+z(d.value?"Hide":"Show")+" AI assistant ",1)]),_:1}),m(D),m(le,null,{default:g(()=>[...e[36]||(e[36]=[x("Demos",-1)])]),_:1}),m(E,{onClick:e[6]||(e[6]=p=>ee("hello"))},{default:g(()=>[...e[37]||(e[37]=[o("i",{class:"bi bi-lightning-charge me-2"},null,-1),x(" Try demo app: Hello ",-1)])]),_:1}),m(E,{onClick:e[7]||(e[7]=p=>ee("counter"))},{default:g(()=>[...e[38]||(e[38]=[o("i",{class:"bi bi-plus-slash-minus me-2"},null,-1),x(" Try demo app: Counter ",-1)])]),_:1}),m(E,{onClick:e[8]||(e[8]=p=>ee("timer"))},{default:g(()=>[...e[39]||(e[39]=[o("i",{class:"bi bi-stopwatch me-2"},null,-1),x(" Try demo app: Timer ",-1)])]),_:1}),m(E,{onClick:e[9]||(e[9]=p=>ee("console"))},{default:g(()=>[...e[40]||(e[40]=[o("i",{class:"bi bi-terminal me-2"},null,-1),x(" Try demo app: Console Test ",-1)])]),_:1}),m(D),m(le,null,{default:g(()=>[...e[41]||(e[41]=[x("API Demos",-1)])]),_:1}),m(E,{onClick:e[10]||(e[10]=p=>ee("refStateKV"))},{default:g(()=>[...e[42]||(e[42]=[o("i",{class:"bi bi-database me-2"},null,-1),x(" Try demo app: Ref State KV ",-1)])]),_:1}),m(E,{onClick:e[11]||(e[11]=p=>ee("netFetch"))},{default:g(()=>[...e[43]||(e[43]=[o("i",{class:"bi bi-globe2 me-2"},null,-1),x(" Try demo app: Net fetchJson ",-1)])]),_:1}),m(E,{onClick:e[12]||(e[12]=p=>ee("weather"))},{default:g(()=>[...e[44]||(e[44]=[o("i",{class:"bi bi-cloud-sun me-2"},null,-1),x(" Try demo app: Weather ",-1)])]),_:1}),m(E,{onClick:e[13]||(e[13]=p=>ee("swearJar"))},{default:g(()=>[...e[45]||(e[45]=[o("i",{class:"bi bi-emoji-surprise me-2"},null,-1),x(" Try demo app: Swear Jar ",-1)])]),_:1})]),_:1})])]),(h(),Q(we,{key:0,code:X.value,"run-id":k.value,"item-id":A.itemId,class:"visually-hidden",onSandboxEvent:ze},null,8,["code","run-id","item-id"])),o("div",jt,[u(n).loading.value?(h(),I("div",Mt,[o("div",$t,[m(se),e[48]||(e[48]=o("p",{class:"mt-2"},"Loading files...",-1))])])):u(n).error.value?(h(),I("div",Nt,[o("div",Dt,z(u(n).error.value),1)])):(h(),I(ce,{key:2},[!u(t)&&!u(n).simpleMode.value?(h(),I("div",Pt,[o("div",Bt,[e[50]||(e[50]=o("h6",{class:"mb-0"},"Files",-1)),m(y,{size:"sm",variant:"outline-primary",onClick:Ee,title:"Add new file"},{default:g(()=>[...e[49]||(e[49]=[o("i",{class:"bi bi-plus"},null,-1)])]),_:1})]),o("div",Ot,[(h(!0),I(ce,null,be(u(n).jsFiles.value,p=>{var te;return h(),I("div",{key:p.id,class:K(["list-group-item list-group-item-action d-flex align-items-center justify-content-between",{active:((te=u(n).selectedFile.value)==null?void 0:te.id)===p.id}])},[o("a",{href:"#",onClick:pe(he=>Ce(p),["prevent"]),class:"d-flex align-items-center gap-2 flex-fill text-decoration-none"},[e[51]||(e[51]=o("i",{class:"bi bi-file-code"},null,-1)),o("span",null,z(p.filename),1)],8,Ut),o("button",{onClick:pe(he=>Ve(p),["stop"]),class:"btn btn-sm btn-link text-danger p-0 ms-2",title:`Delete ${p.filename}`},[...e[52]||(e[52]=[o("i",{class:"bi bi-trash"},null,-1)])],8,Vt)],2)}),128)),u(n).jsFiles.value.length===0?(h(),I("div",Ht," No JavaScript files found ")):P("",!0)])])):P("",!0),o("div",zt,[u(n).simpleMode.value?(h(),I("div",Jt,[Fe.value&&V.value?(h(),I("div",Kt,[o("div",qt,[o("div",Wt,[e[54]||(e[54]=o("span",{class:"text-muted small"},[o("i",{class:"bi bi-eye me-1"}),x(" App Preview ")],-1)),m(y,{onClick:e[14]||(e[14]=p=>V.value=""),variant:"outline-secondary",size:"sm",title:"Close preview"},{default:g(()=>[...e[53]||(e[53]=[o("i",{class:"bi bi-x-lg"},null,-1)])]),_:1})])]),o("div",Gt,[m(we,{code:V.value,"item-id":A.itemId,class:"w-100 h-100"},null,8,["code","item-id"])])])):(h(),I("div",Xt,[e[59]||(e[59]=o("div",{class:"mb-4"},[o("i",{class:"bi bi-magic fs-1 opacity-50"})],-1)),e[60]||(e[60]=o("h4",{class:"mb-3"},"AI App Builder",-1)),e[61]||(e[61]=o("p",{class:"text-muted mb-4 mx-auto w-75"}," Describe what you want to build in the AI chat panel, and the assistant will create and update your app's code automatically. ",-1)),o("div",Yt,[d.value?P("",!0):(h(),Q(y,{key:0,onClick:e[15]||(e[15]=p=>d.value=!0),variant:"success",size:"lg"},{default:g(()=>[m(T,{icon:"robot"}),e[55]||(e[55]=x(" Open AI Assistant ",-1))]),_:1})),m(y,{onClick:e[16]||(e[16]=p=>u(n).simpleModeRef.value=!1),variant:"outline-secondary"},{default:g(()=>[...e[56]||(e[56]=[o("i",{class:"bi bi-code-slash"},null,-1),x(" View Code ",-1)])]),_:1})]),o("div",Qt,[o("div",null,[e[57]||(e[57]=o("i",{class:"bi bi-file-code me-1"},null,-1)),x(" "+z(u(n).jsFiles.value.length)+" file"+z(u(n).jsFiles.value.length!==1?"s":""),1)]),u(n).selectedFile.value?(h(),I("div",Zt,[e[58]||(e[58]=o("i",{class:"bi bi-pencil me-1"},null,-1)),x(" Editing: "+z(u(n).selectedFile.value.filename),1)])):P("",!0)])]))])):P("",!0),u(n).simpleMode.value?P("",!0):(h(),I("div",en,[m(wt,{modelValue:u(n).codeInputRef.value,"onUpdate:modelValue":e[17]||(e[17]=p=>u(n).codeInputRef.value=p),placeholder:"Write TypeScript or JavaScript here..."},null,8,["modelValue"])]))])],64)),d.value&&!u(t)?(h(),I("div",tn,[m(Me,{"agent-mode":$e})])):P("",!0)]),u(t)?(h(),Q(ue,{key:1,modelValue:d.value,"onUpdate:modelValue":e[18]||(e[18]=p=>d.value=p),placement:"end",title:"AI Assistant",class:"bw-background"},{default:g(()=>[m(Me,{"agent-mode":$e})]),_:1},8,["modelValue"])):P("",!0),P("",!0),o("div",null,[m(G,{modelValue:b.value,"onUpdate:modelValue":e[21]||(e[21]=p=>b.value=p),"modal-class":["app-preview-modal",`modal-${v.value}`],"body-class":"p-0","hide-footer":"",size:v.value==="auto"?"lg":"xl",onHide:e[22]||(e[22]=p=>v.value="auto")},{header:g(()=>[o("div",nn,[e[63]||(e[63]=o("h5",{class:"modal-title"},"App Preview",-1)),o("div",ln,[m(y,{onClick:Je,variant:"outline-secondary",size:"sm",class:"me-2",title:v.value==="fit"?"Auto Size":"Fit Window"},{default:g(()=>[o("i",{class:K(v.value==="fit"?"bi bi-arrows-angle-contract":"bi bi-arrows-angle-expand")},null,2)]),_:1},8,["title"]),m(y,{onClick:Ke,variant:"outline-secondary",size:"sm",class:"me-2",title:v.value==="fullscreen"?"Exit Fullscreen":"Fullscreen"},{default:g(()=>[o("i",{class:K(v.value==="fullscreen"?"bi bi-fullscreen-exit":"bi bi-fullscreen")},null,2)]),_:1},8,["title"]),o("button",{type:"button",class:"btn-close",onClick:e[20]||(e[20]=p=>b.value=!1)})])])]),default:g(()=>[m(we,{code:V.value,"item-id":A.itemId,class:K(["modal-iframe",`iframe-${v.value}`])},null,8,["code","item-id","class"])]),_:1},8,["modelValue","modal-class","size"]),m(G,{modelValue:a.value,"onUpdate:modelValue":e[23]||(e[23]=p=>a.value=p),title:"File History",size:"lg","ok-only":"","ok-title":"Close"},{default:g(()=>[r.value.length===0?(h(),I("div",sn," No history available for this file ")):(h(),I("div",on,[(h(!0),I(ce,null,be(r.value.slice().reverse(),(p,te)=>(h(),I("div",{key:te,class:"list-group-item d-flex justify-content-between align-items-start"},[o("div",an,[o("div",rn,[o("span",dn,z(p.label||"Change"),1),o("small",un,z(qe(p.timestamp)),1)]),o("pre",cn,z(p.content.substring(0,200))+z(p.content.length>200?"...":""),1)]),o("div",pn,[m(y,{onClick:he=>Ue(p),variant:"outline-primary",size:"sm"},{default:g(()=>[...e[64]||(e[64]=[x(" Revert ",-1)])]),_:1},8,["onClick"])])]))),128))]))]),_:1},8,["modelValue"]),m(G,{modelValue:M.value,"onUpdate:modelValue":e[25]||(e[25]=p=>M.value=p),title:"Add New File",onOk:ye},{default:g(()=>[o("form",{onSubmit:pe(ye,["prevent"])},[o("div",mn,[e[65]||(e[65]=o("label",{for:"fileName",class:"form-label"},"File Name",-1)),Qe(o("input",{id:"fileName",ref_key:"fileNameInput",ref:J,"onUpdate:modelValue":e[24]||(e[24]=p=>H.value=p),type:"text",class:"form-control",placeholder:"e.g., utils.js",onKeydown:Ze(pe(ye,["prevent"]),["enter"])},null,40,fn),[[et,H.value]]),e[66]||(e[66]=o("div",{class:"form-text"}," File name will automatically get .js extension if not provided ",-1))])],32)]),_:1},8,["modelValue"])]),o("div",vn,[o("div",gn,[o("div",yn,[u(n).selectedFile.value?(h(),I("span",hn,[e[67]||(e[67]=o("i",{class:"bi bi-file-code me-1"},null,-1)),x(" "+z(u(n).selectedFile.value.filename),1)])):P("",!0),u(n).jsFiles.value.length>0?(h(),I("span",bn,[e[68]||(e[68]=o("i",{class:"bi bi-folder me-1"},null,-1)),x(" "+z(u(n).jsFiles.value.length)+" file"+z(u(n).jsFiles.value.length!==1?"s":""),1)])):P("",!0)]),e[69]||(e[69]=o("div",{class:"text-muted small"},null,-1))])])])}}}),An=Pe(_n,[["__scopeId","data-v-f4d97a08"]]),Tn={class:""},Rn={key:1,class:"alert alert-danger m-3"},Tl=ve({__name:"AppCreatorPage",setup(Z){const B=Ye(),t=$(()=>B.params.itemId);return(n,F)=>(h(),I("div",Tn,[t.value?(h(),Q(An,{key:0,itemId:t.value},null,8,["itemId"])):(h(),I("div",Rn,[...F[0]||(F[0]=[o("h5",null,"Error",-1),o("p",null,"No item ID provided",-1)])]))]))}});export{Tl as default};
