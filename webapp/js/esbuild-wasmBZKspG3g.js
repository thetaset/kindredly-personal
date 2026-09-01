var ze={exports:{}};(function(Ge){(Je=>{var Te=Object.defineProperty,qe=Object.getOwnPropertyDescriptor,Ye=Object.getOwnPropertyNames,He=Object.prototype.hasOwnProperty,Qe=(e,n)=>{for(var r in n)Te(e,r,{get:n[r],enumerable:!0})},Xe=(e,n,r,a)=>{if(n&&typeof n=="object"||typeof n=="function")for(let g of Ye(n))!He.call(e,g)&&g!==r&&Te(e,g,{get:()=>n[g],enumerable:!(a=qe(n,g))||a.enumerable});return e},Ke=e=>Xe(Te({},"__esModule",{value:!0}),e),le=(e,n,r)=>new Promise((a,g)=>{var y=u=>{try{k(r.next(u))}catch(D){g(D)}},h=u=>{try{k(r.throw(u))}catch(D){g(D)}},k=u=>u.done?a(u.value):Promise.resolve(u.value).then(y,h);k((r=r.apply(e,n)).next())}),ye={};Qe(ye,{analyzeMetafile:()=>wt,analyzeMetafileSync:()=>_t,build:()=>mt,buildSync:()=>vt,context:()=>gt,default:()=>Tt,formatMessages:()=>yt,formatMessagesSync:()=>xt,initialize:()=>Et,stop:()=>kt,transform:()=>pt,transformSync:()=>bt,version:()=>ht}),Je.exports=Ke(ye);function je(e){let n=a=>{if(a===null)r.write8(0);else if(typeof a=="boolean")r.write8(1),r.write8(+a);else if(typeof a=="number")r.write8(2),r.write32(a|0);else if(typeof a=="string")r.write8(3),r.write(Z(a));else if(a instanceof Uint8Array)r.write8(4),r.write(a);else if(a instanceof Array){r.write8(5),r.write32(a.length);for(let g of a)n(g)}else{let g=Object.keys(a);r.write8(6),r.write32(g.length);for(let y of g)r.write(Z(y)),n(a[y])}},r=new Oe;return r.write32(0),r.write32(e.id<<1|+!e.isRequest),n(e.value),Pe(r.buf,r.len-4,0),r.buf.subarray(0,r.len)}function Ze(e){let n=()=>{switch(r.read8()){case 0:return null;case 1:return!!r.read8();case 2:return r.read32();case 3:return ue(r.read());case 4:return r.read();case 5:{let h=r.read32(),k=[];for(let u=0;u<h;u++)k.push(n());return k}case 6:{let h=r.read32(),k={};for(let u=0;u<h;u++)k[ue(r.read())]=n();return k}default:throw new Error("Invalid packet")}},r=new Oe(e),a=r.read32(),g=(a&1)===0;a>>>=1;let y=n();if(r.ptr!==e.length)throw new Error("Invalid packet");return{id:a,isRequest:g,value:y}}var Oe=class{constructor(e=new Uint8Array(1024)){this.buf=e,this.len=0,this.ptr=0}_write(e){if(this.len+e>this.buf.length){let n=new Uint8Array((this.len+e)*2);n.set(this.buf),this.buf=n}return this.len+=e,this.len-e}write8(e){let n=this._write(1);this.buf[n]=e}write32(e){let n=this._write(4);Pe(this.buf,e,n)}write(e){let n=this._write(4+e.length);Pe(this.buf,e.length,n),this.buf.set(e,n+4)}_read(e){if(this.ptr+e>this.buf.length)throw new Error("Invalid packet");return this.ptr+=e,this.ptr-e}read8(){return this.buf[this._read(1)]}read32(){return Ce(this.buf,this._read(4))}read(){let e=this.read32(),n=new Uint8Array(e),r=this._read(n.length);return n.set(this.buf.subarray(r,r+e)),n}},Z,ue,$e;if(typeof TextEncoder<"u"&&typeof TextDecoder<"u"){let e=new TextEncoder,n=new TextDecoder;Z=r=>e.encode(r),ue=r=>n.decode(r),$e='new TextEncoder().encode("")'}else if(typeof Buffer<"u")Z=e=>Buffer.from(e),ue=e=>{let{buffer:n,byteOffset:r,byteLength:a}=e;return Buffer.from(n,r,a).toString()},$e='Buffer.from("")';else throw new Error("No UTF-8 codec found");if(!(Z("")instanceof Uint8Array))throw new Error(`Invariant violation: "${$e} instanceof Uint8Array" is incorrectly false

This indicates that your JavaScript environment is broken. You cannot use
esbuild in this environment because esbuild relies on this invariant. This
is not a problem with esbuild. You need to fix your environment instead.
`);function Ce(e,n){return e[n++]|e[n++]<<8|e[n++]<<16|e[n++]<<24}function Pe(e,n,r){e[r++]=n,e[r++]=n>>8,e[r++]=n>>16,e[r++]=n>>24}var J=JSON.stringify,Ae="warning",De="silent";function fe(e,n){const r=[];for(const a of e){if(Y(a,n),a.indexOf(",")>=0)throw new Error(`Invalid ${n}: ${a}`);r.push(a)}return r.join(",")}var we=()=>null,L=e=>typeof e=="boolean"?null:"a boolean",P=e=>typeof e=="string"?null:"a string",ve=e=>e instanceof RegExp?null:"a RegExp object",oe=e=>typeof e=="number"&&e===(e|0)?null:"an integer",et=e=>typeof e=="number"&&e===(e|0)&&e>=0&&e<=65535?null:"a valid port number",Re=e=>typeof e=="function"?null:"a function",te=e=>Array.isArray(e)?null:"an array",q=e=>Array.isArray(e)&&e.every(n=>typeof n=="string")?null:"an array of strings",Q=e=>typeof e=="object"&&e!==null&&!Array.isArray(e)?null:"an object",tt=e=>typeof e=="object"&&e!==null?null:"an array or an object",nt=e=>e instanceof WebAssembly.Module?null:"a WebAssembly.Module",Ue=e=>typeof e=="object"&&!Array.isArray(e)?null:"an object or null",Ie=e=>typeof e=="string"||typeof e=="boolean"?null:"a string or a boolean",rt=e=>typeof e=="string"||typeof e=="object"&&e!==null&&!Array.isArray(e)?null:"a string or an object",Me=e=>typeof e=="string"||Array.isArray(e)&&e.every(n=>typeof n=="string")?null:"a string or an array of strings",Fe=e=>typeof e=="string"||e instanceof Uint8Array?null:"a string or a Uint8Array",st=e=>typeof e=="string"||e instanceof URL?null:"a string or a URL";function i(e,n,r,a){let g=e[r];if(n[r+""]=!0,g===void 0)return;let y=a(g);if(y!==null)throw new Error(`${J(r)} must be ${y}`);return g}function z(e,n,r){for(let a in e)if(!(a in n))throw new Error(`Invalid option ${r}: ${J(a)}`)}function it(e){let n=Object.create(null),r=i(e,n,"wasmURL",st),a=i(e,n,"wasmModule",nt),g=i(e,n,"worker",L);return z(e,n,"in initialize() call"),{wasmURL:r,wasmModule:a,worker:g}}function Ne(e){let n;if(e!==void 0){n=Object.create(null);for(let r in e){let a=e[r];if(typeof a=="string"||a===!1)n[r]=a;else throw new Error(`Expected ${J(r)} in mangle cache to map to either a string or false`)}}return n}function be(e,n,r,a,g){let y=i(n,r,"color",L),h=i(n,r,"logLevel",P),k=i(n,r,"logLimit",oe);y!==void 0?e.push(`--color=${y}`):a&&e.push("--color=true"),e.push(`--log-level=${h||g}`),e.push(`--log-limit=${k||0}`)}function Y(e,n,r){if(typeof e!="string")throw new Error(`Expected value for ${n}${r!==void 0?" "+J(r):""} to be a string, got ${typeof e} instead`);return e}function Ve(e,n,r){let a=i(n,r,"legalComments",P),g=i(n,r,"sourceRoot",P),y=i(n,r,"sourcesContent",L),h=i(n,r,"target",Me),k=i(n,r,"format",P),u=i(n,r,"globalName",P),D=i(n,r,"mangleProps",ve),R=i(n,r,"reserveProps",ve),O=i(n,r,"mangleQuoted",L),V=i(n,r,"minify",L),C=i(n,r,"minifySyntax",L),M=i(n,r,"minifyWhitespace",L),F=i(n,r,"minifyIdentifiers",L),$=i(n,r,"lineLimit",oe),W=i(n,r,"drop",q),S=i(n,r,"dropLabels",q),E=i(n,r,"charset",P),p=i(n,r,"treeShaking",L),f=i(n,r,"ignoreAnnotations",L),s=i(n,r,"jsx",P),o=i(n,r,"jsxFactory",P),d=i(n,r,"jsxFragment",P),b=i(n,r,"jsxImportSource",P),x=i(n,r,"jsxDev",L),c=i(n,r,"jsxSideEffects",L),m=i(n,r,"define",Q),t=i(n,r,"logOverride",Q),l=i(n,r,"supported",Q),w=i(n,r,"pure",q),v=i(n,r,"keepNames",L),T=i(n,r,"platform",P),A=i(n,r,"tsconfigRaw",rt),B=i(n,r,"absPaths",q);if(a&&e.push(`--legal-comments=${a}`),g!==void 0&&e.push(`--source-root=${g}`),y!==void 0&&e.push(`--sources-content=${y}`),h&&e.push(`--target=${fe(Array.isArray(h)?h:[h],"target")}`),k&&e.push(`--format=${k}`),u&&e.push(`--global-name=${u}`),T&&e.push(`--platform=${T}`),A&&e.push(`--tsconfig-raw=${typeof A=="string"?A:JSON.stringify(A)}`),V&&e.push("--minify"),C&&e.push("--minify-syntax"),M&&e.push("--minify-whitespace"),F&&e.push("--minify-identifiers"),$&&e.push(`--line-limit=${$}`),E&&e.push(`--charset=${E}`),p!==void 0&&e.push(`--tree-shaking=${p}`),f&&e.push("--ignore-annotations"),W)for(let _ of W)e.push(`--drop:${Y(_,"drop")}`);if(S&&e.push(`--drop-labels=${fe(S,"drop label")}`),B&&e.push(`--abs-paths=${fe(B,"abs paths")}`),D&&e.push(`--mangle-props=${ke(D)}`),R&&e.push(`--reserve-props=${ke(R)}`),O!==void 0&&e.push(`--mangle-quoted=${O}`),s&&e.push(`--jsx=${s}`),o&&e.push(`--jsx-factory=${o}`),d&&e.push(`--jsx-fragment=${d}`),b&&e.push(`--jsx-import-source=${b}`),x&&e.push("--jsx-dev"),c&&e.push("--jsx-side-effects"),m)for(let _ in m){if(_.indexOf("=")>=0)throw new Error(`Invalid define: ${_}`);e.push(`--define:${_}=${Y(m[_],"define",_)}`)}if(t)for(let _ in t){if(_.indexOf("=")>=0)throw new Error(`Invalid log override: ${_}`);e.push(`--log-override:${_}=${Y(t[_],"log override",_)}`)}if(l)for(let _ in l){if(_.indexOf("=")>=0)throw new Error(`Invalid supported: ${_}`);const N=l[_];if(typeof N!="boolean")throw new Error(`Expected value for supported ${J(_)} to be a boolean, got ${typeof N} instead`);e.push(`--supported:${_}=${N}`)}if(w)for(let _ of w)e.push(`--pure:${Y(_,"pure")}`);v&&e.push("--keep-names")}function lt(e,n,r,a,g){var y;let h=[],k=[],u=Object.create(null),D=null,R=null;be(h,n,u,r,a),Ve(h,n,u);let O=i(n,u,"sourcemap",Ie),V=i(n,u,"bundle",L),C=i(n,u,"splitting",L),M=i(n,u,"preserveSymlinks",L),F=i(n,u,"metafile",L),$=i(n,u,"outfile",P),W=i(n,u,"outdir",P),S=i(n,u,"outbase",P),E=i(n,u,"tsconfig",P),p=i(n,u,"resolveExtensions",q),f=i(n,u,"nodePaths",q),s=i(n,u,"mainFields",q),o=i(n,u,"conditions",q),d=i(n,u,"external",q),b=i(n,u,"packages",P),x=i(n,u,"alias",Q),c=i(n,u,"loader",Q),m=i(n,u,"outExtension",Q),t=i(n,u,"publicPath",P),l=i(n,u,"entryNames",P),w=i(n,u,"chunkNames",P),v=i(n,u,"assetNames",P),T=i(n,u,"inject",q),A=i(n,u,"banner",Q),B=i(n,u,"footer",Q),_=i(n,u,"entryPoints",tt),N=i(n,u,"absWorkingDir",P),I=i(n,u,"stdin",Q),U=(y=i(n,u,"write",L))!=null?y:g,H=i(n,u,"allowOverwrite",L),G=i(n,u,"mangleCache",Q);if(u.plugins=!0,z(n,u,`in ${e}() call`),O&&h.push(`--sourcemap${O===!0?"":`=${O}`}`),V&&h.push("--bundle"),H&&h.push("--allow-overwrite"),C&&h.push("--splitting"),M&&h.push("--preserve-symlinks"),F&&h.push("--metafile"),$&&h.push(`--outfile=${$}`),W&&h.push(`--outdir=${W}`),S&&h.push(`--outbase=${S}`),E&&h.push(`--tsconfig=${E}`),b&&h.push(`--packages=${b}`),p&&h.push(`--resolve-extensions=${fe(p,"resolve extension")}`),t&&h.push(`--public-path=${t}`),l&&h.push(`--entry-names=${l}`),w&&h.push(`--chunk-names=${w}`),v&&h.push(`--asset-names=${v}`),s&&h.push(`--main-fields=${fe(s,"main field")}`),o&&h.push(`--conditions=${fe(o,"condition")}`),d)for(let j of d)h.push(`--external:${Y(j,"external")}`);if(x)for(let j in x){if(j.indexOf("=")>=0)throw new Error(`Invalid package name in alias: ${j}`);h.push(`--alias:${j}=${Y(x[j],"alias",j)}`)}if(A)for(let j in A){if(j.indexOf("=")>=0)throw new Error(`Invalid banner file type: ${j}`);h.push(`--banner:${j}=${Y(A[j],"banner",j)}`)}if(B)for(let j in B){if(j.indexOf("=")>=0)throw new Error(`Invalid footer file type: ${j}`);h.push(`--footer:${j}=${Y(B[j],"footer",j)}`)}if(T)for(let j of T)h.push(`--inject:${Y(j,"inject")}`);if(c)for(let j in c){if(j.indexOf("=")>=0)throw new Error(`Invalid loader extension: ${j}`);h.push(`--loader:${j}=${Y(c[j],"loader",j)}`)}if(m)for(let j in m){if(j.indexOf("=")>=0)throw new Error(`Invalid out extension: ${j}`);h.push(`--out-extension:${j}=${Y(m[j],"out extension",j)}`)}if(_)if(Array.isArray(_))for(let j=0,se=_.length;j<se;j++){let X=_[j];if(typeof X=="object"&&X!==null){let ee=Object.create(null),ie=i(X,ee,"in",P),K=i(X,ee,"out",P);if(z(X,ee,"in entry point at index "+j),ie===void 0)throw new Error('Missing property "in" for entry point at index '+j);if(K===void 0)throw new Error('Missing property "out" for entry point at index '+j);k.push([K,ie])}else k.push(["",Y(X,"entry point at index "+j)])}else for(let j in _)k.push([j,Y(_[j],"entry point",j)]);if(I){let j=Object.create(null),se=i(I,j,"contents",Fe),X=i(I,j,"resolveDir",P),ee=i(I,j,"sourcefile",P),ie=i(I,j,"loader",P);z(I,j,'in "stdin" object'),ee&&h.push(`--sourcefile=${ee}`),ie&&h.push(`--loader=${ie}`),X&&(R=X),typeof se=="string"?D=Z(se):se instanceof Uint8Array&&(D=se)}let re=[];if(f)for(let j of f)j+="",re.push(j);return{entries:k,flags:h,write:U,stdinContents:D,stdinResolveDir:R,absWorkingDir:N,nodePaths:re,mangleCache:Ne(G)}}function ot(e,n,r,a){let g=[],y=Object.create(null);be(g,n,y,r,a),Ve(g,n,y);let h=i(n,y,"sourcemap",Ie),k=i(n,y,"sourcefile",P),u=i(n,y,"loader",P),D=i(n,y,"banner",P),R=i(n,y,"footer",P),O=i(n,y,"mangleCache",Q);return z(n,y,`in ${e}() call`),h&&g.push(`--sourcemap=${h===!0?"external":h}`),k&&g.push(`--sourcefile=${k}`),u&&g.push(`--loader=${u}`),D&&g.push(`--banner=${D}`),R&&g.push(`--footer=${R}`),{flags:g,mangleCache:Ne(O)}}function at(e){const n={},r={didClose:!1,reason:""};let a={},g=0,y=0,h=new Uint8Array(16*1024),k=0,u=E=>{let p=k+E.length;if(p>h.length){let s=new Uint8Array(p*2);s.set(h),h=s}h.set(E,k),k+=E.length;let f=0;for(;f+4<=k;){let s=Ce(h,f);if(f+4+s>k)break;f+=4,M(h.subarray(f,f+s)),f+=s}f>0&&(h.copyWithin(0,f,k),k-=f)},D=E=>{r.didClose=!0,E&&(r.reason=": "+(E.message||E));const p="The service was stopped"+r.reason;for(let f in a)a[f](p,null);a={}},R=(E,p,f)=>{if(r.didClose)return f("The service is no longer running"+r.reason,null);let s=g++;a[s]=(o,d)=>{try{f(o,d)}finally{E&&E.unref()}},E&&E.ref(),e.writeToStdin(je({id:s,isRequest:!0,value:p}))},O=(E,p)=>{if(r.didClose)throw new Error("The service is no longer running"+r.reason);e.writeToStdin(je({id:E,isRequest:!1,value:p}))},V=(E,p)=>le(null,null,function*(){try{if(p.command==="ping"){O(E,{});return}if(typeof p.key=="number"){const f=n[p.key];if(!f)return;const s=f[p.command];if(s){yield s(E,p);return}}throw new Error("Invalid command: "+p.command)}catch(f){const s=[ae(f,e,null,void 0,"")];try{O(E,{errors:s})}catch{}}}),C=!0,M=E=>{if(C){C=!1;let f=String.fromCharCode(...E);if(f!=="0.25.12")throw new Error(`Cannot start service: Host version "0.25.12" does not match binary version ${J(f)}`);return}let p=Ze(E);if(p.isRequest)V(p.id,p.value);else{let f=a[p.id];delete a[p.id],p.value.error?f(p.value.error,{}):f(null,p.value)}};return{readFromStdout:u,afterClose:D,service:{buildOrContext:({callName:E,refs:p,options:f,isTTY:s,defaultWD:o,callback:d})=>{let b=0;const x=y++,c={},m={ref(){++b===1&&p&&p.ref()},unref(){--b===0&&(delete n[x],p&&p.unref())}};n[x]=c,m.ref(),ct(E,x,R,O,m,e,c,f,s,o,(t,l)=>{try{d(t,l)}finally{m.unref()}})},transform:({callName:E,refs:p,input:f,options:s,isTTY:o,fs:d,callback:b})=>{const x=Be();let c=m=>{try{if(typeof f!="string"&&!(f instanceof Uint8Array))throw new Error('The input to "transform" must be a string or a Uint8Array');let{flags:t,mangleCache:l}=ot(E,s,o,De),w={command:"transform",flags:t,inputFS:m!==null,input:m!==null?Z(m):typeof f=="string"?Z(f):f};l&&(w.mangleCache=l),R(p,w,(v,T)=>{if(v)return b(new Error(v),null);let A=de(T.errors,x),B=de(T.warnings,x),_=1,N=()=>{if(--_===0){let I={warnings:B,code:T.code,map:T.map,mangleCache:void 0,legalComments:void 0};"legalComments"in T&&(I.legalComments=T==null?void 0:T.legalComments),T.mangleCache&&(I.mangleCache=T==null?void 0:T.mangleCache),b(null,I)}};if(A.length>0)return b(me("Transform failed",A,B),null);T.codeFS&&(_++,d.readFile(T.code,(I,U)=>{I!==null?b(I,null):(T.code=U,N())})),T.mapFS&&(_++,d.readFile(T.map,(I,U)=>{I!==null?b(I,null):(T.map=U,N())})),N()})}catch(t){let l=[];try{be(l,s,{},o,De)}catch{}const w=ae(t,e,x,void 0,"");R(p,{command:"error",flags:l,error:w},()=>{w.detail=x.load(w.detail),b(me("Transform failed",[w],[]),null)})}};if((typeof f=="string"||f instanceof Uint8Array)&&f.length>1024*1024){let m=c;c=()=>d.writeFile(f,m)}c(null)},formatMessages:({callName:E,refs:p,messages:f,options:s,callback:o})=>{if(!s)throw new Error(`Missing second argument in ${E}() call`);let d={},b=i(s,d,"kind",P),x=i(s,d,"color",L),c=i(s,d,"terminalWidth",oe);if(z(s,d,`in ${E}() call`),b===void 0)throw new Error(`Missing "kind" in ${E}() call`);if(b!=="error"&&b!=="warning")throw new Error(`Expected "kind" to be "error" or "warning" in ${E}() call`);let m={command:"format-msgs",messages:ne(f,"messages",null,"",c),isWarning:b==="warning"};x!==void 0&&(m.color=x),c!==void 0&&(m.terminalWidth=c),R(p,m,(t,l)=>{if(t)return o(new Error(t),null);o(null,l.messages)})},analyzeMetafile:({callName:E,refs:p,metafile:f,options:s,callback:o})=>{s===void 0&&(s={});let d={},b=i(s,d,"color",L),x=i(s,d,"verbose",L);z(s,d,`in ${E}() call`);let c={command:"analyze-metafile",metafile:f};b!==void 0&&(c.color=b),x!==void 0&&(c.verbose=x),R(p,c,(m,t)=>{if(m)return o(new Error(m),null);o(null,t.result)})}}}}function ct(e,n,r,a,g,y,h,k,u,D,R){const O=Be(),V=e==="context",C=($,W)=>{const S=[];try{be(S,k,{},u,Ae)}catch{}const E=ae($,y,O,void 0,W);r(g,{command:"error",flags:S,error:E},()=>{E.detail=O.load(E.detail),R(me(V?"Context failed":"Build failed",[E],[]),null)})};let M;if(typeof k=="object"){const $=k.plugins;if($!==void 0){if(!Array.isArray($))return C(new Error('"plugins" must be an array'),"");M=$}}if(M&&M.length>0){if(y.isSync)return C(new Error("Cannot use plugins in synchronous API calls"),"");ut(n,r,a,g,y,h,k,M,O).then($=>{if(!$.ok)return C($.error,$.pluginName);try{F($.requestPlugins,$.runOnEndCallbacks,$.scheduleOnDisposeCallbacks)}catch(W){C(W,"")}},$=>C($,""));return}try{F(null,($,W)=>W([],[]),()=>{})}catch($){C($,"")}function F($,W,S){const E=y.hasFS,{entries:p,flags:f,write:s,stdinContents:o,stdinResolveDir:d,absWorkingDir:b,nodePaths:x,mangleCache:c}=lt(e,k,u,Ae,E);if(s&&!y.hasFS)throw new Error('The "write" option is unavailable in this environment');const m={command:"build",key:n,entries:p,flags:f,write:s,stdinContents:o,stdinResolveDir:d,absWorkingDir:b||D,nodePaths:x,context:V};$&&(m.plugins=$),c&&(m.mangleCache=c);const t=(v,T)=>{const A={errors:de(v.errors,O),warnings:de(v.warnings,O),outputFiles:void 0,metafile:void 0,mangleCache:void 0},B=A.errors.slice(),_=A.warnings.slice();v.outputFiles&&(A.outputFiles=v.outputFiles.map(dt)),v.metafile&&(A.metafile=JSON.parse(v.metafile)),v.mangleCache&&(A.mangleCache=v.mangleCache),v.writeToStdout!==void 0&&ue(v.writeToStdout).replace(/\n$/,""),W(A,(N,I)=>{if(B.length>0||N.length>0){const U=me("Build failed",B.concat(N),_.concat(I));return T(U,null,N,I)}T(null,A,N,I)})};let l,w;V&&(h["on-end"]=(v,T)=>new Promise(A=>{t(T,(B,_,N,I)=>{const U={errors:N,warnings:I};w&&w(B,_),l=void 0,w=void 0,a(v,U),A()})})),r(g,m,(v,T)=>{if(v)return R(new Error(v),null);if(!V)return t(T,(_,N)=>(S(),R(_,N)));if(T.errors.length>0)return R(me("Context failed",T.errors,T.warnings),null);let A=!1;const B={rebuild:()=>(l||(l=new Promise((_,N)=>{let I;w=(H,G)=>{I||(I=()=>H?N(H):_(G))};const U=()=>{r(g,{command:"rebuild",key:n},(G,re)=>{G?N(new Error(G)):I?I():U()})};U()})),l),watch:(_={})=>new Promise((N,I)=>{if(!y.hasFS)throw new Error('Cannot use the "watch" API in this environment');const U={},H=i(_,U,"delay",oe);z(_,U,"in watch() call");const G={command:"watch",key:n};H&&(G.delay=H),r(g,G,re=>{re?I(new Error(re)):N(void 0)})}),serve:(_={})=>new Promise((N,I)=>{if(!y.hasFS)throw new Error('Cannot use the "serve" API in this environment');const U={},H=i(_,U,"port",et),G=i(_,U,"host",P),re=i(_,U,"servedir",P),j=i(_,U,"keyfile",P),se=i(_,U,"certfile",P),X=i(_,U,"fallback",P),ee=i(_,U,"cors",Q),ie=i(_,U,"onRequest",Re);z(_,U,"in serve() call");const K={command:"serve",key:n,onRequest:!!ie};if(H!==void 0&&(K.port=H),G!==void 0&&(K.host=G),re!==void 0&&(K.servedir=re),j!==void 0&&(K.keyfile=j),se!==void 0&&(K.certfile=se),X!==void 0&&(K.fallback=X),ee){const pe={},he=i(ee,pe,"origin",Me);z(ee,pe,'on "cors" object'),Array.isArray(he)?K.corsOrigin=he:he!==void 0&&(K.corsOrigin=[he])}r(g,K,(pe,he)=>{if(pe)return I(new Error(pe));ie&&(h["serve-request"]=($t,Pt)=>{ie(Pt.args),a($t,{})}),N(he)})}),cancel:()=>new Promise(_=>{if(A)return _();r(g,{command:"cancel",key:n},()=>{_()})}),dispose:()=>new Promise(_=>{if(A)return _();A=!0,r(g,{command:"dispose",key:n},()=>{_(),S(),g.unref()})})};g.ref(),R(null,B)})}}var ut=(e,n,r,a,g,y,h,k,u)=>le(null,null,function*(){let D=[],R=[],O={},V={},C=[],M=0,F=0,$=[],W=!1;k=[...k];for(let p of k){let f={};if(typeof p!="object")throw new Error(`Plugin at index ${F} must be an object`);const s=i(p,f,"name",P);if(typeof s!="string"||s==="")throw new Error(`Plugin at index ${F} is missing a name`);try{let o=i(p,f,"setup",Re);if(typeof o!="function")throw new Error("Plugin is missing a setup function");z(p,f,`on plugin ${J(s)}`);let d={name:s,onStart:!1,onEnd:!1,onResolve:[],onLoad:[]};F++;let x=o({initialOptions:h,resolve:(c,m={})=>{if(!W)throw new Error('Cannot call "resolve" before plugin setup has completed');if(typeof c!="string")throw new Error("The path to resolve must be a string");let t=Object.create(null),l=i(m,t,"pluginName",P),w=i(m,t,"importer",P),v=i(m,t,"namespace",P),T=i(m,t,"resolveDir",P),A=i(m,t,"kind",P),B=i(m,t,"pluginData",we),_=i(m,t,"with",Q);return z(m,t,"in resolve() call"),new Promise((N,I)=>{const U={command:"resolve",path:c,key:e,pluginName:s};if(l!=null&&(U.pluginName=l),w!=null&&(U.importer=w),v!=null&&(U.namespace=v),T!=null&&(U.resolveDir=T),A!=null)U.kind=A;else throw new Error('Must specify "kind" when calling "resolve"');B!=null&&(U.pluginData=u.store(B)),_!=null&&(U.with=ft(_,"with")),n(a,U,(H,G)=>{H!==null?I(new Error(H)):N({errors:de(G.errors,u),warnings:de(G.warnings,u),path:G.path,external:G.external,sideEffects:G.sideEffects,namespace:G.namespace,suffix:G.suffix,pluginData:u.load(G.pluginData)})})})},onStart(c){let m='This error came from the "onStart" callback registered here:',t=xe(new Error(m),g,"onStart");D.push({name:s,callback:c,note:t}),d.onStart=!0},onEnd(c){let m='This error came from the "onEnd" callback registered here:',t=xe(new Error(m),g,"onEnd");R.push({name:s,callback:c,note:t}),d.onEnd=!0},onResolve(c,m){let t='This error came from the "onResolve" callback registered here:',l=xe(new Error(t),g,"onResolve"),w={},v=i(c,w,"filter",ve),T=i(c,w,"namespace",P);if(z(c,w,`in onResolve() call for plugin ${J(s)}`),v==null)throw new Error("onResolve() call is missing a filter");let A=M++;O[A]={name:s,callback:m,note:l},d.onResolve.push({id:A,filter:ke(v),namespace:T||""})},onLoad(c,m){let t='This error came from the "onLoad" callback registered here:',l=xe(new Error(t),g,"onLoad"),w={},v=i(c,w,"filter",ve),T=i(c,w,"namespace",P);if(z(c,w,`in onLoad() call for plugin ${J(s)}`),v==null)throw new Error("onLoad() call is missing a filter");let A=M++;V[A]={name:s,callback:m,note:l},d.onLoad.push({id:A,filter:ke(v),namespace:T||""})},onDispose(c){C.push(c)},esbuild:g.esbuild});x&&(yield x),$.push(d)}catch(o){return{ok:!1,error:o,pluginName:s}}}y["on-start"]=(p,f)=>le(null,null,function*(){u.clear();let s={errors:[],warnings:[]};yield Promise.all(D.map(o=>le(null,[o],function*({name:d,callback:b,note:x}){try{let c=yield b();if(c!=null){if(typeof c!="object")throw new Error(`Expected onStart() callback in plugin ${J(d)} to return an object`);let m={},t=i(c,m,"errors",te),l=i(c,m,"warnings",te);z(c,m,`from onStart() callback in plugin ${J(d)}`),t!=null&&s.errors.push(...ne(t,"errors",u,d,void 0)),l!=null&&s.warnings.push(...ne(l,"warnings",u,d,void 0))}}catch(c){s.errors.push(ae(c,g,u,x&&x(),d))}}))),r(p,s)}),y["on-resolve"]=(p,f)=>le(null,null,function*(){let s={},o="",d,b;for(let x of f.ids)try{({name:o,callback:d,note:b}=O[x]);let c=yield d({path:f.path,importer:f.importer,namespace:f.namespace,resolveDir:f.resolveDir,kind:f.kind,pluginData:u.load(f.pluginData),with:f.with});if(c!=null){if(typeof c!="object")throw new Error(`Expected onResolve() callback in plugin ${J(o)} to return an object`);let m={},t=i(c,m,"pluginName",P),l=i(c,m,"path",P),w=i(c,m,"namespace",P),v=i(c,m,"suffix",P),T=i(c,m,"external",L),A=i(c,m,"sideEffects",L),B=i(c,m,"pluginData",we),_=i(c,m,"errors",te),N=i(c,m,"warnings",te),I=i(c,m,"watchFiles",q),U=i(c,m,"watchDirs",q);z(c,m,`from onResolve() callback in plugin ${J(o)}`),s.id=x,t!=null&&(s.pluginName=t),l!=null&&(s.path=l),w!=null&&(s.namespace=w),v!=null&&(s.suffix=v),T!=null&&(s.external=T),A!=null&&(s.sideEffects=A),B!=null&&(s.pluginData=u.store(B)),_!=null&&(s.errors=ne(_,"errors",u,o,void 0)),N!=null&&(s.warnings=ne(N,"warnings",u,o,void 0)),I!=null&&(s.watchFiles=_e(I,"watchFiles")),U!=null&&(s.watchDirs=_e(U,"watchDirs"));break}}catch(c){s={id:x,errors:[ae(c,g,u,b&&b(),o)]};break}r(p,s)}),y["on-load"]=(p,f)=>le(null,null,function*(){let s={},o="",d,b;for(let x of f.ids)try{({name:o,callback:d,note:b}=V[x]);let c=yield d({path:f.path,namespace:f.namespace,suffix:f.suffix,pluginData:u.load(f.pluginData),with:f.with});if(c!=null){if(typeof c!="object")throw new Error(`Expected onLoad() callback in plugin ${J(o)} to return an object`);let m={},t=i(c,m,"pluginName",P),l=i(c,m,"contents",Fe),w=i(c,m,"resolveDir",P),v=i(c,m,"pluginData",we),T=i(c,m,"loader",P),A=i(c,m,"errors",te),B=i(c,m,"warnings",te),_=i(c,m,"watchFiles",q),N=i(c,m,"watchDirs",q);z(c,m,`from onLoad() callback in plugin ${J(o)}`),s.id=x,t!=null&&(s.pluginName=t),l instanceof Uint8Array?s.contents=l:l!=null&&(s.contents=Z(l)),w!=null&&(s.resolveDir=w),v!=null&&(s.pluginData=u.store(v)),T!=null&&(s.loader=T),A!=null&&(s.errors=ne(A,"errors",u,o,void 0)),B!=null&&(s.warnings=ne(B,"warnings",u,o,void 0)),_!=null&&(s.watchFiles=_e(_,"watchFiles")),N!=null&&(s.watchDirs=_e(N,"watchDirs"));break}}catch(c){s={id:x,errors:[ae(c,g,u,b&&b(),o)]};break}r(p,s)});let S=(p,f)=>f([],[]);R.length>0&&(S=(p,f)=>{le(null,null,function*(){const s=[],o=[];for(const{name:d,callback:b,note:x}of R){let c,m;try{const t=yield b(p);if(t!=null){if(typeof t!="object")throw new Error(`Expected onEnd() callback in plugin ${J(d)} to return an object`);let l={},w=i(t,l,"errors",te),v=i(t,l,"warnings",te);z(t,l,`from onEnd() callback in plugin ${J(d)}`),w!=null&&(c=ne(w,"errors",u,d,void 0)),v!=null&&(m=ne(v,"warnings",u,d,void 0))}}catch(t){c=[ae(t,g,u,x&&x(),d)]}if(c){s.push(...c);try{p.errors.push(...c)}catch{}}if(m){o.push(...m);try{p.warnings.push(...m)}catch{}}}f(s,o)})});let E=()=>{for(const p of C)setTimeout(()=>p(),0)};return W=!0,{ok:!0,requestPlugins:$,runOnEndCallbacks:S,scheduleOnDisposeCallbacks:E}});function Be(){const e=new Map;let n=0;return{clear(){e.clear()},load(r){return e.get(r)},store(r){if(r===void 0)return-1;const a=n++;return e.set(a,r),a}}}function xe(e,n,r){let a,g=!1;return()=>{if(g)return a;g=!0;try{let y=(e.stack+"").split(`
`);y.splice(1,1);let h=Le(n,y,r);if(h)return a={text:e.message,location:h},a}catch{}}}function ae(e,n,r,a,g){let y="Internal error",h=null;try{y=(e&&e.message||e)+""}catch{}try{h=Le(n,(e.stack+"").split(`
`),"")}catch{}return{id:"",pluginName:g,text:y,location:h,notes:a?[a]:[],detail:r?r.store(e):-1}}function Le(e,n,r){let a="    at ";if(e.readFileSync&&!n[0].startsWith(a)&&n[1].startsWith(a))for(let g=1;g<n.length;g++){let y=n[g];if(y.startsWith(a))for(y=y.slice(a.length);;){let h=/^(?:new |async )?\S+ \((.*)\)$/.exec(y);if(h){y=h[1];continue}if(h=/^eval at \S+ \((.*)\)(?:, \S+:\d+:\d+)?$/.exec(y),h){y=h[1];continue}if(h=/^(\S+):(\d+):(\d+)$/.exec(y),h){let k;try{k=e.readFileSync(h[1],"utf8")}catch{break}let u=k.split(/\r\n|\r|\n|\u2028|\u2029/)[+h[2]-1]||"",D=+h[3]-1,R=u.slice(D,D+r.length)===r?r.length:0;return{file:h[1],namespace:"file",line:+h[2],column:Z(u.slice(0,D)).length,length:Z(u.slice(D,D+R)).length,lineText:u+`
`+n.slice(1).join(`
`),suggestion:""}}break}}return null}function me(e,n,r){let a=5;e+=n.length<1?"":` with ${n.length} error${n.length<2?"":"s"}:`+n.slice(0,a+1).map((y,h)=>{if(h===a)return`
...`;if(!y.location)return`
error: ${y.text}`;let{file:k,line:u,column:D}=y.location,R=y.pluginName?`[plugin: ${y.pluginName}] `:"";return`
${k}:${u}:${D}: ERROR: ${R}${y.text}`}).join("");let g=new Error(e);for(const[y,h]of[["errors",n],["warnings",r]])Object.defineProperty(g,y,{configurable:!0,enumerable:!0,get:()=>h,set:k=>Object.defineProperty(g,y,{configurable:!0,enumerable:!0,value:k})});return g}function de(e,n){for(const r of e)r.detail=n.load(r.detail);return e}function We(e,n,r){if(e==null)return null;let a={},g=i(e,a,"file",P),y=i(e,a,"namespace",P),h=i(e,a,"line",oe),k=i(e,a,"column",oe),u=i(e,a,"length",oe),D=i(e,a,"lineText",P),R=i(e,a,"suggestion",P);if(z(e,a,n),D){const O=D.slice(0,(k&&k>0?k:0)+(u&&u>0?u:0)+(r&&r>0?r:80));!/[\x7F-\uFFFF]/.test(O)&&!/\n/.test(D)&&(D=O)}return{file:g||"",namespace:y||"",line:h||0,column:k||0,length:u||0,lineText:D||"",suggestion:R||""}}function ne(e,n,r,a,g){let y=[],h=0;for(const k of e){let u={},D=i(k,u,"id",P),R=i(k,u,"pluginName",P),O=i(k,u,"text",P),V=i(k,u,"location",Ue),C=i(k,u,"notes",te),M=i(k,u,"detail",we),F=`in element ${h} of "${n}"`;z(k,u,F);let $=[];if(C)for(const W of C){let S={},E=i(W,S,"text",P),p=i(W,S,"location",Ue);z(W,S,F),$.push({text:E||"",location:We(p,F,g)})}y.push({id:D||"",pluginName:R||a,text:O||"",location:We(V,F,g),notes:$,detail:r?r.store(M):-1}),h++}return y}function _e(e,n){const r=[];for(const a of e){if(typeof a!="string")throw new Error(`${J(n)} must be an array of strings`);r.push(a)}return r}function ft(e,n){const r=Object.create(null);for(const a in e){const g=e[a];if(typeof g!="string")throw new Error(`key ${J(a)} in object ${J(n)} must be a string`);r[a]=g}return r}function dt({path:e,contents:n,hash:r}){let a=null;return{path:e,contents:n,hash:r,get text(){const g=this.contents;return(a===null||g!==n)&&(n=g,a=ue(g)),a}}}function ke(e){let n=e.source;return e.flags&&(n=`(?${e.flags})${n}`),n}var ht="0.25.12",mt=e=>ge().build(e),gt=e=>ge().context(e),pt=(e,n)=>ge().transform(e,n),yt=(e,n)=>ge().formatMessages(e,n),wt=(e,n)=>ge().analyzeMetafile(e,n),vt=()=>{throw new Error('The "buildSync" API only works in node')},bt=()=>{throw new Error('The "transformSync" API only works in node')},xt=()=>{throw new Error('The "formatMessagesSync" API only works in node')},_t=()=>{throw new Error('The "analyzeMetafileSync" API only works in node')},kt=()=>(Ee&&Ee(),Promise.resolve()),ce,Ee,Se,ge=()=>{if(Se)return Se;throw ce?new Error('You need to wait for the promise returned from "initialize" to be resolved before calling this'):new Error('You need to call "initialize" before calling this')},Et=e=>{e=it(e||{});let n=e.wasmURL,r=e.wasmModule,a=e.worker!==!1;if(!n&&!r)throw new Error('Must provide either the "wasmURL" option or the "wasmModule" option');if(ce)throw new Error('Cannot call "initialize" more than once');return ce=St(n||"",r,a),ce.catch(()=>{ce=void 0}),ce},St=(e,n,r)=>le(null,null,function*(){let a,g;const y=new Promise(O=>g=O);if(r){let O=new Blob([`onmessage=((postMessage) => {
      // Copyright 2018 The Go Authors. All rights reserved.
      // Use of this source code is governed by a BSD-style
      // license that can be found in the LICENSE file.
      var __async = (__this, __arguments, generator) => {
        return new Promise((resolve, reject) => {
          var fulfilled = (value) => {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          };
          var rejected = (value) => {
            try {
              step(generator.throw(value));
            } catch (e) {
              reject(e);
            }
          };
          var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
          step((generator = generator.apply(__this, __arguments)).next());
        });
      };
      let onmessage;
      let globalThis = {};
      for (let o = self; o; o = Object.getPrototypeOf(o))
        for (let k of Object.getOwnPropertyNames(o))
          if (!(k in globalThis))
            Object.defineProperty(globalThis, k, { get: () => self[k] });
      "use strict";
      (() => {
        const enosys = () => {
          const err = new Error("not implemented");
          err.code = "ENOSYS";
          return err;
        };
        if (!globalThis.fs) {
          let outputBuf = "";
          globalThis.fs = {
            constants: { O_WRONLY: -1, O_RDWR: -1, O_CREAT: -1, O_TRUNC: -1, O_APPEND: -1, O_EXCL: -1 },
            // unused
            writeSync(fd, buf) {
              outputBuf += decoder.decode(buf);
              const nl = outputBuf.lastIndexOf("\\n");
              if (nl != -1) {
                console.log(outputBuf.substring(0, nl));
                outputBuf = outputBuf.substring(nl + 1);
              }
              return buf.length;
            },
            write(fd, buf, offset, length, position, callback) {
              if (offset !== 0 || length !== buf.length || position !== null) {
                callback(enosys());
                return;
              }
              const n = this.writeSync(fd, buf);
              callback(null, n);
            },
            chmod(path, mode, callback) {
              callback(enosys());
            },
            chown(path, uid, gid, callback) {
              callback(enosys());
            },
            close(fd, callback) {
              callback(enosys());
            },
            fchmod(fd, mode, callback) {
              callback(enosys());
            },
            fchown(fd, uid, gid, callback) {
              callback(enosys());
            },
            fstat(fd, callback) {
              callback(enosys());
            },
            fsync(fd, callback) {
              callback(null);
            },
            ftruncate(fd, length, callback) {
              callback(enosys());
            },
            lchown(path, uid, gid, callback) {
              callback(enosys());
            },
            link(path, link, callback) {
              callback(enosys());
            },
            lstat(path, callback) {
              callback(enosys());
            },
            mkdir(path, perm, callback) {
              callback(enosys());
            },
            open(path, flags, mode, callback) {
              callback(enosys());
            },
            read(fd, buffer, offset, length, position, callback) {
              callback(enosys());
            },
            readdir(path, callback) {
              callback(enosys());
            },
            readlink(path, callback) {
              callback(enosys());
            },
            rename(from, to, callback) {
              callback(enosys());
            },
            rmdir(path, callback) {
              callback(enosys());
            },
            stat(path, callback) {
              callback(enosys());
            },
            symlink(path, link, callback) {
              callback(enosys());
            },
            truncate(path, length, callback) {
              callback(enosys());
            },
            unlink(path, callback) {
              callback(enosys());
            },
            utimes(path, atime, mtime, callback) {
              callback(enosys());
            }
          };
        }
        if (!globalThis.process) {
          globalThis.process = {
            getuid() {
              return -1;
            },
            getgid() {
              return -1;
            },
            geteuid() {
              return -1;
            },
            getegid() {
              return -1;
            },
            getgroups() {
              throw enosys();
            },
            pid: -1,
            ppid: -1,
            umask() {
              throw enosys();
            },
            cwd() {
              throw enosys();
            },
            chdir() {
              throw enosys();
            }
          };
        }
        if (!globalThis.crypto) {
          throw new Error("globalThis.crypto is not available, polyfill required (crypto.getRandomValues only)");
        }
        if (!globalThis.performance) {
          throw new Error("globalThis.performance is not available, polyfill required (performance.now only)");
        }
        if (!globalThis.TextEncoder) {
          throw new Error("globalThis.TextEncoder is not available, polyfill required");
        }
        if (!globalThis.TextDecoder) {
          throw new Error("globalThis.TextDecoder is not available, polyfill required");
        }
        const encoder = new TextEncoder("utf-8");
        const decoder = new TextDecoder("utf-8");
        globalThis.Go = class {
          constructor() {
            this.argv = ["js"];
            this.env = {};
            this.exit = (code) => {
              if (code !== 0) {
                console.warn("exit code:", code);
              }
            };
            this._exitPromise = new Promise((resolve) => {
              this._resolveExitPromise = resolve;
            });
            this._pendingEvent = null;
            this._scheduledTimeouts = /* @__PURE__ */ new Map();
            this._nextCallbackTimeoutID = 1;
            const setInt64 = (addr, v) => {
              this.mem.setUint32(addr + 0, v, true);
              this.mem.setUint32(addr + 4, Math.floor(v / 4294967296), true);
            };
            const setInt32 = (addr, v) => {
              this.mem.setUint32(addr + 0, v, true);
            };
            const getInt64 = (addr) => {
              const low = this.mem.getUint32(addr + 0, true);
              const high = this.mem.getInt32(addr + 4, true);
              return low + high * 4294967296;
            };
            const loadValue = (addr) => {
              const f = this.mem.getFloat64(addr, true);
              if (f === 0) {
                return void 0;
              }
              if (!isNaN(f)) {
                return f;
              }
              const id = this.mem.getUint32(addr, true);
              return this._values[id];
            };
            const storeValue = (addr, v) => {
              const nanHead = 2146959360;
              if (typeof v === "number" && v !== 0) {
                if (isNaN(v)) {
                  this.mem.setUint32(addr + 4, nanHead, true);
                  this.mem.setUint32(addr, 0, true);
                  return;
                }
                this.mem.setFloat64(addr, v, true);
                return;
              }
              if (v === void 0) {
                this.mem.setFloat64(addr, 0, true);
                return;
              }
              let id = this._ids.get(v);
              if (id === void 0) {
                id = this._idPool.pop();
                if (id === void 0) {
                  id = this._values.length;
                }
                this._values[id] = v;
                this._goRefCounts[id] = 0;
                this._ids.set(v, id);
              }
              this._goRefCounts[id]++;
              let typeFlag = 0;
              switch (typeof v) {
                case "object":
                  if (v !== null) {
                    typeFlag = 1;
                  }
                  break;
                case "string":
                  typeFlag = 2;
                  break;
                case "symbol":
                  typeFlag = 3;
                  break;
                case "function":
                  typeFlag = 4;
                  break;
              }
              this.mem.setUint32(addr + 4, nanHead | typeFlag, true);
              this.mem.setUint32(addr, id, true);
            };
            const loadSlice = (addr) => {
              const array = getInt64(addr + 0);
              const len = getInt64(addr + 8);
              return new Uint8Array(this._inst.exports.mem.buffer, array, len);
            };
            const loadSliceOfValues = (addr) => {
              const array = getInt64(addr + 0);
              const len = getInt64(addr + 8);
              const a = new Array(len);
              for (let i = 0; i < len; i++) {
                a[i] = loadValue(array + i * 8);
              }
              return a;
            };
            const loadString = (addr) => {
              const saddr = getInt64(addr + 0);
              const len = getInt64(addr + 8);
              return decoder.decode(new DataView(this._inst.exports.mem.buffer, saddr, len));
            };
            const timeOrigin = Date.now() - performance.now();
            this.importObject = {
              _gotest: {
                add: (a, b) => a + b
              },
              gojs: {
                // Go's SP does not change as long as no Go code is running. Some operations (e.g. calls, getters and setters)
                // may synchronously trigger a Go event handler. This makes Go code get executed in the middle of the imported
                // function. A goroutine can switch to a new stack if the current stack is too small (see morestack function).
                // This changes the SP, thus we have to update the SP used by the imported function.
                // func wasmExit(code int32)
                "runtime.wasmExit": (sp) => {
                  sp >>>= 0;
                  const code = this.mem.getInt32(sp + 8, true);
                  this.exited = true;
                  delete this._inst;
                  delete this._values;
                  delete this._goRefCounts;
                  delete this._ids;
                  delete this._idPool;
                  this.exit(code);
                },
                // func wasmWrite(fd uintptr, p unsafe.Pointer, n int32)
                "runtime.wasmWrite": (sp) => {
                  sp >>>= 0;
                  const fd = getInt64(sp + 8);
                  const p = getInt64(sp + 16);
                  const n = this.mem.getInt32(sp + 24, true);
                  globalThis.fs.writeSync(fd, new Uint8Array(this._inst.exports.mem.buffer, p, n));
                },
                // func resetMemoryDataView()
                "runtime.resetMemoryDataView": (sp) => {
                  sp >>>= 0;
                  this.mem = new DataView(this._inst.exports.mem.buffer);
                },
                // func nanotime1() int64
                "runtime.nanotime1": (sp) => {
                  sp >>>= 0;
                  setInt64(sp + 8, (timeOrigin + performance.now()) * 1e6);
                },
                // func walltime() (sec int64, nsec int32)
                "runtime.walltime": (sp) => {
                  sp >>>= 0;
                  const msec = (/* @__PURE__ */ new Date()).getTime();
                  setInt64(sp + 8, msec / 1e3);
                  this.mem.setInt32(sp + 16, msec % 1e3 * 1e6, true);
                },
                // func scheduleTimeoutEvent(delay int64) int32
                "runtime.scheduleTimeoutEvent": (sp) => {
                  sp >>>= 0;
                  const id = this._nextCallbackTimeoutID;
                  this._nextCallbackTimeoutID++;
                  this._scheduledTimeouts.set(id, setTimeout(
                    () => {
                      this._resume();
                      while (this._scheduledTimeouts.has(id)) {
                        console.warn("scheduleTimeoutEvent: missed timeout event");
                        this._resume();
                      }
                    },
                    getInt64(sp + 8)
                  ));
                  this.mem.setInt32(sp + 16, id, true);
                },
                // func clearTimeoutEvent(id int32)
                "runtime.clearTimeoutEvent": (sp) => {
                  sp >>>= 0;
                  const id = this.mem.getInt32(sp + 8, true);
                  clearTimeout(this._scheduledTimeouts.get(id));
                  this._scheduledTimeouts.delete(id);
                },
                // func getRandomData(r []byte)
                "runtime.getRandomData": (sp) => {
                  sp >>>= 0;
                  crypto.getRandomValues(loadSlice(sp + 8));
                },
                // func finalizeRef(v ref)
                "syscall/js.finalizeRef": (sp) => {
                  sp >>>= 0;
                  const id = this.mem.getUint32(sp + 8, true);
                  this._goRefCounts[id]--;
                  if (this._goRefCounts[id] === 0) {
                    const v = this._values[id];
                    this._values[id] = null;
                    this._ids.delete(v);
                    this._idPool.push(id);
                  }
                },
                // func stringVal(value string) ref
                "syscall/js.stringVal": (sp) => {
                  sp >>>= 0;
                  storeValue(sp + 24, loadString(sp + 8));
                },
                // func valueGet(v ref, p string) ref
                "syscall/js.valueGet": (sp) => {
                  sp >>>= 0;
                  const result = Reflect.get(loadValue(sp + 8), loadString(sp + 16));
                  sp = this._inst.exports.getsp() >>> 0;
                  storeValue(sp + 32, result);
                },
                // func valueSet(v ref, p string, x ref)
                "syscall/js.valueSet": (sp) => {
                  sp >>>= 0;
                  Reflect.set(loadValue(sp + 8), loadString(sp + 16), loadValue(sp + 32));
                },
                // func valueDelete(v ref, p string)
                "syscall/js.valueDelete": (sp) => {
                  sp >>>= 0;
                  Reflect.deleteProperty(loadValue(sp + 8), loadString(sp + 16));
                },
                // func valueIndex(v ref, i int) ref
                "syscall/js.valueIndex": (sp) => {
                  sp >>>= 0;
                  storeValue(sp + 24, Reflect.get(loadValue(sp + 8), getInt64(sp + 16)));
                },
                // valueSetIndex(v ref, i int, x ref)
                "syscall/js.valueSetIndex": (sp) => {
                  sp >>>= 0;
                  Reflect.set(loadValue(sp + 8), getInt64(sp + 16), loadValue(sp + 24));
                },
                // func valueCall(v ref, m string, args []ref) (ref, bool)
                "syscall/js.valueCall": (sp) => {
                  sp >>>= 0;
                  try {
                    const v = loadValue(sp + 8);
                    const m = Reflect.get(v, loadString(sp + 16));
                    const args = loadSliceOfValues(sp + 32);
                    const result = Reflect.apply(m, v, args);
                    sp = this._inst.exports.getsp() >>> 0;
                    storeValue(sp + 56, result);
                    this.mem.setUint8(sp + 64, 1);
                  } catch (err) {
                    sp = this._inst.exports.getsp() >>> 0;
                    storeValue(sp + 56, err);
                    this.mem.setUint8(sp + 64, 0);
                  }
                },
                // func valueInvoke(v ref, args []ref) (ref, bool)
                "syscall/js.valueInvoke": (sp) => {
                  sp >>>= 0;
                  try {
                    const v = loadValue(sp + 8);
                    const args = loadSliceOfValues(sp + 16);
                    const result = Reflect.apply(v, void 0, args);
                    sp = this._inst.exports.getsp() >>> 0;
                    storeValue(sp + 40, result);
                    this.mem.setUint8(sp + 48, 1);
                  } catch (err) {
                    sp = this._inst.exports.getsp() >>> 0;
                    storeValue(sp + 40, err);
                    this.mem.setUint8(sp + 48, 0);
                  }
                },
                // func valueNew(v ref, args []ref) (ref, bool)
                "syscall/js.valueNew": (sp) => {
                  sp >>>= 0;
                  try {
                    const v = loadValue(sp + 8);
                    const args = loadSliceOfValues(sp + 16);
                    const result = Reflect.construct(v, args);
                    sp = this._inst.exports.getsp() >>> 0;
                    storeValue(sp + 40, result);
                    this.mem.setUint8(sp + 48, 1);
                  } catch (err) {
                    sp = this._inst.exports.getsp() >>> 0;
                    storeValue(sp + 40, err);
                    this.mem.setUint8(sp + 48, 0);
                  }
                },
                // func valueLength(v ref) int
                "syscall/js.valueLength": (sp) => {
                  sp >>>= 0;
                  setInt64(sp + 16, parseInt(loadValue(sp + 8).length));
                },
                // valuePrepareString(v ref) (ref, int)
                "syscall/js.valuePrepareString": (sp) => {
                  sp >>>= 0;
                  const str = encoder.encode(String(loadValue(sp + 8)));
                  storeValue(sp + 16, str);
                  setInt64(sp + 24, str.length);
                },
                // valueLoadString(v ref, b []byte)
                "syscall/js.valueLoadString": (sp) => {
                  sp >>>= 0;
                  const str = loadValue(sp + 8);
                  loadSlice(sp + 16).set(str);
                },
                // func valueInstanceOf(v ref, t ref) bool
                "syscall/js.valueInstanceOf": (sp) => {
                  sp >>>= 0;
                  this.mem.setUint8(sp + 24, loadValue(sp + 8) instanceof loadValue(sp + 16) ? 1 : 0);
                },
                // func copyBytesToGo(dst []byte, src ref) (int, bool)
                "syscall/js.copyBytesToGo": (sp) => {
                  sp >>>= 0;
                  const dst = loadSlice(sp + 8);
                  const src = loadValue(sp + 32);
                  if (!(src instanceof Uint8Array || src instanceof Uint8ClampedArray)) {
                    this.mem.setUint8(sp + 48, 0);
                    return;
                  }
                  const toCopy = src.subarray(0, dst.length);
                  dst.set(toCopy);
                  setInt64(sp + 40, toCopy.length);
                  this.mem.setUint8(sp + 48, 1);
                },
                // func copyBytesToJS(dst ref, src []byte) (int, bool)
                "syscall/js.copyBytesToJS": (sp) => {
                  sp >>>= 0;
                  const dst = loadValue(sp + 8);
                  const src = loadSlice(sp + 16);
                  if (!(dst instanceof Uint8Array || dst instanceof Uint8ClampedArray)) {
                    this.mem.setUint8(sp + 48, 0);
                    return;
                  }
                  const toCopy = src.subarray(0, dst.length);
                  dst.set(toCopy);
                  setInt64(sp + 40, toCopy.length);
                  this.mem.setUint8(sp + 48, 1);
                },
                "debug": (value) => {
                  console.log(value);
                }
              }
            };
          }
          run(instance) {
            return __async(this, null, function* () {
              if (!(instance instanceof WebAssembly.Instance)) {
                throw new Error("Go.run: WebAssembly.Instance expected");
              }
              this._inst = instance;
              this.mem = new DataView(this._inst.exports.mem.buffer);
              this._values = [
                // JS values that Go currently has references to, indexed by reference id
                NaN,
                0,
                null,
                true,
                false,
                globalThis,
                this
              ];
              this._goRefCounts = new Array(this._values.length).fill(Infinity);
              this._ids = /* @__PURE__ */ new Map([
                // mapping from JS values to reference ids
                [0, 1],
                [null, 2],
                [true, 3],
                [false, 4],
                [globalThis, 5],
                [this, 6]
              ]);
              this._idPool = [];
              this.exited = false;
              let offset = 4096;
              const strPtr = (str) => {
                const ptr = offset;
                const bytes = encoder.encode(str + "\\0");
                new Uint8Array(this.mem.buffer, offset, bytes.length).set(bytes);
                offset += bytes.length;
                if (offset % 8 !== 0) {
                  offset += 8 - offset % 8;
                }
                return ptr;
              };
              const argc = this.argv.length;
              const argvPtrs = [];
              this.argv.forEach((arg) => {
                argvPtrs.push(strPtr(arg));
              });
              argvPtrs.push(0);
              const keys = Object.keys(this.env).sort();
              keys.forEach((key) => {
                argvPtrs.push(strPtr(\`\${key}=\${this.env[key]}\`));
              });
              argvPtrs.push(0);
              const argv = offset;
              argvPtrs.forEach((ptr) => {
                this.mem.setUint32(offset, ptr, true);
                this.mem.setUint32(offset + 4, 0, true);
                offset += 8;
              });
              const wasmMinDataAddr = 4096 + 8192;
              if (offset >= wasmMinDataAddr) {
                throw new Error("total length of command line and environment variables exceeds limit");
              }
              this._inst.exports.run(argc, argv);
              if (this.exited) {
                this._resolveExitPromise();
              }
              yield this._exitPromise;
            });
          }
          _resume() {
            if (this.exited) {
              throw new Error("Go program has already exited");
            }
            this._inst.exports.resume();
            if (this.exited) {
              this._resolveExitPromise();
            }
          }
          _makeFuncWrapper(id) {
            const go = this;
            return function() {
              const event = { id, this: this, args: arguments };
              go._pendingEvent = event;
              go._resume();
              return event.result;
            };
          }
        };
      })();
      onmessage = ({ data: wasm }) => {
        let decoder = new TextDecoder();
        let fs = globalThis.fs;
        let stderr = "";
        fs.writeSync = (fd, buffer) => {
          if (fd === 1) {
            postMessage(buffer);
          } else if (fd === 2) {
            stderr += decoder.decode(buffer);
            let parts = stderr.split("\\n");
            if (parts.length > 1) console.log(parts.slice(0, -1).join("\\n"));
            stderr = parts[parts.length - 1];
          } else {
            throw new Error("Bad write");
          }
          return buffer.length;
        };
        let stdin = [];
        let resumeStdin;
        let stdinPos = 0;
        onmessage = ({ data }) => {
          if (data.length > 0) {
            stdin.push(data);
            if (resumeStdin) resumeStdin();
          }
          return go;
        };
        fs.read = (fd, buffer, offset, length, position, callback) => {
          if (fd !== 0 || offset !== 0 || length !== buffer.length || position !== null) {
            throw new Error("Bad read");
          }
          if (stdin.length === 0) {
            resumeStdin = () => fs.read(fd, buffer, offset, length, position, callback);
            return;
          }
          let first = stdin[0];
          let count = Math.max(0, Math.min(length, first.length - stdinPos));
          buffer.set(first.subarray(stdinPos, stdinPos + count), offset);
          stdinPos += count;
          if (stdinPos === first.length) {
            stdin.shift();
            stdinPos = 0;
          }
          callback(null, count);
        };
        let go = new globalThis.Go();
        go.argv = ["", \`--service=\${"0.25.12"}\`];
        tryToInstantiateModule(wasm, go).then(
          (instance) => {
            postMessage(null);
            go.run(instance);
          },
          (error) => {
            postMessage(error);
          }
        );
        return go;
      };
      function tryToInstantiateModule(wasm, go) {
        return __async(this, null, function* () {
          if (wasm instanceof WebAssembly.Module) {
            return WebAssembly.instantiate(wasm, go.importObject);
          }
          const res = yield fetch(wasm);
          if (!res.ok) throw new Error(\`Failed to download \${JSON.stringify(wasm)}\`);
          if ("instantiateStreaming" in WebAssembly && /^application\\/wasm($|;)/i.test(res.headers.get("Content-Type") || "")) {
            const result2 = yield WebAssembly.instantiateStreaming(res, go.importObject);
            return result2.instance;
          }
          const bytes = yield res.arrayBuffer();
          const result = yield WebAssembly.instantiate(bytes, go.importObject);
          return result.instance;
        });
      }
      return (m) => onmessage(m);
    })(postMessage)`],{type:"text/javascript"});a=new Worker(URL.createObjectURL(O))}else{let O=(C=>{var M=(S,E,p)=>new Promise((f,s)=>{var o=x=>{try{b(p.next(x))}catch(c){s(c)}},d=x=>{try{b(p.throw(x))}catch(c){s(c)}},b=x=>x.done?f(x.value):Promise.resolve(x.value).then(o,d);b((p=p.apply(S,E)).next())});let F,$={};for(let S=self;S;S=Object.getPrototypeOf(S))for(let E of Object.getOwnPropertyNames(S))E in $||Object.defineProperty($,E,{get:()=>self[E]});(()=>{const S=()=>{const f=new Error("not implemented");return f.code="ENOSYS",f};if(!$.fs){let f="";$.fs={constants:{O_WRONLY:-1,O_RDWR:-1,O_CREAT:-1,O_TRUNC:-1,O_APPEND:-1,O_EXCL:-1},writeSync(s,o){f+=p.decode(o);const d=f.lastIndexOf(`
`);return d!=-1&&(f.substring(0,d),f=f.substring(d+1)),o.length},write(s,o,d,b,x,c){if(d!==0||b!==o.length||x!==null){c(S());return}const m=this.writeSync(s,o);c(null,m)},chmod(s,o,d){d(S())},chown(s,o,d,b){b(S())},close(s,o){o(S())},fchmod(s,o,d){d(S())},fchown(s,o,d,b){b(S())},fstat(s,o){o(S())},fsync(s,o){o(null)},ftruncate(s,o,d){d(S())},lchown(s,o,d,b){b(S())},link(s,o,d){d(S())},lstat(s,o){o(S())},mkdir(s,o,d){d(S())},open(s,o,d,b){b(S())},read(s,o,d,b,x,c){c(S())},readdir(s,o){o(S())},readlink(s,o){o(S())},rename(s,o,d){d(S())},rmdir(s,o){o(S())},stat(s,o){o(S())},symlink(s,o,d){d(S())},truncate(s,o,d){d(S())},unlink(s,o){o(S())},utimes(s,o,d,b){b(S())}}}if($.process||($.process={getuid(){return-1},getgid(){return-1},geteuid(){return-1},getegid(){return-1},getgroups(){throw S()},pid:-1,ppid:-1,umask(){throw S()},cwd(){throw S()},chdir(){throw S()}}),!$.crypto)throw new Error("globalThis.crypto is not available, polyfill required (crypto.getRandomValues only)");if(!$.performance)throw new Error("globalThis.performance is not available, polyfill required (performance.now only)");if(!$.TextEncoder)throw new Error("globalThis.TextEncoder is not available, polyfill required");if(!$.TextDecoder)throw new Error("globalThis.TextDecoder is not available, polyfill required");const E=new TextEncoder("utf-8"),p=new TextDecoder("utf-8");$.Go=class{constructor(){this.argv=["js"],this.env={},this.exit=t=>{t!==0&&console.warn("exit code:",t)},this._exitPromise=new Promise(t=>{this._resolveExitPromise=t}),this._pendingEvent=null,this._scheduledTimeouts=new Map,this._nextCallbackTimeoutID=1;const f=(t,l)=>{this.mem.setUint32(t+0,l,!0),this.mem.setUint32(t+4,Math.floor(l/4294967296),!0)},s=t=>{const l=this.mem.getUint32(t+0,!0),w=this.mem.getInt32(t+4,!0);return l+w*4294967296},o=t=>{const l=this.mem.getFloat64(t,!0);if(l===0)return;if(!isNaN(l))return l;const w=this.mem.getUint32(t,!0);return this._values[w]},d=(t,l)=>{if(typeof l=="number"&&l!==0){if(isNaN(l)){this.mem.setUint32(t+4,2146959360,!0),this.mem.setUint32(t,0,!0);return}this.mem.setFloat64(t,l,!0);return}if(l===void 0){this.mem.setFloat64(t,0,!0);return}let v=this._ids.get(l);v===void 0&&(v=this._idPool.pop(),v===void 0&&(v=this._values.length),this._values[v]=l,this._goRefCounts[v]=0,this._ids.set(l,v)),this._goRefCounts[v]++;let T=0;switch(typeof l){case"object":l!==null&&(T=1);break;case"string":T=2;break;case"symbol":T=3;break;case"function":T=4;break}this.mem.setUint32(t+4,2146959360|T,!0),this.mem.setUint32(t,v,!0)},b=t=>{const l=s(t+0),w=s(t+8);return new Uint8Array(this._inst.exports.mem.buffer,l,w)},x=t=>{const l=s(t+0),w=s(t+8),v=new Array(w);for(let T=0;T<w;T++)v[T]=o(l+T*8);return v},c=t=>{const l=s(t+0),w=s(t+8);return p.decode(new DataView(this._inst.exports.mem.buffer,l,w))},m=Date.now()-performance.now();this.importObject={_gotest:{add:(t,l)=>t+l},gojs:{"runtime.wasmExit":t=>{t>>>=0;const l=this.mem.getInt32(t+8,!0);this.exited=!0,delete this._inst,delete this._values,delete this._goRefCounts,delete this._ids,delete this._idPool,this.exit(l)},"runtime.wasmWrite":t=>{t>>>=0;const l=s(t+8),w=s(t+16),v=this.mem.getInt32(t+24,!0);$.fs.writeSync(l,new Uint8Array(this._inst.exports.mem.buffer,w,v))},"runtime.resetMemoryDataView":t=>{this.mem=new DataView(this._inst.exports.mem.buffer)},"runtime.nanotime1":t=>{t>>>=0,f(t+8,(m+performance.now())*1e6)},"runtime.walltime":t=>{t>>>=0;const l=new Date().getTime();f(t+8,l/1e3),this.mem.setInt32(t+16,l%1e3*1e6,!0)},"runtime.scheduleTimeoutEvent":t=>{t>>>=0;const l=this._nextCallbackTimeoutID;this._nextCallbackTimeoutID++,this._scheduledTimeouts.set(l,setTimeout(()=>{for(this._resume();this._scheduledTimeouts.has(l);)console.warn("scheduleTimeoutEvent: missed timeout event"),this._resume()},s(t+8))),this.mem.setInt32(t+16,l,!0)},"runtime.clearTimeoutEvent":t=>{t>>>=0;const l=this.mem.getInt32(t+8,!0);clearTimeout(this._scheduledTimeouts.get(l)),this._scheduledTimeouts.delete(l)},"runtime.getRandomData":t=>{t>>>=0,crypto.getRandomValues(b(t+8))},"syscall/js.finalizeRef":t=>{t>>>=0;const l=this.mem.getUint32(t+8,!0);if(this._goRefCounts[l]--,this._goRefCounts[l]===0){const w=this._values[l];this._values[l]=null,this._ids.delete(w),this._idPool.push(l)}},"syscall/js.stringVal":t=>{t>>>=0,d(t+24,c(t+8))},"syscall/js.valueGet":t=>{t>>>=0;const l=Reflect.get(o(t+8),c(t+16));t=this._inst.exports.getsp()>>>0,d(t+32,l)},"syscall/js.valueSet":t=>{t>>>=0,Reflect.set(o(t+8),c(t+16),o(t+32))},"syscall/js.valueDelete":t=>{t>>>=0,Reflect.deleteProperty(o(t+8),c(t+16))},"syscall/js.valueIndex":t=>{t>>>=0,d(t+24,Reflect.get(o(t+8),s(t+16)))},"syscall/js.valueSetIndex":t=>{t>>>=0,Reflect.set(o(t+8),s(t+16),o(t+24))},"syscall/js.valueCall":t=>{t>>>=0;try{const l=o(t+8),w=Reflect.get(l,c(t+16)),v=x(t+32),T=Reflect.apply(w,l,v);t=this._inst.exports.getsp()>>>0,d(t+56,T),this.mem.setUint8(t+64,1)}catch(l){t=this._inst.exports.getsp()>>>0,d(t+56,l),this.mem.setUint8(t+64,0)}},"syscall/js.valueInvoke":t=>{t>>>=0;try{const l=o(t+8),w=x(t+16),v=Reflect.apply(l,void 0,w);t=this._inst.exports.getsp()>>>0,d(t+40,v),this.mem.setUint8(t+48,1)}catch(l){t=this._inst.exports.getsp()>>>0,d(t+40,l),this.mem.setUint8(t+48,0)}},"syscall/js.valueNew":t=>{t>>>=0;try{const l=o(t+8),w=x(t+16),v=Reflect.construct(l,w);t=this._inst.exports.getsp()>>>0,d(t+40,v),this.mem.setUint8(t+48,1)}catch(l){t=this._inst.exports.getsp()>>>0,d(t+40,l),this.mem.setUint8(t+48,0)}},"syscall/js.valueLength":t=>{t>>>=0,f(t+16,parseInt(o(t+8).length))},"syscall/js.valuePrepareString":t=>{t>>>=0;const l=E.encode(String(o(t+8)));d(t+16,l),f(t+24,l.length)},"syscall/js.valueLoadString":t=>{t>>>=0;const l=o(t+8);b(t+16).set(l)},"syscall/js.valueInstanceOf":t=>{t>>>=0,this.mem.setUint8(t+24,o(t+8)instanceof o(t+16)?1:0)},"syscall/js.copyBytesToGo":t=>{t>>>=0;const l=b(t+8),w=o(t+32);if(!(w instanceof Uint8Array||w instanceof Uint8ClampedArray)){this.mem.setUint8(t+48,0);return}const v=w.subarray(0,l.length);l.set(v),f(t+40,v.length),this.mem.setUint8(t+48,1)},"syscall/js.copyBytesToJS":t=>{t>>>=0;const l=o(t+8),w=b(t+16);if(!(l instanceof Uint8Array||l instanceof Uint8ClampedArray)){this.mem.setUint8(t+48,0);return}const v=w.subarray(0,l.length);l.set(v),f(t+40,v.length),this.mem.setUint8(t+48,1)},debug:t=>{}}}}run(f){return M(this,null,function*(){if(!(f instanceof WebAssembly.Instance))throw new Error("Go.run: WebAssembly.Instance expected");this._inst=f,this.mem=new DataView(this._inst.exports.mem.buffer),this._values=[NaN,0,null,!0,!1,$,this],this._goRefCounts=new Array(this._values.length).fill(1/0),this._ids=new Map([[0,1],[null,2],[!0,3],[!1,4],[$,5],[this,6]]),this._idPool=[],this.exited=!1;let s=4096;const o=t=>{const l=s,w=E.encode(t+"\0");return new Uint8Array(this.mem.buffer,s,w.length).set(w),s+=w.length,s%8!==0&&(s+=8-s%8),l},d=this.argv.length,b=[];this.argv.forEach(t=>{b.push(o(t))}),b.push(0),Object.keys(this.env).sort().forEach(t=>{b.push(o(`${t}=${this.env[t]}`))}),b.push(0);const c=s;if(b.forEach(t=>{this.mem.setUint32(s,t,!0),this.mem.setUint32(s+4,0,!0),s+=8}),s>=12288)throw new Error("total length of command line and environment variables exceeds limit");this._inst.exports.run(d,c),this.exited&&this._resolveExitPromise(),yield this._exitPromise})}_resume(){if(this.exited)throw new Error("Go program has already exited");this._inst.exports.resume(),this.exited&&this._resolveExitPromise()}_makeFuncWrapper(f){const s=this;return function(){const o={id:f,this:this,args:arguments};return s._pendingEvent=o,s._resume(),o.result}}}})(),F=({data:S})=>{let E=new TextDecoder,p=$.fs,f="";p.writeSync=(x,c)=>{if(x===1)C(c);else if(x===2){f+=E.decode(c);let m=f.split(`
`);m.length>1&&m.slice(0,-1).join(`
`),f=m[m.length-1]}else throw new Error("Bad write");return c.length};let s=[],o,d=0;F=({data:x})=>(x.length>0&&(s.push(x),o&&o()),b),p.read=(x,c,m,t,l,w)=>{if(x!==0||m!==0||t!==c.length||l!==null)throw new Error("Bad read");if(s.length===0){o=()=>p.read(x,c,m,t,l,w);return}let v=s[0],T=Math.max(0,Math.min(t,v.length-d));c.set(v.subarray(d,d+T),m),d+=T,d===v.length&&(s.shift(),d=0),w(null,T)};let b=new $.Go;return b.argv=["","--service=0.25.12"],W(S,b).then(x=>{C(null),b.run(x)},x=>{C(x)}),b};function W(S,E){return M(this,null,function*(){if(S instanceof WebAssembly.Module)return WebAssembly.instantiate(S,E.importObject);const p=yield fetch(S);if(!p.ok)throw new Error(`Failed to download ${JSON.stringify(S)}`);if("instantiateStreaming"in WebAssembly&&/^application\/wasm($|;)/i.test(p.headers.get("Content-Type")||""))return(yield WebAssembly.instantiateStreaming(p,E.importObject)).instance;const f=yield p.arrayBuffer();return(yield WebAssembly.instantiate(f,E.importObject)).instance})}return S=>F(S)})(C=>a.onmessage({data:C})),V;a={onmessage:null,postMessage:C=>setTimeout(()=>{try{V=O({data:C})}catch(M){g(M)}}),terminate(){if(V)for(let C of V._scheduledTimeouts.values())clearTimeout(C)}}}let h,k;const u=new Promise((O,V)=>{h=O,k=V});a.onmessage=({data:O})=>{a.onmessage=({data:V})=>D(V),O?k(O):h()},a.postMessage(n||new URL(e,location.href).toString());let{readFromStdout:D,service:R}=at({writeToStdin(O){a.postMessage(O)},isSync:!1,hasFS:!1,esbuild:ye});yield u,Ee=()=>{a.terminate(),ce=void 0,Ee=void 0,Se=void 0},Se={build:O=>new Promise((V,C)=>{y.then(C),R.buildOrContext({callName:"build",refs:null,options:O,isTTY:!1,defaultWD:"/",callback:(M,F)=>M?C(M):V(F)})}),context:O=>new Promise((V,C)=>{y.then(C),R.buildOrContext({callName:"context",refs:null,options:O,isTTY:!1,defaultWD:"/",callback:(M,F)=>M?C(M):V(F)})}),transform:(O,V)=>new Promise((C,M)=>{y.then(M),R.transform({callName:"transform",refs:null,input:O,options:V||{},isTTY:!1,fs:{readFile(F,$){$(new Error("Internal error"),null)},writeFile(F,$){$(null)}},callback:(F,$)=>F?M(F):C($)})}),formatMessages:(O,V)=>new Promise((C,M)=>{y.then(M),R.formatMessages({callName:"formatMessages",refs:null,messages:O,options:V,callback:(F,$)=>F?M(F):C($)})}),analyzeMetafile:(O,V)=>new Promise((C,M)=>{y.then(M),R.analyzeMetafile({callName:"analyzeMetafile",refs:null,metafile:typeof O=="string"?O:JSON.stringify(O),options:V,callback:(F,$)=>F?M(F):C($)})})}}),Tt=ye})(Ge)})(ze);var jt=ze.exports;export{jt as b};
