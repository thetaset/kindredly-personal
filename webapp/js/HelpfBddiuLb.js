import{A as m}from"./AddUserBg-j_Mhp.js";import{P as p}from"./TIIconDefaultDZ-9wHcm.js";import{_ as y,aj as c}from"./components.global5n24RCIC.js";import{j as f,k as e,K as r,Q as o,z as i,r as n,i as g}from"./@vueC3Nhqlrl.js";import"./ProfileImageEditorB55qGTg6.js";import"./SelectImageC6eE4eIL.js";import"./UsageLimitsComponentDgvva8f4.js";import"./BonusTimeComponentOmyHoWZB.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";const b={name:"ManageUsers",components:{AddUser:m,ProfileImage:p},data(){return{errorMessage:null,userFields:[{key:"id",sortable:!0,label:""}]}},mounted(){},computed:{userList(){return this.users?[...this.users].sort(function(s,t){return c(s,t,"username")}):[]}},methods:{clickOnUser(s){this.isManageMode&&(s==null?void 0:s.type)!="admin"?s._id==this.currentUserId?this.navigateTo("/settings/loginprefs"):this.navigateTo(`/manage/user/${s._id}/loginprefs`):this.navigateTo(`/user/profile/${s._id}`)},navigateTo(s){return this.$router.push(s)},async newUserCreated(s){await this.RefreshUsers(),this.closeModal("add-user-modal"),this.$router.push(`/manage/user/${s._id}/loginprefs`)}},created(){this.RefreshUsers()}},h={class:"container-fluid-max1200"},v={class:"my-3"},w={class:"my-4"},k={class:"my-4"},$={class:"mt-2"};function x(s,t,T,U,W,H){const l=n("b-icon"),a=n("b-col"),d=n("b-row"),u=n("b-link");return g(),f("div",h,[e("div",v,[e("h2",null,[r(l,{icon:"question-circle"}),t[0]||(t[0]=o(" Help"))])]),r(d,{class:"row"},{default:i(()=>[r(a,{class:"col"})]),_:1}),r(d,{class:"row"},{default:i(()=>[r(a,{class:"col"},{default:i(()=>[e("div",w,[t[3]||(t[3]=e("h5",{class:"primary-color mb-3"},"Have an issue or know how to make Kindredly better?",-1)),e("p",null,[r(u,{href:`${s.config.serverHostname}/contactUs`},{default:i(()=>t[1]||(t[1]=[o("contact us")])),_:1},8,["href"]),t[2]||(t[2]=o(". "))])]),t[15]||(t[15]=e("hr",null,null,-1)),t[16]||(t[16]=e("div",{class:"my-4"},[e("h5",{class:"primary-color mb-3"},"What is a restricted user?"),e("p",null," A restricted user is a user that has limited access to the system. They can only view their own activity and settings. They cannot view other users' activity or settings. ")],-1)),t[17]||(t[17]=e("hr",null,null,-1)),e("div",k,[t[14]||(t[14]=e("h5",{class:"primary-color mb-3"},"What exactly is encrypted using end-to-end encryption?",-1)),e("div",null,[t[12]||(t[12]=o(" We encrypt most free text fields and files. We do not encrypt data labelling and categorizing fields such as ids, tags, categories. ")),t[13]||(t[13]=e("br",null,null,-1)),e("div",$,[t[10]||(t[10]=o(" We do our best to encrypt any data that might be personal or sensitive but we do currently have some limitations that you should be aware of: ")),e("ul",null,[t[6]||(t[6]=e("li",null," We do not automatically encrypt items imported from our published library. However, you can manually encrypt the data by visiting the item and clicking encrypt ",-1)),t[7]||(t[7]=e("li",null," Any items you publish, will automatically be decrypted before publishing. This includes the source collection. ",-1)),t[8]||(t[8]=e("li",null,"Subscriptions are not encrypted",-1)),e("li",null,[t[4]||(t[4]=o("Library items showing a ")),r(l,{icon:"unlock"}),t[5]||(t[5]=o(" icon are not encrypted."))]),t[9]||(t[9]=e("li",null,"Public interactions such as reviews or ratings are not encrypted.",-1))]),t[11]||(t[11]=e("div",{class:"my-3"}," Encryption is provided to give you peace of mind that your data is secure and that is isn't being used for commercial gain. Even if you choose to store your encryption keys on our server we will never use them to decrypt your data directly. We take data security and privacy seriously. With or without encryption, we would not share your data with third parties. ",-1))])])]),t[18]||(t[18]=e("hr",null,null,-1)),t[19]||(t[19]=e("div",{class:"my-4"},[e("h5",{class:"primary-color mb-3"}," I don't want to use Kindredly as my home page. How can i fix this? (extension only) "),e("p",null,[e("b",null,"Admin's"),o(" can reset their home page in your browser settings. "),e("br"),e("b",null," Restricted"),o(" users must use Kindredly as their home page. If you are a restricted user and you are not using Kindredly as your home page, you will be redirected to Kindredly's home page. ")])],-1))]),_:1})]),_:1}),t[20]||(t[20]=e("div",{class:"bottom-gap"},null,-1))])}const j=y(b,[["render",x]]);export{j as default};
