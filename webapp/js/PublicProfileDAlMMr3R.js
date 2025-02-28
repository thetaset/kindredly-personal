import{T as _,P as I}from"./TIIconDefaultDZ-9wHcm.js";import{P as y}from"./PublishedCollectionsByUserODWBNH6p.js";import{a as P,H as k,E as w,_ as R}from"./components.global5n24RCIC.js";import{d as C,r as a,i as t,m as p,z as c,j as i,k as s,R as r,Q as d,K as u,s as n,F as D,P as B}from"./@vueC3Nhqlrl.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";const T=C({name:"UserProfile",mixins:[P],components:{TIIconDefault:_,ProfileImage:I,PublishedCollectionsByUser:y},data(){return{publicId:null,errorMessage:null,loading:!0,profile:null,collections:[],reviews:[],loadingReviews:!0,moreReviews:!1}},mounted(){},computed:{hasActiveProfile(){return this.profile&&this.profile.enabled},hasPublicProfileImage(){var e,o;return((o=(e=this.profile)==null?void 0:e.profileImage)==null?void 0:o.filename)!=null}},methods:{prettyTime:k,dateToMDYFormat:w,async loadData(){this.loading=!0,await this.loadPublicUser(),await this.loadReviews(),this.loading=!1},async loadPublicUser(){try{const e=await this.apiReq("/user/public/get",{id:this.publicId});this.profile=e.result}catch(e){console.error("Error:",e.message),this.errorMessage=e.message}},async loadReviews(){this.loadingReviews=!0;try{const e=await this.apiReq("/published/reviewsByUser",{userId:this.publicId});this.reviews=e.result}catch(e){console.error("Error:",e.message),this.errorMessage=e.message}this.loadingReviews=!1}},created(){this.publicId=this.$route.params.userId,this.loadData()}}),U={key:0},M={class:"ms-1 h3 d-flex flex-gap-1 align-items-center"},N=["src"],$={class:"d-flex align-items-center"},A={class:"mt-1 text-muted small"},F={key:0},E={key:0,class:"mt-2 mb-4"},V={class:"row mt-3"},Y={class:"col"},q={key:1,class:"row mt-4"},z={class:"col"},j={class:"ms-2 mt-3"},H={class:"small text-muted"},J={class:"small"},K={key:1};function L(e,o,Q,S,W,G){const h=a("b-icon"),m=a("router-link"),f=a("PublishedCollectionsByUser"),g=a("b-rating"),v=a("b-container");return t(),p(v,{class:"container && profile"},{default:c(()=>[!e.loading&&e.hasActiveProfile&&e.publicId?(t(),i("div",U,[s("div",M,[s("div",null,[e.hasPublicProfileImage?(t(),i("img",{key:0,class:"profileImageContainer",src:e.getImagePathWithDefault(e.profile.profileImage.filename)},null,8,N)):(t(),p(h,{key:1,class:"h1",icon:"person"}))]),s("div",null,r(e.profile.username),1)]),s("div",$,[s("div",A,[d(" Joined in "+r(e.dateToMDYFormat(e.profile.createdAt,!0))+" ",1),e.profile.curator?(t(),i("span",F,[o[1]||(o[1]=d(", ")),u(m,{to:"/curationInfo",title:"This member has been approved for content curation."},{default:c(()=>o[0]||(o[0]=[d(" Curator")])),_:1})])):n("",!0)])]),e.profile.about?(t(),i("div",E,r(e.profile.about),1)):n("",!0),o[5]||(o[5]=s("hr",null,null,-1)),s("div",V,[s("div",Y,[o[2]||(o[2]=s("div",{class:"h6"},"Collections",-1)),u(f,{publicId:e.publicId},null,8,["publicId"])])]),e.reviews.length>0?(t(),i("div",q,[o[4]||(o[4]=s("hr",null,null,-1)),s("div",z,[o[3]||(o[3]=s("h6",null,"Reviews",-1)),s("div",j,[(t(!0),i(D,null,B(e.reviews,(l,b)=>(t(),i("div",{key:b},[s("div",null,[s("div",H,r(e.dateToMDYFormat(l.createdAt)),1),u(m,{to:`/v/${l.publishId}`},{default:c(()=>[d(r(l.publishedName),1)]),_:2},1032,["to"]),s("div",null,[u(g,{class:"ps-0 pe-1","no-border":"",readonly:"",size:"sm",inline:"",value:l.overallRating},null,8,["value"])]),s("p",J,r(l.comment?l.comment:""),1)])]))),128))])])])):n("",!0)])):n("",!0),!e.loading&&!e.hasActiveProfile?(t(),i("div",K,"No such user found")):n("",!0)]),_:1})}const te=R(T,[["render",L]]);export{te as default};
