const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["js/PrivacyZP7lpgIx.js","js/@vueC3Nhqlrl.js","js/components.globalBic2x0kT.js","js/vue3-toastifyDll2FbVh.js","assets/vue3-toastify.css","js/@capacitorCjBcbZvA.js","js/bootstrap-vue-nextDnMzdrWQ.js","assets/bootstrap-vue-next.css","assets/components.css","js/BMsgModal0flkrli6.js","js/ContactUsFormBs5z9y0E.js","js/PersonalHomeymFIQTs8.js","js/aosDzeBdiKi.js","js/@mozillaCDB2aYYy.js","assets/aos.css","js/GalleryViewGMHbf4bP.js","js/AddPublishedToLibraryA9thKyFu.js","js/PopCollectionSelectorCwff-9C9.js","js/CreateCollectionDxlS16jr.js","js/TIIconDefaultCMdnLD-P.js","assets/TIIconDefault.css","js/ai_lookup_utilszDX_hcwM.js","assets/CreateCollection.css","js/ItemImagelPteIRA_.js","assets/PopCollectionSelector.css","js/SelectAccountUsersBAeUorit.js","assets/AddPublishedToLibrary.css","js/PlaceholderListDgoFc2vF.js","js/@egjsD-CUwjTO.js","js/@cfcsDj3SjI2h.js","assets/@egjs.css","assets/GalleryView.css","assets/PersonalHome.css","js/PageNotFound8sBfMX6p.js"])))=>i.map(i=>d[i]);
import{m as S,a as C,L as T,d as H,c as L,b as N,_ as I,s as V,g as w,R as O,e as F}from"./js/components.globalBic2x0kT.js";import{d as z,aa as b,r as a,i as s,j as k,K as n,z as o,k as c,m as d,p as j,s as u,Q as p,R as q,_ as x}from"./js/@vueC3Nhqlrl.js";import{_ as f}from"./js/@capacitorCjBcbZvA.js";import{c as G,a as Q}from"./js/vue-routerB6Jsgi62.js";import{_ as W}from"./js/bootstrap-vue-nextDnMzdrWQ.js";import{m as J}from"./js/vue3-toastifyDll2FbVh.js";const X=z({name:"App",mixins:[S,C],components:{LibraryIcon:T,Privacy:b(()=>f(()=>import("./js/PrivacyZP7lpgIx.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8]))),BMsgModal:b(()=>f(()=>import("./js/BMsgModal0flkrli6.js"),__vite__mapDeps([9,1,2,3,4,5,6,7,8]))),ContactUsForm:b(()=>f(()=>import("./js/ContactUsFormBs5z9y0E.js"),__vite__mapDeps([10,2,1,3,4,5,6,7,8])))},data(){return{notice:null,noticeDismissed:!1,showHelpChat:!1,loadingHelpChat:!1,excludededPages:["AuthTokenLogin"]}},computed:{navClass(){return this.$route.name=="Kindredly"?this.darkMode?"":"bluebg bluenav":""},showFrame(){return this.$route.query.noframe!="true"&&!this.excludededPages.includes(this.$route.name)},isKindredPage(){return["Explore","SearchPublished"].includes(this.$route.name)},showFooter(){return this.$route.name&&(this.$route.name=="Kindredly"||!["OrderSummary"].includes(this.$route.name)&&!this.$route.meta.isKindred)&&!this.excludededPages.includes(this.$route.name)}},mounted(){},methods:{async loadHelpChatTemp(){this.showModal("contact-us-form-modal")},async loadHelpChat(){this.loadingHelpChat=!0;const e=document.createElement("script");e.src="//code.tidio.co/rgd80tr8cj05ctlta4dgkpeldpse6y67.js",document.head.appendChild(e),e.onload=()=>{H("Remote script has been loaded."),setTimeout(()=>{this.showHelpChat=!0,this.loadingHelpChat=!1},1e3)}},signout(){this.sendReq("/signout",{}).then(e=>{e.success?window.location.href=this.homeURL:console.error("Error:",e.message)})},async acceptNotice(e=!0){e?(await L("acceptedNotice",{accepted:!0}),this.notice={accepted:!0}):this.noticeDismissed=!0},async loadPage(){this.notice=await N("acceptedNotice"),this.checkDarkMode(),document.body.classList.add("mountainvec1")}},filters:{},directives:{},created(){this.loadPage()}}),Y={id:"page-container"},Z={id:"content-wrap"},ee={key:0,class:"ms-1 hide-nav-label-md"},te={class:"ms-1"},ne={key:0,class:"fixed-bottom"};function oe(e,t,i,_,m,h){const $=a("BMsgModal"),M=a("ContactUsForm"),v=a("b-modal"),A=a("Privacy"),r=a("b-icon"),E=a("b-navbar-toggle"),l=a("b-button"),g=a("b-dropdown-item"),U=a("b-dropdown"),R=a("b-navbar-nav"),D=a("b-collapse"),K=a("b-navbar"),B=a("router-view");return s(),k("div",Y,[n($,{ref:"msgBoxConfirm"},null,512),n(v,{lazy:"true",id:"contact-us-form-modal",title:"Contact Us","hide-footer":"",size:"lg"},{default:o(()=>[n(M)]),_:1}),n(v,{size:"xl",id:"gdpr-modal",title:"Privacy Policy","ok-only":""},{default:o(()=>[n(A)]),_:1}),c("div",Z,[e.showFrame&&e.$route.name?(s(),d(K,{key:0,toggleable:"md",class:"mainnav"},{default:o(()=>[n(E,{class:"noborder customtoggler",target:"nav-collapse"},{default:o(()=>[n(r,{icon:"list",class:"larger"})]),_:1}),n(D,{id:"nav-collapse","is-nav":""},{default:o(()=>[n(R,{class:j(["ms-auto d-flex align-items-center flex-gap-xs px-3 bw-color ld-background rounded-xl",e.isMobile?"":"shadow-sm  "])},{default:o(()=>[n(l,{variant:"link",class:"nowrap",href:"https://kindredly.ai",target:"_blank"},{default:o(()=>[n(r,{icon:"info-circle",class:"show-nav-label-md"}),t[3]||(t[3]=c("span",{class:"hide-nav-label-md"}," About ",-1))]),_:1}),n(l,{variant:"link",class:"nowrap",href:"https://kindredly.ai/support",target:"_blank"},{default:o(()=>[n(r,{class:"show-nav-label-md",icon:"emoji-smile"}),t[4]||(t[4]=c("span",{class:"hide-nav-label-md"}," Support Us",-1))]),_:1}),n(l,{variant:"link",class:"nowrap linklike-bw",href:"https://kindredly.ai/download",target:"_blank"},{default:o(()=>[n(r,{icon:"download"}),t[5]||(t[5]=c("span",{class:"ms-2 hide-nav-label-md"},"Download",-1))]),_:1}),e.currentUser?(s(),d(l,{key:0,variant:"link",href:"/kindredapp/",title:"Kindredly Home"},{default:o(()=>[n(r,{icon:"house-fill"}),e.isMobile?(s(),k("span",ee,"Kindredly App")):u("",!0)]),_:1})):u("",!0),e.darkMode?(s(),d(l,{key:1,variant:"link",onClick:t[0]||(t[0]=y=>e.setUIMode("light"))},{default:o(()=>[n(r,{icon:"sun-fill"})]),_:1})):(s(),d(l,{key:2,variant:"link",onClick:t[1]||(t[1]=y=>e.setUIMode("dark"))},{default:o(()=>[n(r,{icon:"moon-fill"})]),_:1})),!e.currentUser&&!e.loadingUser?(s(),d(l,{key:3,variant:"link",href:`${e.appPrefix}`,id:"signinButton"},{default:o(()=>t[6]||(t[6]=[p(" Sign In ")])),_:1},8,["href"])):u("",!0),!e.currentUser&&!e.loadingUser?(s(),d(l,{key:4,variant:"link",href:`${e.appPrefix}#/register`,id:"registerButton"},{default:o(()=>t[7]||(t[7]=[p(" Register ")])),_:1},8,["href"])):u("",!0),e.currentUser?(s(),d(U,{key:5,variant:"link",right:"",class:"bw-color"},{"button-content":o(()=>[n(r,{icon:"person"}),c("span",te,q(e.currentUser.displayedName||e.currentUser.username),1)]),default:o(()=>[n(g,{href:"/kindredapp/"},{default:o(()=>[n(r,{icon:"house-fill"}),t[8]||(t[8]=p(" Kindredly Home "))]),_:1}),n(g,{href:"/kindredapp/#/settings"},{default:o(()=>[n(r,{icon:"gear"}),t[9]||(t[9]=p(" Settings "))]),_:1}),n(g,{onClick:t[2]||(t[2]=y=>e.signout())},{default:o(()=>[n(r,{icon:"door-open"}),t[10]||(t[10]=p(" Sign Out"))]),_:1}),n(g,{target:"_blank",href:"https://kindredly.ai"},{default:o(()=>t[11]||(t[11]=[p(" kindredly.ai ")])),_:1})]),_:1})):u("",!0)]),_:1},8,["class"])]),_:1})]),_:1})):u("",!0),c("main",null,[(s(),d(B,{key:e.$route.fullPath}))])]),e.developerMode?(s(),k("div",ne,"Developer Mode")):u("",!0)])}const ae=I(X,[["render",oe]]),re=[...V,{alias:"/index.html",path:"/",name:"Kindredly",component:()=>f(()=>import("./js/PersonalHomeymFIQTs8.js"),__vite__mapDeps([11,12,13,14,2,1,3,4,5,6,7,8,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32])),meta:{guest:!0,isKindred:!0,title:"Kindredly Personal Server",landing:!0}},{path:"/:pathMatch(.*)*",name:"PageNotFound",component:()=>f(()=>import("./js/PageNotFound8sBfMX6p.js"),__vite__mapDeps([33,2,1,3,4,5,6,7,8])),meta:{guest:!0}}],P=G({history:Q(),routes:re,scrollBehavior(e,t,i){return i||{top:0}}});P.beforeEach(async(e,t,i)=>{var _;try{const m=e.meta.title;if((_=e.meta)!=null&&_.landing&&m?document.title=m:m?document.title=m+" - Kindredly.ai":document.title=`${e.name} Kindredly.ai`,e.matched.some(h=>h.meta.guest)){if(w.isAuth()&&e.matched.some(h=>h.meta.guestOnly)){i("/");return}i();return}else{if(w.isAuth()){i();return}document.location.href=`/kindredapp/signin?redirect=${e.fullPath}`;return}}catch{i("/signin");return}});O(!1,!0).then(()=>{const e=x(ae);F(e),e.use(J,{position:"top-right",autoClose:3e3,hideProgressBar:!0,disabledEnterTransition:!0}),e.use(P),e.mixin({data:function(){return{appName:"web"}}}),e.mixin(C),e.use(W()),e.mount("#app")});
