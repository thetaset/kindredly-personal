import{C as L}from"./CreateCollectionCvnp9GSK.js";import A from"./AddItemBupo5MFl.js";import{T as x,P as M}from"./TIIconDefaultDZ-9wHcm.js";import{T as S}from"../kindredapp.js";import N from"./PopCollectionSelectorDtsi0cBR.js";import{a as O,ai as V,ah as _,_ as z}from"./components.global5n24RCIC.js";import{d as q,j as m,K as o,z as n,k as s,m as c,Q as u,L as W,ab as B,X as D,s as d,p as g,r as a,i as r,R as h,F as E,P as F}from"./@vueC3Nhqlrl.js";import"./ai_lookup_utilszDX_hcwM.js";import"./CollectionButtonListDy0-Tbdc.js";import"./ItemTypese0F2nuP7.js";import"./ItemImageBounipmB.js";import"./AddItemFromLibraryResultsB-9vIRhu.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";import"./vue-routerB6Jsgi62.js";import"./browserTabsOcpZnJJW.js";import"./vue-plugin-load-scriptXwA-LyvJ.js";import"./bootstrapDQG5F40S.js";import"./@popperjsCCtJ9KiL.js";import"./@mozillaCDB2aYYy.js";const j=q({mixins:[O],name:"UserLibrary",components:{CreateCollection:L,AddItem:A,TIIconDefault:x,ProfileImage:M,TIListViewOptions:S,PopCollectionSelector:N},data(){return{loading:!0,addCollectionType:null,addContentPage:null,createCollectionForm:{name:null,description:null,visibility:"private"},targetUserId:null,targetUser:null,errorMessage:void 0,searchText:void 0,fields:[{key:"name",label:"",sortable:!1}]}},mounted(){},computed:{pathPrefix(){return"/userLibrary/"+this.targetUserId},navListItems(){return[{path:this.pathPrefix,name:"Collections",icon:"collection",desc:"Collections"},{path:this.pathPrefix+"/items/sharedWithMe",name:"Shared with User",icon:"share",desc:"Shared with User"},{path:this.pathPrefix+"/items/uncategorized",name:"Uncategorized",icon:"ui-radios-grid",desc:"Unorganized"},{path:this.pathPrefix+"/items/feedback/isHidden",name:"Hidden",icon:"eye-slash",desc:"Hidden"},{path:this.pathPrefix+"/items/archived",name:"Archived",icon:"archive",desc:"Archived"},{path:this.pathPrefix+"/items/all",name:"All",icon:"list",desc:"All"}]},libraryTitle(){var t;return(((t=this.targetUser)==null?void 0:t.username)||"")+"'s Library"},currentPageName(){var e;return(e=this.currentPage)==null?void 0:e.name},isAdminOfTargetUser(){var e;return this.isAdminUser&&((e=this.targetUser)==null?void 0:e.type)=="restricted"},currentPage(){return this.navListItems.find(e=>e.path==this.$route.path)},navList(){return this.navListItems.map(e=>({...e,currentPath:e.path==this.$route.path,class:e.path==this.$route.path?"btn-primary":""}))}},methods:{backgroundClassName:V,async _shareWithUsers(e){const t=await this.sendReq("/item/shareWithUsers",{itemId:e,userIds:[this.targetUserId],notifyMessage:void 0,permission:"viewer"});if(!t.success){this.errorMessage=t.message,console.error(this.errorMessage);return}},async addExistingCollectionToLibrary(e){await this._shareWithUsers(e),this.closeModal("add-to-user-lib-modal"),e&&this.$router.push("/collection/"+e)},addItemToLibrary(e){this.closeModal("add-to-user-lib-modal"),e&&this.$router.push("/item/"+e)},addNewCollectionToLibrary(e){this.closeModal("add-to-user-lib-modal"),e&&this.$router.push("/collection/"+e)},async loadTargetUserInfo(){this.loading=!0,this.targetUser=await _(this.targetUserId),this.loading=!1},exploreContent(){this.closeModal("add-to-user-lib-modal"),this.$router.push("/searchPublished")},runSearch(){this.$router.push(this.pathPrefix+"/items/all?search="+this.searchText)},async loadPage(){this.targetUserId=this.$route.params.userId,this.searchText=this.$route.query.search,this.targetUserId&&await this.loadTargetUserInfo(),this.$route.query.show=="notifications"?this.showModal("user-notifications-modal"):this.$route.query.show=="switchUser"?this.showModal("switch-user-modal"):this.$route.query.show=="addContent"&&(this.addContentPage="start",this.showModal("add-to-user-lib-modal"))}},created(){this.loadPage()}}),H={key:0},K={class:"d-flex flex-column"},R={class:"d-flex align-items-center larger flex-gap-sm"},G={class:"d-flex align-items-center larger flex-gap-sm"},Q={class:"d-flex align-items-center larger flex-gap-sm"},X={key:1},J={class:"d-flex justify-content-center flex-gap-1"},Y={key:0,class:"container-fluid-max2k"},Z={class:"row my-3"},ee={class:"col"},te={key:1},se={class:"d-flex flex-gap-sm larger"},oe={class:"d-flex align-items-center flex-gap-1"},ie={key:0,class:"d-flex"},re=["placeholder"],ne={class:"ms-2"},ae={key:0};function le(e,t,de,me,ue,pe){const l=a("b-icon"),p=a("b-button"),f=a("CreateCollection"),b=a("PopCollectionSelector"),v=a("AddItem"),C=a("b-modal"),y=a("ProfileImage"),U=a("router-link"),k=a("b-dropdown-item"),w=a("b-dropdown"),P=a("b-link"),I=a("TIListViewOptions"),T=a("router-view");return r(),m("div",null,[o(C,{lazy:"true",id:"add-to-user-lib-modal",title:`Add to ${e.libraryTitle}`,"hide-footer":""},{default:n(()=>[!e.addContentPage||e.addContentPage=="start"?(r(),m("div",H,[t[15]||(t[15]=s("div",{class:"my-2"},null,-1)),s("div",K,[o(p,{variant:"link",class:"card-btn m-2 p-3 rounded border",onClick:t[0]||(t[0]=i=>e.addContentPage="link")},{default:n(()=>[s("div",R,[o(l,{icon:"link"}),t[9]||(t[9]=s("div",{class:"ms-1"},"Link or Website",-1))]),t[10]||(t[10]=s("div",{class:"text-muted small mt-2"},"Add a link or website",-1))]),_:1}),o(p,{variant:"link",class:"card-btn m-2 p-3 rounded border",onClick:t[1]||(t[1]=i=>e.addContentPage="collection")},{default:n(()=>[s("div",G,[o(l,{icon:"collection"}),t[11]||(t[11]=s("div",{class:"ms-1"},"Collection",-1))]),t[12]||(t[12]=s("div",{class:"text-muted small mt-2"},"Add or create a collection",-1))]),_:1}),o(p,{variant:"link",class:"card-btn m-2 p-3 rounded border",onClick:t[2]||(t[2]=i=>e.exploreContent())},{default:n(()=>[s("div",Q,[o(l,{icon:"search"}),t[13]||(t[13]=s("div",{class:"ms-1"},"Published Content",-1))]),t[14]||(t[14]=s("div",{class:"text-muted small mt-2"},"Find items from curated or community published content.",-1))]),_:1})])])):d("",!0),e.addContentPage=="collection"?(r(),m("div",X,[s("div",J,[o(p,{variant:"outline-primary",class:"text-center m-2 p-3",onClick:t[3]||(t[3]=i=>e.addContentPage="collection_new"),style:{width:"140px"}},{default:n(()=>t[16]||(t[16]=[u(" New Collection ")])),_:1}),o(p,{variant:"outline-primary",class:"text-center m-2 p-3",onClick:t[4]||(t[4]=i=>e.addContentPage="collection_existing"),style:{width:"140px"}},{default:n(()=>t[17]||(t[17]=[u(" Existing Collection ")])),_:1})])])):d("",!0),e.addContentPage=="collection_new"?(r(),c(f,{key:2,targetUserId:e.targetUserId,onClose:e.addNewCollectionToLibrary},null,8,["targetUserId","onClose"])):d("",!0),e.addContentPage=="collection_existing"?(r(),c(b,{key:3,onClose:e.addExistingCollectionToLibrary},null,8,["onClose"])):d("",!0),e.addContentPage=="link"?(r(),c(v,{key:4,targetUserId:e.targetUserId,onClose:e.addItemToLibrary,excludeAllCollections:!0},null,8,["targetUserId","onClose"])):d("",!0)]),_:1},8,["title"]),e.targetUser?(r(),m("div",Y,[s("div",Z,[s("div",ee,[o(U,{class:"h2 d-flex flex-gap-1 align-items-center",to:`/user/profile/${e.targetUser._id}`},{default:n(()=>{var i;return[o(y,{width:50,"profile-image":e.targetUser.profileImage},null,8,["profile-image"]),u(" "+h(e.targetUser?`${(i=e.targetUser)==null?void 0:i.username}'s`:"")+" Library ",1)]}),_:1},8,["to"])])]),s("div",{class:g(["me-2 d-flex flex-wrap align-items-center flex-gap-1",e.isMobile?" ":""])},[e.isAdminOfTargetUser&&e.currentPage?(r(),c(w,{key:0,variant:"link",right:"","toggle-class":"ps-0 "},{"button-content":n(()=>[o(l,{icon:e.currentPage.icon,class:"me-1"},null,8,["icon"]),u(" "+h(e.currentPage.desc),1)]),default:n(()=>[(r(!0),m(E,null,F(e.navList,(i,$)=>(r(),c(k,{key:$,to:i.path},{default:n(()=>[o(l,{icon:i.icon,class:"me-1"},null,8,["icon"]),u(" "+h(i.desc),1)]),_:2},1032,["to"]))),128))]),_:1})):(r(),m("div",te,[s("div",se,[o(l,{icon:"collections"}),t[18]||(t[18]=u()),t[19]||(t[19]=s("div",null,"Collections",-1))])])),s("div",oe,[e.isAdminOfTargetUser?(r(),m("div",ie,[W(s("input",{class:"form-control","onUpdate:modelValue":t[5]||(t[5]=i=>e.searchText=i),placeholder:e.isMobile?"Search":"Search User's Library",onKeyup:t[6]||(t[6]=D(i=>e.runSearch(),["enter"]))},null,40,re),[[B,e.searchText]]),s("div",ne,[o(p,{disabled:e.loading,onClick:t[7]||(t[7]=i=>e.runSearch()),variant:"outline-secondary"},{default:n(()=>[o(l,{icon:"search"})]),_:1},8,["disabled"])])])):d("",!0)]),s("div",{class:g(["d-flex align-items-center flex-gap-1",e.isMobile?"justify-content-between":"ms-auto"])},[s("div",null,[e.isAdminOfTargetUser?(r(),c(p,{key:0,variant:"primary",onClick:t[8]||(t[8]=i=>{e.addContentPage="start",e.showModal("add-to-user-lib-modal")})},{default:n(()=>[o(l,{icon:"plus"}),t[20]||(t[20]=u()),t[21]||(t[21]=s("span",null," Add Content ",-1))]),_:1})):d("",!0)]),s("div",null,[e.isAdminOfTargetUser?(r(),m("div",ae,[o(P,{class:"btn btn-outline-primary",to:`/manage/user/${e.targetUserId}/loginprefs`},{default:n(()=>[o(l,{icon:"gear"}),t[22]||(t[22]=u(" User Settings"))]),_:1},8,["to"])])):d("",!0)]),o(I,{class:"ms-auto"})],2)],2),t[23]||(t[23]=s("hr",null,null,-1)),o(T)])):d("",!0)])}const Oe=z(j,[["render",le]]);export{Oe as default};
