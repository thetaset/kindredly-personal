import{a as c,aU as p,_ as y}from"./components.global5n24RCIC.js";import{d as L,j as i,k as t,l as g,Q as d,R as o,s as m,q as r,p as l,F as v,P as h,r as b,i as n,K as T}from"./@vueC3Nhqlrl.js";function I(e){return p(e,!1,!0)}const k=L({name:"UsageSummary",mixins:[c],components:{},props:{timeLeftInfo:{type:Object,required:!0},userId:{type:String,default:null,required:!1}},data(){return{}},mounted(){},computed:{},methods:{timepastPretty:I},created(){}}),S={key:0},U={class:"d-flex flex-gap-sm align-items-center mb-3"},P={class:"mt-3"},_={key:0,class:"small"},w={class:"mb-1"},E={key:0,class:"mb-1"},M={key:1,class:"mb-1"},j={key:1,class:"text-muted mb-1"},C={key:2,class:"mt-1 rounded border shadow-sm d-flex align-items-center usage-bar"},N={key:0,class:"mt-4"},$={class:"mt-3"},x={class:"mb-1"},V={class:"small"},q={class:"mb-1"},B={key:0,class:"mb-1"},z={class:"mb-1"},D={key:0,class:"mt-1 rounded border shadow-sm d-flex align-items-center usage-bar"};function F(e,s,O,K,Q,R){const f=b("b-icon");return e.timeLeftInfo?(n(),i("div",S,[t("div",null,[t("div",U,[s[0]||(s[0]=t("div",{class:"h5 my-0"},"Overall Usage",-1)),g(e.$slots,"default",{},void 0,!0)]),t("div",P,[e.timeLeftInfo.defaultTimeLimit?(n(),i("div",_,[t("div",w,[s[1]||(s[1]=t("span",{class:"text-muted"},"Time Limit:",-1)),d(" "+o(e.timepastPretty(e.timeLeftInfo.defaultTimeLimit)),1)]),e.timeLeftInfo.defaultExtraTimeMS?(n(),i("div",E,[s[2]||(s[2]=t("span",{class:""}," Extra Time for today:",-1)),d(" "+o(e.timepastPretty(e.timeLeftInfo.defaultExtraTimeMS)),1)])):m("",!0),e.timeLeftInfo.defaultTimeUsage!=null?(n(),i("div",M,o(e.timepastPretty(e.timeLeftInfo.defaultTimeUsage))+" used ",1)):m("",!0)])):(n(),i("div",j," No usage limits ")),e.timeLeftInfo.defaultTimeLimit!=null&&e.timeLeftInfo.defaultTimeLeft!=null?(n(),i("div",C,[t("div",{class:"truncateme d-flex justify-content-center align-items-center rounded-sm",style:r([{height:"48px",background:"rgb(0, 42, 133)",color:"white"},{width:e.timeLeftInfo.defaultTimeUsage*100/(e.timeLeftInfo.defaultTimeLimit+e.timeLeftInfo.defaultExtraTimeMS)+"%"}])},null,4)])):m("",!0),e.timeLeftInfo.defaultTimeLeft?(n(),i("div",{key:3,class:l(["mb-1 font-weight-strong",e.timeLeftInfo.defaultTimeExceeded?"danger-color":""])},o(e.timepastPretty(Math.max(e.timeLeftInfo.defaultTimeLeft,0)))+" remaining ",3)):m("",!0)])]),e.timeLeftInfo.contentUsage.length>0?(n(),i("div",N,[s[5]||(s[5]=t("div",{class:"h5"},"Usage for Content",-1)),t("div",$,[(n(!0),i(v,null,h(e.timeLeftInfo.contentUsage,(a,u)=>(n(),i("div",{key:u,class:"my-1"},[t("div",x,[T(f,{icon:"link"}),d(" "+o(a.limit.data.patterns.join(",")),1)]),t("div",V,[t("div",q,[s[3]||(s[3]=t("span",{class:"text-muted"},"Time Limit:",-1)),d(" "+o(e.timepastPretty(a.limit.timeLimit.hours*1e3*60*60)),1)]),a.extraTimeMS?(n(),i("div",B,[s[4]||(s[4]=t("span",{class:"text-muted"},"Extra Time for today:",-1)),d(" "+o(e.timepastPretty(a.extraTimeMS)),1)])):m("",!0),t("div",z,o(e.timepastPretty(a.usage))+" used",1)]),a.limit!=null?(n(),i("div",D,[t("div",{class:"truncateme d-flex justify-content-center align-items-center rounded-sm",style:r([{height:"48px",background:"rgb(0, 42, 133)",color:"white"},{width:a.usage*100/(a.limit.timeLimit.hours*1e3*60*60+a.extraTimeMS)+"%"}])},null,4)])):m("",!0),t("div",{class:l(["mb-1 font-weight-strong",a.limitExceeded?" danger-color":""])},o(e.timepastPretty(Math.max(a.timeLeft,0)))+" remaining ",3)]))),128))])])):m("",!0)])):m("",!0)}const H=y(k,[["render",F],["__scopeId","data-v-dd4ae4b2"]]);export{H as U};
