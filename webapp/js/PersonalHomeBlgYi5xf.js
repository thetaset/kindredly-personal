import{A as x}from"./aosDzeBdiKi.js";import{_ as k,d as g,m as C,T as w}from"./components.global5n24RCIC.js";import{G as P}from"./GalleryView_9bnSkPy.js";import{r as c,i as n,j as l,K as o,z as p,k as t,Q as u,s as d,F as v}from"./@vueC3Nhqlrl.js";import"./@mozillaCDB2aYYy.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";import"./AddPublishedToLibraryCH8DTyVO.js";import"./PopCollectionSelectorDtsi0cBR.js";import"./CreateCollectionCvnp9GSK.js";import"./TIIconDefaultDZ-9wHcm.js";import"./ai_lookup_utilszDX_hcwM.js";import"./ItemImageBounipmB.js";import"./SelectAccountUsersC0KunEpm.js";import"./PlaceholderListBUV05qM-.js";import"./@egjsD-CUwjTO.js";import"./@cfcsDj3SjI2h.js";const T={name:"Support",components:{},data(){return{planType:null,loading:!1}},computed:{},mounted(){},methods:{isCurrentPlan(e){var s,y;return e==((y=(s=this.account)==null?void 0:s.subscriptionInfo)==null?void 0:y.currentPlanId)},selectPlanType(e){this.planType=e,this.showModal("options-modal")},addToCart(e){this.account?this.currentUser&&this.currentUser.type!="admin"?this.showModal("permission-modal"):(localStorage.setItem("@selectedPlan",e),this.$router.push("/order/checkout")):this.showModal("please-modal")},async loadData(){this.loading=!0;try{await this.RefreshCurrentUser(),await this.RefreshAccountInfo(!0,!0)}catch(e){g(e)}this.loading=!1}},created(){this.loadData()}},z={class:"text-center m-4"},S=["href"],M=["href"],j={key:0,class:"d-flex flex-column justify-content-center"},B={class:"mx-4 mt-2 d-flex justify-content-around"},V=["disabled"],A={key:0},K={key:1,class:"d-flex flex-column justify-content-center"},H={class:"my-4 d-flex justify-content-around"},I=["disabled"],U={key:0},$=["disabled"],L={key:0},N={class:"d-flex flex-wrap justify-content-center align-items-center"},R={style:{width:"25rem"},class:"card mx-3 mt-3 mb-0 shadow","no-body":""},D={class:"card-body"},E={class:"card-text h-100 d-flex flex-column"},F={class:"mx-3"},O={class:"list-display ps-1"},G={class:"d-flex items-start"},Y={class:"me-2 cb"},q={class:"d-flex items-start"},Q={class:"me-2 cb"},W={class:"d-flex items-start"},J={class:"me-2 cb"},X={class:"d-flex items-start"},Z={class:"me-2 cb"},tt={class:"d-flex items-start"},st={class:"me-2 cb"},et={class:"d-flex items-start"},ot={class:"me-2 cb"},nt={key:0,class:"mt-4 text-center mb-4"},lt={key:0,class:"btn btn-lg btn-outline-secondary",disabled:!0},rt=["disabled","href"],it=["disabled"],dt={key:1,class:"text-center mt-4 mb-4"},at={style:{width:"27rem"},class:"card mx-3 mt-3 mb-0 shadow","no-body":""},ct={class:"card-body"},ut={class:"card-text h-100 d-flex flex-column"},mt={class:"mb-1"},pt={class:"mx-3"},bt={class:"list-display ps-1"},yt={class:"d-flex items-start"},ft={class:"me-2 cb"},vt={class:"d-flex items-start"},kt={class:"me-2 cb"},_t={class:"d-flex items-start"},ht={class:"me-2 cb"},xt={class:"d-flex items-start"},gt={class:"me-2 cb"},Ct={class:"d-flex items-start"},wt={class:"me-2 cb"},Pt={key:0,class:"text-center mt-4 mb-4"},Tt=["href"],zt={key:1,class:"text-center mt-4 mb-4"},St={key:2,class:"cost_text mt-2 mb-4 text-center success-color"};function Mt(e,s,y,_,a,r){const m=c("b-modal"),i=c("b-icon"),f=c("b-spinner"),h=c("b-container");return c("b-col"),c("b-row"),n(),l("div",null,[o(m,{lazy:"true",id:"please-modal",title:"Please sign-in or register.","hide-footer":""},{default:p(()=>[t("div",z,[t("a",{class:"btn btn-lg btn-primary my-4 mx-2",href:`${e.appPrefix}#/register`}," Register ",8,S),t("a",{class:"btn btn-lg btn-outline-primary my-4 mx-2",href:e.appPrefix}," Sign-In ",8,M)])]),_:1}),o(m,{lazy:"true",id:"permission-modal",title:"Admin required.","hide-footer":""},{default:p(()=>s[6]||(s[6]=[t("div",{class:"text-center m-4"},[t("h4",null,"Only account admins can change plans")],-1)])),_:1}),o(m,{lazy:"true",id:"options-modal",title:"","hide-footer":""},{default:p(()=>[a.planType=="standard"?(n(),l("div",j,[s[8]||(s[8]=t("div",{class:"text-center mt-4 larger"},[t("p",null,"Switch to Kindredly Basic?")],-1)),t("div",B,[t("div",null,[t("button",{disabled:r.isCurrentPlan("sub_standard_free"),class:"btn btn-lg btn-primary",onClick:s[0]||(s[0]=b=>r.addToCart("sub_standard_free"))},[s[7]||(s[7]=u(" Continue ")),r.isCurrentPlan("sub_standard_free")?(n(),l("span",A,"(current)")):d("",!0)],8,V)])])])):d("",!0),a.planType=="plus"?(n(),l("div",K,[s[11]||(s[11]=t("div",{class:"mt-4 mb-4 text-center"},[t("h4",null,"Kindredly Plus")],-1)),s[12]||(s[12]=t("div",{class:"mx-4"},null,-1)),s[13]||(s[13]=t("div",{class:"text-center mt-4 text-muted"},[t("p",null,"Please select one")],-1)),t("div",H,[t("button",{disabled:r.isCurrentPlan("sub_plus_monthly"),class:"btn btn-lg btn-primary",onClick:s[1]||(s[1]=b=>r.addToCart("sub_plus_monthly"))},[s[9]||(s[9]=u(" $5/month ")),r.isCurrentPlan("sub_plus_monthly")?(n(),l("span",U,"(current)")):d("",!0)],8,I),t("button",{disabled:r.isCurrentPlan("sub_plus_yearly"),class:"btn btn-lg btn-primary",onClick:s[2]||(s[2]=b=>r.addToCart("sub_plus_yearly"))},[s[10]||(s[10]=u(" $49/year")),r.isCurrentPlan("sub_plus_yearly")?(n(),l("span",L,"(current)")):d("",!0)],8,$)])])):d("",!0)]),_:1}),o(m,{lazy:"true",id:"whypay-modal",title:"","hide-footer":""},{default:p(()=>s[14]||(s[14]=[t("div",{class:"text-center"},[t("p",null,"ThetaSet does not make money from ads. Our service depends on our paying subscribers.")],-1)])),_:1}),t("div",null,[o(h,{class:"container mt-5",fluid:""},{default:p(()=>[t("div",N,[t("div",R,[t("div",D,[t("div",E,[t("div",null,[s[21]||(s[21]=t("div",{class:"lead_bigger"},"Basic",-1)),s[22]||(s[22]=t("div",{class:"mt-2 mb-4 mx-2 text-center text-muted"},null,-1)),s[23]||(s[23]=t("div",{class:"cost_text mt-2 mb-4 h5"},"Free forever",-1)),t("div",null,[t("div",F,[t("ul",O,[t("li",G,[t("div",Y,[o(i,{icon:"check",class:"success-color"})]),s[15]||(s[15]=t("div",null,"Kid Mode for Browsers: Content restrictions and Youtube without comments or recommendations",-1))]),t("li",q,[t("div",Q,[o(i,{icon:"check",class:"success-color"})]),s[16]||(s[16]=t("div",null,"Ad free: We will never show ads to your children*",-1))]),t("li",W,[t("div",J,[o(i,{icon:"check",class:"success-color"})]),s[17]||(s[17]=t("div",null,[t("div",null,"Your own private social network for you and your family")],-1))]),t("li",X,[t("div",Z,[o(i,{icon:"check",class:"success-color"})]),s[18]||(s[18]=t("div",null,[t("div",null,"End-to-end encryption support")],-1))]),t("li",tt,[t("div",st,[o(i,{icon:"check",class:"success-color"})]),s[19]||(s[19]=t("div",null,"Up to 5 users",-1))]),t("li",et,[t("div",ot,[o(i,{icon:"record",class:"success-color"})]),s[20]||(s[20]=t("div",null,[t("div",null,"and more")],-1))])])])])]),s[26]||(s[26]=t("div",{class:"mt-5"},null,-1)),a.loading?(n(),l("div",dt,[o(f)])):(n(),l("div",nt,[e.account&&e.account.accountType=="standard"?(n(),l("button",lt,[o(i,{icon:"check"}),s[24]||(s[24]=u(" Current plan "))])):d("",!0),e.account?d("",!0):(n(),l("a",{key:1,class:"btn btn-lg btn-primary",disabled:a.loading,href:`${e.appPrefix}#/register`},[s[25]||(s[25]=u(" Start now ")),o(i,{icon:"arrow-up-right"})],8,rt)),e.account&&e.account.accountType!="standard"?(n(),l("button",{key:2,class:"btn btn-lg btn-primary",disabled:a.loading,onClick:s[3]||(s[3]=b=>r.selectPlanType("standard"))}," Switch to Basic ",8,it)):d("",!0)]))])])]),t("div",at,[t("div",ct,[t("div",ut,[t("div",null,[s[35]||(s[35]=t("div",{class:"lead_bigger"},"Plus",-1)),s[36]||(s[36]=t("div",{class:"mt-2 mb-4 mx-3 text-center text-muted"}," Best choice for users who want to support Kindredly and use our more advanced features. ",-1)),s[37]||(s[37]=t("div",{class:"text-center mt-2 mb-4"},[t("svg",{xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",version:"1.1",width:"60",height:"60",viewBox:"0 0 256 256","xml:space":"preserve"},[t("defs"),t("g",{style:{stroke:"none","stroke-width":"0","stroke-dasharray":"none","stroke-linecap":"butt","stroke-linejoin":"miter","stroke-miterlimit":"10",fill:"currentColor","fill-rule":"nonzero",opacity:"1"},transform:"translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)"},[t("path",{d:"M 51.456 47.291 c -0.256 0 -0.512 -0.098 -0.707 -0.293 L 29.812 26.061 c -5.952 -5.952 -5.952 -15.637 0 -21.589 C 32.694 1.588 36.528 0 40.605 0 S 48.517 1.588 51.4 4.472 l 0.056 0.056 l 0.056 -0.056 C 54.395 1.588 58.229 0 62.307 0 c 4.077 0 7.91 1.588 10.794 4.472 l 0 0 l 0 0 c 5.952 5.952 5.952 15.637 0 21.589 L 52.163 46.998 C 51.968 47.193 51.712 47.291 51.456 47.291 z M 40.605 2 c -3.543 0 -6.875 1.38 -9.38 3.886 c -5.172 5.172 -5.172 13.588 0 18.761 l 20.23 20.23 l 20.23 -20.23 c 5.172 -5.173 5.172 -13.589 0 -18.761 l 0 0 C 69.181 3.38 65.85 2 62.307 2 c -3.544 0 -6.875 1.38 -9.381 3.886 l -0.763 0.763 c -0.391 0.391 -1.023 0.391 -1.414 0 l -0.763 -0.763 C 47.48 3.38 44.149 2 40.605 2 z",style:{stroke:"none","stroke-width":"1","stroke-dasharray":"none","stroke-linecap":"butt","stroke-linejoin":"miter","stroke-miterlimit":"10",fill:"currentColor","fill-rule":"nonzero",opacity:"1"},transform:" matrix(1 0 0 1 0 0) ","stroke-linecap":"round"}),t("path",{d:"M 43.036 90 c -2.937 0 -5.844 -1.081 -8.666 -2.129 c -3.111 -1.156 -6.323 -2.35 -9.521 -2.068 l -7.79 0.691 V 56.157 l 4.222 -0.375 c 2.65 -0.231 4.867 0.798 7.011 1.797 c 2.025 0.943 3.941 1.844 6.142 1.654 l 14.064 -2.552 c 5.025 -0.854 7.791 2.064 9.468 4.721 l 15.39 -7.154 c 5.769 -2.59 12.243 0.01 16.131 6.464 c 1.011 1.678 0.448 3.906 -1.253 4.968 c -1.993 1.243 -3.979 2.487 -5.943 3.719 C 65.158 80.133 50.363 89.403 44.041 89.956 C 43.706 89.986 43.371 90 43.036 90 z M 25.834 83.76 c 3.214 0 6.268 1.135 9.232 2.236 c 3.07 1.142 5.97 2.218 8.799 1.968 c 5.843 -0.511 21.154 -10.104 37.363 -20.261 c 1.966 -1.231 3.952 -2.477 5.946 -3.721 c 0.78 -0.486 1.049 -1.491 0.599 -2.239 c -3.341 -5.544 -8.803 -7.828 -13.586 -5.676 L 57.16 63.982 l -0.456 -0.796 c -1.52 -2.648 -3.639 -5.256 -7.859 -4.535 l -14.151 2.563 c -2.825 0.233 -5.074 -0.812 -7.246 -1.823 c -1.992 -0.929 -3.879 -1.808 -5.989 -1.617 l -2.399 0.213 v 26.321 l 5.613 -0.498 C 25.062 83.776 25.449 83.76 25.834 83.76 z",style:{stroke:"none","stroke-width":"1","stroke-dasharray":"none","stroke-linecap":"butt","stroke-linejoin":"miter","stroke-miterlimit":"10",fill:"currentColor","fill-rule":"nonzero",opacity:"1"},transform:" matrix(1 0 0 1 0 0) ","stroke-linecap":"round"}),t("path",{d:"M 39.091 75.237 c -0.467 0 -0.885 -0.328 -0.979 -0.804 c -0.108 -0.542 0.243 -1.068 0.785 -1.177 c 5.57 -1.113 11.833 -3.661 19.122 -7.779 l -1.314 -2.291 c -0.275 -0.479 -0.109 -1.091 0.369 -1.365 c 0.479 -0.273 1.091 -0.108 1.365 0.369 l 1.813 3.161 c 0.274 0.479 0.109 1.09 -0.368 1.364 c -7.853 4.521 -14.589 7.302 -20.596 8.502 C 39.222 75.231 39.156 75.237 39.091 75.237 z",style:{stroke:"none","stroke-width":"1","stroke-dasharray":"none","stroke-linecap":"butt","stroke-linejoin":"miter","stroke-miterlimit":"10",fill:"currentColor","fill-rule":"nonzero",opacity:"1"},transform:" matrix(1 0 0 1 0 0) ","stroke-linecap":"round"}),t("path",{d:"M 15.54 90 H 3.528 c -1.941 0 -3.52 -1.579 -3.52 -3.52 V 54.192 c 0 -1.94 1.579 -3.52 3.52 -3.52 H 15.54 c 1.941 0 3.52 1.579 3.52 3.52 V 86.48 C 19.059 88.421 17.48 90 15.54 90 z M 3.528 52.673 c -0.838 0 -1.52 0.682 -1.52 1.52 V 86.48 c 0 0.838 0.682 1.52 1.52 1.52 H 15.54 c 0.838 0 1.52 -0.682 1.52 -1.52 V 54.192 c 0 -0.838 -0.682 -1.52 -1.52 -1.52 H 3.528 z",style:{stroke:"none","stroke-width":"1","stroke-dasharray":"none","stroke-linecap":"butt","stroke-linejoin":"miter","stroke-miterlimit":"10",fill:"currentColor","fill-rule":"nonzero",opacity:"1"},transform:" matrix(1 0 0 1 0 0) ","stroke-linecap":"round"})])])],-1)),t("div",mt,[t("div",pt,[s[33]||(s[33]=t("div",{class:"mt-2 mb-1 mx-2"},[t("div",null,"All the same features as the Basic Plan, plus:")],-1)),t("ul",bt,[s[32]||(s[32]=t("li",{class:"d-flex items-start"},null,-1)),t("li",yt,[t("div",ft,[o(i,{icon:"check",class:"success-color"})]),s[27]||(s[27]=t("div",null,"Up to 10 users in the same account",-1))]),t("li",vt,[t("div",kt,[o(i,{icon:"check",class:"success-color"})]),s[28]||(s[28]=t("div",null,"More storage space",-1))]),t("li",_t,[t("div",ht,[o(i,{icon:"check",class:"success-color"})]),s[29]||(s[29]=t("div",null,"RSS feed reader",-1))]),t("li",xt,[t("div",gt,[o(i,{icon:"check",class:"success-color"})]),s[30]||(s[30]=t("div",null,"Advanced AI features",-1))]),t("li",Ct,[t("div",wt,[o(i,{icon:"record",class:"success-color"})]),s[31]||(s[31]=t("div",null,[t("div",null,"and much more")],-1))])])]),s[34]||(s[34]=t("div",{class:"mt-5"},null,-1))])]),a.loading?(n(),l("div",zt,[o(f)])):(n(),l("div",Pt,[e.account&&e.account.accountType=="plus"?(n(),l("div",{key:0,onClick:s[4]||(s[4]=b=>r.selectPlanType("plus")),class:"btn btn-lg btn-outline-secondary"}," Current Plan ")):e.account?(n(),l("button",{key:2,class:"btn btn-lg btn-primary",disabled:!0,onClick:s[5]||(s[5]=b=>r.selectPlanType("plus"))}," Coming Soon ")):(n(),l("a",{key:1,class:"btn btn-lg btn-primary",disabled:!0,href:`${e.appPrefix}#/register`},"Coming Soon ",8,Tt))])),e.account&&e.account.accountType=="plus"?(n(),l("div",St," Thank you for supporting Kindredly! ")):d("",!0)])])])])]),_:1}),d("",!0),d("",!0),s[63]||(s[63]=t("div",{class:"bottom-gap"},null,-1))])])}const jt=k(T,[["render",Mt]]),Bt={name:"KindredLandingPage",mixins:[C],components:{TIcon:w,GalleryView:P,Support:jt},data(){return{imageList:[]}},mounted(){},computed:{},methods:{},created(){x.init({offset:0,duration:400,easing:"ease-in-sine",delay:200})}},Vt={class:"noxoverflow"},At={class:"mt-5 pt-5 text-center"};function Kt(e,s,y,_,a,r){const m=c("b-button");return n(),l("div",Vt,[s[0]||(s[0]=t("div",{class:"my-4 py-4"},null,-1)),s[1]||(s[1]=t("div",{class:"my-4 text-center"},[t("h1",null,"Personal Server Edition")],-1)),t("div",At,[o(m,{size:"lg",variant:"primary",href:"/kindredapp/",title:"Kindredly Home"},{default:p(()=>[e.currentUser?(n(),l(v,{key:1},[u(" Home ")],64)):(n(),l(v,{key:0},[u(" Sign-in ")],64))]),_:1})])])}const Zt=k(Bt,[["render",Kt]]);export{Zt as default};
