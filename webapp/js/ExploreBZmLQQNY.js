import{G as p}from"./GalleryView_9bnSkPy.js";import{a as c,C as u,D as h,p as y,E as _,_ as f}from"./components.global5n24RCIC.js";import{d as v,r as i,i as s,j as a,k as o,K as r,z as g,s as l,m as k}from"./@vueC3Nhqlrl.js";import"./AddPublishedToLibraryCH8DTyVO.js";import"./PopCollectionSelectorDtsi0cBR.js";import"./CreateCollectionCvnp9GSK.js";import"./TIIconDefaultDZ-9wHcm.js";import"./ai_lookup_utilszDX_hcwM.js";import"./ItemImageBounipmB.js";import"./SelectAccountUsersC0KunEpm.js";import"./PlaceholderListBUV05qM-.js";import"./@egjsD-CUwjTO.js";import"./@cfcsDj3SjI2h.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";const b=v({name:"Explore",mixins:[c],components:{GalleryView:p},data(){return{readySearch:!1,errorMessage:null,loading:!0,searchValue:null,galleryId:"explorehome"}},mounted(){},computed:{},methods:{tagName:u,partitionTags:h,prettyTimePast:y,dateToMDYFormat:_,searchButton(){this.searchText(null)},searchText(e){e&&e.preventDefault(),this.$router.push({path:"/searchPublished",query:{q:this.searchValue}})}},created(){}}),x={key:0,class:"container mt-4"},C={class:"alert alert-danger"},V={key:1,class:"container-fluid"},T={key:0,class:"d-flex justify-content-between align-items-center mb-5"},B={class:"h2 d-flex flex-gap-sm"},N={key:0,class:"ms-1"},$={key:1,class:"mt-5"},w={class:"col"};function D(e,t,E,I,G,S){const n=i("b-icon"),d=i("b-button"),m=i("GalleryView");return s(),a("div",null,[e.isCustomServer?(s(),a("div",x,[o("div",C,[r(n,{icon:"exclamation-triangle"}),t[1]||(t[1]=o("span",{class:"ms-2"}," TODO: Not yet supported in Personal Server Edition ",-1))])])):(s(),a("div",V,[e.appName=="home"?(s(),a("div",T,[o("div",B,[r(n,{icon:"stars"}),t[2]||(t[2]=o("div",null,"Featured Content",-1))]),o("div",null,[r(d,{variant:"link",class:"h2",title:"Search",onClick:t[0]||(t[0]=F=>e.searchButton())},{default:g(()=>[r(n,{icon:"search"}),e.isMobile?l("",!0):(s(),a("span",N,"Find"))]),_:1})])])):(s(),a("div",$)),o("div",w,[o("div",null,[e.galleryId?(s(),k(m,{key:0,galleryId:e.galleryId,galleryType:"addOneAtAtime"},null,8,["galleryId"])):l("",!0)])])])),t[3]||(t[3]=o("div",{class:"bottom-gap"},null,-1))])}const X=f(b,[["render",D]]);export{X as default};
