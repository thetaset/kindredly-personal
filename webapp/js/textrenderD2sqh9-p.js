import{t as o}from"./components.globalDizx_NTC.js";import{m as n}from"./markedJKvyS0Pp.js";function c(r){if(!r)return"";try{let e=new n.Renderer({gfm:!0,breaks:!0});r=r.replace(/\n(?=\n)/g,`

<br/>
`);let t=0;return e.link=function(a,i,l){return t++,n.Renderer.prototype.link.call(this,a,i,o(l,40)).replace("<a","<a target='_blank' ")},n.parse(r,{renderer:e})}catch{return JSON.stringify(r)}}export{c as p};
