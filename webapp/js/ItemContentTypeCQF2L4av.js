import{_ as f,F as p}from"./components.global5n24RCIC.js";import{j as _,k as i,K as a,z as m,r as d,i as c,F as x,P as k,m as V,Q as b,R as C}from"./@vueC3Nhqlrl.js";const h={name:"ContentTags",props:["value"],data(){return{costOptions:p().cost.map(t=>({value:t.key,text:t.name})),adsOptions:p().ads.map(t=>({value:t.key,text:t.name})),costdOptions:p().costDetails.map(t=>({value:t.key,text:t.name})),content:this.value}},mounted(){},computed:{},methods:{update(t){this.$emit("input",this.content)}},created(){}},y={class:"row"},O={class:"col-md-4"},T={class:"col-md-4"},D={class:"col-md-4"};function B(t,e,g,v,o,r){const l=d("b-form-radio-group"),s=d("b-form-group"),u=d("b-form-checkbox-group");return c(),_("div",y,[i("div",O,[a(s,{class:"form-group"},{default:m(()=>[a(l,{stacked:"",modelValue:o.content.cost,"onUpdate:modelValue":e[0]||(e[0]=n=>o.content.cost=n),onChange:e[1]||(e[1]=n=>r.update()),options:o.costOptions},null,8,["modelValue","options"])]),_:1})]),i("div",T,[a(s,{class:"form-group"},{default:m(()=>[a(l,{stacked:"",modelValue:o.content.ads,"onUpdate:modelValue":e[2]||(e[2]=n=>o.content.ads=n),onChange:e[3]||(e[3]=n=>r.update()),options:o.adsOptions},null,8,["modelValue","options"])]),_:1})]),i("div",D,[a(s,{class:"form-group"},{default:m(()=>[a(u,{stacked:"",modelValue:o.content.costDetails,"onUpdate:modelValue":e[4]||(e[4]=n=>o.content.costDetails=n),onChange:e[5]||(e[5]=n=>r.update()),options:o.costdOptions},null,8,["modelValue","options"])]),_:1})])])}const j=f(h,[["render",B]]),U={name:"ContentTags",props:["value"],data(){return{options:p().content.map(t=>({value:t.key,text:t.name})),content:this.value}},mounted(){},computed:{},methods:{update(t){this.$emit("input",this.content)}},created(){}},w={class:"d-flex flex-wrap flex-gap-sm"};function F(t,e,g,v,o,r){const l=d("b-form-checkbox");return c(),_("div",w,[(c(!0),_(x,null,k(o.options,s=>(c(),V(l,{"button-variant":"outline-primary",button:"",modelValue:o.content.content,"onUpdate:modelValue":e[0]||(e[0]=u=>o.content.content=u),key:s.value,value:s.value,onChange:e[1]||(e[1]=u=>r.update())},{default:m(()=>[b(C(s.text),1)]),_:2},1032,["modelValue","value"]))),128))])}const z=f(U,[["render",F]]);export{j as I,z as a};
