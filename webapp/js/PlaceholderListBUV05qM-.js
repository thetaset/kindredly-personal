import{a as i,_ as m}from"./components.global5n24RCIC.js";import{d as o,j as t,F as l,P as p,p as r,i as a}from"./@vueC3Nhqlrl.js";const d=o({name:"LoadingList",mixins:[i],components:{},props:{numOfItems:{type:Number,default:5},size:{type:String,default:"md"},wrapperClass:{type:String,default:""},itemClass:{type:String,default:""}},data(){return{}},mounted(){},computed:{listItems(){let e=[];for(let s=0;s<this.numOfItems;s++)e.push(s);return e}},methods:{},created(){}});function u(e,s,c,f,h,g){return a(),t("div",{class:r(e.wrapperClass)},[(a(!0),t(l,null,p(e.listItems,n=>(a(),t("div",{key:n,class:r(`rounded animated-background-ph ${e.size=="class"?e.itemClass:"my-3 ph-size-"+e.size}`)},null,2))),128))],2)}const z=m(d,[["render",u]]);export{z as P};
