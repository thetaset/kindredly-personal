import{F as s}from"./UserFriendManagerDcOU90L1.js";import{P as o}from"./TIIconDefaultDZ-9wHcm.js";import{d as a,j as i,k as n,K as m,s as d,r as l,i as g}from"./@vueC3Nhqlrl.js";import{_ as p}from"./components.global5n24RCIC.js";import"./UsersListCiPq0mdP.js";import"./AddUserBg-j_Mhp.js";import"./ProfileImageEditorB55qGTg6.js";import"./SelectImageC6eE4eIL.js";import"./UsageLimitsComponentDgvva8f4.js";import"./BonusTimeComponentOmyHoWZB.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";const c=a({name:"UserFriendsPage",components:{FriendManager:s,ProfileImage:o},data(){return{targetUserId:null,targetUser:null}},mounted(){},computed:{},methods:{loadTargetUserInfo(){this.loading=!0,this.sendReq("/user/profile/get",{userProfileId:this.targetUserId}).then(e=>{e.success?(this.targetUser=e.result,this.errorMessage=null):(console.error("Error:",e.message),this.errorMessage=e.message),this.loading=!1})}},created(){this.targetUserId=this.$route.params.userId,this.targetUserId&&this.loadTargetUserInfo()}}),u={key:0,class:"container-fluid-max1200"};function f(e,r,h,U,I,_){const t=l("FriendManager");return e.targetUser?(g(),i("div",u,[r[0]||(r[0]=n("h2",{class:"my-3"},"Friends",-1)),m(t,{targetUser:e.targetUser},null,8,["targetUser"])])):d("",!0)}const T=p(c,[["render",f]]);export{T as default};
