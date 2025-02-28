import{F as M,C as J,D as K,_ as D,a as z,J as W,G as Q}from"./components.global5n24RCIC.js";import{P as Y}from"./PublicProfileEditBQPXtV-L.js";import{I as G,a as N,b as q}from"./ItemTargetAudiencesCuVZ52MA.js";import{I as X,a as Z}from"./ItemContentTypeCQF2L4av.js";import{d as R,r as l,i as a,j as r,k as i,K as s,z as o,Q as u,R as g,F as T,P as L,m as b,ac as j,p as x,s as y,L as S}from"./@vueC3Nhqlrl.js";import{S as ee}from"./SelectImageC6eE4eIL.js";import{P as te}from"./PublishedItemDetailsBPLCxl-D.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";import"./AddPublishedToLibraryCH8DTyVO.js";import"./PopCollectionSelectorDtsi0cBR.js";import"./CreateCollectionCvnp9GSK.js";import"./TIIconDefaultDZ-9wHcm.js";import"./ai_lookup_utilszDX_hcwM.js";import"./ItemImageBounipmB.js";import"./SelectAccountUsersC0KunEpm.js";const se=R({name:"ItemCriteria",components:{ItemMinAgeGroup:G,ItemEduValue:N,ItemTargetAudiences:q},emits:["update:modelValue"],props:{modelValue:{type:Array,required:!0}},data(){return{value:this.modelValue,minAgeOptions:M().minAgeGroup.map(e=>({value:e.key,text:e.name})),tagOptions:M().content.map(e=>({value:e.key,text:e.name})),costOptions:M().cost.map(e=>({value:e.key,text:e.name})),adsOptions:M().ads.map(e=>({value:e.key,text:e.name})),costdOptions:M().costDetails.map(e=>({value:e.key,text:e.name})),val2:this.value,useCriteria:{eduValue:null,minAgeGroup:null,targetAudiences:[],cost:null,ads:null,costDetails:[],content:[]}}},mounted(){},computed:{},methods:{tagName:J,update(e){this.$emit("update:modelValue",this.output())},output(){return Array.from(new Set([this.useCriteria.eduValue,this.useCriteria.minAgeGroup,...this.useCriteria.targetAudiences,this.useCriteria.cost,this.useCriteria.ads,...this.useCriteria.costDetails,...this.useCriteria.content].filter(e=>e!=null)))},load(){this.useCriteria={...K(this.value)}}},created(){this.load()}}),oe={class:"row"},ie={class:"col-sm-6 col-md-4"},ae={class:"col-sm-6 col-md-4"},le={class:"col-sm-6 col-md-4"},ne={class:"row"},re={class:"col-sm-6 col-md-4"},de={class:"col-sm-6 col-md-4"},ue={class:"col-sm-6 col-md-4"},me={class:"row"},pe={class:"col"},fe={class:"d-flex justify-content-between flex-wrap flex-gap-xs"};function ce(e,t,_,C,I,$){const m=l("b-form-radio"),p=l("b-form-radio-group"),c=l("b-form-group"),f=l("b-form-checkbox"),v=l("b-form-checkbox-group");return a(),r("div",null,[i("div",oe,[i("div",ie,[t[20]||(t[20]=i("div",{class:"mb-1"}," Educational Value ",-1)),s(c,{class:"form-group"},{default:o(()=>[s(p,{stacked:"",modelValue:e.useCriteria.eduValue,"onUpdate:modelValue":t[0]||(t[0]=n=>e.useCriteria.eduValue=n),onChange:t[1]||(t[1]=n=>e.update())},{default:o(()=>[s(m,{value:"eduval_na"},{default:o(()=>t[14]||(t[14]=[u("NA")])),_:1}),s(m,{value:"eduval_academic"},{default:o(()=>t[15]||(t[15]=[u("Academic (High)")])),_:1}),s(m,{value:"eduval_educational"},{default:o(()=>t[16]||(t[16]=[u("Educational (Medium) ")])),_:1}),s(m,{value:"eduval_edutainment"},{default:o(()=>t[17]||(t[17]=[u("Edutainment (Low) ")])),_:1}),s(m,{value:"eduval_fun"},{default:o(()=>t[18]||(t[18]=[u("Just for fun (None)")])),_:1}),s(m,{value:"eduval_mixed"},{default:o(()=>t[19]||(t[19]=[u("Mixed")])),_:1})]),_:1},8,["modelValue"])]),_:1})]),i("div",ae,[t[21]||(t[21]=i("div",{class:"mb-1"}," Min Age Group ",-1)),s(c,{class:"form-group"},{default:o(()=>[s(p,{stacked:"",modelValue:e.useCriteria.minAgeGroup,"onUpdate:modelValue":t[2]||(t[2]=n=>e.useCriteria.minAgeGroup=n),onChange:t[3]||(t[3]=n=>e.update()),options:e.minAgeOptions},null,8,["modelValue","options"])]),_:1})]),i("div",le,[t[24]||(t[24]=i("div",{class:"mb-1"}," Target Audiences ",-1)),s(c,{class:"form-group"},{default:o(()=>[s(v,{stacked:"",modelValue:e.useCriteria.targetAudiences,"onUpdate:modelValue":t[4]||(t[4]=n=>e.useCriteria.targetAudiences=n),onChange:t[5]||(t[5]=n=>e.update())},{default:o(()=>[s(f,{disabled:e.useCriteria.minAgeGroup!="minage_na",value:"ta_all"},{default:o(()=>t[22]||(t[22]=[u("All")])),_:1},8,["disabled"]),s(f,{disabled:!["minage_na","minage_prek"].includes(e.useCriteria.minAgeGroup),value:"ta_prek"},{default:o(()=>t[23]||(t[23]=[u("Pre-K (0-5)")])),_:1},8,["disabled"]),s(f,{disabled:!["minage_na","minage_prek","minage_kids"].includes(e.useCriteria.minAgeGroup),value:"ta_kids"},{default:o(()=>[u(g(e.tagName("ta_kids")),1)]),_:1},8,["disabled"]),s(f,{disabled:!["minage_na","minage_prek","minage_kids","minage_preteen"].includes(e.useCriteria.minAgeGroup),value:"ta_preteen"},{default:o(()=>[u(g(e.tagName("ta_preteen")),1)]),_:1},8,["disabled"]),s(f,{disabled:!["minage_na","minage_prek","minage_kids","minage_preteen","minage_teen"].includes(e.useCriteria.minAgeGroup),value:"ta_teen"},{default:o(()=>[u(g(e.tagName("ta_teen")),1)]),_:1},8,["disabled"]),s(f,{disabled:!["minage_na","minage_prek","minage_kids","minage_preteen","minage_teen","minage_adult"].includes(e.useCriteria.minAgeGroup),value:"ta_adult"},{default:o(()=>[u(g(e.tagName("ta_adult")),1)]),_:1},8,["disabled"])]),_:1},8,["modelValue"])]),_:1})])]),i("div",ne,[i("div",re,[t[25]||(t[25]=i("div",{class:"mb-1"}," Cost ",-1)),s(c,{class:"form-group"},{default:o(()=>[s(p,{stacked:"",modelValue:e.useCriteria.cost,"onUpdate:modelValue":t[6]||(t[6]=n=>e.useCriteria.cost=n),onChange:t[7]||(t[7]=n=>e.update()),options:e.costOptions},null,8,["modelValue","options"])]),_:1})]),i("div",de,[t[26]||(t[26]=i("div",{class:"mb-1"}," Ads ",-1)),s(c,{class:"form-group",description:"How distracting are the ads?"},{default:o(()=>[s(p,{stacked:"",modelValue:e.useCriteria.ads,"onUpdate:modelValue":t[8]||(t[8]=n=>e.useCriteria.ads=n),onChange:t[9]||(t[9]=n=>e.update()),options:e.adsOptions},null,8,["modelValue","options"])]),_:1})]),i("div",ue,[t[27]||(t[27]=i("div",{class:"mb-1"}," Cost Details ",-1)),s(c,{class:"form-group"},{default:o(()=>[s(v,{stacked:"",modelValue:e.useCriteria.costDetails,"onUpdate:modelValue":t[10]||(t[10]=n=>e.useCriteria.costDetails=n),onChange:t[11]||(t[11]=n=>e.update()),options:e.costdOptions},null,8,["modelValue","options"])]),_:1})])]),i("div",me,[i("div",pe,[t[28]||(t[28]=i("div",{class:"mb-2"}," Included Content",-1)),i("div",fe,[(a(!0),r(T,null,L(e.tagOptions,n=>(a(),b(f,{"button-variant":"outline-primary",button:"",modelValue:e.useCriteria.content,"onUpdate:modelValue":t[12]||(t[12]=k=>e.useCriteria.content=k),key:n.value,value:n.value,onChange:t[13]||(t[13]=k=>e.update())},{default:o(()=>[u(g(n.text),1)]),_:2},1032,["modelValue","value"]))),128))])])])])}const ge=D(se,[["render",ce]]),be=R({name:"ListFromInput",components:{},props:{value:{type:Array,default:()=>[]},name:{type:String,default:"unknown"},formType:{type:String,default:"input"}},data(){return{content:""}},mounted(){},computed:{},methods:{update(e){this.$emit("input",this.prepOutput())},prepOutput(){return this.content.split(",").map(e=>e.trim()).filter(e=>e.length>0)},load(){this.content=this.value.join(", ")}},created(){this.load()}});function he(e,t,_,C,I,$){const m=l("b-form-input");return a(),r("div",null,[s(m,{modelValue:e.content,"onUpdate:modelValue":t[0]||(t[0]=p=>e.content=p),name:e.name,onInput:e.update},null,8,["modelValue","name","onInput"])])}const ve=D(be,[["render",he]]),ye=R({name:"ListFromTextArea",components:{},props:{value:{type:Array,default:()=>[]},name:{type:String,default:"unknown"},placeholder:{type:String,default:"Enter comma separated values"}},data(){return{content:""}},mounted(){},computed:{},methods:{update(e){this.$emit("input",this.prepOutput())},prepOutput(){return this.content.split(",").map(e=>e.trim()).filter(e=>e.length>0)},load(){this.content=this.value.join(", ")}},created(){this.load()}});function _e(e,t,_,C,I,$){const m=l("b-form-textarea");return a(),r("div",null,[s(m,{modelValue:e.content,"onUpdate:modelValue":t[0]||(t[0]=p=>e.content=p),name:e.name,onInput:e.update,rows:"3","max-rows":"6",placeholder:e.placeholder},null,8,["modelValue","name","onInput","placeholder"])])}const Ce=D(ye,[["render",_e]]),Ie=R({name:"EditPublished",mixins:[z],components:{ItemMinAgeGroup:G,ItemEduValue:N,ItemTargetAudiences:q,ItemContentTags:X,ItemCriteria:ge,ItemContentType:Z,ListFromInput:ve,ListFromTextArea:Ce,SelectImage:ee},props:{itemProp:{type:Object,default:null}},emits:["close"],data(){return{item:null,meta:null,loading:!1,url:null,name:null,comment:null,description:null,tags:null,type:null,patterns:[],categories:[],categoryOptions:[],useCriteria:[],errorMessage:null,imageFilename:null,imageRefresh:0}},mounted(){},computed:{currentImage(){var t;let e=(t=this.meta)==null?void 0:t.bannerImagePath;return this.imageFilename&&(e=`${this.imageFilename}?imageRefresh=${this.imageRefresh}`),this.getImagePathWithDefault(e)}},methods:{toggleCategory(e){this.categories.includes(e)?this.categories=this.categories.filter(t=>t!==e):this.categories.push(e)},loadCategories(){this.sendReq("/categories",{availOnly:!1}).then(e=>{e.success?(this.categoryOptions=e.result,this.errorMessage=null,this.loading=!1):(console.error("Error:",e.message),this.errorMessage=e.message)})},loadItem(){var e,t,_,C,I,$,m,p;this.meta=((e=this.item)==null?void 0:e.meta)||{},this.meta||(this.meta={}),this.url=(_=(t=this.item)==null?void 0:t.data)==null?void 0:_.url,this.name=this.item.name,this.description=this.item.description,this.patterns=((I=(C=this.item)==null?void 0:C.data)==null?void 0:I.patterns)||[],this.tags=this.item.tags,this.type=this.item.type,this.imageFilename=($=this.item)==null?void 0:$.imageFilename,this.useCriteria=((m=this.item)==null?void 0:m.useCriteria)||[],this.categories=((p=this.item)==null?void 0:p.categories)||[]},async selectImage(e){if(!e)return;const t=`pubitem_${this.item._id}.jpg`;(await this.sendReq("/image/upload",{imageData:e,filename:t})).success&&(this.imageFilename=t,await this.save())},async save(){this.loading=!0;try{const e={name:this.name,description:this.description,categories:this.categories,useCriteria:this.useCriteria,patterns:this.patterns,imageFilename:this.imageFilename,url:this.url},t=await this.sendReq("/published/info/update",{itemId:this.item._id,data:e});t.success?(this.loadItem(),this.$emit("close",!0),this.errorMessage=null):(console.error("Error:",t.message),this.errorMessage=t.message)}catch(e){this.errorMessage=e,console.error(e)}this.loading=!1}},created(){this.item=this.itemProp,this.loadItem(),this.loadCategories()}}),$e={class:"my-2"},ke={key:0},Ve={class:"mb-2"},we={class:"my-3"},Pe=["src"],Ae={key:1},Me={class:"mb-4"},De={class:"my-2"},Re={class:"my-2"},Ee={class:"h5"},Ue={class:"ms-2"},Se={key:1},Oe={class:"mb-4"},Te={key:0},Le={key:1},Fe={key:0},ze={key:1,class:"text-center my-4"};function Ge(e,t,_,C,I,$){const m=l("SelectImage"),p=l("b-modal"),c=l("b-button"),f=l("b-form"),v=l("b-form-input"),n=l("b-form-group"),k=l("b-form-textarea"),V=l("ListFromTextArea"),E=l("b-icon"),w=l("b-col"),A=l("b-row"),O=l("b-card"),U=l("ItemCriteria"),h=l("b-alert"),H=l("b-container"),B=l("b-spinner"),F=j("b-modal");return a(),r("div",null,[s(p,{lazy:"true",id:"edit-image-modal",title:"Select Image",size:"lg","hide-footer":"","no-close-on-esc":"","no-close-on-backdrop":""},{default:o(()=>[s(m,{onSelectImage:e.selectImage,"max-size":600,smallImageSize:300,keepAspectRatio:!0,onClose:t[0]||(t[0]=d=>e.closeModal("edit-image-modal"))},null,8,["onSelectImage"])]),_:1}),s(p,{lazy:"true",id:"categories-modal",title:"Categories",size:"lg","no-close-on-esc":"","no-close-on-backdrop":""},{default:o(()=>[i("div",null,[s(f,{class:"mx-4"},{default:o(()=>[i("div",$e,[(a(!0),r(T,null,L(e.categoryOptions,d=>(a(),b(c,{key:d,variant:"outline-primary",class:x(["me-2 mb-2",{active:e.categories.includes(d)}]),onClick:P=>e.toggleCategory(d)},{default:o(()=>[u(g(d),1)]),_:2},1032,["class","onClick"]))),128))])]),_:1})])]),_:1}),e.item?(a(),r("div",ke,[s(H,{class:"container"},{default:o(()=>[s(A,{class:"row"},{default:o(()=>[s(w,{class:"col"},{default:o(()=>[s(f,null,{default:o(()=>[e.item.type=="url"?(a(),b(n,{key:0,class:"form-group",label:"URL:"},{default:o(()=>[s(v,{id:"forURL",autocorrect:"off",autocapitalize:"off",modelValue:e.url,"onUpdate:modelValue":t[1]||(t[1]=d=>e.url=d)},null,8,["modelValue"])]),_:1})):y("",!0),s(n,{class:"form-group"},{default:o(()=>{var d;return[s(v,{id:"formName",modelValue:e.name,"onUpdate:modelValue":t[2]||(t[2]=P=>e.name=P),placeholder:e.item.name||((d=e.meta)==null?void 0:d.title)},null,8,["modelValue","placeholder"])]}),_:1}),s(n,{class:"form-group",label:"Description:","label-for":"formDescription",description:"Description (Leave blank to use default)"},{default:o(()=>{var d;return[s(k,{id:"formDescription",modelValue:e.description,"onUpdate:modelValue":t[3]||(t[3]=P=>e.description=P),placeholder:e.item.description||((d=e.meta)==null?void 0:d.description),rows:"3","max-rows":"6"},null,8,["modelValue","placeholder"])]}),_:1}),e.item.type=="col"?(a(),b(n,{key:1,class:"form-group",label:"Comment:","label-for":"formComment",description:"Comment (not required)"},{default:o(()=>[s(k,{id:"formComment",modelValue:e.comment,"onUpdate:modelValue":t[4]||(t[4]=d=>e.comment=d),rows:"3","max-rows":"6"},null,8,["modelValue"])]),_:1})):y("",!0),e.type=="link"?(a(),b(n,{key:2,class:"form-group",label:"URI Patterns:","label-for":"formPatterns",description:"Accepted URI Patterns. one per line, * is wild card. For example: *.google.com/* will match all google.com no matter the path provided"},{default:o(()=>[s(V,{modelValue:e.patterns,"onUpdate:modelValue":t[5]||(t[5]=d=>e.patterns=d),placeholder:"Enter URI Patterns"},null,8,["modelValue"])]),_:1})):y("",!0),i("div",Ve,[i("div",we,[t[8]||(t[8]=i("div",{class:"mb-1"},"Image",-1)),e.currentImage?(a(),r("img",{key:0,src:`${e.currentImage}`,alt:"",style:{width:"300px"},class:"rounded"},null,8,Pe)):(a(),r("div",Ae,"No Image")),S((a(),b(c,{variant:"link"},{default:o(()=>[s(E,{icon:"pencil"})]),_:1})),[[F,void 0,void 0,{"edit-image-modal":!0}]])])])]),_:1})]),_:1})]),_:1}),s(A,{class:"row"},{default:o(()=>[s(w,{class:"col"},{default:o(()=>[i("div",Me,[i("div",null,[t[11]||(t[11]=i("hr",null,null,-1)),i("div",null,[i("div",De,[i("div",null,[i("div",Re,[i("div",Ee,[t[9]||(t[9]=u(" Categories ")),S((a(),b(c,{variant:"link"},{default:o(()=>[s(E,{icon:"pencil"})]),_:1})),[[F,void 0,void 0,{"categories-modal":!0}]])]),i("div",Ue,[e.categories&&e.categories.length>0?(a(),b(O,{key:0},{default:o(()=>[(a(!0),r(T,null,L(e.categories,(d,P)=>(a(),r("span",{key:P,class:"mx-2"},g(d),1))),128))]),_:1})):(a(),r("div",Se,"No categories assigned"))])])])])]),t[12]||(t[12]=i("hr",null,null,-1)),i("div",null,[i("div",Oe,[t[10]||(t[10]=i("div",{class:"h5 mb-3"},"Age Group and Educational Value",-1)),s(U,{modelValue:e.useCriteria,"onUpdate:modelValue":t[6]||(t[6]=d=>e.useCriteria=d)},null,8,["modelValue"])])])])])]),_:1})]),_:1}),t[14]||(t[14]=i("hr",null,null,-1)),s(A,{class:"mt-3"},{default:o(()=>[s(w,{class:"col"},{default:o(()=>[e.errorMessage?(a(),r("div",Te,[s(h,{variant:"danger","model-value":!!e.errorMessage,innerHTML:e.errorMessage},null,8,["model-value","innerHTML"])])):y("",!0),s(c,{onClick:t[7]||(t[7]=d=>e.save())},{default:o(()=>t[13]||(t[13]=[u("Save")])),_:1})]),_:1})]),_:1})]),_:1})])):(a(),r("div",Le,[e.errorMessage?(a(),r("div",Fe,[s(h,{variant:"danger",show:"",innerHTML:e.errorMessage},null,8,["innerHTML"])])):(a(),r("div",ze,[s(B,{label:"Loading..."})]))]))])}const Ne=D(Ie,[["render",Ge]]),qe=R({name:"CurateItem",mixins:[z],components:{PublishedItemDetails:te,EditPublished:Ne,PublicProfileEdit:Y},data(){return{itemRaw:null,item:void 0,childItems:[],accessDenied:!0,curated:!1,curatorId:null,curatedDate:null,curatorProfile:null,overallRating:null,comment:null,itemId:void 0,easyId:void 0,loading:!1,errorMessage:null}},mounted(){},computed:{},methods:{async updateEasyId(){if(this.easyId){if(this.easyId=this.easyId.trim().toLowerCase(),/[^a-z0-9-]/.test(this.easyId))throw new Error("Readable Id can only contain letters, numbers, and -");/-\d{3,}$/.test(this.easyId)||(this.easyId+="-"+Math.floor(Math.random()*1e3)),await this.apiReq("/published/updateEasyId",{itemId:this.itemId,easyId:this.easyId})}},async updateStatus(e){if(this.errorMessage=null,!(!e&&!await this.getRef("msgBoxConfirm").show("Are you sure you want to change set curated to "+e+"?",{title:"Confirm",okVariant:"danger",okTitle:"Confirm",cancelTitle:"Cancel",hideHeaderClose:!1}))){try{await this.updateEasyId()}catch(t){this.errorMessage=t.message;return}try{const t=await this.apiReq("/published/updateCurationStatus",{itemId:this.itemId,approved:e,comment:this.comment});await this.loadPublished()}catch(t){this.errorMessage=t.message}}},async getCuratorProfile(){const e=await this.apiReq("/user/public/get",{id:this.curatorId});this.curatorProfile=e.result},async loadPublished(){var t;const e=await this.sendReq("/published/view",{itemId:this.itemId});e.success&&e.result?(this.itemRaw=e.result.info,this.item=W(e.result.info),((t=this.item)==null?void 0:t.type)=="col"&&(this.childItems=Q(e.result.items)),this.curated=this.item.curated,this.easyId=this.item.easyId,this.comment=this.item.curatorComment,this.curatedDate=this.item.curatedDate,this.curatorId=this.item.curatorId,await this.getCuratorProfile(),this.loading=!1):(console.error("Error:",e),this.loading=!1)},async load(){const e=await this.loadPublicProfile();!e||!e.curator?this.accessDenied=!0:this.accessDenied=!1,await this.loadPublished()}},created(){this.itemId=this.$route.params.itemId,this.load()}}),je={class:"text-center"},He=["to"],Be={key:0},Je={class:"card"},Ke={class:"mb-3 text-center"},We={class:"mb-2 d-flex flex-gap-1 flex-wrap"},Qe={key:0},Ye={class:"mb-2"},Xe={class:"mb-2"},Ze={class:"mb-2"},xe={class:"mb-2 d-flex justify-content-end"},et={key:1},tt={key:0,class:"mb-2 alert alert-info"},st={class:"d-flex justify-content-between"},ot={key:0,class:"mt-4 alert alert-danger"},it={key:1};function at(e,t,_,C,I,$){const m=l("b-modal"),p=l("PublicProfileEdit"),c=l("EditPublished"),f=l("b-col"),v=l("b-row"),n=l("PublishedItemDetails"),k=l("router-link"),V=l("b-button"),E=l("b-form-input"),w=l("b-form-group"),A=l("b-form-textarea"),O=l("b-container"),U=j("b-modal");return a(),r("div",null,[s(m,{lazy:"true",id:"saved-modal",title:"Review Published Successfully","hide-footer":"","hide-header":""},{default:o(()=>[i("div",je,[t[7]||(t[7]=i("div",{class:"my-4"}," You review submitted has been submitted. Thank you! ",-1)),i("button",{class:"btn btn-primary",to:`/item/${e.itemId}`,onClick:t[0]||(t[0]=h=>e.closeModal("saved-modal"))}," Ok ",8,He)])]),_:1}),s(m,{lazy:"true",id:"public-profile-modal",title:"Public Profile Settings","hide-footer":""},{default:o(()=>[s(p,{onClick:t[1]||(t[1]=h=>{e.closeModal("public-profile-modal"),e.loadPublicProfile()})})]),_:1}),s(m,{lazy:"true",id:"edit-published-modal",title:"Public Profile Settings","hide-footer":"",size:"xl"},{default:o(()=>[e.itemRaw?(a(),b(c,{key:0,itemProp:e.itemRaw,onClose:t[2]||(t[2]=h=>{e.load(),e.closeModal("edit-published-modal")})},null,8,["itemProp"])):y("",!0)]),_:1}),s(m,{lazy:"true",id:"raw-item-modal",title:"Raw Item","hide-footer":"",size:"xl"},{default:o(()=>[i("pre",null,g(e.itemRaw),1)]),_:1}),e.accessDenied?y("",!0):(a(),r("div",Be,[e.item?(a(),b(O,{key:0},{default:o(()=>[s(v,{class:"row"},{default:o(()=>[s(f,{class:"col"},{default:o(()=>t[8]||(t[8]=[i("div",{class:"my-4"},[i("h3",null,"Item Curation")],-1)])),_:1})]),_:1}),s(v,{class:"row"},{default:o(()=>[s(f,{class:"col"},{default:o(()=>[i("div",Je,[s(n,{item:e.item},null,8,["item"]),t[10]||(t[10]=i("hr",null,null,-1)),i("div",Ke,[s(k,{to:`/v/${e.itemId}`},{default:o(()=>t[9]||(t[9]=[u("View Item")])),_:1},8,["to"])])])]),_:1})]),_:1}),s(v,{class:"my-3"},{default:o(()=>[s(f,{class:"col"},{default:o(()=>[i("div",We,[S((a(),b(V,null,{default:o(()=>t[11]||(t[11]=[u(" Edit Details")])),_:1})),[[U,void 0,void 0,{"edit-published-modal":!0}]]),S((a(),b(V,null,{default:o(()=>t[12]||(t[12]=[u(" Raw Details")])),_:1})),[[U,void 0,void 0,{"raw-item-modal":!0}]])]),e.curated?(a(),r("div",Qe,[i("div",Ye," Curated on "+g(e.curatedDate)+" by "+g(e.curatorProfile?e.curatorProfile.username:"?"),1),i("div",Xe,"Comment: "+g(e.easyId),1),i("div",Ze,"Comment: "+g(e.comment),1),i("div",xe,[s(V,{variant:"danger",onClick:t[3]||(t[3]=h=>e.updateStatus(!1))},{default:o(()=>t[13]||(t[13]=[u(" Change to Uncurated ")])),_:1})])])):(a(),r("div",et,[t[16]||(t[16]=i("div",{class:"mb-2"}," This item is not curated. ",-1)),e.item.type=="col"?(a(),r("div",tt," All children must be curated before this collection can be curated. ")):y("",!0),s(w,{class:"form-group",description:"Readable Id should not contain special characters other than -"},{default:o(()=>[s(E,{modelValue:e.easyId,"onUpdate:modelValue":t[4]||(t[4]=h=>e.easyId=h),placeholder:"Enter a readable Id"},null,8,["modelValue"])]),_:1}),s(w,{class:"form-group",description:"Comment (Leave blank to use default)"},{default:o(()=>[s(A,{id:"formComment",modelValue:e.comment,"onUpdate:modelValue":t[5]||(t[5]=h=>e.comment=h),placeholder:"enter a comment",rows:"3","max-rows":"6"},null,8,["modelValue"])]),_:1}),i("div",st,[s(V,{variant:"outline-secondary",to:`/v/${e.itemId}`},{default:o(()=>t[14]||(t[14]=[u(" Back ")])),_:1},8,["to"]),s(V,{variant:"success",onClick:t[6]||(t[6]=h=>e.updateStatus(!0))},{default:o(()=>t[15]||(t[15]=[u(" Approve ")])),_:1})])]))]),_:1})]),_:1}),s(v,{class:"row"},{default:o(()=>[s(f,{class:"col"},{default:o(()=>[e.errorMessage?(a(),r("div",ot,g(e.errorMessage),1)):y("",!0)]),_:1})]),_:1})]),_:1})):y("",!0)])),e.accessDenied&&!e.loading?(a(),r("div",it," Access Denied ")):y("",!0)])}const $t=D(qe,[["render",at]]);export{$t as default};
