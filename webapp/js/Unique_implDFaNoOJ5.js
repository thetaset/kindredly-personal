import{_ as Os}from"./__vite-browser-externalBhtWQ3xB.js";import{a as Ls,g as Cs}from"./cjs-helpersC4iS2aBk.js";function Ps(e,t){for(var n=0;n<t.length;n++){const s=t[n];if(typeof s!="string"&&!Array.isArray(s)){for(const r in s)if(r!=="default"&&!(r in e)){const o=Object.getOwnPropertyDescriptor(s,r);o&&Object.defineProperty(e,r,o.get?o:{enumerable:!0,get:()=>s[r]})}}}return Object.freeze(Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}))}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Us=1e-7,Gs=1e-4;class bl{constructor(t,n){this.backend=t,this.dataMover=n,this.data=new WeakMap,this.dataIdsCount=0}get(t){return this.data.has(t)||this.dataMover.moveData(this.backend,t),this.data.get(t)}set(t,n){this.dataIdsCount++,this.data.set(t,n)}has(t){return this.data.has(t)}delete(t){return this.dataIdsCount--,this.data.delete(t)}numDataIds(){return this.dataIdsCount}}class zs{refCount(t){return z("refCount")}incRef(t){return z("incRef")}timerAvailable(){return!0}time(t){return z("time")}read(t){return z("read")}readSync(t){return z("readSync")}readToGPU(t,n){return z("readToGPU")}numDataIds(){return z("numDataIds")}disposeData(t,n){return z("disposeData")}write(t,n,s){return z("write")}move(t,n,s,r,o){return z("move")}createTensorFromGPUData(t,n,s){return z("createTensorFromGPUData")}memory(){return z("memory")}floatPrecision(){return z("floatPrecision")}epsilon(){return this.floatPrecision()===32?Us:Gs}dispose(){return z("dispose")}}function z(e){throw new Error(`'${e}' not yet implemented or not found in the registry. This kernel may not be supported by the tfjs backend you have chosen`)}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Tn(e){let t=e.length,n=0;for(;t>0;)n=Math.random()*t|0,t--,re(e,t,n)}function Ws(e,t){if(e.length!==t.length)throw new Error(`Array sizes must match to be shuffled together First array length was ${e.length}Second array length was ${t.length}`);let n=e.length,s=0;for(;n>0;)s=Math.random()*n|0,n--,re(e,n,s),re(t,n,s)}function jt(e,t,n){return Math.max(e,Math.min(t,n))}function qs(e){return e%2===0?e:e+1}function re(e,t,n){const s=e[t];e[t]=e[n],e[n]=s}function Vs(e){let t=0;for(let n=0;n<e.length;n++)t+=e[n];return t}function js(e,t){const n=Math.random();return t*n+(1-n)*e}function Hs(e,t){let n=0;for(let s=0;s<e.length;s++){const r=Number(e[s])-Number(t[s]);n+=r*r}return n}function b(e,t){if(!e)throw new Error(typeof t=="string"?t:t())}function Jt(e,t,n=""){b(fe(e,t),()=>n+` Shapes ${e} and ${t} must match`)}function Ks(e){b(e!=null,()=>"The input to the tensor constructor must be a non-null value.")}function B(e){if(e.length===0)return 1;let t=e[0];for(let n=1;n<e.length;n++)t*=e[n];return t}function Zs(e){return e.length===0}function Xs(e,t){if(e===t)return!0;if(e==null||t==null||e.length!==t.length)return!1;for(let n=0;n<e.length;n++)if(e[n]!==null&&t[n]!==null&&e[n]!==t[n])return!1;return!0}function fe(e,t){if(e===t)return!0;if(e==null||t==null||e.length!==t.length)return!1;for(let n=0;n<e.length;n++)if(e[n]!==t[n])return!1;return!0}function oe(e){return e%1===0}function Ys(e){if(Math.tanh!=null)return Math.tanh(e);if(e===1/0)return 1;if(e===-1/0)return-1;{const t=Math.exp(2*e);return(t-1)/(t+1)}}function Js(e){const t=Math.ceil(Math.sqrt(e));return[t,Math.ceil(e/t)]}function Qs(e){const t=new Uint32Array(e);for(let n=0;n<e;++n)t[n]=n;return Tn(t),t}function Vt(e,t){return t<=e.length?e:e+" ".repeat(t-e.length)}function tr(e,t=r=>0,n,s){return new Promise((r,o)=>{let i=0;const a=()=>{if(e()){r();return}i++;const l=t(i);if(n!=null&&i>=n){o();return}s!=null?s(a,l):setTimeout(a,l)};a()})}function er(e,t){let n=1,s=-1;for(let o=0;o<e.length;++o)if(e[o]>=0)n*=e[o];else if(e[o]===-1){if(s!==-1)throw Error(`Shapes can only have 1 implicit size. Found -1 at dim ${s} and dim ${o}`);s=o}else if(e[o]<0)throw Error(`Shapes can not be < 0. Found ${e[o]} at dim ${o}`);if(s===-1){if(t>0&&t!==n)throw Error(`Size(${t}) must match the product of shape ${e}`);return e}if(n===0)throw Error(`Cannot infer the missing size in [${e}] when there are 0 elements`);if(t%n!==0)throw Error(`The implicit shape can't be a fractional number. Got ${t} / ${n}`);const r=e.slice();return r[s]=t/n,r}function qe(e,t){const n=t.length;return e=e==null?t.map((s,r)=>r):[].concat(e),b(e.every(s=>s>=-n&&s<n),()=>`All values in axis param must be in range [-${n}, ${n}) but got axis ${e}`),b(e.every(s=>oe(s)),()=>`All values in axis param must be integers but got axis ${e}`),e.map(s=>s<0?n+s:s)}function nr(e,t){const n=[],s=[],r=t!=null&&Array.isArray(t)&&t.length===0,o=t==null||r?null:qe(t,e).sort();let i=0;for(let a=0;a<e.length;++a){if(o!=null){if(o[i]===a&&e[a]!==1)throw new Error(`Can't squeeze axis ${a} since its dim '${e[a]}' is not 1`);(o[i]==null||o[i]>a)&&e[a]===1&&(n.push(e[a]),s.push(a)),o[i]<=a&&i++}e[a]!==1&&(n.push(e[a]),s.push(a))}return{newShape:n,keptDims:s}}function sr(e,t){return At(e,t)}function At(e,t){let n=null;if(e==null||e==="float32")n=new Float32Array(t);else if(e==="int32")n=new Int32Array(t);else if(e==="bool")n=new Uint8Array(t);else if(e==="string")n=new Array(t);else throw new Error(`Unknown data type ${e}`);return n}function $n(e,t){for(let n=0;n<e.length;n++){const s=e[n];if(isNaN(s)||!isFinite(s))throw Error(`A tensor of type ${t} being uploaded contains ${s}.`)}}function Mn(e){return e==="bool"||e==="complex64"||e==="float32"||e==="int32"||e==="string"}function rr(e,t){return!(t==="complex64"||t==="float32"&&e!=="complex64"||t==="int32"&&e!=="float32"&&e!=="complex64"||t==="bool"&&e==="bool")}function ie(e){if(e==="float32"||e==="int32")return 4;if(e==="complex64")return 8;if(e==="bool")return 1;throw new Error(`Unknown dtype ${e}`)}function vn(e){if(e==null)return 0;let t=0;return e.forEach(n=>t+=n.length),t}function de(e){return typeof e=="string"||e instanceof String}function Fn(e){return typeof e=="boolean"}function xn(e){return typeof e=="number"}function Qt(e){return Array.isArray(e)?Qt(e[0]):e instanceof Float32Array?"float32":e instanceof Int32Array||e instanceof Uint8Array||e instanceof Uint8ClampedArray?"int32":xn(e)?"float32":de(e)?"string":Fn(e)?"bool":"float32"}function ut(e){return!!(e&&e.constructor&&e.call&&e.apply)}function ae(e,t){for(let n=t;n<e;++n)if(e%n===0)return n;return e}function kt(e){const t=e.length;if(t<2)return[];const n=new Array(t-1);n[t-2]=e[t-1];for(let s=t-3;s>=0;--s)n[s]=n[s+1]*e[s+1];return n}function Nn(e,t,n,s=!1){const r=new Array;if(t.length===1){const o=t[0]*(s?2:1);for(let i=0;i<o;i++)r[i]=n[e+i]}else{const o=t[0],i=t.slice(1),a=i.reduce((l,c)=>l*c)*(s?2:1);for(let l=0;l<o;l++)r[l]=Nn(e+l*a,i,n,s)}return r}function Bt(e,t,n=!1){if(e.length===0)return t[0];const s=e.reduce((r,o)=>r*o)*(n?2:1);if(s===0)return[];if(s!==t.length)throw new Error(`[${e}] does not match the input size ${t.length}${n?" for a complex tensor":""}.`);return Nn(0,e,t,n)}function or(e,t){if(Array.isArray(e))return e;if(t==="float32")return e instanceof Float32Array?e:new Float32Array(e);if(t==="int32")return e instanceof Int32Array?e:new Int32Array(e);if(t==="bool"||t==="string")return Uint8Array.from(new Int32Array(e));throw new Error(`Unknown dtype ${t}`)}function Bn(e,t){const n=Ht(e,t);for(let s=0;s<n.length;s++)n[s]=1;return n}function Ht(e,t){if(t==null||t==="float32"||t==="complex64")return new Float32Array(e);if(t==="int32")return new Int32Array(e);if(t==="bool")return new Uint8Array(e);throw new Error(`Unknown data type ${t}`)}function ir(e,t){const n=e.reduce((s,r)=>s*r,1);if(t==null||t==="float32")return Bt(e,new Float32Array(n));if(t==="int32")return Bt(e,new Int32Array(n));if(t==="bool")return Bt(e,new Uint8Array(n));throw new Error(`Unknown data type ${t}`)}function ge(e){e.forEach(t=>{b(Number.isInteger(t)&&t>=0,()=>`Tensor must have a shape comprised of positive integers but got shape [${e}].`)})}function ar(e,t,n){if(t===0)return 0;if(t===1)return e[0];let s=e[e.length-1];for(let r=0;r<e.length-1;++r)s+=n[r]*e[r];return s}function lr(e,t,n){if(t===0)return[];if(t===1)return[e];const s=new Array(t);for(let r=0;r<s.length-1;++r)s[r]=Math.floor(e/n[r]),e-=s[r]*n[r];return s[s.length-1]=e,s}function me(e){return e&&e.then&&typeof e.then=="function"}/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const on="tfjsflags";class cr{constructor(t){this.global=t,this.flags={},this.flagRegistry={},this.urlFlags={},this.getQueryParams=ur,this.populateURLFlags()}setPlatform(t,n){this.platform!=null&&(A().getBool("IS_TEST")||A().getBool("PROD")||console.warn(`Platform ${this.platformName} has already been set. Overwriting the platform with ${t}.`)),this.platformName=t,this.platform=n}registerFlag(t,n,s){if(this.flagRegistry[t]={evaluationFn:n,setHook:s},this.urlFlags[t]!=null){const r=this.urlFlags[t];A().getBool("IS_TEST")||A().getBool("PROD")||console.warn(`Setting feature override from URL ${t}: ${r}.`),this.set(t,r)}}async getAsync(t){return t in this.flags?this.flags[t]:(this.flags[t]=await this.evaluateFlag(t),this.flags[t])}get(t){if(t in this.flags)return this.flags[t];const n=this.evaluateFlag(t);if(me(n))throw new Error(`Flag ${t} cannot be synchronously evaluated. Please use getAsync() instead.`);return this.flags[t]=n,this.flags[t]}getNumber(t){return this.get(t)}getBool(t){return this.get(t)}getString(t){return this.get(t)}getFlags(){return this.flags}get features(){return this.flags}set(t,n){if(this.flagRegistry[t]==null)throw new Error(`Cannot set flag ${t} as it has not been registered.`);this.flags[t]=n,this.flagRegistry[t].setHook!=null&&this.flagRegistry[t].setHook(n)}evaluateFlag(t){if(this.flagRegistry[t]==null)throw new Error(`Cannot evaluate flag '${t}': no evaluation function found.`);return this.flagRegistry[t].evaluationFn()}setFlags(t){this.flags=Object.assign({},t)}reset(){this.flags={},this.urlFlags={},this.populateURLFlags()}populateURLFlags(){if(typeof this.global>"u"||typeof this.global.location>"u"||typeof this.global.location.search>"u")return;const t=this.getQueryParams(this.global.location.search);on in t&&t[on].split(",").forEach(s=>{const[r,o]=s.split(":");this.urlFlags[r]=fr(r,o)})}}function ur(e){const t={};return e.replace(/[?&]([^=?&]+)(?:=([^&]*))?/g,(n,...s)=>(hr(t,s[0],s[1]),s.join("="))),t}function hr(e,t,n){e[decodeURIComponent(t)]=decodeURIComponent(n||"")}function fr(e,t){const n=t.toLowerCase();return n==="true"||n==="false"?n==="true":`${+n}`===n?+n:t}function A(){return _n}let _n=null;function dr(e){_n=e}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */let Ee;function Rn(){if(Ee==null){let e;if(typeof window<"u")e=window;else if(typeof global<"u")e=global;else if(typeof process<"u")e=process;else if(typeof self<"u")e=self;else throw new Error("Could not find a global object");Ee=e}return Ee}function gr(){const e=Rn();return e._tfGlobals==null&&(e._tfGlobals=new Map),e._tfGlobals}function Ve(e,t){const n=gr();if(n.has(e))return n.get(e);{const s=t();return n.set(e,s),n.get(e)}}const mr="Abs",Sl="Acos",El="Acosh",Dn="Add",Il="AddN",Al="All",kl="Any",Tl="ArgMax",$l="ArgMin",Ml="Asin",vl="Asinh",Fl="Atan",xl="Atanh",Nl="Atan2",Bl="AvgPool",_l="AvgPoolGrad",Rl="AvgPool3D",Dl="AvgPool3DGrad",Ol="BatchMatMul",Ll="BatchToSpaceND",Cl="Bincount",Pl="BitwiseAnd",Ul="BroadcastTo",Gl="BroadcastArgs",On="Cast",zl="Ceil",Wl="ClipByValue",pr="Complex",yr="ComplexAbs",ql="Concat",Vl="Conv2D",jl="Conv2DBackpropFilter",Hl="Conv2DBackpropInput",Kl="Conv3D",Zl="Conv3DBackpropFilterV2",Xl="Conv3DBackpropInputV2",Yl="Cos",Jl="Cosh",Ql="Cumprod",tc="Cumsum",ec="CropAndResize",nc="DenseBincount",sc="DepthToSpace",rc="DepthwiseConv2dNative",oc="DepthwiseConv2dNativeBackpropFilter",ic="DepthwiseConv2dNativeBackpropInput",ac="Diag",lc="Dilation2D",cc="Dilation2DBackpropInput",uc="Dilation2DBackpropFilter",hc="Draw",wr="RealDiv",fc="Einsum",br="Elu",dc="EluGrad",gc="Erf",mc="Equal",pc="Exp",yc="ExpandDims",wc="Expm1",bc="FFT",Sr="Fill",Sc="FlipLeftRight",Ec="Floor",Er="FloorDiv",Ic="FusedBatchNorm",Ac="GatherV2",kc="GatherNd",Tc="Greater",$c="GreaterEqual",Ln="Identity",Mc="IFFT",vc="Imag",Fc="IsFinite",xc="IsInf",Nc="IsNan",Ir="LeakyRelu",Bc="Less",_c="LessEqual",Rc="LinSpace",Dc="Log",Oc="Log1p",Lc="LogicalAnd",Cc="LogicalNot",Pc="LogicalOr",Uc="LogicalXor",Gc="LogSoftmax",zc="LowerBound",Wc="LRN",qc="LRNGrad",Vc="MatrixBandPart",jc="Max",Ar="Maximum",Hc="MaxPool",Kc="MaxPoolGrad",Zc="MaxPool3D",Xc="MaxPool3DGrad",Yc="MaxPoolWithArgmax",Jc="Mean",Qc="Min",tu="Minimum",eu="MirrorPad",nu="Mod",su="Multinomial",kr="Multiply",ru="Neg",ou="NotEqual",iu="NonMaxSuppressionV3",au="NonMaxSuppressionV4",lu="NonMaxSuppressionV5",cu="OnesLike",uu="OneHot",hu="Pack",fu="PadV2",du="Pool",Tr="Pow",$r="Prelu",gu="Prod",mu="RaggedGather",pu="RaggedRange",yu="RaggedTensorToTensor",wu="Range",bu="Real",Su="Reciprocal",Mr="Relu",vr="Reshape",Eu="ResizeNearestNeighbor",Iu="ResizeNearestNeighborGrad",Au="ResizeBilinear",ku="ResizeBilinearGrad",Fr="Relu6",Tu="Reverse",$u="Round",Mu="Rsqrt",vu="ScatterNd",Fu="TensorScatterUpdate",xu="SearchSorted",Nu="Select",Bu="Selu",xr="Slice",_u="Sin",Ru="Sinh",Du="Sign",Nr="Sigmoid",Ou="Softplus",Br="Sqrt",_r="Sum",Lu="SpaceToBatchND",Cu="SplitV",Pu="Softmax",Uu="SparseFillEmptyRows",Gu="SparseReshape",zu="SparseSegmentMean",Wu="SparseSegmentSum",qu="SparseToDense",Vu="SquaredDifference",ju="Square",Hu="StaticRegexReplace",Ku="StridedSlice",Zu="StringNGrams",Xu="StringSplit",Yu="StringToHashBucketFast",Rr="Sub",Ju="Tan",Qu="Tanh",th="Tile",eh="TopK",nh="Transform",sh="Transpose",rh="Unique",oh="Unpack",ih="UnsortedSegmentSum",ah="UpperBound",Dr="ZerosLike",Or="Step",lh="FromPixels",ch="RotateWithOffset",uh="_FusedMatMul",hh="FusedConv2D",fh="FusedDepthwiseConv2D";/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function it(...e){A().getBool("IS_TEST")||A().getBool("PROD")||console.warn(...e)}function Lr(...e){A().getBool("IS_TEST")||A().getBool("PROD")||[...e]}/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Ot=Ve("kernelRegistry",()=>new Map),Kt=Ve("gradRegistry",()=>new Map);function an(e,t){const n=je(e,t);return Ot.get(n)}function ln(e){return Kt.get(e)}function Me(e){const t=Ot.entries(),n=[];for(;;){const{done:s,value:r}=t.next();if(s)break;const[o,i]=r,[a]=o.split("_");a===e&&n.push(i)}return n}function Cr(e){const{kernelName:t,backendName:n}=e,s=je(t,n);Ot.has(s)&&it(`The kernel '${t}' for backend '${n}' is already registered`),Ot.set(s,e)}function dh(e){const{kernelName:t}=e;Kt.has(t)&&A().getBool("DEBUG")&&it(`Overriding the gradient for '${t}'`),Kt.set(t,e)}function gh(e,t){const n=je(e,t);if(!Ot.has(n))throw new Error(`The kernel '${e}' for backend '${t}' is not registered`);Ot.delete(n)}function mh(e){if(!Kt.has(e))throw new Error(`The gradient '${e}' for backend is not registered`);Kt.delete(e)}function ph(e,t){Me(e).forEach(s=>{const r=Object.assign({},s,{backendName:t});Cr(r)})}function je(e,t){return`${t}_${e}`}/**
 * @license
 * Copyright 2023 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Cn(e){return e instanceof Float32Array||e instanceof Int32Array||e instanceof Uint8Array||e instanceof Uint8ClampedArray}var Pn=F,K=null;try{K=new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0,1,13,2,96,0,1,127,96,4,127,127,127,127,1,127,3,7,6,0,1,1,1,1,1,6,6,1,127,1,65,0,11,7,50,6,3,109,117,108,0,1,5,100,105,118,95,115,0,2,5,100,105,118,95,117,0,3,5,114,101,109,95,115,0,4,5,114,101,109,95,117,0,5,8,103,101,116,95,104,105,103,104,0,0,10,191,1,6,4,0,35,0,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,126,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,127,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,128,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,129,34,4,66,32,135,167,36,0,32,4,167,11,36,1,1,126,32,0,173,32,1,173,66,32,134,132,32,2,173,32,3,173,66,32,134,132,130,34,4,66,32,135,167,36,0,32,4,167,11])),{}).exports}catch{}function F(e,t,n){this.low=e|0,this.high=t|0,this.unsigned=!!n}F.prototype.__isLong__;Object.defineProperty(F.prototype,"__isLong__",{value:!0});function q(e){return(e&&e.__isLong__)===!0}F.isLong=q;var cn={},un={};function Tt(e,t){var n,s,r;return t?(e>>>=0,(r=0<=e&&e<256)&&(s=un[e],s)?s:(n=x(e,(e|0)<0?-1:0,!0),r&&(un[e]=n),n)):(e|=0,(r=-128<=e&&e<128)&&(s=cn[e],s)?s:(n=x(e,e<0?-1:0,!1),r&&(cn[e]=n),n))}F.fromInt=Tt;function Z(e,t){if(isNaN(e))return t?pt:X;if(t){if(e<0)return pt;if(e>=Un)return Wn}else{if(e<=-fn)return W;if(e+1>=fn)return zn}return e<0?Z(-e,t).neg():x(e%Lt|0,e/Lt|0,t)}F.fromNumber=Z;function x(e,t,n){return new F(e,t,n)}F.fromBits=x;var le=Math.pow;function He(e,t,n){if(e.length===0)throw Error("empty string");if(e==="NaN"||e==="Infinity"||e==="+Infinity"||e==="-Infinity")return X;if(typeof t=="number"?(n=t,t=!1):t=!!t,n=n||10,n<2||36<n)throw RangeError("radix");var s;if((s=e.indexOf("-"))>0)throw Error("interior hyphen");if(s===0)return He(e.substring(1),t,n).neg();for(var r=Z(le(n,8)),o=X,i=0;i<e.length;i+=8){var a=Math.min(8,e.length-i),l=parseInt(e.substring(i,i+a),n);if(a<8){var c=Z(le(n,a));o=o.mul(c).add(Z(l))}else o=o.mul(r),o=o.add(Z(l))}return o.unsigned=t,o}F.fromString=He;function Q(e,t){return typeof e=="number"?Z(e,t):typeof e=="string"?He(e,t):x(e.low,e.high,typeof t=="boolean"?t:e.unsigned)}F.fromValue=Q;var hn=65536,Pr=1<<24,Lt=hn*hn,Un=Lt*Lt,fn=Un/2,dn=Tt(Pr),X=Tt(0);F.ZERO=X;var pt=Tt(0,!0);F.UZERO=pt;var Nt=Tt(1);F.ONE=Nt;var Gn=Tt(1,!0);F.UONE=Gn;var ve=Tt(-1);F.NEG_ONE=ve;var zn=x(-1,2147483647,!1);F.MAX_VALUE=zn;var Wn=x(-1,-1,!0);F.MAX_UNSIGNED_VALUE=Wn;var W=x(0,-2147483648,!1);F.MIN_VALUE=W;var p=F.prototype;p.toInt=function(){return this.unsigned?this.low>>>0:this.low};p.toNumber=function(){return this.unsigned?(this.high>>>0)*Lt+(this.low>>>0):this.high*Lt+(this.low>>>0)};p.toString=function(t){if(t=t||10,t<2||36<t)throw RangeError("radix");if(this.isZero())return"0";if(this.isNegative())if(this.eq(W)){var n=Z(t),s=this.div(n),r=s.mul(n).sub(this);return s.toString(t)+r.toInt().toString(t)}else return"-"+this.neg().toString(t);for(var o=Z(le(t,6),this.unsigned),i=this,a="";;){var l=i.div(o),c=i.sub(l.mul(o)).toInt()>>>0,f=c.toString(t);if(i=l,i.isZero())return f+a;for(;f.length<6;)f="0"+f;a=""+f+a}};p.getHighBits=function(){return this.high};p.getHighBitsUnsigned=function(){return this.high>>>0};p.getLowBits=function(){return this.low};p.getLowBitsUnsigned=function(){return this.low>>>0};p.getNumBitsAbs=function(){if(this.isNegative())return this.eq(W)?64:this.neg().getNumBitsAbs();for(var t=this.high!=0?this.high:this.low,n=31;n>0&&!(t&1<<n);n--);return this.high!=0?n+33:n+1};p.isZero=function(){return this.high===0&&this.low===0};p.eqz=p.isZero;p.isNegative=function(){return!this.unsigned&&this.high<0};p.isPositive=function(){return this.unsigned||this.high>=0};p.isOdd=function(){return(this.low&1)===1};p.isEven=function(){return(this.low&1)===0};p.equals=function(t){return q(t)||(t=Q(t)),this.unsigned!==t.unsigned&&this.high>>>31===1&&t.high>>>31===1?!1:this.high===t.high&&this.low===t.low};p.eq=p.equals;p.notEquals=function(t){return!this.eq(t)};p.neq=p.notEquals;p.ne=p.notEquals;p.lessThan=function(t){return this.comp(t)<0};p.lt=p.lessThan;p.lessThanOrEqual=function(t){return this.comp(t)<=0};p.lte=p.lessThanOrEqual;p.le=p.lessThanOrEqual;p.greaterThan=function(t){return this.comp(t)>0};p.gt=p.greaterThan;p.greaterThanOrEqual=function(t){return this.comp(t)>=0};p.gte=p.greaterThanOrEqual;p.ge=p.greaterThanOrEqual;p.compare=function(t){if(q(t)||(t=Q(t)),this.eq(t))return 0;var n=this.isNegative(),s=t.isNegative();return n&&!s?-1:!n&&s?1:this.unsigned?t.high>>>0>this.high>>>0||t.high===this.high&&t.low>>>0>this.low>>>0?-1:1:this.sub(t).isNegative()?-1:1};p.comp=p.compare;p.negate=function(){return!this.unsigned&&this.eq(W)?W:this.not().add(Nt)};p.neg=p.negate;p.add=function(t){q(t)||(t=Q(t));var n=this.high>>>16,s=this.high&65535,r=this.low>>>16,o=this.low&65535,i=t.high>>>16,a=t.high&65535,l=t.low>>>16,c=t.low&65535,f=0,u=0,h=0,d=0;return d+=o+c,h+=d>>>16,d&=65535,h+=r+l,u+=h>>>16,h&=65535,u+=s+a,f+=u>>>16,u&=65535,f+=n+i,f&=65535,x(h<<16|d,f<<16|u,this.unsigned)};p.subtract=function(t){return q(t)||(t=Q(t)),this.add(t.neg())};p.sub=p.subtract;p.multiply=function(t){if(this.isZero())return X;if(q(t)||(t=Q(t)),K){var n=K.mul(this.low,this.high,t.low,t.high);return x(n,K.get_high(),this.unsigned)}if(t.isZero())return X;if(this.eq(W))return t.isOdd()?W:X;if(t.eq(W))return this.isOdd()?W:X;if(this.isNegative())return t.isNegative()?this.neg().mul(t.neg()):this.neg().mul(t).neg();if(t.isNegative())return this.mul(t.neg()).neg();if(this.lt(dn)&&t.lt(dn))return Z(this.toNumber()*t.toNumber(),this.unsigned);var s=this.high>>>16,r=this.high&65535,o=this.low>>>16,i=this.low&65535,a=t.high>>>16,l=t.high&65535,c=t.low>>>16,f=t.low&65535,u=0,h=0,d=0,g=0;return g+=i*f,d+=g>>>16,g&=65535,d+=o*f,h+=d>>>16,d&=65535,d+=i*c,h+=d>>>16,d&=65535,h+=r*f,u+=h>>>16,h&=65535,h+=o*c,u+=h>>>16,h&=65535,h+=i*l,u+=h>>>16,h&=65535,u+=s*f+r*c+o*l+i*a,u&=65535,x(d<<16|g,u<<16|h,this.unsigned)};p.mul=p.multiply;p.divide=function(t){if(q(t)||(t=Q(t)),t.isZero())throw Error("division by zero");if(K){if(!this.unsigned&&this.high===-2147483648&&t.low===-1&&t.high===-1)return this;var n=(this.unsigned?K.div_u:K.div_s)(this.low,this.high,t.low,t.high);return x(n,K.get_high(),this.unsigned)}if(this.isZero())return this.unsigned?pt:X;var s,r,o;if(this.unsigned){if(t.unsigned||(t=t.toUnsigned()),t.gt(this))return pt;if(t.gt(this.shru(1)))return Gn;o=pt}else{if(this.eq(W)){if(t.eq(Nt)||t.eq(ve))return W;if(t.eq(W))return Nt;var i=this.shr(1);return s=i.div(t).shl(1),s.eq(X)?t.isNegative()?Nt:ve:(r=this.sub(t.mul(s)),o=s.add(r.div(t)),o)}else if(t.eq(W))return this.unsigned?pt:X;if(this.isNegative())return t.isNegative()?this.neg().div(t.neg()):this.neg().div(t).neg();if(t.isNegative())return this.div(t.neg()).neg();o=X}for(r=this;r.gte(t);){s=Math.max(1,Math.floor(r.toNumber()/t.toNumber()));for(var a=Math.ceil(Math.log(s)/Math.LN2),l=a<=48?1:le(2,a-48),c=Z(s),f=c.mul(t);f.isNegative()||f.gt(r);)s-=l,c=Z(s,this.unsigned),f=c.mul(t);c.isZero()&&(c=Nt),o=o.add(c),r=r.sub(f)}return o};p.div=p.divide;p.modulo=function(t){if(q(t)||(t=Q(t)),K){var n=(this.unsigned?K.rem_u:K.rem_s)(this.low,this.high,t.low,t.high);return x(n,K.get_high(),this.unsigned)}return this.sub(this.div(t).mul(t))};p.mod=p.modulo;p.rem=p.modulo;p.not=function(){return x(~this.low,~this.high,this.unsigned)};p.and=function(t){return q(t)||(t=Q(t)),x(this.low&t.low,this.high&t.high,this.unsigned)};p.or=function(t){return q(t)||(t=Q(t)),x(this.low|t.low,this.high|t.high,this.unsigned)};p.xor=function(t){return q(t)||(t=Q(t)),x(this.low^t.low,this.high^t.high,this.unsigned)};p.shiftLeft=function(t){return q(t)&&(t=t.toInt()),(t&=63)===0?this:t<32?x(this.low<<t,this.high<<t|this.low>>>32-t,this.unsigned):x(0,this.low<<t-32,this.unsigned)};p.shl=p.shiftLeft;p.shiftRight=function(t){return q(t)&&(t=t.toInt()),(t&=63)===0?this:t<32?x(this.low>>>t|this.high<<32-t,this.high>>t,this.unsigned):x(this.high>>t-32,this.high>=0?0:-1,this.unsigned)};p.shr=p.shiftRight;p.shiftRightUnsigned=function(t){if(q(t)&&(t=t.toInt()),t&=63,t===0)return this;var n=this.high;if(t<32){var s=this.low;return x(s>>>t|n<<32-t,n>>>t,this.unsigned)}else return t===32?x(n,0,this.unsigned):x(n>>>t-32,0,this.unsigned)};p.shru=p.shiftRightUnsigned;p.shr_u=p.shiftRightUnsigned;p.toSigned=function(){return this.unsigned?x(this.low,this.high,!1):this};p.toUnsigned=function(){return this.unsigned?this:x(this.low,this.high,!0)};p.toBytes=function(t){return t?this.toBytesLE():this.toBytesBE()};p.toBytesLE=function(){var t=this.high,n=this.low;return[n&255,n>>>8&255,n>>>16&255,n>>>24,t&255,t>>>8&255,t>>>16&255,t>>>24]};p.toBytesBE=function(){var t=this.high,n=this.low;return[t>>>24,t>>>16&255,t>>>8&255,t&255,n>>>24,n>>>16&255,n>>>8&255,n&255]};F.fromBytes=function(t,n,s){return s?F.fromBytesLE(t,n):F.fromBytesBE(t,n)};F.fromBytesLE=function(t,n){return new F(t[0]|t[1]<<8|t[2]<<16|t[3]<<24,t[4]|t[5]<<8|t[6]<<16|t[7]<<24,n)};F.fromBytesBE=function(t,n){return new F(t[4]<<24|t[5]<<16|t[6]<<8|t[7],t[0]<<24|t[1]<<16|t[2]<<8|t[3],n)};const qn=Ls(Pn),Ur=Ps({__proto__:null,default:qn},[Pn]);/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const mt=qn||Ur;function te(e){return mt.fromString(e,!0,16)}const Vn=te("c3a5c85c97cb3127"),gt=te("b492b66fbe98f273"),C=te("9ae16a3b2f90404f");function Fe(e){return e.xor(e.shru(47))}function jn(e,t,n){const s=e.slice(t,t+n);return mt.fromBytes(Array.from(s),!0,!0)}function M(e,t){return jn(e,t,8)}function gn(e,t){return jn(e,t,4)}function D(e,t){return t===0?e:e.shru(t).or(e.shl(64-t))}function ct(e,t,n=te("9ddfea08eb382d69")){let s=e.xor(t).mul(n);s=s.xor(s.shru(47));let r=t.xor(s).mul(n);return r=r.xor(r.shru(47)),r=r.mul(n),r}function Gr(e,t,n,s,r,o){r=r.add(e),o=D(o.add(r).add(s),21);const i=r;return r=r.add(t),r=r.add(n),o=o.add(D(r,44)),[r.add(s),o.add(i)]}function ee(e,t,n,s){return Gr(M(e,t),M(e,t+8),M(e,t+16),M(e,t+24),n,s)}function zr(e,t=e.length){if(t>=8){const n=C.add(t*2),s=M(e,0).add(C),r=M(e,t-8),o=D(r,37).mul(n).add(s),i=D(s,25).add(r).mul(n);return ct(o,i,n)}if(t>=4){const n=C.add(t*2),s=gn(e,0);return ct(s.shl(3).add(t),gn(e,t-4),n)}if(t>0){const n=e[0],s=e[t>>1],r=e[t-1],o=n+(s<<8),i=t+(r<<2);return Fe(C.mul(o).xor(Vn.mul(i))).mul(C)}return C}function Wr(e,t=e.length){const n=C.add(t*2),s=M(e,0).mul(gt),r=M(e,8),o=M(e,t-8).mul(n),i=M(e,t-16).mul(C);return ct(D(s.add(r),43).add(D(o,30)).add(i),s.add(D(r.add(C),18)).add(o),n)}function qr(e,t=e.length){const n=C.add(t*2),s=M(e,0).mul(C),r=M(e,8),o=M(e,t-8).mul(n),i=M(e,t-16).mul(C),a=D(s.add(r),43).add(D(o,30)).add(i),l=ct(a,s.add(D(r.add(C),18)).add(o),n),c=M(e,16).mul(n),f=M(e,24),u=a.add(M(e,t-32)).mul(n),h=l.add(M(e,t-24)).mul(n);return ct(D(c.add(f),43).add(D(u,30)).add(h),c.add(D(f.add(s),18)).add(u),n)}function Hn(e,t=e.length){const n=mt.fromNumber(81,!0);if(t<=32)return t<=16?zr(e,t):Wr(e,t);if(t<=64)return qr(e,t);let s=n,r=n.mul(gt).add(113),o=Fe(r.mul(C).add(113)).mul(C),i=[mt.UZERO,mt.UZERO],a=[mt.UZERO,mt.UZERO];s=s.mul(C).add(M(e,0));let l=0;const c=(t-1>>6)*64,f=c+(t-1&63)-63;do s=D(s.add(r).add(i[0]).add(M(e,l+8)),37).mul(gt),r=D(r.add(i[1]).add(M(e,l+48)),42).mul(gt),s=s.xor(a[1]),r=r.add(i[0]).add(M(e,l+40)),o=D(o.add(a[0]),33).mul(gt),i=ee(e,l,i[1].mul(gt),s.add(a[0])),a=ee(e,l+32,o.add(a[1]),r.add(M(e,l+16))),[o,s]=[s,o],l+=64;while(l!==c);const u=gt.add(o.and(255).shl(1));return l=f,a[0]=a[0].add(t-1&63),i[0]=i[0].add(a[0]),a[0]=a[0].add(i[0]),s=D(s.add(r).add(i[0]).add(M(e,l+8)),37).mul(u),r=D(r.add(i[1]).add(M(e,l+48)),42).mul(u),s=s.xor(a[1].mul(9)),r=r.add(i[0].mul(9).add(M(e,l+40))),o=D(o.add(a[0]),33).mul(u),i=ee(e,l,i[1].mul(u),s.add(a[0])),a=ee(e,l+32,o.add(a[1]),r.add(M(e,l+16))),[o,s]=[s,o],ct(ct(i[0],a[0],u).add(Fe(r).mul(Vn)).add(o),ct(i[1],a[1],u).add(s),u)}/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Vr(e,t){return t==="string"?wt(e):pe([e],t)}function jr(e,t){return e instanceof Float32Array&&t==="float32"||e instanceof Int32Array&&t==="int32"||e instanceof Uint8Array&&t==="bool"}function pe(e,t){if(t==="string")throw new Error("Cannot convert a string[] to a TypedArray");if(Array.isArray(e)&&(e=Ct(e)),A().getBool("DEBUG")&&$n(e,t),jr(e,t))return e;if(t==null||t==="float32"||t==="complex64")return new Float32Array(e);if(t==="int32")return new Int32Array(e);if(t==="bool"){const n=new Uint8Array(e.length);for(let s=0;s<n.length;++s)Math.round(e[s])!==0&&(n[s]=1);return n}else throw new Error(`Unknown data type ${t}`)}function Zt(){return A().platform.now()}function Hr(e,t){return A().platform.fetch(e,t)}function wt(e,t="utf-8"){return t=t||"utf-8",A().platform.encode(e,t)}function ce(e,t="utf-8"){return t=t||"utf-8",A().platform.decode(e,t)}function j(e){return A().platform.isTypedArray!=null?A().platform.isTypedArray(e):Cn(e)}function Ct(e,t=[],n=!1){if(t==null&&(t=[]),typeof e=="boolean"||typeof e=="number"||typeof e=="string"||me(e)||e==null||j(e)&&n)t.push(e);else if(Array.isArray(e)||j(e))for(let s=0;s<e.length;++s)Ct(e[s],t,n);else{let s=-1;for(const r of Object.keys(e))/^([1-9]+[0-9]*|0)$/.test(r)&&(s=Math.max(s,Number(r)));for(let r=0;r<=s;r++)Ct(e[r],t,n)}return t}const yh=Object.freeze(Object.defineProperty({__proto__:null,arraysEqual:fe,arraysEqualWithNull:Xs,assert:b,assertNonNegativeIntegerDimensions:ge,assertNonNull:Ks,assertShapesMatch:Jt,bytesFromStringArray:vn,bytesPerElement:ie,checkConversionForErrors:$n,clamp:jt,computeStrides:kt,convertBackendValuesAndArrayBuffer:or,createScalarValue:Vr,createShuffledIndices:Qs,decodeString:ce,distSquared:Hs,encodeString:wt,fetch:Hr,fingerPrint64:Hn,flatten:Ct,getArrayFromDType:At,getTypedArrayFromDType:sr,hasEncodingLoss:rr,hexToLong:te,indexToLoc:lr,inferDtype:Qt,inferFromImplicitShape:er,isBoolean:Fn,isFunction:ut,isInt:oe,isNumber:xn,isPromise:me,isScalarShape:Zs,isString:de,isTypedArray:j,isValidDtype:Mn,locToIndex:ar,makeOnesTypedArray:Bn,makeZerosNestedTypedArray:ir,makeZerosTypedArray:Ht,nearestDivisor:ae,nearestLargerEven:qs,now:Zt,parseAxisParam:qe,randUniform:js,repeatedTry:tr,rightPad:Vt,shuffle:Tn,shuffleCombo:Ws,sizeFromShape:B,sizeToSquarishShape:Js,squeezeShape:nr,sum:Vs,swap:re,tanh:Ys,toNestedArray:Bt,toTypedArray:pe},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class Kr{constructor(t,n){this.backendTimer=t,this.logger=n,n==null&&(this.logger=new Xr)}profileKernel(t,n,s){let r;const o=()=>{r=s()};let i;const a=Zt();if(this.backendTimer.timerAvailable())i=this.backendTimer.time(o);else{o();for(const c of r)c.dataSync();i=Promise.resolve({kernelMs:Zt()-a})}if(A().getBool("CHECK_COMPUTATION_FOR_ERRORS"))for(let c=0;c<r.length;c++){const f=r[c];f.data().then(u=>{Zr(u,f.dtype,t)})}return{kernelName:t,outputs:r,inputs:n,timeMs:i.then(c=>c.kernelMs),extraInfo:i.then(c=>c.getExtraProfileInfo!=null?c.getExtraProfileInfo():"")}}logKernelProfile(t){const{kernelName:n,outputs:s,timeMs:r,inputs:o,extraInfo:i}=t;s.forEach(a=>{Promise.all([a.data(),r,i]).then(l=>{this.logger.logKernelProfile(n,a,l[0],l[1],o,l[2])})})}}function Zr(e,t,n){if(t!=="float32")return!1;for(let s=0;s<e.length;s++){const r=e[s];if(isNaN(r)||!isFinite(r))return console.warn(`Found ${r} in the result of '${n}'`),!0}return!1}class Xr{logKernelProfile(t,n,s,r,o,i){const a=typeof r=="number"?Vt(`${r}ms`,9):r.error,l=Vt(t,25),c=n.rank,f=n.size,u=Vt(n.shape.toString(),14);let h="";for(const d in o){const g=o[d];if(g!=null){const m=g.shape||n.shape,S=m.length;h+=`${d}: ${S}D ${S>0?m:""} `}}`${l}${a}${c}${u}${f}${h}${i}`}}/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Yr(e,t,n){const s={},r={};for(let l=0;l<t.length;l++)s[t[l].id]=!0;for(let l=0;l<e.length;l++){const c=e[l],f=c.inputs;for(const u in f){const h=f[u];let d=!1;for(let g=0;g<t.length;g++)if(s[h.id]){c.outputs.forEach(m=>s[m.id]=!0),d=!0,r[c.id]=!0;break}if(d)break}}const o={};o[n.id]=!0;const i={};for(let l=e.length-1;l>=0;l--){const c=e[l],f=c.inputs;for(let u=0;u<c.outputs.length;u++)if(o[c.outputs[u].id]){for(const h in f)o[f[h].id]=!0,i[c.id]=!0;break}}const a=[];for(let l=0;l<e.length;l++){const c=e[l];if(r[c.id]&&i[c.id]){const f={};for(const h in c.inputs){const d=c.inputs[h];s[d.id]&&(f[h]=d)}const u=Object.assign({},c);u.inputs=f,u.outputs=c.outputs,a.push(u)}}return a}function Jr(e,t,n,s){for(let r=t.length-1;r>=0;r--){const o=t[r],i=[];if(o.outputs.forEach(l=>{const c=e[l.id];c!=null?i.push(c):i.push(null)}),o.gradient==null)throw new Error(`Cannot compute gradient: gradient function not found for ${o.kernelName}.`);const a=o.gradient(i);for(const l in o.inputs){if(!(l in a))throw new Error(`Cannot backprop through input ${l}. Available gradients found: ${Object.keys(a)}.`);const c=n(()=>a[l]());if(c.dtype!=="float32")throw new Error(`Error in gradient for op ${o.kernelName}. The gradient of input ${l} must have 'float32' dtype, but has '${c.dtype}'`);const f=o.inputs[l];if(!fe(c.shape,f.shape))throw new Error(`Error in gradient for op ${o.kernelName}. The gradient of input '${l}' has shape '${c.shape}', which does not match the shape of the input '${f.shape}'`);if(e[f.id]==null)e[f.id]=c;else{const u=e[f.id];e[f.id]=s(u,c),u.dispose()}}}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const mn=20,zt=3,Ie=7;function Qr(e,t,n,s){const r=kt(t),o=to(e,t,n,r),i=t.length,a=ne(e,t,n,r,o),l=["Tensor"];return s&&(l.push(`  dtype: ${n}`),l.push(`  rank: ${i}`),l.push(`  shape: [${t}]`),l.push("  values:")),l.push(a.map(c=>"    "+c).join(`
`)),l.join(`
`)}function to(e,t,n,s){const r=B(t),o=s[s.length-1],i=new Array(o).fill(0),a=t.length,l=n==="complex64"?qt(e):e;if(a>1)for(let c=0;c<r/o;c++){const f=c*o;for(let u=0;u<o;u++)i[u]=Math.max(i[u],Wt(l[f+u],0,n).length)}return i}function Wt(e,t,n){let s;return Array.isArray(e)?s=`${parseFloat(e[0].toFixed(Ie))} + ${parseFloat(e[1].toFixed(Ie))}j`:de(e)?s=`'${e}'`:n==="bool"?s=Kn(e):s=parseFloat(e.toFixed(Ie)).toString(),Vt(s,t)}function Kn(e){return e===0?"false":"true"}function ne(e,t,n,s,r,o=!0){const i=n==="complex64"?2:1,a=t[0],l=t.length;if(l===0){if(n==="complex64"){const m=qt(e);return[Wt(m[0],0,n)]}return n==="bool"?[Kn(e[0])]:[e[0].toString()]}if(l===1){if(a>mn){const S=zt*i;let E=Array.from(e.slice(0,S)),I=Array.from(e.slice((a-zt)*i,a*i));return n==="complex64"&&(E=qt(E),I=qt(I)),["["+E.map((y,v)=>Wt(y,r[v],n)).join(", ")+", ..., "+I.map((y,v)=>Wt(y,r[a-zt+v],n)).join(", ")+"]"]}return["["+(n==="complex64"?qt(e):Array.from(e)).map((S,E)=>Wt(S,r[E],n)).join(", ")+"]"]}const c=t.slice(1),f=s.slice(1),u=s[0]*i,h=[];if(a>mn){for(let m=0;m<zt;m++){const S=m*u,E=S+u;h.push(...ne(e.slice(S,E),c,n,f,r,!1))}h.push("...");for(let m=a-zt;m<a;m++){const S=m*u,E=S+u;h.push(...ne(e.slice(S,E),c,n,f,r,m===a-1))}}else for(let m=0;m<a;m++){const S=m*u,E=S+u;h.push(...ne(e.slice(S,E),c,n,f,r,m===a-1))}const d=l===2?",":"";h[0]="["+(a>0?h[0]+d:"");for(let m=1;m<h.length-1;m++)h[m]=" "+h[m]+d;let g=`,
`;for(let m=2;m<l;m++)g+=`
`;return h[h.length-1]=" "+h[h.length-1]+"]"+(o?"":g),h}function qt(e){const t=[];for(let n=0;n<e.length;n+=2)t.push([e[n],e[n+1]]);return t}/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class xe{constructor(t,n,s){if(this.dtype=n,this.shape=t.slice(),this.size=B(t),s!=null){const r=s.length;b(r===this.size,()=>`Length of values '${r}' does not match the size inferred by the shape '${this.size}'.`)}if(n==="complex64")throw new Error("complex64 dtype TensorBuffers are not supported. Please create a TensorBuffer for the real and imaginary parts separately and call tf.complex(real, imag).");this.values=s||At(n,this.size),this.strides=kt(t)}set(t,...n){n.length===0&&(n=[0]),b(n.length===this.rank,()=>`The number of provided coordinates (${n.length}) must match the rank (${this.rank})`);const s=this.locToIndex(n);this.values[s]=t}get(...t){t.length===0&&(t=[0]);let n=0;for(const r of t){if(r<0||r>=this.shape[n]){const o=`Requested out of range element at ${t}.   Buffer shape=${this.shape}`;throw new Error(o)}n++}let s=t[t.length-1];for(let r=0;r<t.length-1;++r)s+=this.strides[r]*t[r];return this.values[s]}locToIndex(t){if(this.rank===0)return 0;if(this.rank===1)return t[0];let n=t[t.length-1];for(let s=0;s<t.length-1;++s)n+=this.strides[s]*t[s];return n}indexToLoc(t){if(this.rank===0)return[];if(this.rank===1)return[t];const n=new Array(this.shape.length);for(let s=0;s<n.length-1;++s)n[s]=Math.floor(t/this.strides[s]),t-=n[s]*this.strides[s];return n[n.length-1]=t,n}get rank(){return this.shape.length}toTensor(){return J().makeTensor(this.values,this.shape,this.dtype)}}let J=null,Ft=null;function eo(e){J=e}function no(e){Ft=e}class U{constructor(t,n,s,r){this.kept=!1,this.isDisposedInternal=!1,this.shape=t.slice(),this.dtype=n||"float32",this.size=B(t),this.strides=kt(t),this.dataId=s,this.id=r,this.rankType=this.rank<5?this.rank.toString():"higher"}get rank(){return this.shape.length}async buffer(){const t=await this.data();return Ft.buffer(this.shape,this.dtype,t)}bufferSync(){return Ft.buffer(this.shape,this.dtype,this.dataSync())}async array(){const t=await this.data();return Bt(this.shape,t,this.dtype==="complex64")}arraySync(){return Bt(this.shape,this.dataSync(),this.dtype==="complex64")}async data(){this.throwIfDisposed();const t=J().read(this.dataId);if(this.dtype==="string"){const n=await t;try{return n.map(s=>ce(s))}catch{throw new Error("Failed to decode the string bytes into utf-8. To get the original bytes, call tensor.bytes().")}}return t}dataToGPU(t){return this.throwIfDisposed(),J().readToGPU(this.dataId,t)}dataSync(){this.throwIfDisposed();const t=J().readSync(this.dataId);if(this.dtype==="string")try{return t.map(n=>ce(n))}catch{throw new Error("Failed to decode the string bytes into utf-8. To get the original bytes, call tensor.bytes().")}return t}async bytes(){this.throwIfDisposed();const t=await J().read(this.dataId);return this.dtype==="string"?t:new Uint8Array(t.buffer)}dispose(){this.isDisposed||(this.kerasMask&&this.kerasMask.dispose(),J().disposeTensor(this),this.isDisposedInternal=!0)}get isDisposed(){return this.isDisposedInternal}throwIfDisposed(){if(this.isDisposed)throw new Error("Tensor is disposed.")}print(t=!1){return Ft.print(this,t)}clone(){return this.throwIfDisposed(),Ft.clone(this)}toString(t=!1){const n=this.dataSync();return Qr(n,this.shape,this.dtype,t)}cast(t){return this.throwIfDisposed(),Ft.cast(this,t)}variable(t=!0,n,s){return this.throwIfDisposed(),J().makeVariable(this,t,n,s)}}Object.defineProperty(U,Symbol.hasInstance,{value:e=>!!e&&e.data!=null&&e.dataSync!=null&&e.throwIfDisposed!=null});function Zn(){return Ve("Tensor",()=>U)}Zn();class ue extends U{constructor(t,n,s,r){super(t.shape,t.dtype,t.dataId,r),this.trainable=n,this.name=s}assign(t){if(t.dtype!==this.dtype)throw new Error(`dtype of the new value (${t.dtype}) and previous value (${this.dtype}) must match`);if(!fe(t.shape,this.shape))throw new Error(`shape of the new value (${t.shape}) and previous value (${this.shape}) must match`);J().disposeTensor(this),this.dataId=t.dataId,J().incRef(this,null)}dispose(){J().disposeVariable(this),this.isDisposedInternal=!0}}Object.defineProperty(ue,Symbol.hasInstance,{value:e=>e instanceof U&&e.assign!=null&&e.assign instanceof Function});/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */var pn;(function(e){e.R0="R0",e.R1="R1",e.R2="R2",e.R3="R3",e.R4="R4",e.R5="R5",e.R6="R6"})(pn||(pn={}));var Ne;(function(e){e.float32="float32",e.int32="int32",e.bool="int32",e.complex64="complex64"})(Ne||(Ne={}));var Be;(function(e){e.float32="float32",e.int32="int32",e.bool="bool",e.complex64="complex64"})(Be||(Be={}));var _e;(function(e){e.float32="float32",e.int32="float32",e.bool="float32",e.complex64="complex64"})(_e||(_e={}));var Re;(function(e){e.float32="complex64",e.int32="complex64",e.bool="complex64",e.complex64="complex64"})(Re||(Re={}));const so={float32:_e,int32:Ne,bool:Be,complex64:Re};function Ke(e,t){if(e==="string"||t==="string"){if(e==="string"&&t==="string")return"string";throw new Error(`Can not upcast ${e} with ${t}`)}return so[e][t]}function wh(e){return Ke(e,"int32")}function Xn(e){return e!=null&&typeof e=="object"&&"texture"in e&&e.texture instanceof WebGLTexture}function Yn(e){return typeof GPUBuffer<"u"&&e!=null&&typeof e=="object"&&"buffer"in e&&e.buffer instanceof GPUBuffer}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ft(e,t){if(e.dtype===t.dtype)return[e,t];const n=Ke(e.dtype,t.dtype);return[e.cast(n),t.cast(n)]}function ro(e,t){b(e.dtype===t.dtype,()=>`The dtypes of the first(${e.dtype}) and second(${t.dtype}) input must match`)}function oo(e,t){return t.some(n=>n.id===e.id)}function Ze(e){const t=[];return Jn(e,t,new Set),t}function Jn(e,t,n){if(e==null)return;if(e instanceof U){t.push(e);return}if(!io(e))return;const s=e;for(const r in s){const o=s[r];n.has(o)||(n.add(o),Jn(o,t,n))}}function io(e){return Array.isArray(e)||typeof e=="object"}const bh=Object.freeze(Object.defineProperty({__proto__:null,assertTypesMatch:ro,getTensorsInContainer:Ze,isTensorInList:oo,makeTypesMatch:ft},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Ae(e){return e.kernelName!=null}class yn{constructor(){this.registeredVariables={},this.nextTapeNodeId=0,this.numBytes=0,this.numTensors=0,this.numStringTensors=0,this.numDataBuffers=0,this.gradientDepth=0,this.kernelDepth=0,this.scopeStack=[],this.numDataMovesStack=[],this.nextScopeId=0,this.tensorInfo=new WeakMap,this.profiling=!1,this.activeProfile={newBytes:0,newTensors:0,peakBytes:0,kernels:[],result:null,get kernelNames(){return Array.from(new Set(this.kernels.map(t=>t.name)))}}}dispose(){for(const t in this.registeredVariables)this.registeredVariables[t].dispose()}}class Pt{constructor(t){this.ENV=t,this.registry={},this.registryFactory={},this.pendingBackendInitId=0,this.state=new yn}async ready(){if(this.pendingBackendInit!=null)return this.pendingBackendInit.then(()=>{});if(this.backendInstance!=null)return;const t=this.getSortedBackends();for(let n=0;n<t.length;n++){const s=t[n];if(await this.initializeBackend(s).success){await this.setBackend(s);return}}throw new Error("Could not initialize any backends, all backend initializations failed.")}get backend(){if(this.pendingBackendInit!=null)throw new Error(`Backend '${this.backendName}' has not yet been initialized. Make sure to await tf.ready() or await tf.setBackend() before calling other methods`);if(this.backendInstance==null){const{name:t,asyncInit:n}=this.initializeBackendsAndReturnBest();if(n)throw new Error(`The highest priority backend '${t}' has not yet been initialized. Make sure to await tf.ready() or await tf.setBackend() before calling other methods`);this.setBackend(t)}return this.backendInstance}backendNames(){return Object.keys(this.registryFactory)}findBackend(t){if(!(t in this.registry))if(t in this.registryFactory){const{asyncInit:n}=this.initializeBackend(t);if(n)return null}else return null;return this.registry[t]}findBackendFactory(t){return t in this.registryFactory?this.registryFactory[t].factory:null}registerBackend(t,n,s=1){return t in this.registryFactory?(it(`${t} backend was already registered. Reusing existing backend factory.`),!1):(this.registryFactory[t]={factory:n,priority:s},!0)}async setBackend(t){if(this.registryFactory[t]==null)throw new Error(`Backend name '${t}' not found in registry`);if(this.backendName=t,this.registry[t]==null){this.backendInstance=null;const{success:n,asyncInit:s}=this.initializeBackend(t);if(!(s?await n:n))return!1}return this.backendInstance=this.registry[t],this.setupRegisteredKernels(),this.profiler=new Kr(this.backendInstance),!0}setupRegisteredKernels(){Me(this.backendName).forEach(n=>{n.setupFunc!=null&&n.setupFunc(this.backendInstance)})}disposeRegisteredKernels(t){Me(t).forEach(s=>{s.disposeFunc!=null&&s.disposeFunc(this.registry[t])})}initializeBackend(t){const n=this.registryFactory[t];if(n==null)throw new Error(`Cannot initialize backend ${t}, no registration found.`);try{const s=n.factory();if(s&&!(s instanceof zs)&&typeof s.then=="function"){const r=++this.pendingBackendInitId,o=s.then(i=>r<this.pendingBackendInitId?!1:(this.registry[t]=i,this.pendingBackendInit=null,!0)).catch(i=>(r<this.pendingBackendInitId||(this.pendingBackendInit=null,it(`Initialization of backend ${t} failed`),it(i.stack||i.message)),!1));return this.pendingBackendInit=o,{success:o,asyncInit:!0}}else return this.registry[t]=s,{success:!0,asyncInit:!1}}catch(s){return it(`Initialization of backend ${t} failed`),it(s.stack||s.message),{success:!1,asyncInit:!1}}}removeBackend(t){if(!(t in this.registryFactory))throw new Error(`${t} backend not found in registry`);this.backendName===t&&this.pendingBackendInit!=null&&this.pendingBackendInitId++,t in this.registry&&(this.disposeRegisteredKernels(t),this.registry[t].dispose(),delete this.registry[t]),delete this.registryFactory[t],this.backendName===t&&(this.pendingBackendInit=null,this.backendName=null,this.backendInstance=null)}getSortedBackends(){if(Object.keys(this.registryFactory).length===0)throw new Error("No backend found in registry.");return Object.keys(this.registryFactory).sort((t,n)=>this.registryFactory[n].priority-this.registryFactory[t].priority)}initializeBackendsAndReturnBest(){const t=this.getSortedBackends();for(let n=0;n<t.length;n++){const s=t[n],{success:r,asyncInit:o}=this.initializeBackend(s);if(o||r)return{name:s,asyncInit:o}}throw new Error("Could not initialize any backends, all backend initializations failed.")}moveData(t,n){const s=this.state.tensorInfo.get(n),r=s.backend,o=this.readSync(n),i=r.refCount(n);r.disposeData(n,!0),s.backend=t,t.move(n,o,s.shape,s.dtype,i),this.shouldCheckForMemLeaks()&&this.state.numDataMovesStack[this.state.numDataMovesStack.length-1]++}tidy(t,n){let s=null;if(n==null){if(typeof t!="function")throw new Error("Please provide a function to tidy()");n=t}else{if(typeof t!="string"&&!(t instanceof String))throw new Error("When calling with two arguments, the first argument to tidy() must be a string");if(typeof n!="function")throw new Error("When calling with two arguments, the 2nd argument to tidy() must be a function");s=t}let r;return this.scopedRun(()=>this.startScope(s),()=>this.endScope(r),()=>(r=n(),r instanceof Promise&&console.error("Cannot return a Promise inside of tidy."),r))}scopedRun(t,n,s){t();try{const r=s();return n(),r}catch(r){throw n(),r}}nextTensorId(){return Pt.nextTensorId++}nextVariableId(){return Pt.nextVariableId++}clone(t){const n=w.runKernel(Ln,{x:t}),s={x:t},r=i=>({x:()=>{const a="float32",l={x:i},c={dtype:a};return w.runKernel(On,l,c)}}),o=[];return this.addTapeNode(this.state.activeScope.name,s,[n],r,o,{}),n}runKernel(t,n,s){if(this.backendName==null&&this.backend,!(an(t,this.backendName)!=null))throw new Error(`Kernel '${t}' not registered for backend '${this.backendName}'`);return this.runKernelFunc({kernelName:t,inputs:n,attrs:s})}shouldCheckForMemLeaks(){return this.ENV.getBool("IS_TEST")}checkKernelForMemLeak(t,n,s){const r=this.backend.numDataIds();let o=0;s.forEach(l=>{o+=l.dtype==="complex64"?3:1});const i=this.state.numDataMovesStack[this.state.numDataMovesStack.length-1],a=r-n-o-i;if(a>0)throw new Error(`Backend '${this.backendName}' has an internal memory leak (${a} data ids) after running '${t}'`)}runKernelFunc(t){let n,s=[];const r=this.isTapeOn(),o=this.state.numBytes,i=this.state.numTensors;this.shouldCheckForMemLeaks()&&this.state.numDataMovesStack.push(0);let a;this.backendName==null&&this.backend;let l;const c=Ae(t)?t.kernelName:this.state.activeScope!=null?this.state.activeScope.name:"";if(Ae(t)){const{kernelName:g,inputs:m,attrs:S}=t;this.backendName==null&&this.backend;const E=an(g,this.backendName);b(E!=null,()=>`Cannot find registered kernel '${g}' for backend '${this.backendName}'`),a=()=>{const I=this.backend.numDataIds();l=E.kernelFunc({inputs:m,attrs:S,backend:this.backend});const y=Array.isArray(l)?l:[l];this.shouldCheckForMemLeaks()&&this.checkKernelForMemLeak(g,I,y);const v=y.map(N=>N.rank!=null?N:this.makeTensorFromTensorInfo(N));if(r){const N=this.getTensorsForGradient(g,m,v);s=this.saveTensorsForBackwardMode(N)}return v}}else{const{forwardFunc:g}=t,m=S=>{r&&(s=S.map(E=>this.keep(this.clone(E))))};a=()=>{const S=this.backend.numDataIds();l=this.tidy(()=>g(this.backend,m));const E=Array.isArray(l)?l:[l];return this.shouldCheckForMemLeaks()&&this.checkKernelForMemLeak(c,S,E),E}}const{inputs:f,attrs:u}=t,h=Ae(t)?null:t.backwardsFunc;let d;return this.scopedRun(()=>this.state.kernelDepth++,()=>this.state.kernelDepth--,()=>{!this.ENV.getBool("DEBUG")&&!this.state.profiling?n=a():(d=this.profiler.profileKernel(c,f,()=>a()),this.ENV.getBool("DEBUG")&&this.profiler.logKernelProfile(d),n=d.outputs)}),r&&this.addTapeNode(c,f,n,h,s,u),this.state.profiling&&this.state.activeProfile.kernels.push({name:c,bytesAdded:this.state.numBytes-o,totalBytesSnapshot:this.state.numBytes,tensorsAdded:this.state.numTensors-i,totalTensorsSnapshot:this.state.numTensors,inputShapes:Object.keys(f).map(g=>f[g]!=null?f[g].shape:null),outputShapes:n.map(g=>g.shape),kernelTimeMs:d.timeMs,extraInfo:d.extraInfo}),Array.isArray(l)?n:n[0]}saveTensorsForBackwardMode(t){return t.map(s=>this.keep(this.clone(s)))}getTensorsForGradient(t,n,s){const r=ln(t);if(r!=null){const o=r.inputsToSave||[],i=r.outputsToSave||[];let a;r.saveAllInputs?(b(Array.isArray(n),()=>"saveAllInputs is true, expected inputs to be an array."),a=Object.keys(n).map(c=>n[c])):a=o.map(c=>n[c]);const l=s.filter((c,f)=>i[f]);return a.concat(l)}return[]}makeTensor(t,n,s,r){if(t==null)throw new Error("Values passed to engine.makeTensor() are null");s=s||"float32",r=r||this.backend;let o=t;s==="string"&&de(t[0])&&(o=t.map(l=>wt(l)));const i=r.write(o,n,s),a=new U(n,s,i,this.nextTensorId());if(this.trackTensor(a,r),s==="string"){const l=this.state.tensorInfo.get(i),c=vn(o);this.state.numBytes+=c-l.bytes,l.bytes=c}return a}makeTensorFromDataId(t,n,s,r){s=s||"float32";const o={dataId:t,shape:n,dtype:s};return this.makeTensorFromTensorInfo(o,r)}makeTensorFromTensorInfo(t,n){const{dataId:s,shape:r,dtype:o}=t,i=new U(r,o,s,this.nextTensorId());return this.trackTensor(i,n),i}makeVariable(t,n=!0,s,r){s=s||this.nextVariableId().toString(),r!=null&&r!==t.dtype&&(t=t.cast(r));const o=new ue(t,n,s,this.nextTensorId());if(this.state.registeredVariables[o.name]!=null)throw new Error(`Variable with name ${o.name} was already registered`);return this.state.registeredVariables[o.name]=o,this.incRef(o,this.backend),o}trackTensor(t,n){this.state.numTensors++,t.dtype==="string"&&this.state.numStringTensors++;let s=0;t.dtype!=="complex64"&&t.dtype!=="string"&&(s=t.size*ie(t.dtype)),this.state.numBytes+=s,this.state.tensorInfo.has(t.dataId)||(this.state.numDataBuffers++,this.state.tensorInfo.set(t.dataId,{backend:n||this.backend,dtype:t.dtype,shape:t.shape,bytes:s})),t instanceof ue||this.track(t)}incRef(t,n){this.trackTensor(t,n),this.backend.incRef(t.dataId)}removeDataId(t,n){this.state.tensorInfo.has(t)&&this.state.tensorInfo.get(t).backend===n&&(this.state.tensorInfo.delete(t),this.state.numDataBuffers--)}disposeTensor(t){if(!this.state.tensorInfo.has(t.dataId))return;const n=this.state.tensorInfo.get(t.dataId);if(this.state.numTensors--,t.dtype==="string"&&(this.state.numStringTensors--,this.state.numBytes-=n.bytes),t.dtype!=="complex64"&&t.dtype!=="string"){const s=t.size*ie(t.dtype);this.state.numBytes-=s}n.backend.disposeData(t.dataId)&&this.removeDataId(t.dataId,n.backend)}disposeVariables(){for(const t in this.state.registeredVariables){const n=this.state.registeredVariables[t];this.disposeVariable(n)}}disposeVariable(t){this.disposeTensor(t),this.state.registeredVariables[t.name]!=null&&delete this.state.registeredVariables[t.name]}memory(){const t=this.backend.memory();return t.numTensors=this.state.numTensors,t.numDataBuffers=this.state.numDataBuffers,t.numBytes=this.state.numBytes,this.state.numStringTensors>0&&(t.unreliable=!0,t.reasons==null&&(t.reasons=[]),t.reasons.push("Memory usage by string tensors is approximate (2 bytes per character)")),t}async profile(t){this.state.profiling=!0;const n=this.state.numBytes,s=this.state.numTensors;this.state.activeProfile.kernels=[],this.state.activeProfile.result=await t(),this.state.profiling=!1,this.state.activeProfile.peakBytes=Math.max(...this.state.activeProfile.kernels.map(r=>r.totalBytesSnapshot)),this.state.activeProfile.newBytes=this.state.numBytes-n,this.state.activeProfile.newTensors=this.state.numTensors-s;for(const r of this.state.activeProfile.kernels)r.kernelTimeMs=await r.kernelTimeMs,r.extraInfo=await r.extraInfo;return this.state.activeProfile}isTapeOn(){return this.state.gradientDepth>0&&this.state.kernelDepth===0}addTapeNode(t,n,s,r,o,i){const a={id:this.state.nextTapeNodeId++,kernelName:t,inputs:n,outputs:s,saved:o},l=ln(t);l!=null&&(r=l.gradFunc),r!=null&&(a.gradient=c=>(c=c.map((f,u)=>{if(f==null){const h=s[u],d=Ht(h.size,h.dtype);return this.makeTensor(d,h.shape,h.dtype)}return f}),r(c.length>1?c:c[0],o,i))),this.state.activeTape.push(a)}keep(t){return t.kept=!0,t}startTape(){this.state.gradientDepth===0&&(this.state.activeTape=[]),this.state.gradientDepth++}endTape(){this.state.gradientDepth--}startScope(t){const n={track:[],name:"unnamed scope",id:this.state.nextScopeId++};t&&(n.name=t),this.state.scopeStack.push(n),this.state.activeScope=n}endScope(t){const n=Ze(t),s=new Set(n.map(o=>o.id));for(let o=0;o<this.state.activeScope.track.length;o++){const i=this.state.activeScope.track[o];!i.kept&&!s.has(i.id)&&i.dispose()}const r=this.state.scopeStack.pop();this.state.activeScope=this.state.scopeStack.length===0?null:this.state.scopeStack[this.state.scopeStack.length-1],n.forEach(o=>{!o.kept&&o.scopeId===r.id&&this.track(o)})}gradients(t,n,s,r=!1){if(b(n.length>0,()=>"gradients() received an empty list of xs."),s!=null&&s.dtype!=="float32")throw new Error(`dy must have 'float32' dtype, but has '${s.dtype}'`);const o=this.scopedRun(()=>this.startTape(),()=>this.endTape(),()=>this.tidy("forward",t));b(o instanceof U,()=>"The result y returned by f() must be a tensor.");const i=Yr(this.state.activeTape,n,o);if(!r&&i.length===0&&n.length>0)throw new Error("Cannot compute gradient of y=f(x) with respect to x. Make sure that the f you passed encloses all operations that lead from x to y.");return this.tidy("backward",()=>{const a={};a[o.id]=s??ao(o.shape),Jr(a,i,c=>this.tidy(c),lo);const l=n.map(c=>a[c.id]);return this.state.gradientDepth===0&&(this.state.activeTape.forEach(c=>{for(const f of c.saved)f.dispose()}),this.state.activeTape=null),{value:o,grads:l}})}customGrad(t){return b(ut(t),()=>"The f passed in customGrad(f) must be a function."),(...n)=>{b(n.every(a=>a instanceof U),()=>"The args passed in customGrad(f)(x1, x2,...) must all be tensors");let s;const r={};n.forEach((a,l)=>{r[l]=a});const o=(a,l)=>(s=t(...n,l),b(s.value instanceof U,()=>"The function f passed in customGrad(f) must return an object where `obj.value` is a tensor"),b(ut(s.gradFunc),()=>"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function."),s.value),i=(a,l)=>{const c=s.gradFunc(a,l),f=Array.isArray(c)?c:[c];b(f.length===n.length,()=>"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function that returns the same number of tensors as inputs passed to f(...)."),b(f.every(h=>h instanceof U),()=>"The function f passed in customGrad(f) must return an object where `obj.gradFunc` is a function that returns a list of only tensors.");const u={};return f.forEach((h,d)=>{u[d]=()=>h}),u};return this.runKernelFunc({forwardFunc:o,backwardsFunc:i,inputs:r})}}readSync(t){return this.state.tensorInfo.get(t).backend.readSync(t)}read(t){return this.state.tensorInfo.get(t).backend.read(t)}readToGPU(t,n){return this.state.tensorInfo.get(t).backend.readToGPU(t,n)}async time(t){const n=Zt(),s=await this.backend.time(t);return s.wallMs=Zt()-n,s}track(t){return this.state.activeScope!=null&&(t.scopeId=this.state.activeScope.id,this.state.activeScope.track.push(t)),t}get registeredVariables(){return this.state.registeredVariables}reset(){this.pendingBackendInitId++,this.state.dispose(),this.ENV.reset(),this.state=new yn;for(const t in this.registry)this.disposeRegisteredKernels(t),this.registry[t].dispose(),delete this.registry[t];this.backendName=null,this.backendInstance=null,this.pendingBackendInit=null}}Pt.nextTensorId=0;Pt.nextVariableId=0;function ao(e){const t=Bn(B(e),"float32");return w.makeTensor(t,e,"float32")}function Qn(){const e=Rn();if(e._tfengine==null){const t=new cr(e);e._tfengine=new Pt(t)}return dr(e._tfengine.ENV),eo(()=>e._tfengine),e._tfengine}const w=Qn();function lo(e,t){const n={a:e,b:t};return w.runKernel(Dn,n)}/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function co(){return typeof navigator<"u"&&navigator!=null}let De;function uo(e){De=e}function ho(e){if(De!==void 0)return De;if(e||co()){if(e||(e=navigator),e.product==="ReactNative")return!0;const t=e.userAgent||e.vendor||(typeof window<"u"?window.opera:"");if(!t){const n=e;return n.userAgentData&&n.userAgentData.mobile}return/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(t)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(t.substr(0,4))}return!1}function ts(){return typeof window<"u"&&window.document!=null||typeof WorkerGlobalScope<"u"}const Sh=Object.freeze(Object.defineProperty({__proto__:null,isBrowser:ts,isMobile:ho,mockIsMobile:uo},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const G=A();G.registerFlag("DEBUG",()=>!1,e=>{e&&console.warn("Debugging mode is ON. The output of every math call will be downloaded to CPU and checked for NaNs. This significantly impacts performance.")});G.registerFlag("IS_BROWSER",()=>ts());G.registerFlag("IS_NODE",()=>typeof process<"u"&&typeof process.versions<"u"&&typeof process.versions.node<"u");G.registerFlag("IS_CHROME",()=>typeof navigator<"u"&&navigator!=null&&navigator.userAgent!=null&&/Chrome/.test(navigator.userAgent)&&/Google Inc/.test(navigator.vendor));G.registerFlag("IS_SAFARI",()=>typeof navigator<"u"&&navigator!=null&&navigator.userAgent!=null&&/Safari/.test(navigator.userAgent)&&/Apple/.test(navigator.vendor));G.registerFlag("PROD",()=>!1);G.registerFlag("TENSORLIKE_CHECK_SHAPE_CONSISTENCY",()=>G.getBool("DEBUG"));G.registerFlag("DEPRECATION_WARNINGS_ENABLED",()=>!0);G.registerFlag("IS_TEST",()=>!1);G.registerFlag("CHECK_COMPUTATION_FOR_ERRORS",()=>G.getBool("DEBUG"));G.registerFlag("WRAP_TO_IMAGEBITMAP",()=>!1);G.registerFlag("CANVAS2D_WILL_READ_FREQUENTLY_FOR_GPU",()=>!1);G.registerFlag("USE_SETTIMEOUTCUSTOM",()=>!1);/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function es(e,t){let n=e;if(j(e))return t==="string"?[]:[e.length];if(Xn(e)){const r=e.channels||"RGBA";return[e.height,e.width*r.length]}else if(Yn(e))return[e.buffer.size/(t==null?4:ie(t))];if(!Array.isArray(e))return[];const s=[];for(;Array.isArray(n)||j(n)&&t!=="string";)s.push(n.length),n=n[0];return Array.isArray(e)&&A().getBool("TENSORLIKE_CHECK_SHAPE_CONSISTENCY")&&ns(e,s,[]),s}function ns(e,t,n){if(n=n||[],!Array.isArray(e)&&!j(e)){b(t.length===0,()=>`Element arr[${n.join("][")}] is a primitive, but should be an array/TypedArray of ${t[0]} elements`);return}b(t.length>0,()=>`Element arr[${n.join("][")}] should be a primitive, but is an array of ${e.length} elements`),b(e.length===t[0],()=>`Element arr[${n.join("][")}] should have ${t[0]} elements, but has ${e.length} elements`);const s=t.slice(1);for(let r=0;r<e.length;++r)ns(e[r],s,n.concat(r))}function wn(e,t,n,s){if(e!=="string_or_numeric"){if(e==null)throw new Error("Expected dtype cannot be null.");if(e!=="numeric"&&e!==t||e==="numeric"&&t==="string")throw new Error(`Argument '${n}' passed to '${s}' must be ${e} tensor, but got ${t} tensor`)}}function T(e,t,n,s="numeric"){if(e instanceof Zn())return wn(s,e.dtype,t,n),e;let r=Qt(e);if(r!=="string"&&["bool","int32","float32"].indexOf(s)>=0&&(r=s),wn(s,r,t,n),e==null||!j(e)&&!Array.isArray(e)&&typeof e!="number"&&typeof e!="boolean"&&typeof e!="string"){const l=e==null?"null":e.constructor.name;throw new Error(`Argument '${t}' passed to '${n}' must be a Tensor or TensorLike, but got '${l}'`)}const o=es(e,r);!j(e)&&!Array.isArray(e)&&(e=[e]);const a=r!=="string"?pe(e,r):Ct(e,[],!0);return w.makeTensor(a,o,r)}function fo(e,t,n,s="numeric"){if(!Array.isArray(e))throw new Error(`Argument ${t} passed to ${n} must be a \`Tensor[]\` or \`TensorLike[]\``);return e.map((o,i)=>T(o,`${t}[${i}]`,n,s))}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const go="__op";function _(e){const t=Object.keys(e);if(t.length!==1)throw new Error(`Please provide an object with a single key (operation name) mapping to a function. Got an object with ${t.length} keys.`);let n=t[0];const s=e[n];n.endsWith("_")&&(n=n.substring(0,n.length-1)),n=n+go;const r=(...o)=>{w.startScope(n);try{const i=s(...o);return me(i)&&console.error("Cannot return a Promise inside of tidy."),w.endScope(i),i}catch(i){throw w.endScope(null),i}};return Object.defineProperty(r,"name",{value:n,configurable:!0}),r}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function mo(e,t){const n=T(e,"real","complex"),s=T(t,"imag","complex");Jt(n.shape,s.shape,`real and imag shapes, ${n.shape} and ${s.shape}, must match in call to tf.complex().`);const r={real:n,imag:s};return w.runKernel(pr,r)}const po=_({complex_:mo});/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ss(e,t,n,s){if(s==null)s=Qt(e);else if(s==="complex64")throw new Error("Cannot construct a complex64 tensor directly. Please use tf.complex(real, imag).");if(Yn(e)||Xn(e)){if(s!=="float32"&&s!=="int32")throw new Error(`Creating tensor from GPU data only supports 'float32'|'int32' dtype, while the dtype is ${s}.`);return w.backend.createTensorFromGPUData(e,t||n,s)}if(!j(e)&&!Array.isArray(e)&&typeof e!="number"&&typeof e!="boolean"&&typeof e!="string")throw new Error("values passed to tensor(values) must be a number/boolean/string or an array of numbers/booleans/strings, or a TypedArray");if(t!=null){ge(t);const r=B(t),o=B(n);b(r===o,()=>`Based on the provided shape, [${t}], the tensor should have ${r} values but has ${o}`);for(let i=0;i<n.length;++i){const a=n[i],l=i===n.length-1?a!==B(t.slice(i)):!0;b(n[i]===t[i]||!l,()=>`Error creating a new Tensor. Inferred shape (${n}) does not match the provided shape (${t}). `)}}return!j(e)&&!Array.isArray(e)&&(e=[e]),t=t||n,e=s!=="string"?pe(e,s):Ct(e,[],!0),w.makeTensor(e,t,s)}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ke(e,t,n){const s=es(e,n);return ss(e,t,s,n)}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Ut={float32:4,float16:2,int32:4,uint16:2,uint8:1,bool:1,complex64:8};class $t{static join(t){return new $t(t).slice()}constructor(t){if(this.shards=[],this.previousShardIndex=0,t==null||(t instanceof Array||(t=[t]),t=t.map(s=>j(s)?s.buffer:s),t.length===0))return;this.bufferUniformSize=t[0].byteLength;let n=0;for(let s=0;s<t.length;s++){const r=t[s];s!==t.length-1&&r.byteLength!==this.bufferUniformSize&&(this.bufferUniformSize=void 0);const o=n+r.byteLength;this.shards.push({buffer:r,start:n,end:o}),n=o}this.shards.length===0&&(this.byteLength=0),this.byteLength=this.shards[this.shards.length-1].end}slice(t=0,n=this.byteLength){if(this.shards.length===0)return new ArrayBuffer(0);if(t=isNaN(Number(t))?0:t,n=isNaN(Number(n))?0:n,t=Math.max(0,t),n=Math.min(this.byteLength,n),n<=t)return new ArrayBuffer(0);const s=this.findShardForByte(t);if(s===-1)throw new Error(`Could not find start shard for byte ${t}`);const r=n-t,o=new ArrayBuffer(r),i=new Uint8Array(o);let a=0;for(let l=s;l<this.shards.length;l++){const c=this.shards[l],u=t+a-c.start,h=a,g=Math.min(n,c.end)-c.start,m=new Uint8Array(c.buffer,u,g-u);if(i.set(m,h),a+=m.length,n<c.end)break}return o}findShardForByte(t){if(this.shards.length===0||t<0||t>=this.byteLength)return-1;if(this.bufferUniformSize!=null)return this.previousShardIndex=Math.floor(t/this.bufferUniformSize),this.previousShardIndex;function n(r){return t<r.start?-1:t>=r.end?1:0}if(n(this.shards[this.previousShardIndex])===0)return this.previousShardIndex;const s=yo(this.shards,n);return s===-1?-1:(this.previousShardIndex=s,this.previousShardIndex)}}function yo(e,t){let n=0,s=e.length;for(;n<=s;){const r=Math.floor((s-n)/2)+n,o=t(e[r]);if(o===0)return r;o<0?s=r:n=r+1}return-1}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Eh(){A().set("PROD",!0)}function Ih(){A().set("DEBUG",!0)}function Ah(){A().set("DEPRECATION_WARNINGS_ENABLED",!1),console.warn("TensorFlow.js deprecation warnings have been disabled.")}function kh(e){A().getBool("DEPRECATION_WARNINGS_ENABLED")&&console.warn(e+" You can disable deprecation warnings with tf.disableDeprecationWarnings().")}function Th(){w.disposeVariables()}function $h(){return w}function Mh(){return w.memory()}function vh(e){return w.profile(e)}function O(e,t){return w.tidy(e,t)}function V(e){Ze(e).forEach(n=>n.dispose())}function wo(e){return w.keep(e)}function Fh(e){return w.time(e)}function xh(e){return w.setBackend(e)}function Nh(){return w.ready()}function bo(){return w.backendName}function Bh(e){w.removeBackend(e)}function _h(e){return w.findBackend(e)}function Rh(e){return w.findBackendFactory(e)}function Dh(e,t,n=1){return w.registerBackend(e,t,n)}function So(){return w.backend}function Oh(e,t){A().setPlatform(e,t)}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const ht=4;async function Lh(e,t){const n=[],s=[],r=Array.isArray(e)?e.map(i=>i.name):Object.keys(e);for(let i=0;i<r.length;++i){const a=r[i],l=Array.isArray(e)?e[i].tensor:e[a];if(l.dtype!=="float32"&&l.dtype!=="int32"&&l.dtype!=="bool"&&l.dtype!=="string"&&l.dtype!=="complex64")throw new Error(`Unsupported dtype in weight '${a}': ${l.dtype}`);const c={name:a,shape:l.shape,dtype:l.dtype};if(l.dtype==="string"){const f=new Promise(async u=>{const h=await l.bytes(),d=h.reduce((S,E)=>S+E.length,0)+ht*h.length,g=new Uint8Array(d);let m=0;for(let S=0;S<h.length;S++){const E=h[S],I=new Uint8Array(new Uint32Array([E.length]).buffer);g.set(I,m),m+=ht,g.set(E,m),m+=E.length}u(g)});s.push(f)}else s.push(l.data());t!=null&&(c.group=t),n.push(c)}const o=await Promise.all(s);return{data:Ao(o),specs:n}}function Ch(e,t){const n=new $t(e),s={};let r=0;for(const o of t){const i=Eo(o,(a,l)=>n.slice(r+a,r+l));s[o.name]=rs(o,n.slice(r,r+i)),r+=i}return s}function Eo(e,t){const n=B(e.shape);let s;if("quantization"in e){const r=e.quantization;s=Ut[r.dtype]}else if(e.dtype==="string"){let r=0;for(let o=0;o<n;o++)r+=ht+new Uint32Array(t(r,r+ht))[0];return r}else s=Ut[e.dtype];return n*s}async function Io(e,t){const n=B(e.shape);let s;if("quantization"in e){const r=e.quantization;s=Ut[r.dtype]}else if(e.dtype==="string"){let r=0;for(let o=0;o<n;o++)r+=ht+new Uint32Array(await t(r,r+ht))[0];return r}else s=Ut[e.dtype];return n*s}function rs(e,t){const n=e.name,s=e.dtype,r=e.shape,o=B(r);let i,a=0;if("quantization"in e){const l=e.quantization;if(l.dtype==="uint8"||l.dtype==="uint16"){if(!("min"in l&&"scale"in l))throw new Error(`Weight ${e.name} with quantization ${l.dtype} doesn't have corresponding metadata min and scale.`)}else if(l.dtype==="float16"){if(s!=="float32")throw new Error(`Weight ${e.name} is quantized with ${l.dtype} which only supports weights of type float32 not ${s}.`)}else throw new Error(`Weight ${e.name} has unknown quantization dtype ${l.dtype}. Supported quantization dtypes are: 'uint8', 'uint16', and 'float16'.`);const c=Ut[l.dtype],f=l.dtype==="uint8"?new Uint8Array(t):new Uint16Array(t);if(s==="float32")if(l.dtype==="uint8"||l.dtype==="uint16"){i=new Float32Array(f.length);for(let u=0;u<f.length;u++){const h=f[u];i[u]=h*l.scale+l.min}}else if(l.dtype==="float16")i=xo()(f);else throw new Error(`Unsupported quantization type ${l.dtype} for weight type float32.`);else if(s==="int32"){if(l.dtype!=="uint8"&&l.dtype!=="uint16")throw new Error(`Unsupported quantization type ${l.dtype} for weight type int32.`);i=new Int32Array(f.length);for(let u=0;u<f.length;u++){const h=f[u];i[u]=Math.round(h*l.scale+l.min)}}else throw new Error(`Unsupported dtype in weight '${n}': ${s}`);a+=o*c}else if(s==="string"){const l=B(e.shape);i=[];for(let c=0;c<l;c++){const f=new Uint32Array(t.slice(a,a+ht))[0];a+=ht;const u=new Uint8Array(t.slice(a,a+f));i.push(u),a+=f}}else{const l=Ut[s];if(s==="float32")i=new Float32Array(t);else if(s==="int32")i=new Int32Array(t);else if(s==="bool")i=new Uint8Array(t);else if(s==="complex64"){i=new Float32Array(t);const c=new Float32Array(i.length/2),f=new Float32Array(i.length/2);for(let g=0;g<c.length;g++)c[g]=i[g*2],f[g]=i[g*2+1];const u=ke(c,r,"float32"),h=ke(f,r,"float32"),d=po(u,h);return u.dispose(),h.dispose(),d}else throw new Error(`Unsupported dtype in weight '${n}': ${s}`);a+=o*l}return ke(i,r,s)}async function bn(e,t,n){let s=new Uint8Array(t);for(;s.byteLength<n;){const{done:r,value:o}=await e.read();if(r&&o==null){const a=n-s.byteLength;throw new Error(`Reader is done but ${a} bytes are still expected`)}const i=new Uint8Array(s.length+o.byteLength);i.set(s,0),i.set(new Uint8Array(o),s.length),s=i}return s.buffer}async function Ph(e,t){const n={},s=e.getReader();let r=new ArrayBuffer(0);for(const o of t){const i=await Io(o,async(c,f)=>(r=await bn(s,r,f),r.slice(c,f)));r=await bn(s,r,i);const a=r.slice(0,i);r=r.slice(i);const l=rs(o,a);if(n[o.name]=l,bo()==="webgpu"){const c=So();"uploadToGPU"in c&&B(l.shape)>=A().get("WEBGPU_CPU_HANDOFF_SIZE_THRESHOLD")&&c.uploadToGPU(l.dataId)}}return n}function Ao(e){if(e===null)throw new Error(`Invalid input value: ${JSON.stringify(e)}`);let t=0;const n=[];e.forEach(o=>{if(t+=o.byteLength,n.push(o.byteLength===o.buffer.byteLength?o:new o.constructor(o)),!(o instanceof Float32Array||o instanceof Int32Array||o instanceof Uint8Array))throw new Error(`Unsupported TypedArray subtype: ${o.constructor.name}`)});const s=new Uint8Array(t);let r=0;return n.forEach(o=>{s.set(new Uint8Array(o.buffer),r),r+=o.byteLength}),s.buffer}const Xe=typeof Buffer<"u"&&(typeof Blob>"u"||typeof atob>"u"||typeof btoa>"u");function Sn(e){return Xe?Buffer.byteLength(e,"utf8"):new Blob([e]).size}function ko(e){if(Xe)return Buffer.from(e).toString("base64");const t=new Uint8Array(e);let n="";for(let s=0,r=t.length;s<r;s++)n+=String.fromCharCode(t[s]);return btoa(n)}function To(e){if(Xe){const s=Buffer.from(e,"base64");return s.buffer.slice(s.byteOffset,s.byteOffset+s.byteLength)}const t=atob(e),n=new Uint8Array(t.length);for(let s=0;s<t.length;++s)n.set([t.charCodeAt(s)],s);return n.buffer}function Uh(e){return $t.join(e)}function Gh(e){const t="/";for(e=e.trim();e.endsWith(t);)e=e.slice(0,e.length-1);const n=e.split(t);return n[n.length-1]}function zh(e,t){const n={modelTopology:e.modelTopology,format:e.format,generatedBy:e.generatedBy,convertedBy:e.convertedBy,weightsManifest:t};return e.signature!=null&&(n.signature=e.signature),e.userDefinedMetadata!=null&&(n.userDefinedMetadata=e.userDefinedMetadata),e.modelInitializer!=null&&(n.modelInitializer=e.modelInitializer),e.initializerSignature!=null&&(n.initializerSignature=e.initializerSignature),e.trainingConfig!=null&&(n.trainingConfig=e.trainingConfig),n}function $o(e,t,n){const s={modelTopology:e.modelTopology,format:e.format,generatedBy:e.generatedBy,convertedBy:e.convertedBy};if(e.trainingConfig!=null&&(s.trainingConfig=e.trainingConfig),e.weightsManifest!=null){if(!t)throw new Error("modelJSON has weightsManifest but weightSpecs is null");if(!n)throw new Error("modelJSON has weightsManifest but weightData is null");s.weightSpecs=t,s.weightData=n}return e.signature!=null&&(s.signature=e.signature),e.userDefinedMetadata!=null&&(s.userDefinedMetadata=e.userDefinedMetadata),e.modelInitializer!=null&&(s.modelInitializer=e.modelInitializer),e.initializerSignature!=null&&(s.initializerSignature=e.initializerSignature),s}async function Wh(e,t){let n,s;return e.weightsManifest!=null&&([n,s]=await t(e.weightsManifest)),$o(e,n,s)}function os(e){if(e.modelTopology instanceof ArrayBuffer)throw new Error("Expected JSON model topology, received ArrayBuffer.");return{dateSaved:new Date,modelTopologyType:"JSON",modelTopologyBytes:e.modelTopology==null?0:Sn(JSON.stringify(e.modelTopology)),weightSpecsBytes:e.weightSpecs==null?0:Sn(JSON.stringify(e.weightSpecs)),weightDataBytes:e.weightData==null?0:new $t(e.weightData).byteLength}}function qh(e){const t=[];for(const n of e)t.push(...n.weights);return t}function Mo(){const e=n=>{let s=n<<13,r=0;for(;!(s&8388608);)r-=8388608,s<<=1;return s&=-8388609,r+=947912704,s|r},t=new Uint32Array(2048);t[0]=0;for(let n=1;n<1024;n++)t[n]=e(n);for(let n=1024;n<2048;n++)t[n]=939524096+(n-1024<<13);return t}function vo(){const e=new Uint32Array(64);e[0]=0,e[31]=1199570944,e[32]=2147483648,e[63]=3347054592;for(let t=1;t<31;t++)e[t]=t<<23;for(let t=33;t<63;t++)e[t]=2147483648+(t-32<<23);return e}function Fo(){const e=new Uint32Array(64);for(let t=0;t<64;t++)e[t]=1024;return e[0]=e[32]=0,e}function xo(){const e=Mo(),t=vo(),n=Fo();return s=>{const r=new ArrayBuffer(4*s.length),o=new Uint32Array(r);for(let i=0;i<s.length;i++){const a=s[i],l=e[n[a>>10]+(a&1023)]+t[a>>10];o[i]=l}return new Float32Array(r)}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class R{constructor(){this.saveRouters=[],this.loadRouters=[]}static getInstance(){return R.instance==null&&(R.instance=new R),R.instance}static registerSaveRouter(t){R.getInstance().saveRouters.push(t)}static registerLoadRouter(t){R.getInstance().loadRouters.push(t)}static getSaveHandlers(t){return R.getHandlers(t,"save")}static getLoadHandlers(t,n){return R.getHandlers(t,"load",n)}static getHandlers(t,n,s){const r=[];return(n==="load"?R.getInstance().loadRouters:R.getInstance().saveRouters).forEach(i=>{const a=i(t,s);a!==null&&r.push(a)}),r}}const Vh=e=>R.registerSaveRouter(e),jh=e=>R.registerLoadRouter(e),Hh=e=>R.getSaveHandlers(e),Kh=(e,t)=>R.getLoadHandlers(e,t);/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Oe="tensorflowjs",Le=1,yt="models_store",lt="model_info_store";function is(){if(!A().getBool("IS_BROWSER"))throw new Error("Failed to obtain IndexedDB factory because the current environmentis not a web browser.");const e=typeof window>"u"?self:window,t=e.indexedDB||e.mozIndexedDB||e.webkitIndexedDB||e.msIndexedDB||e.shimIndexedDB;if(t==null)throw new Error("The current browser does not appear to support IndexedDB.");return t}function Ce(e){const t=e.result;t.createObjectStore(yt,{keyPath:"modelPath"}),t.createObjectStore(lt,{keyPath:"modelPath"})}class St{constructor(t){if(this.indexedDB=is(),t==null||!t)throw new Error("For IndexedDB, modelPath must not be null, undefined or empty.");this.modelPath=t}async save(t){if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserLocalStorage.save() does not support saving model topology in binary formats yet.");return this.databaseAction(this.modelPath,t)}async load(){return this.databaseAction(this.modelPath)}databaseAction(t,n){return new Promise((s,r)=>{const o=this.indexedDB.open(Oe,Le);o.onupgradeneeded=()=>Ce(o),o.onsuccess=()=>{const i=o.result;if(n==null){const a=i.transaction(yt,"readonly"),c=a.objectStore(yt).get(this.modelPath);c.onsuccess=()=>{if(c.result==null)return i.close(),r(new Error(`Cannot find model with path '${this.modelPath}' in IndexedDB.`));s(c.result.modelArtifacts)},c.onerror=f=>(i.close(),r(c.error)),a.oncomplete=()=>i.close()}else{n.weightData=$t.join(n.weightData);const a=os(n),l=i.transaction(lt,"readwrite");let c=l.objectStore(lt),f;try{f=c.put({modelPath:this.modelPath,modelArtifactsInfo:a})}catch(h){return r(h)}let u;f.onsuccess=()=>{u=i.transaction(yt,"readwrite");const h=u.objectStore(yt);let d;try{d=h.put({modelPath:this.modelPath,modelArtifacts:n,modelArtifactsInfo:a})}catch(g){return r(g)}d.onsuccess=()=>s({modelArtifactsInfo:a}),d.onerror=g=>{c=l.objectStore(lt);const m=c.delete(this.modelPath);m.onsuccess=()=>(i.close(),r(d.error)),m.onerror=S=>(i.close(),r(d.error))}},f.onerror=h=>(i.close(),r(f.error)),l.oncomplete=()=>{u==null?i.close():u.oncomplete=()=>i.close()}}},o.onerror=i=>r(o.error)})}}St.URL_SCHEME="indexeddb://";const as=e=>A().getBool("IS_BROWSER")&&!Array.isArray(e)&&e.startsWith(St.URL_SCHEME)?No(e.slice(St.URL_SCHEME.length)):null;R.registerSaveRouter(as);R.registerLoadRouter(as);function No(e){return new St(e)}function Bo(e){return e.startsWith(St.URL_SCHEME)?e.slice(St.URL_SCHEME.length):e}class _o{constructor(){this.indexedDB=is()}async listModels(){return new Promise((t,n)=>{const s=this.indexedDB.open(Oe,Le);s.onupgradeneeded=()=>Ce(s),s.onsuccess=()=>{const r=s.result,o=r.transaction(lt,"readonly"),a=o.objectStore(lt).getAll();a.onsuccess=()=>{const l={};for(const c of a.result)l[c.modelPath]=c.modelArtifactsInfo;t(l)},a.onerror=l=>(r.close(),n(a.error)),o.oncomplete=()=>r.close()},s.onerror=r=>n(s.error)})}async removeModel(t){return t=Bo(t),new Promise((n,s)=>{const r=this.indexedDB.open(Oe,Le);r.onupgradeneeded=()=>Ce(r),r.onsuccess=()=>{const o=r.result,i=o.transaction(lt,"readwrite"),a=i.objectStore(lt),l=a.get(t);let c;l.onsuccess=()=>{if(l.result==null)return o.close(),s(new Error(`Cannot find model with path '${t}' in IndexedDB.`));{const f=a.delete(t),u=()=>{c=o.transaction(yt,"readwrite");const d=c.objectStore(yt).delete(t);d.onsuccess=()=>n(l.result.modelArtifactsInfo),d.onerror=g=>s(l.error)};f.onsuccess=u,f.onerror=h=>(u(),o.close(),s(l.error))}},l.onerror=f=>(o.close(),s(l.error)),i.oncomplete=()=>{c==null?o.close():c.oncomplete=()=>o.close()}},r.onerror=o=>s(r.error)})}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const ot="/",xt="tensorflowjs_models",ls="info",Ro="model_topology",Do="weight_specs",Oo="weight_data",Lo="model_metadata";function cs(e){return{info:[xt,e,ls].join(ot),topology:[xt,e,Ro].join(ot),weightSpecs:[xt,e,Do].join(ot),weightData:[xt,e,Oo].join(ot),modelMetadata:[xt,e,Lo].join(ot)}}function us(e){for(const t of Object.values(e))window.localStorage.removeItem(t)}function Co(e){const t=e.split(ot);if(t.length<3)throw new Error(`Invalid key format: ${e}`);return t.slice(1,t.length-1).join(ot)}function Po(e){return e.startsWith(Et.URL_SCHEME)?e.slice(Et.URL_SCHEME.length):e}class Et{constructor(t){if(!A().getBool("IS_BROWSER")||typeof window>"u"||typeof window.localStorage>"u")throw new Error("The current environment does not support local storage.");if(this.LS=window.localStorage,t==null||!t)throw new Error("For local storage, modelPath must not be null, undefined or empty.");this.modelPath=t,this.keys=cs(this.modelPath)}async save(t){if(t.modelTopology instanceof ArrayBuffer)throw new Error("BrowserLocalStorage.save() does not support saving model topology in binary formats yet.");{const n=JSON.stringify(t.modelTopology),s=JSON.stringify(t.weightSpecs),r=os(t),o=$t.join(t.weightData);try{this.LS.setItem(this.keys.info,JSON.stringify(r)),this.LS.setItem(this.keys.topology,n),this.LS.setItem(this.keys.weightSpecs,s),this.LS.setItem(this.keys.weightData,ko(o));const i={format:t.format,generatedBy:t.generatedBy,convertedBy:t.convertedBy,signature:t.signature!=null?t.signature:void 0,userDefinedMetadata:t.userDefinedMetadata!=null?t.userDefinedMetadata:void 0,modelInitializer:t.modelInitializer!=null?t.modelInitializer:void 0,initializerSignature:t.initializerSignature!=null?t.initializerSignature:void 0,trainingConfig:t.trainingConfig!=null?t.trainingConfig:void 0};return this.LS.setItem(this.keys.modelMetadata,JSON.stringify(i)),{modelArtifactsInfo:r}}catch{throw us(this.keys),new Error(`Failed to save model '${this.modelPath}' to local storage: size quota being exceeded is a possible cause of this failure: modelTopologyBytes=${r.modelTopologyBytes}, weightSpecsBytes=${r.weightSpecsBytes}, weightDataBytes=${r.weightDataBytes}.`)}}}async load(){const t=JSON.parse(this.LS.getItem(this.keys.info));if(t==null)throw new Error(`In local storage, there is no model with name '${this.modelPath}'`);if(t.modelTopologyType!=="JSON")throw new Error("BrowserLocalStorage does not support loading non-JSON model topology yet.");const n={},s=JSON.parse(this.LS.getItem(this.keys.topology));if(s==null)throw new Error(`In local storage, the topology of model '${this.modelPath}' is missing.`);n.modelTopology=s;const r=JSON.parse(this.LS.getItem(this.keys.weightSpecs));if(r==null)throw new Error(`In local storage, the weight specs of model '${this.modelPath}' are missing.`);n.weightSpecs=r;const o=this.LS.getItem(this.keys.modelMetadata);if(o!=null){const a=JSON.parse(o);n.format=a.format,n.generatedBy=a.generatedBy,n.convertedBy=a.convertedBy,a.signature!=null&&(n.signature=a.signature),a.userDefinedMetadata!=null&&(n.userDefinedMetadata=a.userDefinedMetadata),a.modelInitializer!=null&&(n.modelInitializer=a.modelInitializer),a.initializerSignature!=null&&(n.initializerSignature=a.initializerSignature),a.trainingConfig!=null&&(n.trainingConfig=a.trainingConfig)}const i=this.LS.getItem(this.keys.weightData);if(i==null)throw new Error(`In local storage, the binary weight values of model '${this.modelPath}' are missing.`);return n.weightData=To(i),n}}Et.URL_SCHEME="localstorage://";const hs=e=>A().getBool("IS_BROWSER")&&!Array.isArray(e)&&e.startsWith(Et.URL_SCHEME)?Uo(e.slice(Et.URL_SCHEME.length)):null;R.registerSaveRouter(hs);R.registerLoadRouter(hs);function Uo(e){return new Et(e)}class Go{constructor(){b(A().getBool("IS_BROWSER"),()=>"Current environment is not a web browser"),b(typeof window>"u"||typeof window.localStorage<"u",()=>"Current browser does not appear to support localStorage"),this.LS=window.localStorage}async listModels(){const t={},n=xt+ot,s=ot+ls;for(let r=0;r<this.LS.length;++r){const o=this.LS.key(r);if(o.startsWith(n)&&o.endsWith(s)){const i=Co(o);t[i]=JSON.parse(this.LS.getItem(o))}}return t}async removeModel(t){t=Po(t);const n=cs(t);if(this.LS.getItem(n.info)==null)throw new Error(`Cannot find model at path '${t}'`);const s=JSON.parse(this.LS.getItem(n.info));return us(n),s}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const _t="://";class L{constructor(){this.managers={}}static getInstance(){return L.instance==null&&(L.instance=new L),L.instance}static registerManager(t,n){b(t!=null,()=>"scheme must not be undefined or null."),t.endsWith(_t)&&(t=t.slice(0,t.indexOf(_t))),b(t.length>0,()=>"scheme must not be an empty string.");const s=L.getInstance();b(s.managers[t]==null,()=>`A model store manager is already registered for scheme '${t}'.`),s.managers[t]=n}static getManager(t){const n=L.getInstance().managers[t];if(n==null)throw new Error(`Cannot find model manager for scheme '${t}'`);return n}static getSchemes(){return Object.keys(L.getInstance().managers)}}function se(e){if(e.indexOf(_t)===-1)throw new Error(`The url string provided does not contain a scheme. Supported schemes are: ${L.getSchemes().join(",")}`);return{scheme:e.split(_t)[0],path:e.split(_t)[1]}}async function fs(e,t,n=!1){b(e!==t,()=>`Old path and new path are the same: '${e}'`);const s=R.getLoadHandlers(e);b(s.length>0,()=>`Copying failed because no load handler is found for source URL ${e}.`),b(s.length<2,()=>`Copying failed because more than one (${s.length}) load handlers for source URL ${e}.`);const r=s[0],o=R.getSaveHandlers(t);b(o.length>0,()=>`Copying failed because no save handler is found for destination URL ${t}.`),b(o.length<2,()=>`Copying failed because more than one (${s.length}) save handlers for destination URL ${t}.`);const i=o[0],a=se(e).scheme,l=se(e).path,c=a===se(e).scheme,f=await r.load();n&&c&&await L.getManager(a).removeModel(l);const u=await i.save(f);return n&&!c&&await L.getManager(a).removeModel(l),u.modelArtifactsInfo}async function Zh(){const e=L.getSchemes(),t={};for(const n of e){const s=await L.getManager(n).listModels();for(const r in s){const o=n+_t+r;t[o]=s[r]}}return t}async function Xh(e){const t=se(e);return L.getManager(t.scheme).removeModel(t.path)}async function Yh(e,t){return fs(e,t,!1)}async function Jh(e,t){return fs(e,t,!0)}/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class zo{constructor(){this.messageName="setTimeoutCustom",this.functionRefs=[],this.handledMessageCount=0,this.hasEventListener=!1}fetch(t,n){return fetch(t,n)}now(){return performance.now()}encode(t,n){if(n!=="utf-8"&&n!=="utf8")throw new Error(`Browser's encoder only supports utf-8, but got ${n}`);return this.textEncoder==null&&(this.textEncoder=new TextEncoder),this.textEncoder.encode(t)}decode(t,n){return new TextDecoder(n).decode(t)}setTimeoutCustom(t,n){if(typeof window>"u"||!A().getBool("USE_SETTIMEOUTCUSTOM")){setTimeout(t,n);return}this.functionRefs.push(t),setTimeout(()=>{window.postMessage({name:this.messageName,index:this.functionRefs.length-1},"*")},n),this.hasEventListener||(this.hasEventListener=!0,window.addEventListener("message",s=>{if(s.source===window&&s.data.name===this.messageName){s.stopPropagation();const r=this.functionRefs[s.data.index];r(),this.handledMessageCount++,this.handledMessageCount===this.functionRefs.length&&(this.functionRefs=[],this.handledMessageCount=0)}},!0))}isTypedArray(t){return Cn(t)}}if(A().get("IS_BROWSER")){A().setPlatform("browser",new zo);try{L.registerManager(Et.URL_SCHEME,new Go)}catch{}try{L.registerManager(St.URL_SCHEME,new _o)}catch{}}/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Wo={importFetch:()=>require("node-fetch")};let Te;class qo{constructor(){this.util=require("util"),this.textEncoder=new this.util.TextEncoder}fetch(t,n){return A().global.fetch!=null?A().global.fetch(t,n):(Te==null&&(Te=Wo.importFetch()),Te(t,n))}now(){const t=process.hrtime();return t[0]*1e3+t[1]/1e6}encode(t,n){if(n!=="utf-8"&&n!=="utf8")throw new Error(`Node built-in encoder only supports utf-8, but got ${n}`);return this.textEncoder.encode(t)}decode(t,n){return t.length===0?"":new this.util.TextDecoder(n).decode(t)}isTypedArray(t){return this.util.types.isFloat32Array(t)||this.util.types.isInt32Array(t)||this.util.types.isUint8Array(t)||this.util.types.isUint8ClampedArray(t)}}A().get("IS_NODE")&&!A().get("IS_BROWSER")&&A().setPlatform("node",new qo);/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Pe(e,t="float32",n){return t=t||"float32",ge(e),new xe(e,t,n)}/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Vo(e,t){const n=T(e,"x","cast");if(!Mn(t))throw new Error(`Failed to cast to unknown dtype ${t}`);if(t==="string"&&n.dtype!=="string"||t!=="string"&&n.dtype==="string")throw new Error("Only strings can be casted to strings");const s={x:n},r={dtype:t};return w.runKernel(On,s,r)}const he=_({cast_:Vo});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function jo(e){const n={x:T(e,"x","clone","string_or_numeric")};return w.runKernel(Ln,n)}const Ho=_({clone_:jo});/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Ko(e,t=!1){e.toString(t)}/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */Qn();const Zo={buffer:Pe,cast:he,clone:Ho,print:Ko};no(Zo);/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Xo(e,t){let n=T(e,"a","add"),s=T(t,"b","add");[n,s]=ft(n,s);const r={a:n,b:s};return w.runKernel(Dn,r)}const $=_({add_:Xo});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Yo(e,t){let n=T(e,"a","floorDiv"),s=T(t,"b","floorDiv");[n,s]=ft(n,s);const r={a:n,b:s};return w.runKernel(Er,r)}const Jo=_({floorDiv_:Yo});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Qo(e,t){let n=T(e,"a","div"),s=T(t,"b","div");if([n,s]=ft(n,s),n.dtype==="int32"&&s.dtype==="int32")return Jo(n,s);const r={a:n,b:s},o={};return w.runKernel(wr,r,o)}const st=_({div_:Qo});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ti(e,t){let n=T(e,"a","mul"),s=T(t,"b","mul");[n,s]=ft(n,s);const r={a:n,b:s};return w.runKernel(kr,r)}const k=_({mul_:ti});/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ei(e){const t=T(e,"x","abs");if(t.dtype==="complex64"){const n={x:t};return w.runKernel(yr,n)}else{const n={x:t};return w.runKernel(mr,n)}}const ni=_({abs_:ei});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function si(e,t,n,s,r="NHWC",o){const i=e[3],a=[...t,i],l=gs(r);return Ye(e,a,n,o,s,null,null,l)}function ri(e,t,n,s,r,o,i="channelsLast"){const[a,l]=Xt(t);let c;if(i==="channelsLast")c=[a,l,e[3],e[3]];else if(i==="channelsFirst")c=[a,l,e[1],e[1]];else throw new Error(`Unknown dataFormat ${i}`);return Ye(e,c,n,s,r,o,!1,i)}function oi(e,t,n,s,r,o,i="NDHWC"){const[a,l,c]=Ue(t);let f,u;if(i==="NDHWC")u="channelsLast",f=[a,l,c,e[4],e[4]];else if(i==="NCDHW")u="channelsFirst",f=[a,l,c,e[1],e[1]];else throw new Error(`Unknown dataFormat ${i}`);return ds(e,f,n,s,r,!1,u,o)}function Ye(e,t,n,s,r,o,i=!1,a="channelsLast"){let[l,c,f,u]=[-1,-1,-1,-1];if(a==="channelsLast")[l,c,f,u]=e;else if(a==="channelsFirst")[l,u,c,f]=e;else throw new Error(`Unknown dataFormat ${a}`);const[h,d,,g]=t,[m,S]=Xt(n),[E,I]=Xt(s),y=Rt(h,E),v=Rt(d,I),{padInfo:N,outHeight:H,outWidth:Y}=li(r,c,f,m,S,y,v,o,a),tt=i?g*u:g;let P;return a==="channelsFirst"?P=[l,tt,H,Y]:a==="channelsLast"&&(P=[l,H,Y,tt]),{batchSize:l,dataFormat:a,inHeight:c,inWidth:f,inChannels:u,outHeight:H,outWidth:Y,outChannels:tt,padInfo:N,strideHeight:m,strideWidth:S,filterHeight:h,filterWidth:d,effectiveFilterHeight:y,effectiveFilterWidth:v,dilationHeight:E,dilationWidth:I,inShape:e,outShape:P,filterShape:t}}function ds(e,t,n,s,r,o=!1,i="channelsLast",a){let[l,c,f,u,h]=[-1,-1,-1,-1,-1];if(i==="channelsLast")[l,c,f,u,h]=e;else if(i==="channelsFirst")[l,h,c,f,u]=e;else throw new Error(`Unknown dataFormat ${i}`);const[d,g,m,,S]=t,[E,I,y]=Ue(n),[v,N,H]=Ue(s),Y=Rt(d,v),tt=Rt(g,N),P=Rt(m,H),{padInfo:vt,outDepth:et,outHeight:dt,outWidth:we}=ci(r,c,f,u,E,I,y,Y,tt,P,a),be=o?S*h:S;let Se;return i==="channelsFirst"?Se=[l,be,et,dt,we]:i==="channelsLast"&&(Se=[l,et,dt,we,be]),{batchSize:l,dataFormat:i,inDepth:c,inHeight:f,inWidth:u,inChannels:h,outDepth:et,outHeight:dt,outWidth:we,outChannels:be,padInfo:vt,strideDepth:E,strideHeight:I,strideWidth:y,filterDepth:d,filterHeight:g,filterWidth:m,effectiveFilterDepth:Y,effectiveFilterHeight:tt,effectiveFilterWidth:P,dilationDepth:v,dilationHeight:N,dilationWidth:H,inShape:e,outShape:Se,filterShape:t}}function ii(e,t,n,s,r){s==null&&(s=Je(e,t,n));const o=e[0],i=e[1],a=Yt((o-t+2*s)/n+1,r),l=Yt((i-t+2*s)/n+1,r);return[a,l]}function ai(e,t,n,s,r,o){r==null&&(r=Je(e,t[0],s[0]));const i=[0,0,0,n];for(let a=0;a<3;a++)e[a]+2*r>=t[a]&&(i[a]=Yt((e[a]-t[a]+2*r)/s[a]+1,o));return i}function Je(e,t,n,s=1){const r=Rt(t,s);return Math.floor((e[0]*(n-1)-n+r)/2)}function Xt(e){return typeof e=="number"?[e,e,e]:e.length===2?[e[0],e[1],1]:e}function Ue(e){return typeof e=="number"?[e,e,e]:e}function Rt(e,t){return t<=1?e:e+(e-1)*(t-1)}function li(e,t,n,s,r,o,i,a,l){let c,f,u;if(typeof e=="number"){c={top:e,bottom:e,left:e,right:e,type:e===0?"VALID":"NUMBER"};const d=ii([t,n],o,s,e,a);f=d[0],u=d[1]}else if(e==="same"){f=Math.ceil(t/s),u=Math.ceil(n/r);const h=Math.max(0,(f-1)*s+o-t),d=Math.max(0,(u-1)*r+i-n),g=Math.floor(h/2),m=h-g,S=Math.floor(d/2),E=d-S;c={top:g,bottom:m,left:S,right:E,type:"SAME"}}else if(e==="valid")c={top:0,bottom:0,left:0,right:0,type:"VALID"},f=Math.ceil((t-o+1)/s),u=Math.ceil((n-i+1)/r);else if(typeof e=="object"){const h=l==="channelsLast"?e[1][0]:e[2][0],d=l==="channelsLast"?e[1][1]:e[2][1],g=l==="channelsLast"?e[2][0]:e[3][0],m=l==="channelsLast"?e[2][1]:e[3][1];c={top:h,bottom:d,left:g,right:m,type:h===0&&d===0&&g===0&&m===0?"VALID":"EXPLICIT"},f=Yt((t-o+h+d)/s+1,a),u=Yt((n-i+g+m)/r+1,a)}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:c,outHeight:f,outWidth:u}}function ci(e,t,n,s,r,o,i,a,l,c,f){let u,h,d,g;if(e==="valid"&&(e=0),typeof e=="number"){u={top:e,bottom:e,left:e,right:e,front:e,back:e,type:e===0?"VALID":"NUMBER"};const S=ai([t,n,s,1],[a,l,c],1,[r,o,i],e,f);h=S[0],d=S[1],g=S[2]}else if(e==="same"){h=Math.ceil(t/r),d=Math.ceil(n/o),g=Math.ceil(s/i);const m=(h-1)*r+a-t,S=(d-1)*o+l-n,E=(g-1)*i+c-s,I=Math.floor(m/2),y=m-I,v=Math.floor(S/2),N=S-v,H=Math.floor(E/2),Y=E-H;u={top:v,bottom:N,left:H,right:Y,front:I,back:y,type:"SAME"}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:u,outDepth:h,outHeight:d,outWidth:g}}function Yt(e,t){if(!t)return Math.trunc(e);switch(t){case"round":return Math.round(e);case"ceil":return Math.ceil(e);case"floor":return Math.floor(e);default:throw new Error(`Unknown roundingMode ${t}`)}}function Ge(e){const[t,n,s]=Xt(e);return t===1&&n===1&&s===1}function ui(e,t){return Ge(e)||Ge(t)}function hi(e){return Xt(e).every(t=>t>0)}function gs(e){if(e==="NHWC")return"channelsLast";if(e==="NCHW")return"channelsFirst";throw new Error(`Unknown dataFormat ${e}`)}function fi(e,t,n){if(n!=null){if(typeof t=="string")throw Error(`Error in ${e}: pad must be an integer when using dimRoundingMode ${n} but got pad ${t}.`);if(typeof t=="number")b(oe(t),()=>`Error in ${e}: pad must be an integer when using dimRoundingMode ${n} but got pad ${t}.`);else if(typeof t=="object")t.forEach(s=>{s.forEach(r=>{b(oe(r),()=>`Error in ${e}: pad must be an integer when using dimRoundingMode ${n} but got pad ${r}.`)})});else throw Error(`Error in ${e}: Unknown padding parameter: ${t}`)}}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function di(e,t){const s={x:T(e,"x","reshape","string_or_numeric")},r={shape:t};return w.runKernel(vr,s,r)}const gi=_({reshape_:di});/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function mi(e){const n={x:T(e,"x","sigmoid","float32")};return w.runKernel(Nr,n)}const pi=_({sigmoid_:mi});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function yi(e,t,n){ge(e),n=n||Qt(t);const s={shape:e,value:t,dtype:n};return w.runKernel(Sr,{},s)}/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ms(e,t){const n=e.length,s=[];for(let r=0;r<n;r++){const o=n-1-r,i=e[o]||1;(t[t.length-1-r]||1)>1&&i===1&&s.unshift(o)}return s}function Qe(e,t){const n=[];for(let s=0;s<t.length;s++){const r=e[e.length-s-1],o=t.length-s-1,i=t[o];(r==null||r===1&&i>1)&&n.unshift(o)}return n}function tn(e,t){const n=Math.max(e.length,t.length),s=new Array(n);for(let r=0;r<n;r++){let o=e[e.length-r-1];o==null&&(o=1);let i=t[t.length-r-1];if(i==null&&(i=1),o===1)s[n-r-1]=i;else if(i===1)s[n-r-1]=o;else if(o!==i){const a=`Operands could not be broadcast together with shapes ${e} and ${t}.`;throw Error(a)}else s[n-r-1]=o}return s}const Qh=Object.freeze(Object.defineProperty({__proto__:null,assertAndGetBroadcastShape:tn,getBroadcastDims:ms,getReductionAxes:Qe},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function wi(e){const n={x:T(e,"x","zerosLike")};return w.runKernel(Dr,n)}const rt=_({zerosLike_:wi});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function bi(e){const n={x:T(e,"x","elu","float32")};return w.runKernel(br,n)}const Si=_({elu_:bi});/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function en(e,t){for(let n=0;n<e.length;++n)if(e[e.length-n-1]!==t-1-n)return!1;return!0}function ps(e,t,n){const s=e.length+t.length,r=[];let o=0,i=0;for(let a=0;a<s;a++)n.indexOf(a)===-1?r.push(e[o++]):r.push(t[i++]);return r}function Ei(e,t){const n=[],s=e.length;for(let o=0;o<s;o++)t.indexOf(o)===-1&&n.push(e[o]);const r=t.map(o=>e[o]);return[n,r]}function Ii(e,t){const n=t.map(s=>1);return ps(e,n,t)}function Ai(e,t,n){b(en(t,n),()=>`${e} supports only inner-most axes for now. Got axes ${t} and rank-${n} input.`)}function ki(e,t){if(en(e,t))return null;const n=[];for(let s=0;s<t;++s)e.indexOf(s)===-1&&n.push(s);return e.forEach(s=>n.push(s)),n}function Ti(e){return e.map((t,n)=>[n,t]).sort((t,n)=>t[1]-n[1]).map(t=>t[0])}function $i(e,t){const n=[];for(let s=t-e;s<t;++s)n.push(s);return n}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Mi(e,t){let n=T(e,"base","pow"),s=T(t,"exp","pow");[n,s]=ft(n,s);const r={a:n,b:s};return w.runKernel(Tr,r)}const En=_({pow_:Mi});/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function It(e,t){if((j(e)&&t!=="string"||Array.isArray(e))&&t!=="complex64")throw new Error("Error creating a new Scalar: value must be a primitive (number|boolean|string)");if(t==="string"&&j(e)&&!(e instanceof Uint8Array))throw new Error("When making a scalar from encoded string, the value must be `Uint8Array`.");return ss(e,[],[],t)}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function vi(e){const n={x:T(e,"x","sqrt","float32")};return w.runKernel(Br,n)}const Gt=_({sqrt_:vi});/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Fi(e){const t=T(e,"x","square"),n={};return w.runKernel("Square",{x:t},n)}const bt=_({square_:Fi});/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function xi(e,t=null,n=!1){let s=T(e,"x","sum");s.dtype==="bool"&&(s=he(s,"int32"));const r={x:s},o={axis:t,keepDims:n};return w.runKernel(_r,r,o)}const Ni=_({sum_:xi});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Bi(e,t=.2){const s={x:T(e,"x","leakyRelu")},r={alpha:t};return w.runKernel(Ir,s,r)}const _i=_({leakyRelu_:Bi});/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function tf(e){return b(ut(e),()=>"The f passed in grad(f) must be a function"),(t,n)=>{const s=T(t,"x","tf.grad","string_or_numeric"),r=n!=null?T(n,"dy","tf.grad"):null;return w.tidy(()=>{const{value:o,grads:i}=w.gradients(()=>e(s),[s],r);return r!=null&&Jt(o.shape,r.shape,"The shape of dy passed in grad(f)(x, dy) must match the shape returned by f(x)"),ye(i),i[0]})}}function ef(e){return b(ut(e),()=>"The f passed in grads(f) must be a function"),(t,n)=>{b(Array.isArray(t),()=>"The args passed in grads(f)(args) must be an array of `Tensor`s or `TensorLike`s");const s=fo(t,"args","tf.grads","string_or_numeric"),r=n!=null?T(n,"dy","tf.grads"):null;return w.tidy(()=>{const{value:o,grads:i}=w.gradients(()=>e(...s),s,r);return r!=null&&Jt(o.shape,r.shape,"The shape of dy passed in grads(f)([x1,...], dy) must match the shape returned by f([x1,...])"),ye(i),i})}}function nf(e){return b(ut(e),()=>"The f passed in valueAndGrad(f) must be a function"),(t,n)=>{b(t instanceof U,()=>"The x passed in valueAndGrad(f)(x) must be a tensor"),b(n==null||n instanceof U,()=>"The dy passed in valueAndGrad(f)(x, dy) must be a tensor");const{grads:s,value:r}=w.gradients(()=>e(t),[t],n);return ye(s),{grad:s[0],value:r}}}function sf(e){return b(ut(e),()=>"The f passed in valueAndGrads(f) must be a function"),(t,n)=>{b(Array.isArray(t)&&t.every(r=>r instanceof U),()=>"The args passed in valueAndGrads(f)(args) must be array of tensors"),b(n==null||n instanceof U,()=>"The dy passed in valueAndGrads(f)(args, dy) must be a tensor");const s=w.gradients(()=>e(...t),t,n);return n!=null&&Jt(s.value.shape,n.shape,"The shape of dy passed in valueAndGrads(f)([x1,...], dy) must match the shape returned by f([x1,...])"),ye(s.grads),s}}function Ri(e,t){b(ut(e),()=>"The f passed in variableGrads(f) must be a function"),b(t==null||Array.isArray(t)&&t.every(c=>c instanceof ue),()=>"The varList passed in variableGrads(f, varList) must be an array of variables");const n=t!=null;if(!n){t=[];for(const c in w.registeredVariables)t.push(w.registeredVariables[c])}const s=n?t.filter(c=>!c.trainable):null,r=t.length;t=t.filter(c=>c.trainable),b(t.length>0,()=>`variableGrads() expects at least one of the input variables to be trainable, but none of the ${r} variables is trainable.`);const o=!0,{value:i,grads:a}=w.gradients(e,t,null,o);b(a.some(c=>c!=null),()=>"Cannot find a connection between any variable and the result of the loss function y=f(x). Please make sure the operations that use variables are inside the function f passed to minimize()."),b(i.rank===0,()=>`The f passed in variableGrads(f) must return a scalar, but it returned a rank-${i.rank} tensor`);const l={};return t.forEach((c,f)=>{a[f]!=null&&(l[c.name]=a[f])}),s!=null&&s.forEach(c=>l[c.name]=null),{value:i,grads:l}}function rf(e){return w.customGrad(e)}function ye(e){if(e.filter(n=>n==null).length>0)throw new Error(`Cannot compute gradient of y=f(x) with respect to x. Make sure that
    the f you passed encloses all operations that lead from x to y.`)}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Di(e,t){let n=T(e,"a","sub"),s=T(t,"b","sub");[n,s]=ft(n,s);const r={a:n,b:s};return w.runKernel(Rr,r)}const Dt=_({sub_:Di});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Oi(e,t){let n=T(e,"a","maximum"),s=T(t,"b","maximum");[n,s]=ft(n,s),n.dtype==="bool"&&(n=he(n,"int32"),s=he(s,"int32")),tn(n.shape,s.shape);const r={a:n,b:s};return w.runKernel(Ar,r)}const Li=_({maximum_:Oi});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Ci(e,t){const n=T(e,"x","prelu"),s=T(t,"alpha","prelu"),r={x:n,alpha:s};return w.runKernel($r,r)}const Pi=_({prelu_:Ci}),of=Cs(Os);/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Ui(e){const n={x:T(e,"x","relu")};return w.runKernel(Mr,n)}const Gi=_({relu_:Ui});/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function zi(e){const n={x:T(e,"x","relu6")};return w.runKernel(Fr,n)}const Wi=_({relu6_:zi});/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function qi(e,t=0){const s={x:T(e,"x","step")},r={alpha:t};return w.runKernel(Or,s,r)}const Vi=_({step_:qi});function nn(e,t,n){const s=t.rank>1?t.shape[t.rank-1]:1,r=t.rank>1?t.rank-1:1,o=`Must have updates.shape = indices.shape[:batchDim] + shape[sliceDim:], got updates.shape: ${n.shape}, indices.shape: ${t.shape}, shape: ${e}, sliceDim: ${s}, and batchDim: ${r}.`;if(n.rank<r)throw new Error(o+` update.rank < ${r}. `);if(e.length<s+(n.rank-r))throw new Error(o+` Output shape length < ${s+(n.rank-r)}`);if(n.rank!==r+e.length-s)throw new Error(o+` update.rank != ${r+e.length-s}`);for(let i=0;i<r;++i)if(n.shape[i]!==t.shape[i])throw new Error(o+` updates.shape[${i}] (${n.shape[i]}) != indices.shape[${i}] (${t.shape[i]}).`);for(let i=0;i<n.rank-r;++i)if(n.shape[i+r]!==e[i+s])throw new Error(o+` updates.shape[${i+r}] (${n.shape[i+r]}) != shape[${i+r}] (${e[i+r]})`)}function ys(e,t,n){if(t.rank<1)throw new Error(`tf.scatterND() expects the indices to be rank 1 or higher, but the rank was ${t.rank}.`);if(e.rank<1)throw new Error(`tf.scatterND() expects the updates to be rank 1 or higher, but the rank was ${e.rank}.`);if(t.dtype!=="int32")throw new Error(`The dtype of 'indices' should be int32, but got dtype: ${t.dtype}`);if(n.length<1)throw new Error(`Output rank must be greater or equal to 1, but got shape: ${n}`);if(n.length===0){if(t.size===0)throw new Error(`Indices specified for empty output. indices shape: ${t.shape}`);if(e.size===0)throw new Error(`Updates specified for empty output. updates shape: ${e.shape}`)}nn(n,t,e)}function ws(e,t,n){const s=t.shape.length,r=s>1?t.shape[s-1]:1,o=n.length;let i=1;for(let u=r;u<o;++u)i*=n[u];const a=r<1?1:r,l=B(t.shape)/a,c=[...kt(n.slice(0,r)),1],f=B(n);return{sliceRank:r,numUpdates:l,sliceSize:i,strides:c,outputSize:f}}const af=Object.freeze(Object.defineProperty({__proto__:null,calculateShapes:ws,validateInput:ys,validateUpdateShape:nn},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ji(e,t,n){if(n==null||n==="linear")return e;if(n==="relu")return k(e,Vi(t));throw new Error(`Cannot compute gradient for fused activation ${n}.`)}function Hi(e,t){let n=t;const s=Qe(e.shape,t.shape);return s.length>0&&(n=Ni(n,s)),gi(n,e.shape)}function Ki(e,t,n,s){if(t==="linear")return e;if(t==="relu")return Gi(e);if(t==="elu")return Si(e);if(t==="relu6")return Wi(e);if(t==="prelu")return Pi(e,n);if(t==="leakyrelu")return _i(e,s);if(t==="sigmoid")return pi(e);throw new Error(`Unknown fused activation ${t}.`)}const Zi=(e,t)=>!(e>0)||t==="linear";/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const Xi=new Map,ze=new Map;class bs{getClassName(){return this.constructor.className}static fromConfig(t,n){return new t(n)}}class at{constructor(){this.classNameMap={}}static getMap(){return at.instance==null&&(at.instance=new at),at.instance}static register(t){at.getMap().classNameMap[t.className]=[t,t.fromConfig]}}function Ss(e,t,n){b(e.className!=null,()=>"Class being registered does not have the static className property defined."),b(typeof e.className=="string",()=>"className is required to be a string, but got type "+typeof e.className),b(e.className.length>0,()=>"Class being registered has an empty-string as its className, which is disallowed."),typeof t>"u"&&(t="Custom"),typeof n>"u"&&(n=e.className);const s=n,r=t+">"+s;return at.register(e),Xi.set(r,e),ze.set(e,r),e}function Yi(e){return ze.has(e)?ze.get(e):e.className}const lf=Object.freeze(Object.defineProperty({__proto__:null,Serializable:bs,SerializationMap:at,getRegisteredName:Yi,registerClass:Ss},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class Mt extends bs{minimize(t,n=!1,s){const{value:r,grads:o}=this.computeGradients(t,s);if(s!=null){const i=s.map(a=>({name:a.name,tensor:o[a.name]}));this.applyGradients(i)}else this.applyGradients(o);return V(o),n?r:(r.dispose(),null)}get iterations(){return this.iterations_==null&&(this.iterations_=0),this.iterations_}incrementIterations(){this.iterations_=this.iterations+1}computeGradients(t,n){return Ri(t,n)}dispose(){this.iterations_!=null&&V(this.iterations_)}async saveIterations(){return this.iterations_==null&&(this.iterations_=0),{name:"iter",tensor:It(this.iterations_,"int32")}}async getWeights(){throw new Error("getWeights() is not implemented for this optimizer yet.")}async setWeights(t){throw new Error(`setWeights() is not implemented for this optimizer class ${this.getClassName()}`)}async extractIterations(t){return this.iterations_=(await t[0].tensor.data())[0],t.slice(1)}}Object.defineProperty(Mt,Symbol.hasInstance,{value:e=>e.minimize!=null&&e.computeGradients!=null&&e.applyGradients!=null});/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class Ji extends Mt{static get className(){return"Adadelta"}constructor(t,n,s=null){super(),this.learningRate=t,this.rho=n,this.epsilon=s,this.accumulatedGrads=[],this.accumulatedUpdates=[],s==null&&(this.epsilon=w.backend.epsilon())}applyGradients(t){(Array.isArray(t)?t.map(s=>s.name):Object.keys(t)).forEach((s,r)=>{const o=w.registeredVariables[s],i=!1;this.accumulatedGrads[r]==null&&(this.accumulatedGrads[r]={originalName:`${s}/accum_grad`,variable:O(()=>rt(o).variable(i))}),this.accumulatedUpdates[r]==null&&(this.accumulatedUpdates[r]={originalName:`${s}/accum_var`,variable:O(()=>rt(o).variable(i))});const a=Array.isArray(t)?t[r].tensor:t[s];if(a==null)return;const l=this.accumulatedGrads[r].variable,c=this.accumulatedUpdates[r].variable;O(()=>{const f=$(k(l,this.rho),k(bt(a),1-this.rho)),u=k(st(Gt($(c,this.epsilon)),Gt($(l,this.epsilon))),a),h=$(k(c,this.rho),k(bt(u),1-this.rho));l.assign(f),c.assign(h);const d=$(k(u,-this.learningRate),o);o.assign(d)})}),this.incrementIterations()}dispose(){this.accumulatedUpdates!=null&&(V(this.accumulatedGrads.map(t=>t.variable)),V(this.accumulatedUpdates.map(t=>t.variable)))}async getWeights(){const t=[...this.accumulatedGrads,...this.accumulatedUpdates];return[await this.saveIterations()].concat(t.map(n=>({name:n.originalName,tensor:n.variable})))}async setWeights(t){t=await this.extractIterations(t);const n=t.length/2,s=!1;this.accumulatedGrads=t.slice(0,n).map(r=>({originalName:r.name,variable:r.tensor.variable(s)})),this.accumulatedUpdates=t.slice(n,n*2).map(r=>({originalName:r.name,variable:r.tensor.variable(s)}))}getConfig(){return{learningRate:this.learningRate,rho:this.rho,epsilon:this.epsilon}}static fromConfig(t,n){return new t(n.learningRate,n.rho,n.epsilon)}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class Qi extends Mt{static get className(){return"Adagrad"}constructor(t,n=.1){super(),this.learningRate=t,this.initialAccumulatorValue=n,this.accumulatedGrads=[]}applyGradients(t){(Array.isArray(t)?t.map(s=>s.name):Object.keys(t)).forEach((s,r)=>{const o=w.registeredVariables[s];this.accumulatedGrads[r]==null&&(this.accumulatedGrads[r]={originalName:`${s}/accumulator`,variable:O(()=>yi(o.shape,this.initialAccumulatorValue).variable(!1))});const i=Array.isArray(t)?t[r].tensor:t[s];if(i==null)return;const a=this.accumulatedGrads[r].variable;O(()=>{const l=$(a,bt(i));a.assign(l);const c=$(k(st(i,Gt($(l,w.backend.epsilon()))),-this.learningRate),o);o.assign(c)})}),this.incrementIterations()}dispose(){this.accumulatedGrads!=null&&V(this.accumulatedGrads.map(t=>t.variable))}async getWeights(){return[await this.saveIterations()].concat(this.accumulatedGrads.map(t=>({name:t.originalName,tensor:t.variable})))}async setWeights(t){t=await this.extractIterations(t);const n=!1;this.accumulatedGrads=t.map(s=>({originalName:s.name,variable:s.tensor.variable(n)}))}getConfig(){return{learningRate:this.learningRate,initialAccumulatorValue:this.initialAccumulatorValue}}static fromConfig(t,n){return new t(n.learningRate,n.initialAccumulatorValue)}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class ta extends Mt{static get className(){return"Adam"}constructor(t,n,s,r=null){super(),this.learningRate=t,this.beta1=n,this.beta2=s,this.epsilon=r,this.accumulatedFirstMoment=[],this.accumulatedSecondMoment=[],O(()=>{this.accBeta1=It(n).variable(),this.accBeta2=It(s).variable()}),r==null&&(this.epsilon=w.backend.epsilon())}applyGradients(t){const n=Array.isArray(t)?t.map(s=>s.name):Object.keys(t);O(()=>{const s=Dt(1,this.accBeta1),r=Dt(1,this.accBeta2);n.forEach((o,i)=>{const a=w.registeredVariables[o],l=!1;this.accumulatedFirstMoment[i]==null&&(this.accumulatedFirstMoment[i]={originalName:`${o}/m`,variable:O(()=>rt(a).variable(l))}),this.accumulatedSecondMoment[i]==null&&(this.accumulatedSecondMoment[i]={originalName:`${o}/v`,variable:O(()=>rt(a).variable(l))});const c=Array.isArray(t)?t[i].tensor:t[o];if(c==null)return;const f=this.accumulatedFirstMoment[i].variable,u=this.accumulatedSecondMoment[i].variable,h=$(k(f,this.beta1),k(c,1-this.beta1)),d=$(k(u,this.beta2),k(bt(c),1-this.beta2)),g=st(h,s),m=st(d,r);f.assign(h),u.assign(d);const S=$(k(st(g,$(Gt(m),this.epsilon)),-this.learningRate),a);a.assign(S)}),this.accBeta1.assign(k(this.accBeta1,this.beta1)),this.accBeta2.assign(k(this.accBeta2,this.beta2))}),this.incrementIterations()}dispose(){this.accBeta1.dispose(),this.accBeta2.dispose(),this.accumulatedFirstMoment!=null&&V(this.accumulatedFirstMoment.map(t=>t.variable)),this.accumulatedSecondMoment!=null&&V(this.accumulatedSecondMoment.map(t=>t.variable))}async getWeights(){const t=[...this.accumulatedFirstMoment,...this.accumulatedSecondMoment];return[await this.saveIterations()].concat(t.map(n=>({name:n.originalName,tensor:n.variable})))}async setWeights(t){t=await this.extractIterations(t),O(()=>{this.accBeta1.assign(En(this.beta1,this.iterations_+1)),this.accBeta2.assign(En(this.beta2,this.iterations_+1))});const n=t.length/2,s=!1;this.accumulatedFirstMoment=t.slice(0,n).map(r=>({originalName:r.name,variable:r.tensor.variable(s)})),this.accumulatedSecondMoment=t.slice(n,n*2).map(r=>({originalName:r.name,variable:r.tensor.variable(s)}))}getConfig(){return{learningRate:this.learningRate,beta1:this.beta1,beta2:this.beta2,epsilon:this.epsilon}}static fromConfig(t,n){return new t(n.learningRate,n.beta1,n.beta2,n.epsilon)}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class ea extends Mt{static get className(){return"Adamax"}constructor(t,n,s,r=null,o=0){super(),this.learningRate=t,this.beta1=n,this.beta2=s,this.epsilon=r,this.decay=o,this.accumulatedFirstMoment=[],this.accumulatedWeightedInfNorm=[],O(()=>{this.iteration=It(0).variable(),this.accBeta1=It(n).variable()}),r==null&&(this.epsilon=w.backend.epsilon())}applyGradients(t){const n=Array.isArray(t)?t.map(s=>s.name):Object.keys(t);O(()=>{const s=Dt(1,this.accBeta1),r=st(-this.learningRate,$(k(this.iteration,this.decay),1));n.forEach((o,i)=>{const a=w.registeredVariables[o],l=!1;this.accumulatedFirstMoment[i]==null&&(this.accumulatedFirstMoment[i]={originalName:`${o}/m`,variable:rt(a).variable(l)}),this.accumulatedWeightedInfNorm[i]==null&&(this.accumulatedWeightedInfNorm[i]={originalName:`${o}/v`,variable:rt(a).variable(l)});const c=Array.isArray(t)?t[i].tensor:t[o];if(c==null)return;const f=this.accumulatedFirstMoment[i].variable,u=this.accumulatedWeightedInfNorm[i].variable,h=$(k(f,this.beta1),k(c,1-this.beta1)),d=k(u,this.beta2),g=ni(c),m=Li(d,g);f.assign(h),u.assign(m);const S=$(k(st(r,s),st(h,$(m,this.epsilon))),a);a.assign(S)}),this.iteration.assign($(this.iteration,1)),this.accBeta1.assign(k(this.accBeta1,this.beta1))}),this.incrementIterations()}dispose(){this.accBeta1.dispose(),this.iteration.dispose(),this.accumulatedFirstMoment!=null&&V(this.accumulatedFirstMoment.map(t=>t.variable)),this.accumulatedWeightedInfNorm!=null&&V(this.accumulatedWeightedInfNorm.map(t=>t.variable))}async getWeights(){throw new Error("getWeights() is not implemented for Adamax yet.")}async setWeights(t){throw new Error("setWeights() is not implemented for Adamax yet.")}getConfig(){return{learningRate:this.learningRate,beta1:this.beta1,beta2:this.beta2,epsilon:this.epsilon,decay:this.decay}}static fromConfig(t,n){return new t(n.learningRate,n.beta1,n.beta2,n.epsilon,n.decay)}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class Es extends Mt{static get className(){return"SGD"}constructor(t){super(),this.learningRate=t,this.setLearningRate(t)}applyGradients(t){(Array.isArray(t)?t.map(s=>s.name):Object.keys(t)).forEach((s,r)=>{const o=Array.isArray(t)?t[r].tensor:t[s];if(o==null)return;const i=w.registeredVariables[s];O(()=>{const a=$(k(this.c,o),i);i.assign(a)})}),this.incrementIterations()}setLearningRate(t){this.learningRate=t,this.c!=null&&this.c.dispose(),this.c=wo(It(-t))}dispose(){this.c.dispose()}async getWeights(){return[await this.saveIterations()]}async setWeights(t){if(t=await this.extractIterations(t),t.length!==0)throw new Error("SGD optimizer does not have settable weights.")}getConfig(){return{learningRate:this.learningRate}}static fromConfig(t,n){return new t(n.learningRate)}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class na extends Es{static get className(){return"Momentum"}constructor(t,n,s=!1){super(t),this.learningRate=t,this.momentum=n,this.useNesterov=s,this.accumulations=[],this.m=It(this.momentum)}applyGradients(t){(Array.isArray(t)?t.map(s=>s.name):Object.keys(t)).forEach((s,r)=>{const o=w.registeredVariables[s];this.accumulations[r]==null&&(this.accumulations[r]={originalName:`${s}/momentum`,variable:O(()=>rt(o).variable(!1))});const i=this.accumulations[r].variable,a=Array.isArray(t)?t[r].tensor:t[s];a!=null&&O(()=>{let l;const c=$(k(this.m,i),a);this.useNesterov?l=$(k(this.c,$(a,k(c,this.m))),o):l=$(k(this.c,c),o),i.assign(c),o.assign(l)})}),this.incrementIterations()}dispose(){this.m.dispose(),this.accumulations!=null&&V(this.accumulations.map(t=>t.variable))}setMomentum(t){this.momentum=t}async getWeights(){return[await this.saveIterations()].concat(this.accumulations.map(t=>({name:t.originalName,tensor:t.variable})))}async setWeights(t){t=await this.extractIterations(t);const n=!1;this.accumulations=t.map(s=>({originalName:s.name,variable:s.tensor.variable(n)}))}getConfig(){return{learningRate:this.learningRate,momentum:this.momentum,useNesterov:this.useNesterov}}static fromConfig(t,n){return new t(n.learningRate,n.momentum,n.useNesterov)}}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class sa extends Mt{static get className(){return"RMSProp"}constructor(t,n=.9,s=0,r=null,o=!1){if(super(),this.learningRate=t,this.decay=n,this.momentum=s,this.epsilon=r,this.accumulatedMeanSquares=[],this.accumulatedMoments=[],this.accumulatedMeanGrads=[],this.centered=o,r==null&&(this.epsilon=w.backend.epsilon()),t==null)throw new Error("learningRate for RMSPropOptimizer must be defined.")}applyGradients(t){(Array.isArray(t)?t.map(s=>s.name):Object.keys(t)).forEach((s,r)=>{const o=w.registeredVariables[s],i=!1;this.accumulatedMeanSquares[r]==null&&(this.accumulatedMeanSquares[r]={originalName:`${s}/rms`,variable:O(()=>rt(o).variable(i))}),this.accumulatedMoments[r]==null&&(this.accumulatedMoments[r]={originalName:`${s}/momentum`,variable:O(()=>rt(o).variable(i))}),this.accumulatedMeanGrads[r]==null&&this.centered&&(this.accumulatedMeanGrads[r]={originalName:`${s}/mg`,variable:O(()=>rt(o).variable(i))});const a=Array.isArray(t)?t[r].tensor:t[s];if(a==null)return;const l=this.accumulatedMeanSquares[r].variable,c=this.accumulatedMoments[r].variable;O(()=>{const f=$(k(l,this.decay),k(bt(a),1-this.decay));if(this.centered){const u=this.accumulatedMeanGrads[r].variable,h=$(k(u,this.decay),k(a,1-this.decay)),d=st(k(a,this.learningRate),Gt(Dt(f,$(bt(h),this.epsilon)))),g=$(k(c,this.momentum),d);l.assign(f),u.assign(h),c.assign(g);const m=Dt(o,g);o.assign(m)}else{const u=$(k(l,this.decay),k(bt(a),1-this.decay)),h=$(k(c,this.momentum),st(k(a,this.learningRate),Gt($(u,this.epsilon))));l.assign(u),c.assign(h);const d=Dt(o,h);o.assign(d)}})}),this.incrementIterations()}dispose(){this.accumulatedMeanSquares!=null&&V(this.accumulatedMeanSquares.map(t=>t.variable)),this.accumulatedMeanGrads!=null&&this.centered&&V(this.accumulatedMeanGrads.map(t=>t.variable)),this.accumulatedMoments!=null&&V(this.accumulatedMoments.map(t=>t.variable))}async getWeights(){const t=[...this.accumulatedMeanSquares,...this.accumulatedMoments];return this.centered&&t.push(...this.accumulatedMeanGrads),[await this.saveIterations()].concat(t.map(n=>({name:n.originalName,tensor:n.variable})))}async setWeights(t){t=await this.extractIterations(t);const n=this.centered?t.length/3:t.length/2,s=!1;this.accumulatedMeanSquares=t.slice(0,n).map(r=>({originalName:r.name,variable:r.tensor.variable(s)})),this.accumulatedMoments=t.slice(n,n*2).map(r=>({originalName:r.name,variable:r.tensor.variable(s)})),this.centered&&(this.accumulatedMeanGrads=t.slice(n*2,n*3).map(r=>({originalName:r.name,variable:r.tensor.variable(s)})))}getConfig(){return{learningRate:this.learningRate,decay:this.decay,momentum:this.momentum,epsilon:this.epsilon,centered:this.centered}}static fromConfig(t,n){return new t(n.learningRate,n.decay,n.momentum,n.epsilon,n.centered)}}/**
 * @license
 * Copyright 2022 Google LLC.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const ra=[Ji,Qi,ta,ea,na,sa,Es];function oa(){for(const e of ra)Ss(e)}function Is(e,t){const n=e.shape.length,s=t.shape.length;if(n<1)throw new Error(`tf.gatherND() expects the input to be rank 1 or higher, but the rank was ${n}.`);if(s<1)throw new Error(`tf.gatherND() expects the indices to be rank 1 or higher, but the rank was ${s}.`);if(t.dtype!=="int32")throw new Error(`tf.gatherND() expects the indices to be int32 type, but the dtype was ${t.dtype}.`);if(t.shape[s-1]>n)throw new Error(`index innermost dimension length must be <= tensor rank; saw: ${t.shape[s-1]} vs. ${n}`);if(B(e.shape)===0)throw new Error(`Requested more than 0 entries, but input is empty. Input shape: ${e.shape}.`);const r=t.shape,o=r[r.length-1];let i=1;for(let u=0;u<r.length-1;++u)i*=r[u];const a=e.shape,l=r.slice();l.pop();let c=1;for(let u=o;u<n;++u)c*=a[u],l.push(a[u]);const f=[...kt(e.shape).map(u=>u/c),1].slice(0,o);return[l,i,c,f]}const cf=Object.freeze(Object.defineProperty({__proto__:null,prepareAndValidate:Is},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const We=-2,ia=-1;function As(e,t,n){const s=e.shape.length;b(s===t.length,()=>`Error in slice${s}D: Length of begin ${t} must match the rank of the array (${s}).`),b(s===n.length,()=>`Error in slice${s}D: Length of size ${n} must match the rank of the array (${s}).`);for(let r=0;r<s;++r)b(t[r]+n[r]<=e.shape[r],()=>`Error in slice${s}D: begin[${r}] + size[${r}] (${t[r]+n[r]}) would overflow input.shape[${r}] (${e.shape[r]})`)}function aa(e){const t=[];let n=0;for(;e>0;)e&1&&t.push(n),e/=2,n++;return t}function la(e,t,n){const s=[];for(let r=0;r<e.length;r++)s[r]=Math.ceil((t[r]-e[r])/n[r]);return s}function ks(e,t,n,s){const r=[...e];for(let o=r.length;o<s.length;o++)r.push(1);for(let o=0;o<n;o++)o===0?r[t]=1:(r.splice(t,0,1),r.pop());return r}function Ts(e,t,n){return n<=e?n:n-(t-1)}function $s(e,t){const n=[];for(let s=0;s<e;s++)n.push(t+s);return n}function ca(e,t,n,s,r,o,i,a,l){const c=e.length;let f=new Array(c),u=new Array(c),h=new Array(c);if(t.length&&n>0){const d=t[0],g=n+1;f=Ms(i,d,g,s,e),u=vs(a,d,g,r,e),h=ks(o,d,g,e)}else for(let d=0;d<c;d++)f[d]=xs(i,s,o,e,d,l),u[d]=Ns(a,r,o,e,d,l),h[d]=Fs(o,d,l);return{begin:f,end:u,strides:h}}function Ms(e,t,n,s,r){const o=[...r],i=$s(n,t);for(let a=0;a<o.length;a++)if(i.indexOf(a)>-1)o[a]=0;else{const l=Ts(t,n,a);let c=s[l];e&1<<l&&(c=0),o[a]=c}return o}function vs(e,t,n,s,r){const o=[...r],i=$s(n,t);for(let a=0;a<o.length;a++)if(i.indexOf(a)>-1)o[a]=Number.MAX_SAFE_INTEGER;else{const l=Ts(t,n,a);let c=s[l];e&1<<l&&(c=Number.MAX_SAFE_INTEGER),o[a]=c}for(let a=0;a<o.length;a++){const l=r[a];o[a]<0&&(o[a]+=l),o[a]=jt(0,o[a],r[a])}return o}function Fs(e,t,n){let s=e[t];return(n&1<<t||s==null)&&(s=1),s}function xs(e,t,n,s,r,o){let i=t[r];const a=n[r]||1;(e&1<<r||o&1<<r||i==null)&&(a>0?i=Number.MIN_SAFE_INTEGER:i=Number.MAX_SAFE_INTEGER);const l=s[r];return i<0&&(i+=l),i=jt(0,i,l-1),i}function Ns(e,t,n,s,r,o){let i=t[r];const a=n[r]||1;(e&1<<r||o&1<<r||i==null)&&(a>0?i=Number.MAX_SAFE_INTEGER:i=Number.MIN_SAFE_INTEGER);const l=s[r];return i<0&&(i+=l),a>0?i=jt(0,i,l):i=jt(-1,i,l-1),i}function Bs(e,t,n){let s=n.length;for(let r=0;r<n.length;r++)if(n[r]>1){s=r;break}for(let r=s+1;r<n.length;r++)if(t[r]>0||n[r]!==e[r])return!1;return!0}function _s(e,t){let n=e.length>0?e[e.length-1]:1;for(let s=0;s<e.length-1;s++)n+=e[s]*t[s];return n}function Rs(e,t,n){let s;const r=e.shape.length;typeof t=="number"?s=[t,...new Array(r-1).fill(0)]:t.length<r?s=t.concat(new Array(r-t.length).fill(0)):s=t.slice(),s.forEach(i=>{b(i!==-1,()=>"slice() does not support negative begin indexing.")});let o;return n==null?o=new Array(r).fill(-1):typeof n=="number"?o=[n,...new Array(r-1).fill(-1)]:n.length<r?o=n.concat(new Array(r-n.length).fill(-1)):o=n,o=o.map((i,a)=>i>=0?i:(b(i===-1,()=>`Negative size values should be exactly -1 but got ${i} for the slice() size at index ${a}.`),e.shape[a]-s[a])),[s,o]}function ua(e,t,n,s,r,o,i,a,l){let c;if(s==null?(c=new Array(t.length),c.fill(1)):c=s,i!=null&&i&i-1)throw new Error("Multiple ellipses in slice is not allowed.");let f=!1;const u={dims:c.length,numAddAxisAfterEllipsis:0,begin:t.slice(),end:n.slice(),strides:c.slice(),beginMask:r,endMask:o,ellipsisMask:i,newAxisMask:a,shrinkAxisMask:l};for(let y=0;y<u.dims;y++)f&&1<<y&a&&u.numAddAxisAfterEllipsis++,1<<y&i&&(f=!0);f||(u.ellipsisMask|=1<<u.dims,u.dims++);const h={dims:e.length,beginMask:0,endMask:0,beginValid:!1,endValid:!1};ha(u,h);let d=!0,g=!0,m=!0;const S=[],E=[];for(let y=0;y<e.length;++y){if(h.strides[y]===0)throw Error(`strides[${y}] must be non-zero`);const v=!!(h.shrinkAxisMask&1<<y),N=e[y];if(N===-1){S.push(v?1:-1);continue}const H=[h.beginMask&1<<y,h.endMask&1<<y],Y=[h.strides[y]>0?0:-1,h.strides[y]>0?N:N-1];if(v&&h.strides[y]<=0)throw Error("only stride 1 allowed on non-range indexing.");m=m&&h.strides[y]===1;const tt=!!(h.beginMask&1<<y&&h.endMask&1<<y);if(h.beginValid&&h.endValid){if(v){const dt=h.begin[y]<0?N+h.begin[y]:h.begin[y];if(h.begin[y]=dt,h.end[y]=h.begin[y]+1,dt<0||dt>=N)throw Error(`slice index ${h.begin[y]} of dimension ${y} out of bounds.`)}else h.begin[y]=In(h.begin[y],0,h.strides[y],N,H,Y),h.end[y]=In(h.end[y],1,h.strides[y],N,H,Y);const et=h.strides[y]===1&&h.begin[y]===0&&h.end[y]===N;d=d&&et,g=g&&(y===0&&h.strides[y]===1||et)}else d=d&&h.strides[y]===1&&tt,g=g&&(y===0&&h.strides[y]===1||tt);let P,vt=!1;if(h.beginValid&&h.endValid?(P=h.end[y]-h.begin[y],vt=!0):v?(P=1,vt=!0):tt&&N>=0&&(h.strides[y]<0?P=-N:P=N,vt=!0),vt){let et;P===0||P<0!=h.strides[y]<0?et=0:et=Math.trunc(P/h.strides[y])+(P%h.strides[y]!==0?1:0),S.push(et)}else S.push(-1)}for(let y=0;y<h.finalShapeGatherIndices.length;++y){const v=h.finalShapeGatherIndices[y];v>=0?E.push(S[v]):v===We&&E.push(1)}return{finalShapeSparse:E.filter((y,v)=>h.finalShapeGatherIndices[v]!==We),finalShape:E,isIdentity:d,sliceDim0:g,isSimpleSlice:m,begin:h.begin,end:h.end,strides:h.strides}}function ha(e,t){t.beginMask=0,t.endMask=0,t.shrinkAxisMask=0;let n=0;t.beginValid=e.begin!=null,t.endValid=e.end!=null,t.begin=new Array(t.dims),t.end=new Array(t.dims),t.strides=new Array(t.dims),t.finalShapeGatherIndices=[],t.finalShapeGatherIndicesSparse=[],t.inputShapeGatherIndicesSparse=new Array(t.dims);for(let s=0;s<e.dims;s++)if(1<<s&e.ellipsisMask){const r=Math.min(t.dims-(e.dims-s)+1+e.numAddAxisAfterEllipsis,t.dims);for(;n<r;n++)t.begin[n]=0,t.end[n]=0,t.strides[n]=1,t.beginMask|=1<<n,t.endMask|=1<<n,t.finalShapeGatherIndices.push(n),t.finalShapeGatherIndicesSparse.push(-1),t.inputShapeGatherIndicesSparse[n]=s}else if(1<<s&e.newAxisMask)t.finalShapeGatherIndices.push(We),t.finalShapeGatherIndicesSparse.push(-1);else{if(n===t.begin.length)throw Error(`Index out of range using input dim ${n}; input has only ${t.dims} dims, ${t.begin.length}.`);e.begin!=null&&(t.begin[n]=e.begin[s]),e.end!=null&&(t.end[n]=e.end[s]),t.strides[n]=e.strides[s],e.beginMask&1<<s&&(t.beginMask|=1<<n),e.endMask&1<<s&&(t.endMask|=1<<n),e.shrinkAxisMask&1<<s?(t.finalShapeGatherIndices.push(ia),t.finalShapeGatherIndicesSparse.push(-1),t.shrinkAxisMask|=1<<n):(t.finalShapeGatherIndices.push(n),t.finalShapeGatherIndicesSparse.push(s)),t.inputShapeGatherIndicesSparse[n]=s,n++}}function In(e,t,n,s,r,o){if(r[t])return n>0?o[t]:o[t+1&1];{const i=e<0?s+e:e;return i<o[0]?o[0]:i>o[1]?o[1]:i}}const fa=Object.freeze(Object.defineProperty({__proto__:null,assertParamsValid:As,computeFlatOffset:_s,computeOutShape:la,getNormalizedAxes:ca,isSliceContinous:Bs,maskToAxes:aa,parseSliceParams:Rs,sliceInfo:ua,startForAxis:xs,startIndicesWithElidedDims:Ms,stopForAxis:Ns,stopIndicesWithElidedDims:vs,stridesForAxis:Fs,stridesWithElidedDims:ks},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function da(e,t){const n=e[0].length;e.forEach((r,o)=>{b(r.length===n,()=>`Error in concat${n}D: rank of tensors[${o}] must be the same as the rank of the rest (${n})`)}),b(t>=0&&t<n,()=>`Error in concat${n}D: axis must be between 0 and ${n-1}.`);const s=e[0];e.forEach((r,o)=>{for(let i=0;i<n;i++)b(i===t||r[i]===s[i],()=>`Error in concat${n}D: Shape of tensors[${o}] (${r}) does not match the shape of the rest (${s}) along the non-concatenated axis ${o}.`)})}function ga(e,t){const n=e[0].slice();for(let s=1;s<e.length;s++)n[t]+=e[s][t];return n}/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */var nt;(function(e){e[e.FIRST_DIM_SIZE=0]="FIRST_DIM_SIZE",e[e.VALUE_ROWIDS=1]="VALUE_ROWIDS",e[e.ROW_LENGTHS=2]="ROW_LENGTHS",e[e.ROW_SPLITS=3]="ROW_SPLITS",e[e.ROW_LIMITS=4]="ROW_LIMITS",e[e.ROW_STARTS=5]="ROW_STARTS"})(nt||(nt={}));function ma(e,t,n){let s=new Array;if(n==null&&t==null)return s;if(t==null)for(;s.length<e+n.length;)s.push(-1);else s=t.slice();if(n==null)return s;if(e+n.length!==s.length)throw new Error(`rt input.shape and shape=${t} are incompatible: rt input.rank = ${e+n.length}, but shape.rank = ${s.length}`);for(let r=1;r<n.length;++r){const o=n[r],i=s[s.length-n.length+r],a=s[i];if(o>=0)if(a>=0){if(a!==o)throw new Error(`rt input.shape and shape=${t} are incompatible: rt input.shape[${r+e}] = ${o} but shape[${r+e}] = ${a}`)}else s[i]=o}return s}function pa(e){const t={FIRST_DIM_SIZE:nt.FIRST_DIM_SIZE,VALUE_ROWIDS:nt.VALUE_ROWIDS,ROW_LENGTHS:nt.ROW_LENGTHS,ROW_SPLITS:nt.ROW_SPLITS,ROW_LIMITS:nt.ROW_LIMITS,ROW_STARTS:nt.ROW_STARTS},n=[];for(const s of e)if(s in t)n.push(t[s]);else break;return n}function ya(e){return e.length===0?0:e[0]===nt.FIRST_DIM_SIZE?e.length-1:e.length}function wa(e,t){if(e==null||t==null)return;const n=e.length,s=t.length;if(n>=s)throw new Error(`defaultValue.shape=${e} and ragged tensor flatValues.shape=${t}, are incompatible: defaultValue.rank = ${n} must be less than ragged tensor input flatValues.rank = ${s})`);for(let r=0;r<Math.min(n,s-1);++r){const o=e[r],i=t[r+1];if(o>=0&&i>=0&&o!==1&&o!==i)throw new Error(`defaultValue.shape=${e}, and ragged tensor input flatValues.shape=${t} are incompatible: defaultValue.shape[${r-e.length}] = ${o} but ragged tensor input.flatValues.shape[${r-e.length}] = ${i}`)}}/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const sn=30;function ba(e){return e<=sn?e:ae(e,Math.floor(Math.sqrt(e)))}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Sa(e,t,n){const s=n*(typeof e=="number"?e:e[0]),r=t*(typeof e=="number"?e:e[1]);return[s,r]}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Ea(e,t,n,s=!0){let r=[];if(s)r=r.concat(t.slice(0)),r.push(e[0]/n),r=r.concat(e.slice(1));else{r=r.concat(e[0]);const o=t.length;for(let i=0;i<o;++i)r=r.concat([e[i+1]/t[i],t[i]]);r=r.concat(e.slice(o+1))}return r}function Ia(e,t,n=!0){const s=[];if(n){s.push(t);for(let r=t+1;r<e;++r)r<=2*t?(s.push(r),s.push(r-(t+1))):s.push(r)}else{const r=[],o=[];for(let i=1;i<e;++i)i>=t*2+1||i%2===1?o.push(i):r.push(i);s.push(...r),s.push(0),s.push(...o)}return s}function Aa(e,t,n,s=!0){const r=[];s?r.push(e[0]/n):r.push(e[0]*n);for(let o=1;o<e.length;++o)o<=t.length?s?r.push(t[o-1]*e[o]):r.push(e[o]/t[o-1]):r.push(e[o]);return r}function ka(e,t){const n=[0];for(let s=0;s<t;++s)n.push(e[s][0]);return n}function Ta(e,t,n){const s=e.slice(0,1);for(let r=0;r<n;++r)s.push(e[r+1]-t[r][0]-t[r][1]);return s}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const $a=1.7580993408473768,Ma=1.0507009873554805;/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const va=.3275911,Fa=.254829592,xa=-.284496736,Na=1.421413741,Ba=-1.453152027,_a=1.061405429;/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Ra(e,t){if(e.length!==t.length)throw new Error(`Cannot merge real and imag arrays of different lengths. real:${e.length}, imag: ${t.length}.`);const n=new Float32Array(e.length*2);for(let s=0;s<n.length;s+=2)n[s]=e[s/2],n[s+1]=t[s/2];return n}function Da(e){const t=new Float32Array(e.length/2),n=new Float32Array(e.length/2);for(let s=0;s<e.length;s+=2)t[s/2]=e[s],n[s/2]=e[s+1];return{real:t,imag:n}}function Oa(e){const t=Math.ceil(e.length/4),n=new Float32Array(t),s=new Float32Array(t);for(let r=0;r<e.length;r+=4)n[Math.floor(r/4)]=e[r],s[Math.floor(r/4)]=e[r+1];return{real:n,imag:s}}function La(e){const t=Math.floor(e.length/4),n=new Float32Array(t),s=new Float32Array(t);for(let r=2;r<e.length;r+=4)n[Math.floor(r/4)]=e[r],s[Math.floor(r/4)]=e[r+1];return{real:n,imag:s}}function Ca(e,t){const n=e[t*2],s=e[t*2+1];return{real:n,imag:s}}function Pa(e,t,n,s){e[s*2]=t,e[s*2+1]=n}function Ua(e,t){const n=new Float32Array(e/2),s=new Float32Array(e/2);for(let r=0;r<Math.ceil(e/2);r++){const o=(t?2:-2)*Math.PI*(r/e);n[r]=Math.cos(o),s[r]=Math.sin(o)}return{real:n,imag:s}}function Ga(e,t,n){const s=(n?2:-2)*Math.PI*(e/t),r=Math.cos(s),o=Math.sin(s);return{real:r,imag:o}}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const $e="->",za=/->/g,An=",",kn="...";function Wa(e,t){e=e.replace(/\s/g,"");const n=(e.length-e.replace(za,"").length)/$e.length;if(n<1)throw new Error("Equations without an arrow are not supported.");if(n>1)throw new Error(`Equation must contain exactly one arrow ("${$e}").`);const[s,r]=e.split($e);b(s.indexOf(kn)===-1,()=>`The ellipsis notation ("${kn}") is not supported yet.`);const o=s.split(An),i=o.length;if(t!==i)throw new Error(`Expected ${i} input tensors, received ${t}`);if(i>2)throw new Error("Support for more than 2 input tensors is not implemented yet.");const a=[];for(let h=0;h<r.length;++h){const d=r[h];if(!o.some(g=>g.indexOf(d)!==-1))throw new Error(`Output subscripts contain the label ${d} not present in the input subscripts.`);a.indexOf(d)===-1&&a.push(d)}for(let h=0;h<s.length;++h){const d=s[h];a.indexOf(d)===-1&&d!==An&&a.push(d)}const l=new Array(o.length);for(let h=0;h<i;++h){if(new Set(o[h].split("")).size!==o[h].length)throw new Error(`Found duplicate axes in input component ${o[h]}. Support for duplicate axes in input is not implemented yet.`);l[h]=[];for(let d=0;d<o[h].length;++d)l[h].push(a.indexOf(o[h][d]))}const c=a.length,f=r.length,u=[];for(let h=f;h<c;++h)u.push(h);return{allDims:a,summedDims:u,idDims:l}}function qa(e,t){let n=new Array(e);n.fill(-1);for(let r=0;r<t.length;++r)n[t[r]]=r;const s=[];for(let r=0;r<e;++r)n[r]===-1&&s.push(r);return n=n.filter(r=>r!==-1),{permutationIndices:n,expandDims:s}}function Va(e,t,n){const s=new Array(e);for(let r=0;r<n.length;++r){const o=n[r].shape;for(let i=0;i<t[r].length;++i)s[t[r][i]]===void 0?s[t[r][i]]=o[i]:b(s[t[r][i]]===o[i],()=>`Expected dimension ${s[t[r][i]]} at axis ${i} of input shaped ${JSON.stringify(o)}, but got dimension ${o[i]}`)}}function ja(e,t){const n=e,s=[];let r=0;e.length===0&&n.push(-1),r=e.length+1;for(let i=0;i<r;++i)s.push([]);const o=[];for(let i=0;i<n.length;++i){const a=n[i],l=Ka(t,a);for(const c of l)o.indexOf(c)===-1&&(s[i].push(c),o.push(c))}return{path:n,steps:s}}function Ha(e){return e.every((t,n)=>t===n)}function Ka(e,t){const n=[];for(let s=0;s<e.length;++s)(e[s].length===0||e[s].indexOf(t)!==-1||t===-1)&&n.push(s);return n}function Za(e,t,n=0){let s=[];if(typeof t=="number")b(e.shape[n]%t===0,()=>"Number of splits must evenly divide the axis."),s=new Array(t).fill(e.shape[n]/t);else{const r=t.reduce((i,a)=>(a===-1&&(i+=1),i),0);b(r<=1,()=>"There should be only one negative value in split array.");const o=t.indexOf(-1);if(o!==-1){const i=t.reduce((a,l)=>l>0?a+l:a);t[o]=e.shape[n]-i}b(e.shape[n]===t.reduce((i,a)=>i+a),()=>"The sum of sizes must match the size of the axis dimension."),s=t}return s}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Xa(e){return`Received SparseTensor with denseShape[0] = 0 but
  indices.shape[0] = ${e}`}function Ya(e,t){return`indices(${e}, 0) is invalid: ${t} < 0`}function Ja(e,t,n){return`indices(${e}, 0) is invalid: ${t} >= ${n}`}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function Qa(e,t){return`only one output dimension may be -1, not both ${e} and ${t}`}function tl(e,t){return`size ${e} must be non-negative, not ${t}`}function el(){return"reshape cannot infer the missing input size for an empty tensor unless all specified input sizes are non-zero"}function nl(e,t){const n=B(e),s=B(t);return`Input to reshape is a SparseTensor with ${n}
  dense values, but the requested shape requires a multiple of ${s}. inputShape=${e} outputShape= ${t}`}function sl(e,t){const n=B(e),s=B(t);return`Input to reshape is a tensor with ${n} dense values, but the requested shape has ${s}. inputShape=${e} outputShape=${t}`}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function rl(){return"segment ids must be >= 0"}function ol(){return"segment ids are not increasing"}function il(e,t){return`Segment id ${e} out of range [0, ${t}), possibly because segmentIds input is not sorted.`}function al(e,t,n){return`Bad: indices[${e}] == ${t} out of range [0, ${n})`}/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ll(e,t){let n=!1,s;for(e<=sn?(s=e,n=!0):s=ae(e,Math.floor(Math.sqrt(e)));!n;)s>t||s===e?n=!0:s=ae(e,s+1);return s}function cl(e,t,n){const s=[],r=e.length;for(let o=0;o<r;o++)o!==t?s.push(e[o]):s.push(n);return s}function ul(e,t,n,s){const r=t.shape.length,o=e.shape.length;if(s!==0&&(s<-r||s>r))throw new Error(`Expect batchDims in the range of [-${r}, ${r}], but got ${s}`);if(s<0&&(s+=r),s>o)throw new Error(`batchDims (${s}) must be less than rank(x) (
    ${o}).`);if(n<s)throw new Error(`batchDims (${s}) must be less than or equal to axis (${n}).`);for(let u=0;u<s;++u)if(e.shape[u]!==t.shape[u])throw new Error(`x.shape[${u}]: ${e.shape[u]} should be equal to indices.shape[${u}]: ${t.shape[u]}.`);const i=e.shape[n],a=[];let l=1,c=1,f=1;for(let u=0;u<s;++u)a.push(e.shape[u]),l*=e.shape[u];for(let u=s;u<n;u++)a.push(e.shape[u]),c*=e.shape[u];for(let u=s;u<r;u++)a.push(t.shape[u]);for(let u=n+1;u<o;u++)a.push(e.shape[u]),f*=e.shape[u];return{batchSize:l,sliceSize:f,outerSize:c,dimSize:i,outputShape:a}}const hl=Object.freeze(Object.defineProperty({__proto__:null,collectGatherOpShapeInfo:ul,computeOutShape:cl,segOpComputeOptimalWindowSize:ll},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function rn(e){try{return e.map(t=>ce(t))}catch(t){throw new Error(`Failed to decode encoded string bytes into utf-8, error: ${t}`)}}function Ds(e){return e.map(t=>wt(t))}const uf=Object.freeze(Object.defineProperty({__proto__:null,ERF_A1:Fa,ERF_A2:xa,ERF_A3:Na,ERF_A4:Ba,ERF_A5:_a,ERF_P:va,PARALLELIZE_THRESHOLD:sn,get RowPartitionType(){return nt},SELU_SCALE:Ma,SELU_SCALEALPHA:$a,applyActivation:Ki,assertAndGetBroadcastShape:tn,assertAxesAreInnerMostDims:Ai,assertParamsConsistent:da,assignToTypedArray:Pa,axesAreInnerMostDims:en,calculateShapes:ws,checkEinsumDimSizes:Va,checkPadOnDimRoundingMode:fi,combineLocations:ps,combineRaggedTensorToTensorShapes:ma,complexWithEvenIndex:Oa,complexWithOddIndex:La,computeConv2DInfo:Ye,computeConv3DInfo:ds,computeDefaultPad:Je,computeDilation2DInfo:si,computeOptimalWindowSize:ba,computeOutAndReduceShapes:Ei,computeOutShape:ga,computePool2DInfo:ri,computePool3DInfo:oi,convertConv2DDataFormat:gs,decodeEinsumEquation:Wa,eitherStridesOrDilationsAreOne:ui,expandShapeToKeepDim:Ii,exponent:Ga,exponents:Ua,fromStringArrayToUint8:Ds,fromUint8ToStringArray:rn,getAxesPermutation:ki,getBroadcastDims:ms,getComplexWithIndex:Ca,getEinsumComputePath:ja,getEinsumPermutation:qa,getFusedBiasGradient:Hi,getFusedDyActivation:ji,getImageCenter:Sa,getInnerMostAxes:$i,getPermuted:Ia,getRaggedRank:ya,getReductionAxes:Qe,getReshaped:Ea,getReshapedPermuted:Aa,getRowPartitionTypesHelper:pa,getSliceBeginCoords:ka,getSliceSize:Ta,getSparseFillEmptyRowsIndicesDenseShapeMismatch:Xa,getSparseFillEmptyRowsNegativeIndexErrorMessage:Ya,getSparseFillEmptyRowsOutOfRangeIndexErrorMessage:Ja,getSparseReshapeEmptyTensorZeroOutputDimErrorMessage:el,getSparseReshapeInputOutputMismatchErrorMessage:sl,getSparseReshapeInputOutputMultipleErrorMessage:nl,getSparseReshapeMultipleNegativeOneOutputDimErrorMessage:Qa,getSparseReshapeNegativeOutputDimErrorMessage:tl,getSparseSegmentReductionIndicesOutOfRangeErrorMessage:al,getSparseSegmentReductionNegativeSegmentIdsErrorMessage:rl,getSparseSegmentReductionNonIncreasingSegmentIdsErrorMessage:ol,getSparseSegmentReductionSegmentIdOutOfRangeErrorMessage:il,getUndoAxesPermutation:Ti,isIdentityPermutation:Ha,log:Lr,mergeRealAndImagArrays:Ra,prepareAndValidate:Is,prepareSplitSize:Za,segment_util:hl,shouldFuse:Zi,slice_util:fa,splitRealAndImagArrays:Da,stridesOrDilationsArePositive:hi,tupleValuesAreOne:Ge,upcastType:Ke,validateDefaultValueShape:wa,validateInput:ys,validateUpdateShape:nn,warn:it},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */oa();/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function fl(e,t){Array.isArray(e)||(e=[e]),e.forEach(n=>{n!=null&&b(n.dtype!=="complex64",()=>`${t} does not support complex64 tensors in the CPU backend.`)})}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function hf(e,t,n,s){const r=At(n,B(t));if(s&&n!=="string"){let o=0;e.forEach(i=>{const a=B(i.shape);r.set(i.vals,o),o+=a})}else{let o=0;e.forEach(i=>{const a=n==="string"?rn(i.vals):i.vals;let l=0;for(let c=0;c<i.shape[0];++c){const f=c*t[1]+o;for(let u=0;u<i.shape[1];++u)r[f+u]=a[l++]}o+=i.shape[1]})}return r}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function ff(e,t,n,s){const r=e===t,o=e<t&&n<0,i=t<e&&n>1;if(r||o||i)return Ht(0,s);const a=Math.abs(Math.ceil((t-e)/n)),l=Ht(a,s);t<e&&n===1&&(n=-1),l[0]=e;for(let c=1;c<l.length;c++)l[c]=l[c-1]+n;return l}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function dl(e,t,n,s,r){const o=Bs(s,t,n),i=B(n),a=kt(s);if(o){const u=_s(t,a);return r==="string"?e.slice(u,u+i):e.subarray(u,u+i)}const l=r==="string"?rn(e):e,c=Pe(s,r,l),f=Pe(n,r);for(let u=0;u<f.size;++u){const h=f.indexToLoc(u),d=h.map((g,m)=>g+t[m]);f.set(c.get(...d),...h)}return r==="string"?Ds(f.values):f.values}function gl(e){const{inputs:t,backend:n,attrs:s}=e,{x:r}=t,{begin:o,size:i}=s;fl(r,"slice");const[a,l]=Rs(r,o,i);As(r,a,l);const c=n.data.get(r.dataId).values,f=dl(c,a,l,r.shape,r.dtype);return n.makeTensorInfo(l,r.dtype,f)}const df={kernelName:xr,backendName:"cpu",kernelFunc:gl};/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */class ml{constructor(t,n,s,r,o,i){this.separator=wt(t),this.nGramWidths=n,this.leftPad=wt(s),this.rightPad=wt(r),this.padWidth=o,this.preserveShort=i}getPadWidth(t){return Math.min(this.padWidth<0?t-1:this.padWidth,t-1)}getNumNGrams(t,n){const s=this.getPadWidth(n);return Math.max(0,t+2*s-n+1)}createNGrams(t,n,s,r,o,i){for(let a=0;a<o;++a){const l=this.getPadWidth(i),c=Math.max(0,l-a),f=Math.max(0,l-(o-(a+1))),u=i-(c+f),h=n+(c>0?0:a-l);let d=0;d+=c*this.leftPad.length;for(let I=0;I<u;++I)d+=t[h+I].length;d+=f*this.rightPad.length;const g=c+f+u-1;d+=g*this.separator.length,s[r+a]=new Uint8Array(d);const m=s[r+a];let S=0;const E=I=>I.forEach(y=>m[S++]=y);for(let I=0;I<c;++I)E(this.leftPad),E(this.separator);for(let I=0;I<u-1;++I)E(t[h+I]),E(this.separator);if(u>0){E(t[h+u-1]);for(let I=0;I<f;++I)E(this.separator),E(this.rightPad)}else{for(let I=0;I<f-1;++I)E(this.rightPad),E(this.separator);E(this.rightPad)}}}compute(t,n){const s=t.length,r=n.length;if(r>0){let l=n[0];if(l!==0)throw new Error(`First split value must be 0, got ${l}`);for(let c=1;c<r;++c){let f=n[c]>=l;if(f=f&&n[c]<=s,!f)throw new Error(`Invalid split value ${n[c]}, must be in [${l}, ${s}]`);l=n[c]}if(l!==s)throw new Error(`Last split value must be data size. Expected ${s}, got ${l}`)}const o=r-1,i=At("int32",r);if(s===0||r===0){const l=new Array(s);for(let c=0;c<=o;++c)i[c]=0;return[l,i]}i[0]=0;for(let l=1;l<=o;++l){const c=n[l]-n[l-1];let f=0;this.nGramWidths.forEach(u=>{f+=this.getNumNGrams(c,u)}),this.preserveShort&&c>0&&f===0&&(f=1),i[l]=i[l-1]+f}const a=new Array(i[o]);for(let l=0;l<o;++l){const c=n[l];let f=i[l];if(this.nGramWidths.forEach(u=>{const h=n[l+1]-n[l],d=this.getNumNGrams(h,u);this.createNGrams(t,c,a,f,d,u),f+=d}),this.preserveShort&&f===i[l]){const u=n[l+1]-n[l];if(u===0)continue;const h=u+2*this.padWidth;this.createNGrams(t,c,a,f,1,h)}}return[a,i]}}function gf(e,t,n,s,r,o,i,a){return new ml(n,s,r,o,i,a).compute(e,t)}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function pl(e,t,n,s){if(!e.length)return;if(t.length===0){for(let o=0;o<e.length;++o)s.push(e.subarray(o,o+1));return}if(t.length===1){const o=t[0];let i=e.indexOf(o);for(;i!==-1;){const a=e.subarray(0,i);(!n||a.length!==0)&&s.push(a),e=e.subarray(i+1),i=e.indexOf(o)}(!n||e.length!==0)&&s.push(e);return}let r=0;for(let o=0;o<e.length+1;o++)if(o===e.length||t.indexOf(e[o])!==-1){const i=e.subarray(r,o);(!n||i.length!==0)&&s.push(i),r=o+1}}function mf(e,t,n){const s=e.length,r=[];let o=0,i=0;const a=new Array(s);for(let h=0;h<s;++h){const d=r.length;pl(e[h],t,n,r);const g=r.length-d;a[h]=g,o+=g,i=Math.max(i,g)}const l=At("int32",o*2),c=new Array(o),f=[s,i];let u=0;for(let h=0;h<s;++h)for(let d=0;d<a[h];++d)l[u*2]=h,l[u*2+1]=d,c[u]=r[u],++u;return[l,c,f]}/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function pf(e,t){const n=At("int32",e.length);for(let s=0;s<e.length;++s)n[s]=Hn(e[s]).modulo(t).getLowBitsUnsigned();return n}/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function yf(e,t,n,s){const r=qe(t,n)[0],o=[1,n[0],1];for(let g=0;g<r;g++)o[0]*=n[g];o[1]=n[r];for(let g=r+1;g<n.length;g++)o[2]*=n[g];const i=new Map,a=new Int32Array(n[r]),l=new xe(o,s,e),c=[],f=o[0]===1&&o[2]===1;for(let g=0;g<n[r];g++){let m;if(f)m=e[g].toString();else{const E=[];for(let I=0;I<o[0];I++)for(let y=0;y<o[2];y++)E.push(l.get(I,g,y));m=E.join(",")}const S=i.get(m);if(S!=null)a[g]=S;else{const E=i.size;i.set(m,E),a[g]=E,c.push(g)}}const u=o.slice();u[1]=i.size;const h=new xe(u,s);c.forEach((g,m)=>{for(let S=0;S<o[0];S++)for(let E=0;E<o[2];E++)h.set(l.get(S,g,E),S,m,E)});const d=n.slice();return d[r]=u[1],{outputValues:h.values,outputShape:d,indices:a}}export{Gl as $,mr as A,ri as B,Rl as C,oi as D,Dl as E,_l as F,er as G,b as H,Ln as I,Ol as J,Rs as K,Bs as L,kt as M,_s as N,dl as O,Ll as P,Ea as Q,vr as R,xr as S,U as T,Ia as U,Aa as V,ka as W,Ta as X,Cl as Y,Pl as Z,uh as _,tn as a,Uc as a$,On as a0,zl as a1,Wl as a2,ql as a3,da as a4,ga as a5,hf as a6,Ds as a7,Vl as a8,gs as a9,wc as aA,Sr as aB,Qt as aC,Sc as aD,Ec as aE,Er as aF,Ic as aG,hh as aH,fh as aI,kc as aJ,Is as aK,Ac as aL,ul as aM,Tc as aN,$c as aO,Fc as aP,xc as aQ,Nc as aR,Ir as aS,Bc as aT,_c as aU,Rc as aV,Dc as aW,Oc as aX,Lc as aY,Cc as aZ,Pc as a_,Ye as aa,Hl as ab,Kl as ac,ds as ad,Zl as ae,Xl as af,Yl as ag,Jl as ah,ec as ai,Ql as aj,Ti as ak,tc as al,nc as am,sc as an,rc as ao,ac as ap,lc as aq,si as ar,uc as as,cc as at,br as au,dc as av,mc as aw,gc as ax,pc as ay,yc as az,B as b,nl as b$,Wc as b0,qc as b1,jc as b2,Ar as b3,Hc as b4,Zc as b5,Xc as b6,Kc as b7,Yc as b8,ui as b9,Fr as bA,Au as bB,ku as bC,Eu as bD,Iu as bE,Tu as bF,ch as bG,Sa as bH,$u as bI,Mu as bJ,vu as bK,ws as bL,xu as bM,Nu as bN,Bu as bO,Nr as bP,Du as bQ,_u as bR,Ru as bS,Ou as bT,Lu as bU,Uu as bV,Ja as bW,Ya as bX,Xa as bY,Gu as bZ,sl as b_,Jc as ba,Qc as bb,tu as bc,eu as bd,Pu as be,su as bf,nu as bg,kr as bh,ru as bi,iu as bj,au as bk,lu as bl,ou as bm,uu as bn,cu as bo,hu as bp,Jt as bq,fu as br,Tr as bs,$r as bt,gu as bu,wu as bv,ff as bw,wr as bx,Su as by,Mr as bz,Sl as c,hi as c$,tl as c0,Qa as c1,el as c2,rl as c3,al as c4,il as c5,ol as c6,zu as c7,Wu as c8,qu as c9,Dr as cA,Cr as cB,A as cC,of as cD,zs as cE,bl as cF,$h as cG,Zt as cH,ie as cI,kh as cJ,Hr as cK,Dh as cL,_ as cM,T as cN,w as cO,fe as cP,ft as cQ,gi as cR,fi as cS,he as cT,fo as cU,Ho as cV,$ as cW,k as cX,pi as cY,ge as cZ,yi as c_,Cu as ca,Za as cb,Br as cc,ju as cd,Vu as ce,Or as cf,Ku as cg,ua as ch,la as ci,Zu as cj,gf as ck,Xu as cl,mf as cm,Yu as cn,pf as co,Rr as cp,_r as cq,Ju as cr,Qu as cs,Fu as ct,th as cu,eh as cv,nh as cw,rh as cx,yf as cy,oh as cz,El as d,Hh as d$,st as d0,rt as d1,fc as d2,Xs as d3,ni as d4,Ni as d5,Gt as d6,En as d7,bt as d8,Pe as d9,sr as dA,jl as dB,Zi as dC,Ki as dD,ji as dE,Ge as dF,Hi as dG,oc as dH,ic as dI,V as dJ,Gi as dK,Hu as dL,Wh as dM,Gh as dN,R as dO,$t as dP,zh as dQ,os as dR,Ut as dS,Ch as dT,qh as dU,Uh as dV,Yh as dW,Ph as dX,Lh as dY,Kh as dZ,$o as d_,vc as da,oe as db,rf as dc,Dt as dd,po as de,Ht as df,Bn as dg,mu as dh,pu as di,yu as dj,de as dk,wt as dl,j as dm,es as dn,Ct as dp,bu as dq,xe as dr,bc as ds,Mc as dt,nr as du,Ks as dv,ss as dw,ys as dx,ih as dy,ro as dz,Dn as e,wa as e$,Zh as e0,Jh as e1,jh as e2,Vh as e3,Xh as e4,an as e5,hc as e6,lh as e7,Es as e8,na as e9,Mt as eA,Tn as eB,Mh as eC,Bt as eD,go as eE,Ko as eF,me as eG,Ze as eH,oo as eI,it as eJ,Ra as eK,or as eL,ce as eM,fl as eN,ms as eO,lr as eP,ar as eQ,pr as eR,pe as eS,rr as eT,rn as eU,At as eV,Vr as eW,Ke as eX,pa as eY,ya as eZ,nt as e_,sa as ea,ta as eb,Ji as ec,ea as ed,Qi as ee,Vi as ef,Qe as eg,Ul as eh,yr as ei,Gc as ej,$a as ek,Ma as el,Li as em,dh as en,Zn as eo,Si as ep,Jo as eq,_i as er,Pi as es,Wi as et,So as eu,bs as ev,at as ew,Ss as ex,xn as ey,wo as ez,Il as f,af as f$,ma as f0,re as f1,gl as f2,ir as f3,Wa as f4,Va as f5,ja as f6,qa as f7,Ha as f8,_a as f9,ll as fA,_n as fB,cr as fC,zc as fD,Vc as fE,du as fF,pn as fG,ah as fH,ue as fI,Qh as fJ,ph as fK,Sh as fL,Ah as fM,Th as fN,Ih as fO,Eh as fP,_h as fQ,Rh as fR,cf as fS,bo as fT,ln as fU,Me as fV,tf as fW,ef as fX,vh as fY,Nh as fZ,Bh as f_,Ba as fa,Na as fb,xa as fc,Fa as fd,va as fe,Ca as ff,Da as fg,Oa as fh,La as fi,Ua as fj,Ga as fk,Pa as fl,jt as fm,df as fn,Js as fo,Vt as fp,qs as fq,ho as fr,uf as fs,tr as ft,Vs as fu,ts as fv,ba as fw,wh as fx,As as fy,cl as fz,ke as g,lf as g0,xh as g1,Oh as g2,fa as g3,bh as g4,Fh as g5,mh as g6,gh as g7,yh as g8,nf as g9,sf as ga,Ri as gb,sh as h,ki as i,$i as j,Al as k,Ai as l,Ei as m,Ii as n,kl as o,qe as p,Tl as q,$l as r,It as s,O as t,Ml as u,vl as v,Fl as w,Nl as x,xl as y,Bl as z};
