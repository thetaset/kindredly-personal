import{_ as w,a as C,p as I,l as L}from"./components.global5n24RCIC.js";import{j as a,K as i,z as n,r as d,ac as R,i as o,k as l,F as $,P as D,Q as c,R as m,m as f,s as r,L as T}from"./@vueC3Nhqlrl.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";const U={name:"ArchivedItems",mixins:[C],components:{},data(){return{loading:!0,items:null,selectedItemId:null,fields:[{key:"name",label:"Items",sortable:!1}]}},mounted(){},computed:{itemList(){return this.items==null?[]:this.items}},methods:{prettyTimePast:I,async unarchive(s){await this.getRef("msgBoxConfirm").show(`Unarchive '${s.name}'?  `,{title:"Confirm",okVariant:"info",okTitle:"Unarchive",cancelTitle:"Cancel",hideHeaderClose:!1})&&(await this.sendReq("/item/unarchive",{itemId:s._id}),await this.loadData(),await this.sendReq("/client/updateIndex"))},async loadData(){this.loading=!0;const s=await this.sendReq("/library/archived");s.success?(this.items=L(s.result,50,!1),this.errorMessage=null):(console.error("Error:",s.message),this.errorMessage=s.message),this.loading=!1}},created(){this.loadData()}},V={class:"d-flex h4"},B={key:0},N={class:"row"},j=["src"],q={class:"d-flex justify-content-between"},A={class:"h5"},F={class:"mb-1 text-muted"},E={key:0,class:"badge badge-success rounded"},M={key:1,class:"small"},O=["href"],P={class:"mb-1 small"},z={class:"mb-1 d-flex flex-wrap text-muted small"},H={key:0},K={key:0,class:"small"},Q={key:1,class:"m-5"};function S(s,t,G,J,h,v){const _=d("b-icon"),p=d("router-link"),b=d("b-col"),u=d("b-dropdown-item"),k=d("b-dropdown"),y=d("b-container"),g=R("b-popover");return o(),a("div",null,[i(y,{class:"container"},{default:n(()=>[l("div",V,[i(p,{class:"btn btn-link",to:"/library/collections"},{default:n(()=>[i(_,{icon:"chevron-left"})]),_:1}),t[0]||(t[0]=l("div",{class:"ms-3"},"Archive",-1))]),t[7]||(t[7]=l("div",{class:"mb-5"},null,-1)),h.loading?(o(),a("div",Q,"Loading ...")):(o(),a("div",B,[(o(!0),a($,null,D(v.itemList,(e,x)=>(o(),a("div",{class:"mb-1",key:x},[l("div",N,[i(b,{md:"3",class:"d-flex align-items-center justify-content-center mb-2"},{default:n(()=>[i(p,{to:`/${e.type=="col"?"collection":"item"}/${e._id}`},{default:n(()=>[l("img",{style:{"max-height":"100px",width:"100%"},class:"rounded",src:e.imageFilename,alt:""},null,8,j)]),_:2},1032,["to"])]),_:2},1024),i(b,{class:"col"},{default:n(()=>[l("div",q,[l("span",A,[i(p,{to:`/${e.type=="col"?"collection":"item"}/${e._id}`},{default:n(()=>[c(m(s.textTruncate(e.name||e.url,60)),1)]),_:2},1032,["to"])]),i(k,{variant:"link",right:"","no-caret":""},{"button-content":n(()=>[i(_,{icon:"three-dots"})]),default:n(()=>[e.type=="link"?(o(),f(u,{key:0,title:"edit",to:`/item?itemId=${e._id}`},{default:n(()=>t[1]||(t[1]=[c("Open")])),_:2},1032,["to"])):r("",!0),e.type=="col"?(o(),f(u,{key:1,to:`/collection/${e._id}`},{default:n(()=>t[2]||(t[2]=[c("Open")])),_:2},1032,["to"])):r("",!0),e.type=="link"?(o(),f(u,{key:2,title:"edit",href:s.toURL(e.url)},{default:n(()=>t[3]||(t[3]=[c("Visit")])),_:2},1032,["href"])):r("",!0),i(u,{onClick:W=>v.unarchive(e)},{default:n(()=>t[4]||(t[4]=[c("Unarchive")])),_:2},1032,["onClick"])]),_:2},1024)]),l("div",F,[e.type=="col"?(o(),a("span",E," Collection ")):r("",!0),e.type=="link"?(o(),a("span",M,[i(_,{icon:"link"}),T((o(),a("a",{class:"text-muted small ms-1",target:"_blank",href:s.toURL(e.url)},[c(m(s.textTruncate(e.url,60)),1)],8,O)),[[g,s.toURL(e.url),void 0,{hover:!0,right:!0}]])])):r("",!0)]),l("div",P,m(s.textTruncate(e.description,160)),1),t[5]||(t[5]=l("div",{class:"mb-1 d-flex flex-wrap small text-muted"},null,-1)),l("div",z,[e.type=="col"&&e.itemCount?(o(),a("div",H,m(e.itemCount)+" items",1)):r("",!0)])]),_:2},1024)]),t[6]||(t[6]=l("hr",null,null,-1))]))),128)),h.items.length==0?(o(),a("div",K,"No items found.")):r("",!0)]))]),_:1})])}const se=w(U,[["render",S]]);export{se as default};
