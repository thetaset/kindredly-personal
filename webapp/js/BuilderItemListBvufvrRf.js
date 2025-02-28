import{p as U,E as D,ax as M,_ as N,a as F,l as H,aQ as O,aR as E,aS as W}from"./components.global5n24RCIC.js";import{I as G}from"./ItemTypese0F2nuP7.js";import{d as R,j as d,k as i,K as s,z as l,l as K,m as k,F as P,s as f,R as I,N as J,P as B,r as u,i as o,Q as h,p as L,L as X,ac as Y}from"./@vueC3Nhqlrl.js";import Z from"./PopCollectionSelectorDtsi0cBR.js";import{I as x}from"./ItemImageBounipmB.js";const _=R({name:"BuilderItem",components:{ItemTypes:G},emits:["update:modelValue"],props:{modelValue:{type:Object,required:!1}},data(){return{loading:!1,errorMessage:null,placeHolders:{name:"Item Name",description:"Item Description",tags:"Tags, comma separated",url:"Link to item",rssURL:"RSS URL(Optional)",textContent:"Text Content"},tags:null,mode:"view",item:{idx:0,name:null,description:null,remark:null,url:null,rssURL:null,tags:null,type:null,textContent:null,availableDate:null,files:[]}}},mounted(){},computed:{},methods:{prettyTimePast:U,dateToMDYFormat:D,prettyDate:M,getPrimaryType(e){return["note","link","col"].includes(e)?e:"thing"},getSubType(e){return e},updateItem(){var e;this.mode="view",this.item.tags=(e=this.tags)==null?void 0:e.split(",").map(t=>t.trim()),this.$emit("update:modelValue",this.item)},update(){var e;this.item.tags=(e=this.tags)==null?void 0:e.split(",").map(t=>t.trim()),this.$emit("update:modelValue",this.item)},addImage(){const e=document.createElement("input");e.type="file",e.accept="image/*",e.onchange=t=>{const n=t.target.files;n&&n.length>0&&(this.item.files||(this.item.files=[]),this.item.files.push(n[0]),this.update())},e.click()},removeFile(e){this.item.files.splice(e,1),this.update()},updateType(e){console.log("updateType",e),this.item.type=e.subType||e.type,this.update()},loadComponent(){this.modelValue&&(this.item=this.modelValue),this.item.tags&&(this.tags=this.item.tags.join(", ")),this.item.editMode&&(this.mode="edit")}},watch:{modelValue:{immediate:!0,handler(e){var t;e&&(this.item=e,this.tags=(t=e.tags)==null?void 0:t.join(", "))}}},created(){this.loadComponent()}}),ee={class:"d-flex my-1 align-items-center justify-content-between flex-gap-1"},te={key:0,class:"rounded border py-4 px-3"},se={key:1,class:"text-muted"},ie={class:"mb-1"},le={class:"h5"},oe={class:"mb-2"},ne={class:""},ae={class:"mb-2 d-flex flex-gap-xs align-items-center"},de={class:""},re={key:0,class:"mb-2"},me={key:1,class:"mb-2"},ue={class:"text-muted small"},pe={class:"d-flex flex-gap-sm"};function ge(e,t,n,m,p,c){const v=u("b-icon"),y=u("b-button"),S=u("b-form-input"),T=u("b-form-textarea"),g=u("b-form-group"),V=u("ItemTypes"),w=u("b-link");return o(),d(P,null,[i("div",ee,[s(y,{size:"sm",class:"hoverrow",variant:"link",onClick:t[0]||(t[0]=r=>e.mode="edit")},{default:l(()=>[s(v,{icon:"pencil"})]),_:1}),i("div",null,[K(e.$slots,"default")])]),e.mode=="edit"?(o(),d("div",te,[s(g,{class:"form-group"},{default:l(()=>[t[14]||(t[14]=i("div",{class:"text-muted mb-1"},"Name",-1)),s(S,{id:"formName",modelValue:e.item.name,"onUpdate:modelValue":t[1]||(t[1]=r=>e.item.name=r),placeholder:e.placeHolders.name,required:"",onChange:t[2]||(t[2]=r=>e.update())},null,8,["modelValue","placeholder"]),t[15]||(t[15]=i("div",{class:"text-muted mt-3 mb-1"},"Description",-1)),s(T,{id:"formDescription",modelValue:e.item.description,"onUpdate:modelValue":t[3]||(t[3]=r=>e.item.description=r),placeholder:e.placeHolders.description,onChange:t[4]||(t[4]=r=>e.update()),rows:"1","max-rows":"6"},null,8,["modelValue","placeholder"])]),_:1}),t[19]||(t[19]=i("div",{class:"text-muted mt-3 mb-1"},"Type",-1)),e.item.type!="col"?(o(),k(V,{key:0,itemType:e.getPrimaryType(e.item.type),itemSubType:e.getSubType(e.item.type),onUpdate:e.updateType,disableButtons:!0},null,8,["itemType","itemSubType","onUpdate"])):(o(),d("div",se,"Collection")),t[20]||(t[20]=i("div",{class:"text-muted mt-3 mb-1"},"Tags, comma separated",-1)),s(g,{class:"form-group"},{default:l(()=>[s(S,{id:"formTags",modelValue:e.tags,"onUpdate:modelValue":t[5]||(t[5]=r=>e.tags=r),placeholder:e.placeHolders.tags,onChange:t[6]||(t[6]=r=>e.update())},null,8,["modelValue","placeholder"])]),_:1}),e.item.type!="col"?(o(),d(P,{key:2},[i("div",null,[t[16]||(t[16]=i("div",{class:"text-muted mt-3 mb-1"},"URL",-1)),s(g,{class:"form-group"},{default:l(()=>[s(S,{id:"formLink",modelValue:e.item.url,"onUpdate:modelValue":t[7]||(t[7]=r=>e.item.url=r),placeholder:e.placeHolders.url,onChange:t[8]||(t[8]=r=>e.update())},null,8,["modelValue","placeholder"])]),_:1})]),t[17]||(t[17]=i("div",{class:"text-muted mt-3 mb-1"},"Text",-1)),s(g,{class:"form-group"},{default:l(()=>[s(T,{id:"formDescription",modelValue:e.item.textContent,"onUpdate:modelValue":t[9]||(t[9]=r=>e.item.textContent=r),placeholder:e.placeHolders.textContent,onChange:t[10]||(t[10]=r=>e.update()),rows:"3","max-rows":"6"},null,8,["modelValue","placeholder"])]),_:1})],64)):f("",!0),s(y,{variant:"primary",size:"sm",onClick:t[11]||(t[11]=r=>e.updateItem()),class:"mt-2"},{default:l(()=>t[18]||(t[18]=[h(" Done ")])),_:1})])):(o(),d("div",{key:1,onClick:t[13]||(t[13]=r=>e.mode="edit"),role:"button",class:"round"},[i("div",ie,[i("div",le,I(e.item.name),1)]),i("div",oe,[i("div",ne,I(e.item.description),1)]),i("div",ae,[t[21]||(t[21]=i("div",{class:"text-muted small"},"Type:",-1)),i("div",de,I(e.item.type),1)]),e.item.url?(o(),d("div",re,[s(w,{class:"small",target:"_blank",href:e.item.url,onClick:t[12]||(t[12]=J(()=>{},["stop"]))},{default:l(()=>[h(I(e.item.url)+" ",1),s(v,{icon:"box-arrow-up-right"})]),_:1},8,["href"])])):f("",!0),e.item.textContent?(o(),d("div",me,[i("div",ue,I(e.item.textContent),1)])):f("",!0),i("div",pe,[(o(!0),d(P,null,B(e.item.tags,(r,b)=>(o(),d("div",{key:b,class:"smaller px-2 py-0 pill border fillrow"},I(r),1))),128))])]))],64)}const ce=N(_,[["render",ge]]),fe=R({name:"BuildItemList",props:["parentCollectionId","showParent","allowRedirect"],mixins:[F],components:{BuilderItem:ce,PopCollectionSelector:Z,ItemImage:x},data(){return{loading:!1,uploadText:"",errorMessage:null,parent:null,selectedParentCollectionId:null,defaults:{description:"Description of the item list"},progressLog:"",builderSettings:{description:"",dayIncrement:0},items:[],lastUpdate:null,aiSuggestInstructions:"Create list based on the provided context.",aiSuggestNumItems:"as many as needed",aiSuggestIncludeCollectionDetails:!0,aiSuggestIncludePreviousItems:!0,aiSuggestIncludeWikipediaLink:!0,aiSuggestAllowSubCollections:!1}},mounted(){},computed:{},methods:{prettyTimePast:U,dateToMDYFormat:D,prettyDate:M,async aiQuickAdd(){this.aiSuggestIncludeCollectionDetails=!0,this.aiSuggestIncludePreviousItems=!0,this.aiSuggestInstructions="Create list based on the provided context.",this.aiSuggestNumItems="between 1-3",await this.genAISuggested()},async genAISuggested(){if(!this.aiSuggestInstructions){this.showToast("Please enter instructions",{variant:"danger"});return}this.loading=!0;let e=null;this.parent&&this.aiSuggestIncludeCollectionDetails&&(e={name:this.parent.name,description:this.parent.description});let t=[];this.aiSuggestIncludePreviousItems&&(this.parent&&this.aiSuggestIncludeCollectionDetails&&(await this.getParentItems()).forEach(c=>{var v;t.push({name:c.name,description:c.description,tags:c.tags,type:c.type=="thing"?c.subType:c.type,textContent:(v=c.info)==null?void 0:v.value})}),t.push(...this.items.map(p=>({name:p.name,description:p.description,tags:p.tags,type:p.type,textContent:p.textContent}))));let n="";this.aiSuggestIncludeWikipediaLink&&(n=" Add wikipedia link if applicable."),this.aiSuggestAllowSubCollections?n=" Create sub collections if needed.":n=" Do not create sub collections.";const m=await this.sendReq("/client/ai/itemSuggestGenerator",{instructions:this.aiSuggestInstructions+n,numItems:this.aiSuggestNumItems,collectionDetails:e,previousItems:t});m.success?(this.items.push(...m.result.items),this.saveToLocal(!0),this.closeModal("ai-suggest-modal")):this.errorMessage=m.message,this.loading=!1},moveDown(e){if(e<this.items.length-1){const t=this.items.splice(e,1)[0];this.items.splice(e+1,0,t),this.items=[...this.items],console.log(this.items)}},moveUp(e){if(e>0){const t=this.items.splice(e,1)[0];this.items.splice(e-1,0,t),this.items=[...this.items]}},loadFromText(e){try{let t=JSON.parse(e);this.items=[];for(let n=0;n<t.length;n++){let m=t[n];m.idx=n,m.tags=m.tags,this.items.push(m)}this.closeModal("paste-modal")}catch(t){this.errorMessage="Invalid JSON data"+t}},addItem(){const e=new Date;let t=new Date(e);if(this.items.length>0){let c=this.items[this.items.length-1];c.availableDate&&(t=new Date(c.availableDate))}let n=Number(this.builderSettings.dayIncrement)*24*60*60*1e3,m=new Date(t.getTime()+n),p=m.toISOString().split("T")[0]+"T"+m.toTimeString().split(" ")[0];this.items.unshift({idx:this.items.length,id:null,name:null,type:null,tags:null,description:null,url:null,bannerQuery:null,textContent:null,availableDate:p,editMode:!0}),this.saveToLocal(!0)},addCollection(e){if(!e){this.closeModal("select-col-modal");return}this.selectedParentCollectionId=e,this.loadParentInfo(),this.closeModal("select-col-modal")},async loadParentInfo(){if(!this.selectedParentCollectionId)return;const e=await this.sendReq("/client/collection/infoByUser",{collectionId:this.selectedParentCollectionId,includeUserPermissions:!0});e.success?this.parent=e.result:(this.errorMessage=e.message,console.error(e.message))},async getParentItems(){if(!this.selectedParentCollectionId)return;let e=await this.sendReq("/client/collection/listItemsWithInfoByUser",{collectionId:this.selectedParentCollectionId});return e.success?H(e.result,15,!0):[]},async clear(e=!1){!e&&!await this.confirmModal("Are you sure you want to clear the list?")||(await O("itemListBuilder"),this.builderSettings={dayIncrement:0,description:""},this.items=[])},async saveToLocal(e=!1){if(!e&&this.lastUpdate&&new Date().getTime()-this.lastUpdate.getTime()<3e4)return;let t={parent:this.parent,items:this.items,builderSettings:this.builderSettings};await E("itemListBuilder",t),this.lastUpdate=null},async loadFromLocal(){var t,n;let e=await W("itemListBuilder");if(console.log("loadFromLocal",e),e!=null&&e.data){if(this.selectedParentCollectionId&&((n=(t=e.data)==null?void 0:t.collection)==null?void 0:n._id)!=this.selectedParentCollectionId)return;let m=e.data;this.parent=m.parent,this.items=m.items,this.builderSettings=m.builderSettings}},getPrimaryType(e){return["note","link","col"].includes(e)?e:"thing"},async save(){this.loading=!0;for(let e=0;e<this.items.length;e++)try{let t=this.items[e];t.tags==null&&(t.tags=[]);let n=t.tags.map(function(p){return p.toLowerCase().trim()}),m=this.getPrimaryType(t.type);if(m=="col"){const p={name:t.name,description:t.description,tags:n,visibility:this.parent.visibility},c=await this.sendReq("/client/collection/create",{data:{...p},collectionIds:[this.selectedParentCollectionId],customPermissions:null,bannerQuery:t.bannerQuery})}else{const p={name:t.name,description:t.description,url:t.url,rssURL:t.rssURL,type:m,subType:t.type,tags:n,info:{value:t.textContent}},c=await this.sendReq("/client/item/save",{details:p,collectionIds:[this.selectedParentCollectionId],bannerQuery:null})}this.progressLog="Item "+(e+1)+" of "+this.items.length+" saved"}catch(t){console.error(t),this.showToast("Error saving item "+(e+1),{variant:"danger"})}this.loading=!1,this.showToast("Items saved successfully",{variant:"success"}),this.clear(!0),this.RefreshIndexQuick(),this.$emit("update"),this.allowRedirect&&this.selectedParentCollectionId&&this.$router.push("/collection/"+this.selectedParentCollectionId)},autoSave(){setInterval(()=>{this.saveToLocal()},5e3)}},watch:{collection:{handler:function(e){this.lastUpdate=new Date},deep:!0},items:{handler:function(e){this.lastUpdate=new Date},deep:!0},builderSettings:{handler:function(e){this.lastUpdate=new Date},deep:!0}},created(){(this.$route.query.collectionId||this.parentCollectionId)&&(this.selectedParentCollectionId=this.parentCollectionId||this.$route.query.collectionId,this.loadParentInfo()),this.loadFromLocal().then(()=>{this.autoSave()})}}),he={class:"my-4 d-flex justify-content-between"},ve={class:"my-4 d-flex justify-content-between"},be={class:"mb-4"},ye={key:0,class:"mb-2"},Ie={key:0,class:"text-muted divfit"},Ce={class:"mb-3 d-flex flex-gap-1 align-items-center"},ke={class:"ms-1 h3 mb-1"},Se={class:"ms-1 text-muted small wwrap"},we={class:"ms-1"},Te={key:1,class:"mb-4 d-flex align-items-center flex-gap-sm"},Ve={class:"d-flex justify-content-between align-items-center"},$e={class:"d-flex flex-gap-sm align-items-center flex-wrap"},Pe={key:0,class:"ms-1"},Le={key:0,class:"ms-1"},Ue={class:"d-flex justify-content-end flex-gap-sm"},De={class:"d-flex flex-gap-sm flex-wrap"},Me={class:"my-3"},Ne={key:0,class:"d-flex flex-gap-sm"},Re={class:"text-muted"},Be={key:0},Ae={key:1},ze={key:1},je={key:2};function Qe(e,t,n,m,p,c){const v=u("b-form-checkbox"),y=u("b-form-group"),S=u("b-form-textarea"),T=u("b-form-input"),g=u("b-button"),V=u("b-spinner"),w=u("b-modal"),r=u("PopCollectionSelector"),b=u("b-icon"),A=u("ItemImage"),z=u("b-link"),j=u("BuilderItem"),Q=u("b-alert"),q=Y("b-modal");return o(),d("div",null,[s(w,{lazy:"true",id:"ai-suggest-modal",size:"lg","hide-footer":"",title:"AI Item Suggestion Generator"},{default:l(()=>[t[21]||(t[21]=i("div",{class:"my-2"},null,-1)),e.parentCollectionId?(o(),k(y,{key:0,class:"mt-3",label:""},{default:l(()=>[s(v,{modelValue:e.aiSuggestIncludeCollectionDetails,"onUpdate:modelValue":t[0]||(t[0]=a=>e.aiSuggestIncludeCollectionDetails=a)},{default:l(()=>t[15]||(t[15]=[h(" Include collection details for context? ")])),_:1},8,["modelValue"])]),_:1})):f("",!0),s(y,{class:"mt-3",label:""},{default:l(()=>[s(v,{modelValue:e.aiSuggestIncludePreviousItems,"onUpdate:modelValue":t[1]||(t[1]=a=>e.aiSuggestIncludePreviousItems=a)},{default:l(()=>t[16]||(t[16]=[h("Include any previous items for context? ")])),_:1},8,["modelValue"])]),_:1}),s(y,{class:"mt-3",label:""},{default:l(()=>[s(v,{modelValue:e.aiSuggestAllowSubCollections,"onUpdate:modelValue":t[2]||(t[2]=a=>e.aiSuggestAllowSubCollections=a)},{default:l(()=>t[17]||(t[17]=[h("Allow creating sub collections? ")])),_:1},8,["modelValue"])]),_:1}),s(y,{class:"mt-3",label:""},{default:l(()=>[s(v,{modelValue:e.aiSuggestIncludeWikipediaLink,"onUpdate:modelValue":t[3]||(t[3]=a=>e.aiSuggestIncludeWikipediaLink=a)},{default:l(()=>t[18]||(t[18]=[h("Add wikipedia link if applicable? ")])),_:1},8,["modelValue"])]),_:1}),s(y,{class:"mt-3",label:"Give description of items you want suggested to the AI to generate items"},{default:l(()=>[s(S,{rows:"10",modelValue:e.aiSuggestInstructions,"onUpdate:modelValue":t[4]||(t[4]=a=>e.aiSuggestInstructions=a)},null,8,["modelValue"])]),_:1}),s(y,{class:"mt-3",label:"Number of items to generate.",description:"This is approximate. Must not exceed 10 items at a time."},{default:l(()=>[s(T,{modelValue:e.aiSuggestNumItems,"onUpdate:modelValue":t[5]||(t[5]=a=>e.aiSuggestNumItems=a),placeholder:"enter a number or range of items to generate"},null,8,["modelValue"])]),_:1}),i("div",he,[s(g,{onClick:t[6]||(t[6]=a=>e.aiSuggestInstructions=""),variant:"outline-danger"},{default:l(()=>t[19]||(t[19]=[h("Clear")])),_:1}),s(g,{onClick:e.genAISuggested,variant:"primary",disabled:e.loading},{default:l(()=>[e.loading?(o(),k(V,{key:0,small:""})):f("",!0),t[20]||(t[20]=h(" Generate"))]),_:1},8,["onClick","disabled"])])]),_:1}),s(w,{lazy:"true",id:"select-col-modal",title:"Select Collection",size:"lg","hide-footer":""},{default:l(()=>[s(r,{onClose:e.addCollection},null,8,["onClose"])]),_:1}),s(w,{lazy:"true",id:"paste-modal","hide-footer":""},{default:l(()=>[t[24]||(t[24]=i("div",{class:"my-2"}," Paste in your JSON data here using this format: ",-1)),s(S,{rows:"20",modelValue:e.uploadText,"onUpdate:modelValue":t[7]||(t[7]=a=>e.uploadText=a)},null,8,["modelValue"]),i("div",ve,[s(g,{onClick:t[8]||(t[8]=a=>e.uploadText=""),variant:"outline-danger"},{default:l(()=>t[22]||(t[22]=[h("Clear")])),_:1}),s(g,{onClick:t[9]||(t[9]=a=>e.loadFromText(e.uploadText)),variant:"primary"},{default:l(()=>t[23]||(t[23]=[h("Load")])),_:1})])]),_:1}),i("div",be,[s(b,{icon:"exclamation-triangle",class:"me-1"}),t[25]||(t[25]=h(" AI generated items may be inaccurate or made up entirely. Please review and edit as needed. "))]),e.showParent?(o(),d("div",ye,[i("div",null,[e.parent?(o(),d("div",Ie,[i("div",Ce,[i("div",{class:L(["py-2 d-flex flex-gap-sm",e.isMobile?"":" align-items-center"]),onClick:t[10]||(t[10]=a=>e.showModal("select-col-modal")),role:"button"},[i("div",{class:L(e.isMobile?"miniItemImageContainer mt-2":"miniItemImageXLContainer")},[s(A,{class:"rounded shadow-sm miniItemImageLg",item:e.parent,alt:""},null,8,["item"])],2),i("div",null,[i("div",ke,I(e.parent.name),1),i("div",Se,I(e.textTruncate(e.parent.description,150)),1)]),i("div",we,[s(z,{to:`/collection/${e.selectedParentCollectionId}`,class:"small",target:"_blank"},{default:l(()=>[s(b,{icon:"box-arrow-up-right"})]),_:1},8,["to"])])],2)])])):e.parentCollectionId?f("",!0):(o(),d("div",Te,[i("div",{role:"button",onClick:t[11]||(t[11]=a=>e.showModal("select-col-modal")),class:"text-muted d-flex flex-gap-sm align-items-center border rounded p-1 px-2 fillrow"}," Select collection "),t[26]||(t[26]=i("div",{class:"xsmall text-muted"},"(optional)",-1))]))])])):f("",!0),i("div",Ve,[i("div",$e,[s(g,{variant:"primary",onClick:t[12]||(t[12]=a=>e.aiQuickAdd()),disabled:e.loading},{default:l(()=>[s(b,{icon:"lightning"}),e.isMobile?f("",!0):(o(),d("span",Pe,"Quick"))]),_:1},8,["disabled"]),X((o(),k(g,{disabled:e.loading},{default:l(()=>[s(b,{icon:"pencil"}),e.isMobile?f("",!0):(o(),d("span",Le,"Custom"))]),_:1},8,["disabled"])),[[q,void 0,"ai-suggest-modal"]])]),i("div",Ue,[i("div",De,[s(g,{variant:"outline-danger",onClick:t[13]||(t[13]=a=>e.clear()),disabled:e.loading||!e.items||e.items.length==0},{default:l(()=>t[27]||(t[27]=[h(" Reset ")])),_:1},8,["disabled"]),s(g,{variant:"primary",onClick:t[14]||(t[14]=a=>e.save()),disabled:e.loading||!e.items||e.items.length==0},{default:l(()=>[s(b,{icon:"save"}),t[28]||(t[28]=h(" Save "))]),_:1},8,["disabled"])])])]),i("div",Me,[e.loading?(o(),d("div",Ne,[i("div",Re,[s(V,{small:"",type:"grow"})]),e.progressLog?(o(),d("div",Be,"Progress: "+I(e.progressLog),1)):(o(),d("div",Ae,"loading"))])):f("",!0)]),e.items&&e.items.length!=0?(o(),d("div",ze,[(o(!0),d(P,null,B(e.items,(a,C)=>(o(),d("div",{key:a.idx,class:"py-2 my-1"},[t[29]||(t[29]=i("hr",{class:"my-1"},null,-1)),s(j,{modelValue:e.items[C],"onUpdate:modelValue":$=>e.items[C]=$},{default:l(()=>[C!=0?(o(),k(g,{key:0,size:"sm",class:"m-0 hoverrow",variant:"link",onClick:$=>e.moveUp(C)},{default:l(()=>[s(b,{icon:"chevron-up"})]),_:2},1032,["onClick"])):f("",!0),C+1<e.items.length?(o(),k(g,{key:1,size:"sm",class:"m-0 hoverrow",variant:"link",onClick:$=>e.moveDown(C)},{default:l(()=>[s(b,{icon:"chevron-down"})]),_:2},1032,["onClick"])):f("",!0),s(g,{size:"sm",class:"m-0 hoverrow",variant:"link",onClick:$=>e.items.splice(C,1)},{default:l(()=>[s(b,{icon:"x-lg"})]),_:2},1032,["onClick"])]),_:2},1032,["modelValue","onUpdate:modelValue"])]))),128))])):e.loading?f("",!0):(o(),d("div",je,t[30]||(t[30]=[i("hr",{class:"mt-4"},null,-1),i("div",{class:"text-muted mt-4"}," Select a method to create new items. ",-1)]))),e.errorMessage?(o(),k(Q,{key:3,class:"m-4",variant:"danger","model-value":!!e.errorMessage,innerHTML:e.errorMessage},null,8,["model-value","innerHTML"])):f("",!0)])}const We=N(fe,[["render",Qe]]);export{We as B};
