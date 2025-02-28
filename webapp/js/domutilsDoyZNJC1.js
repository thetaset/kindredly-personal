import{r as ot,a as pt}from"./dom-serializerDa3BHheJ.js";import{E as dt,o as ht}from"./domelementtypeCGHdmTnT.js";import{h as O,k as z,l as I,m as B,i as h,a as gt,e as b,n as K,o as N,p as W,b as g,d as bt}from"./domhandlerCjB8Dp5l.js";function q(t,n){return ot(t,n)}function yt(t,n){return O(t)?t.children.map(e=>q(e,n)).join(""):""}function S(t){return Array.isArray(t)?t.map(S).join(""):h(t)?t.name==="br"?`
`:S(t.children):B(t)?S(t.children):I(t)?t.data:""}function w(t){return Array.isArray(t)?t.map(w).join(""):O(t)&&!z(t)?w(t.children):I(t)?t.data:""}function P(t){return Array.isArray(t)?t.map(P).join(""):O(t)&&(t.type===dt.Tag||B(t))?P(t.children):I(t)?t.data:""}function U(t){return O(t)?t.children:[]}function J(t){return t.parent||null}function Et(t){const n=J(t);if(n!=null)return U(n);const e=[t];let{prev:r,next:i}=t;for(;r!=null;)e.unshift(r),{prev:r}=r;for(;i!=null;)e.push(i),{next:i}=i;return e}function xt(t,n){var e;return(e=t.attribs)===null||e===void 0?void 0:e[n]}function Ot(t,n){return t.attribs!=null&&Object.prototype.hasOwnProperty.call(t.attribs,n)&&t.attribs[n]!=null}function It(t){return t.name}function Nt(t){let{next:n}=t;for(;n!==null&&!h(n);)({next:n}=n);return n}function Ct(t){let{prev:n}=t;for(;n!==null&&!h(n);)({prev:n}=n);return n}function D(t){if(t.prev&&(t.prev.next=t.next),t.next&&(t.next.prev=t.prev),t.parent){const n=t.parent.children,e=n.lastIndexOf(t);e>=0&&n.splice(e,1)}t.next=null,t.prev=null,t.parent=null}function Tt(t,n){const e=n.prev=t.prev;e&&(e.next=n);const r=n.next=t.next;r&&(r.prev=n);const i=n.parent=t.parent;if(i){const u=i.children;u[u.lastIndexOf(t)]=n,t.parent=null}}function mt(t,n){if(D(n),n.next=null,n.parent=t,t.children.push(n)>1){const e=t.children[t.children.length-2];e.next=n,n.prev=e}else n.prev=null}function $t(t,n){D(n);const{parent:e}=t,r=t.next;if(n.next=r,n.prev=t,t.next=n,n.parent=e,r){if(r.prev=n,e){const i=e.children;i.splice(i.lastIndexOf(r),0,n)}}else e&&e.children.push(n)}function Dt(t,n){if(D(n),n.parent=t,n.prev=null,t.children.unshift(n)!==1){const e=t.children[1];e.prev=n,n.next=e}else n.next=null}function At(t,n){D(n);const{parent:e}=t;if(e){const r=e.children;r.splice(r.indexOf(t),0,n)}t.prev&&(t.prev.next=n),n.parent=e,n.prev=t.prev,n.next=t,t.prev=n}function M(t,n,e=!0,r=1/0){return Q(t,Array.isArray(n)?n:[n],e,r)}function Q(t,n,e,r){const i=[],u=[n],f=[0];for(;;){if(f[0]>=u[0].length){if(f.length===1)return i;u.shift(),f.shift();continue}const s=u[0][f[0]++];if(t(s)&&(i.push(s),--r<=0))return i;e&&O(s)&&s.children.length>0&&(f.unshift(0),u.unshift(s.children))}}function vt(t,n){return n.find(t)}function Y(t,n,e=!0){let r=null;for(let i=0;i<n.length&&!r;i++){const u=n[i];if(h(u))t(u)?r=u:e&&u.children.length>0&&(r=Y(t,u.children,!0));else continue}return r}function X(t,n){return n.some(e=>h(e)&&(t(e)||X(t,e.children)))}function St(t,n){const e=[],r=[n],i=[0];for(;;){if(i[0]>=r[0].length){if(r.length===1)return e;r.shift(),i.shift();continue}const u=r[0][i[0]++];h(u)&&(t(u)&&e.push(u),u.children.length>0&&(i.unshift(0),r.unshift(u.children)))}}const k={tag_name(t){return typeof t=="function"?n=>h(n)&&t(n.name):t==="*"?h:n=>h(n)&&n.name===t},tag_type(t){return typeof t=="function"?n=>t(n.type):n=>n.type===t},tag_contains(t){return typeof t=="function"?n=>I(n)&&t(n.data):n=>I(n)&&n.data===t}};function Z(t,n){return typeof n=="function"?e=>h(e)&&n(e.attribs[t]):e=>h(e)&&e.attribs[t]===n}function _t(t,n){return e=>t(e)||n(e)}function tt(t){const n=Object.keys(t).map(e=>{const r=t[e];return Object.prototype.hasOwnProperty.call(k,e)?k[e](r):Z(e,r)});return n.length===0?null:n.reduce(_t)}function wt(t,n){const e=tt(t);return e?e(n):!0}function kt(t,n,e,r=1/0){const i=tt(t);return i?M(i,n,e,r):[]}function Lt(t,n,e=!0){return Array.isArray(n)||(n=[n]),Y(Z("id",t),n,e)}function C(t,n,e=!0,r=1/0){return M(k.tag_name(t),n,e,r)}function Ft(t,n,e=!0,r=1/0){return M(k.tag_type(t),n,e,r)}function Gt(t){let n=t.length;for(;--n>=0;){const e=t[n];if(n>0&&t.lastIndexOf(e,n-1)>=0){t.splice(n,1);continue}for(let r=e.parent;r;r=r.parent)if(t.includes(r)){t.splice(n,1);break}}return t}var p;(function(t){t[t.DISCONNECTED=1]="DISCONNECTED",t[t.PRECEDING=2]="PRECEDING",t[t.FOLLOWING=4]="FOLLOWING",t[t.CONTAINS=8]="CONTAINS",t[t.CONTAINED_BY=16]="CONTAINED_BY"})(p||(p={}));function nt(t,n){const e=[],r=[];if(t===n)return 0;let i=O(t)?t:t.parent;for(;i;)e.unshift(i),i=i.parent;for(i=O(n)?n:n.parent;i;)r.unshift(i),i=i.parent;const u=Math.min(e.length,r.length);let f=0;for(;f<u&&e[f]===r[f];)f++;if(f===0)return p.DISCONNECTED;const s=e[f-1],a=s.children,c=e[f],y=r[f];return a.indexOf(c)>a.indexOf(y)?s===n?p.FOLLOWING|p.CONTAINED_BY:p.FOLLOWING:s===t?p.PRECEDING|p.CONTAINS:p.PRECEDING}function jt(t){return t=t.filter((n,e,r)=>!r.includes(n,e+1)),t.sort((n,e)=>{const r=nt(n,e);return r&p.PRECEDING?-1:r&p.FOLLOWING?1:0}),t}function Mt(t){const n=L(Yt,t);return n?n.name==="feed"?Pt(n):Rt(n):null}function Pt(t){var n;const e=t.children,r={type:"atom",items:C("entry",e).map(f=>{var s;const{children:a}=f,c={media:et(a)};l(c,"id","id",a),l(c,"title","title",a);const y=(s=L("link",a))===null||s===void 0?void 0:s.attribs.href;y&&(c.link=y);const m=E("summary",a)||E("content",a);m&&(c.description=m);const $=E("updated",a);return $&&(c.pubDate=new Date($)),c})};l(r,"id","id",e),l(r,"title","title",e);const i=(n=L("link",e))===null||n===void 0?void 0:n.attribs.href;i&&(r.link=i),l(r,"description","subtitle",e);const u=E("updated",e);return u&&(r.updated=new Date(u)),l(r,"author","email",e,!0),r}function Rt(t){var n,e;const r=(e=(n=L("channel",t.children))===null||n===void 0?void 0:n.children)!==null&&e!==void 0?e:[],i={type:t.name.substr(0,3),id:"",items:C("item",t.children).map(f=>{const{children:s}=f,a={media:et(s)};l(a,"id","guid",s),l(a,"title","title",s),l(a,"link","link",s),l(a,"description","description",s);const c=E("pubDate",s)||E("dc:date",s);return c&&(a.pubDate=new Date(c)),a})};l(i,"title","title",r),l(i,"link","link",r),l(i,"description","description",r);const u=E("lastBuildDate",r);return u&&(i.updated=new Date(u)),l(i,"author","managingEditor",r,!0),i}const Bt=["url","type","lang"],Wt=["fileSize","bitrate","framerate","samplingrate","channels","duration","height","width"];function et(t){return C("media:content",t).map(n=>{const{attribs:e}=n,r={medium:e.medium,isDefault:!!e.isDefault};for(const i of Bt)e[i]&&(r[i]=e[i]);for(const i of Wt)e[i]&&(r[i]=parseInt(e[i],10));return e.expression&&(r.expression=e.expression),r})}function L(t,n){return C(t,n,!0,1)[0]}function E(t,n,e=!1){return w(C(t,n,e,1)).trim()}function l(t,n,e,r,i=!1){const u=E(e,r,i);u&&(t[n]=u)}function Yt(t){return t==="rss"||t==="feed"||t==="rdf:RDF"}const Nn=Object.freeze(Object.defineProperty({__proto__:null,get DocumentPosition(){return p},append:$t,appendChild:mt,compareDocumentPosition:nt,existsOne:X,filter:M,find:Q,findAll:St,findOne:Y,findOneChild:vt,getAttributeValue:xt,getChildren:U,getElementById:Lt,getElements:kt,getElementsByTagName:C,getElementsByTagType:Ft,getFeed:Mt,getInnerHTML:yt,getName:It,getOuterHTML:q,getParent:J,getSiblings:Et,getText:S,hasAttrib:Ot,hasChildren:O,innerText:P,isCDATA:B,isComment:z,isDocument:gt,isTag:h,isText:I,nextElementSibling:Nt,prepend:At,prependChild:Dt,prevElementSibling:Ct,removeElement:D,removeSubsets:Gt,replaceElement:Tt,testElement:wt,textContent:w,uniqueSort:jt},Symbol.toStringTag,{value:"Module"}));function rt(t,n){return pt(t,n)}function Ht(t,n){return b(t)?t.children.map(e=>rt(e,n)).join(""):""}function _(t){return Array.isArray(t)?t.map(_).join(""):g(t)?t.name==="br"?`
`:_(t.children):W(t)?_(t.children):N(t)?t.data:""}function F(t){return Array.isArray(t)?t.map(F).join(""):b(t)&&!K(t)?F(t.children):N(t)?t.data:""}function R(t){return Array.isArray(t)?t.map(R).join(""):b(t)&&(t.type===ht.Tag||W(t))?R(t.children):N(t)?t.data:""}function it(t){return b(t)?t.children:[]}function ut(t){return t.parent||null}function Vt(t){const n=ut(t);if(n!=null)return it(n);const e=[t];let{prev:r,next:i}=t;for(;r!=null;)e.unshift(r),{prev:r}=r;for(;i!=null;)e.push(i),{next:i}=i;return e}function zt(t,n){var e;return(e=t.attribs)===null||e===void 0?void 0:e[n]}function Kt(t,n){return t.attribs!=null&&Object.prototype.hasOwnProperty.call(t.attribs,n)&&t.attribs[n]!=null}function qt(t){return t.name}function Ut(t){let{next:n}=t;for(;n!==null&&!g(n);)({next:n}=n);return n}function Jt(t){let{prev:n}=t;for(;n!==null&&!g(n);)({prev:n}=n);return n}function A(t){if(t.prev&&(t.prev.next=t.next),t.next&&(t.next.prev=t.prev),t.parent){const n=t.parent.children,e=n.lastIndexOf(t);e>=0&&n.splice(e,1)}t.next=null,t.prev=null,t.parent=null}function Qt(t,n){const e=n.prev=t.prev;e&&(e.next=n);const r=n.next=t.next;r&&(r.prev=n);const i=n.parent=t.parent;if(i){const u=i.children;u[u.lastIndexOf(t)]=n,t.parent=null}}function Xt(t,n){if(A(n),n.next=null,n.parent=t,t.children.push(n)>1){const e=t.children[t.children.length-2];e.next=n,n.prev=e}else n.prev=null}function Zt(t,n){A(n);const{parent:e}=t,r=t.next;if(n.next=r,n.prev=t,t.next=n,n.parent=e,r){if(r.prev=n,e){const i=e.children;i.splice(i.lastIndexOf(r),0,n)}}else e&&e.children.push(n)}function tn(t,n){if(A(n),n.parent=t,n.prev=null,t.children.unshift(n)!==1){const e=t.children[1];e.prev=n,n.next=e}else n.next=null}function nn(t,n){A(n);const{parent:e}=t;if(e){const r=e.children;r.splice(r.indexOf(t),0,n)}t.prev&&(t.prev.next=n),n.parent=e,n.prev=t.prev,n.next=t,t.prev=n}function v(t,n,e=!0,r=1/0){return st(t,Array.isArray(n)?n:[n],e,r)}function st(t,n,e,r){const i=[],u=[Array.isArray(n)?n:[n]],f=[0];for(;;){if(f[0]>=u[0].length){if(f.length===1)return i;u.shift(),f.shift();continue}const s=u[0][f[0]++];if(t(s)&&(i.push(s),--r<=0))return i;e&&b(s)&&s.children.length>0&&(f.unshift(0),u.unshift(s.children))}}function en(t,n){return n.find(t)}function H(t,n,e=!0){const r=Array.isArray(n)?n:[n];for(let i=0;i<r.length;i++){const u=r[i];if(g(u)&&t(u))return u;if(e&&b(u)&&u.children.length>0){const f=H(t,u.children,!0);if(f)return f}}return null}function ft(t,n){return(Array.isArray(n)?n:[n]).some(e=>g(e)&&t(e)||b(e)&&ft(t,e.children))}function rn(t,n){const e=[],r=[Array.isArray(n)?n:[n]],i=[0];for(;;){if(i[0]>=r[0].length){if(r.length===1)return e;r.shift(),i.shift();continue}const u=r[0][i[0]++];g(u)&&t(u)&&e.push(u),b(u)&&u.children.length>0&&(i.unshift(0),r.unshift(u.children))}}const G={tag_name(t){return typeof t=="function"?n=>g(n)&&t(n.name):t==="*"?g:n=>g(n)&&n.name===t},tag_type(t){return typeof t=="function"?n=>t(n.type):n=>n.type===t},tag_contains(t){return typeof t=="function"?n=>N(n)&&t(n.data):n=>N(n)&&n.data===t}};function V(t,n){return typeof n=="function"?e=>g(e)&&n(e.attribs[t]):e=>g(e)&&e.attribs[t]===n}function un(t,n){return e=>t(e)||n(e)}function at(t){const n=Object.keys(t).map(e=>{const r=t[e];return Object.prototype.hasOwnProperty.call(G,e)?G[e](r):V(e,r)});return n.length===0?null:n.reduce(un)}function sn(t,n){const e=at(t);return e?e(n):!0}function fn(t,n,e,r=1/0){const i=at(t);return i?v(i,n,e,r):[]}function an(t,n,e=!0){return Array.isArray(n)||(n=[n]),H(V("id",t),n,e)}function T(t,n,e=!0,r=1/0){return v(G.tag_name(t),n,e,r)}function cn(t,n,e=!0,r=1/0){return v(V("class",t),n,e,r)}function ln(t,n,e=!0,r=1/0){return v(G.tag_type(t),n,e,r)}function on(t){let n=t.length;for(;--n>=0;){const e=t[n];if(n>0&&t.lastIndexOf(e,n-1)>=0){t.splice(n,1);continue}for(let r=e.parent;r;r=r.parent)if(t.includes(r)){t.splice(n,1);break}}return t}var d;(function(t){t[t.DISCONNECTED=1]="DISCONNECTED",t[t.PRECEDING=2]="PRECEDING",t[t.FOLLOWING=4]="FOLLOWING",t[t.CONTAINS=8]="CONTAINS",t[t.CONTAINED_BY=16]="CONTAINED_BY"})(d||(d={}));function ct(t,n){const e=[],r=[];if(t===n)return 0;let i=b(t)?t:t.parent;for(;i;)e.unshift(i),i=i.parent;for(i=b(n)?n:n.parent;i;)r.unshift(i),i=i.parent;const u=Math.min(e.length,r.length);let f=0;for(;f<u&&e[f]===r[f];)f++;if(f===0)return d.DISCONNECTED;const s=e[f-1],a=s.children,c=e[f],y=r[f];return a.indexOf(c)>a.indexOf(y)?s===n?d.FOLLOWING|d.CONTAINED_BY:d.FOLLOWING:s===t?d.PRECEDING|d.CONTAINS:d.PRECEDING}function pn(t){return t=t.filter((n,e,r)=>!r.includes(n,e+1)),t.sort((n,e)=>{const r=ct(n,e);return r&d.PRECEDING?-1:r&d.FOLLOWING?1:0}),t}function dn(t){const n=j(En,t);return n?n.name==="feed"?hn(n):gn(n):null}function hn(t){var n;const e=t.children,r={type:"atom",items:T("entry",e).map(f=>{var s;const{children:a}=f,c={media:lt(a)};o(c,"id","id",a),o(c,"title","title",a);const y=(s=j("link",a))===null||s===void 0?void 0:s.attribs.href;y&&(c.link=y);const m=x("summary",a)||x("content",a);m&&(c.description=m);const $=x("updated",a);return $&&(c.pubDate=new Date($)),c})};o(r,"id","id",e),o(r,"title","title",e);const i=(n=j("link",e))===null||n===void 0?void 0:n.attribs.href;i&&(r.link=i),o(r,"description","subtitle",e);const u=x("updated",e);return u&&(r.updated=new Date(u)),o(r,"author","email",e,!0),r}function gn(t){var n,e;const r=(e=(n=j("channel",t.children))===null||n===void 0?void 0:n.children)!==null&&e!==void 0?e:[],i={type:t.name.substr(0,3),id:"",items:T("item",t.children).map(f=>{const{children:s}=f,a={media:lt(s)};o(a,"id","guid",s),o(a,"title","title",s),o(a,"link","link",s),o(a,"description","description",s);const c=x("pubDate",s)||x("dc:date",s);return c&&(a.pubDate=new Date(c)),a})};o(i,"title","title",r),o(i,"link","link",r),o(i,"description","description",r);const u=x("lastBuildDate",r);return u&&(i.updated=new Date(u)),o(i,"author","managingEditor",r,!0),i}const bn=["url","type","lang"],yn=["fileSize","bitrate","framerate","samplingrate","channels","duration","height","width"];function lt(t){return T("media:content",t).map(n=>{const{attribs:e}=n,r={medium:e.medium,isDefault:!!e.isDefault};for(const i of bn)e[i]&&(r[i]=e[i]);for(const i of yn)e[i]&&(r[i]=parseInt(e[i],10));return e.expression&&(r.expression=e.expression),r})}function j(t,n){return T(t,n,!0,1)[0]}function x(t,n,e=!1){return F(T(t,n,e,1)).trim()}function o(t,n,e,r,i=!1){const u=x(e,r,i);u&&(t[n]=u)}function En(t){return t==="rss"||t==="feed"||t==="rdf:RDF"}const Cn=Object.freeze(Object.defineProperty({__proto__:null,get DocumentPosition(){return d},append:Zt,appendChild:Xt,compareDocumentPosition:ct,existsOne:ft,filter:v,find:st,findAll:rn,findOne:H,findOneChild:en,getAttributeValue:zt,getChildren:it,getElementById:an,getElements:fn,getElementsByClassName:cn,getElementsByTagName:T,getElementsByTagType:ln,getFeed:dn,getInnerHTML:Ht,getName:qt,getOuterHTML:rt,getParent:ut,getSiblings:Vt,getText:_,hasAttrib:Kt,hasChildren:b,innerText:R,isCDATA:W,isComment:K,isDocument:bt,isTag:g,isText:N,nextElementSibling:Ut,prepend:nn,prependChild:tn,prevElementSibling:Jt,removeElement:A,removeSubsets:on,replaceElement:Qt,testElement:sn,textContent:F,uniqueSort:pn},Symbol.toStringTag,{value:"Module"}));export{Nn as D,U as a,F as b,R as c,pn as d,Ut as e,Jt as f,Et as g,Vt as h,P as i,it as j,A as k,Q as l,Cn as m,Nt as n,st as o,Ct as p,D as r,w as t,jt as u};
