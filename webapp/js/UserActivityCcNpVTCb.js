import{A as n}from"./ActivityComponentRCZI2nHs.js";import{U as a}from"./UsageLogComponentD8iFNN7E.js";import{P as i}from"./TIIconDefaultDZ-9wHcm.js";import{d as m,j as r,k as p,K as d,s as c,r as u,i as o}from"./@vueC3Nhqlrl.js";import{_ as l}from"./components.global5n24RCIC.js";import"./OptionsComponentCQ7miA5c.js";import"./UsageSummaryCiBFm1Dm.js";import"./BonusTimeComponentOmyHoWZB.js";import"./usageBVbzi9Go.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";const f=m({name:"UserActivity",components:{ActivityComponent:n,UsageLogComponent:a,ProfileImage:i},data(){return{targetUserId:null,targetUser:null,page:"history"}},mounted(){},computed:{},methods:{async loadUserInfo(){const t=await this.sendReq("/user/info",{userId:this.targetUserId});this.targetUser=t.result}},created(){this.targetUserId=this.$route.query.userId||this.$route.params.userId,this.loadUserInfo()}}),U={key:0,class:"container-fluid-max1200"};function g(t,e,y,h,I,_){const s=u("ActivityComponent");return o(),r("div",null,[t.targetUser?(o(),r("div",U,[e[0]||(e[0]=p("h2",{class:"my-3"},"History",-1)),d(s,{user:t.targetUser},null,8,["user"])])):c("",!0)])}const w=l(f,[["render",g]]);export{w as default};
