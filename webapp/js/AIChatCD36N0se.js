import{d as c,_ as m}from"./components.global5n24RCIC.js";import{d as h,j as n,k as t,F as p,P as y,s as g,L as Q,ab as v,X as f,Q as b,R as u,i as o}from"./@vueC3Nhqlrl.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";const _=h({name:"AIChat",components:{},data(){return{currentQuery:"",chatMessages:[],loading:!1}},mounted(){},computed:{},methods:{async submitQuery(){this.loading||(this.loading=!0,await this.sendQuery(),this.loading=!1)},async sendQuery(){const e=""+this.currentQuery;this.currentQuery="";const s={content:e,role:"user"};this.chatMessages.push(s);const i=await this.apiReq("/client/aiChatRequest",{messages:this.chatMessages}),{defaultChoice:a,results:d}=i.result;c("AI response",i.result),this.chatMessages.push(a.message)}},created(){this.currentQuery=this.$route.query.query,this.currentQuery&&this.currentQuery.trim()!=""&&this.submitQuery()}}),M={class:"container"},k={class:"row"},C={class:"col"},w={class:"chatcontainer"},I={class:"chats"},A={key:0,class:"text-muted"},$={key:1,class:"text-muted"},q=["innerHTML"],L={key:0,class:"small text-muted ms-1"},T={class:"d-flex flex-gap-1"},V={class:"w-100"},B=["disabled"];function N(e,s,i,a,d,R){return o(),n("div",null,[t("div",M,[t("div",k,[t("div",C,[t("div",w,[s[4]||(s[4]=t("div",null,null,-1)),t("div",I,[(o(!0),n(p,null,y(e.chatMessages,(r,l)=>(o(),n("div",{key:l,class:"p-1 mb-1"},[r.role=="user"?(o(),n("div",A," You: ")):(o(),n("div",$," AI: ")),t("div",{innerHTML:r.content},null,8,q)]))),128)),e.loading?(o(),n("div",L," ... ")):g("",!0)]),t("div",T,[t("div",V,[Q(t("input",{autofocus:"",type:"text",class:"form-control","onUpdate:modelValue":s[0]||(s[0]=r=>e.currentQuery=r),onKeyup:s[1]||(s[1]=f((...r)=>e.submitQuery&&e.submitQuery(...r),["enter"])),placeholder:"Message to AI..."},null,544),[[v,e.currentQuery]])]),s[3]||(s[3]=b()),t("div",null,u(e.currentQuery?e.currentQuery.length:null),1),t("button",{class:"btn btn-primary",onClick:s[2]||(s[2]=(...r)=>e.submitQuery&&e.submitQuery(...r)),disabled:e.loading},u(e.loading?"...":"Send"),9,B)])])])])])])}const j=m(_,[["render",N],["__scopeId","data-v-eb70bded"]]);export{j as default};
