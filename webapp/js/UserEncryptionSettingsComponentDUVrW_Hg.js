import{L}from"./bootstrap-vue-nextDnMzdrWQ.js";import{a as M,d as h,_ as N}from"./components.global5n24RCIC.js";import{U as B}from"./UpdatePasswordDdJ5QkqZ.js";import{d as F,j as n,K as o,z as l,k as s,s as d,Q as a,L as H,m as p,F as O,R as f,r as y,ac as z,i}from"./@vueC3Nhqlrl.js";const j=F({name:"UserEncryptionSettingsComponent",mixins:[M],components:{BTable:L,UpdatePassword:B},props:{user:{type:Object,default:null,required:!1}},data(){return{targetUser:null,userId:null,password:null,loading:!1,loadingComponent:!0,results:null,showDetails:!1,testMessage:null,testComplete:!1,testPassed:!1,accountKeysExist:!1,encSettings:{encryptHistory:!1,encryptItems:!1,encryptPostsAndComments:!1},userEncStatus:null,keyBackup:null,keyList:null,recoveryKey:null}},mounted(){},computed:{keysExist(){return this.keyList&&this.keyList.length>0},userKeysExist(){return this.keyList&&this.keyList.filter(t=>t.selectType=="user"&&t.selectId==this.userId).length>0},isCurrentUser(){return!this.targetUser||this.targetUser._id==this.currentUserId}},methods:{getUserName(t){if(t==this.currentUserId)return"Current";if(!this.users)return t;const e=this.users.find(m=>m._id==t);return e?e.username:t},async backupKeys(){this.loading=!0;try{const t=await this.apiReq("/client/encryption/getKeyBackup",{userId:this.userId});this.keyBackup=t.result}catch(t){this.showToast("Error getting key backup: "+t.message,{variant:"danger"})}this.loading=!1},async updateEncSettings(){this.loading=!0,await this.apiReq("/user/encryption/updateSettings",{userId:this.userId,encSettings:this.encSettings}),await this.RefreshCurrentUser(),this.$emit("updated"),this.loading=!1},async refreshKeyList(){this.loading=!0;try{const t=await this.apiReq("/client/encryption/listKeysWithStatus",{userId:this.userId});h("List Keys: ",t),this.keyList=t.result.sort((e,m)=>e.groupId<m.groupId?-1:e.groupId>m.groupId?1:e.keyType<m.keyType?-1:e.keyType>m.keyType?1:0)}catch{}this.loading=!1},keyFields(){return this.developerMode?["description","keyType","permission","keyName","keyAccess","keyId","wrappingKeyId","unwrappingKeyId","_id"]:this.isCurrentUser?["description","keyType","permission","keyName","keyAccess"]:["description","keyType","permission","keyName","keyAccess"]},async enableEncryption(){this.loading=!0;try{await this.apiReq("/client/encryption/enable",{userId:this.userId,password:this.password}),await this.RefreshCurrentUser(),await this.loadData(),this.$emit("updated")}catch(t){this.showToast("Error generating keys: "+t.message,{variant:"danger"})}this.loading=!1},async removeKeys(){if(await this.getRef("msgBoxConfirm").show("Are you sure you want to delete your encryption keys, this will render all encrypted data unreadable?",{title:"Confirm",okVariant:"danger",okTitle:"Delete Encryption Keys?",cancelTitle:"Cancel",hideHeaderClose:!1})){this.loading=!0;try{await this.apiReq("/user/encryption/removeKeys",{userId:this.userId}),await this.loadData(),this.$emit("updated")}catch(e){this.showToast("Error removing keys: "+e.message,{variant:"danger"})}this.loading=!1}},async generateRecoveryKey(){this.loading=!0;try{await this.apiReq("/client/encryption/generateRecoveryKey",{userId:this.userId}),this.isCurrentUser?(await this.loadData(),await this.RefreshCurrentUser(),await this.LoadEncStatus(!0)):await this.loadData(),this.$emit("updated")}catch(t){this.showToast("Error: "+t.message,{variant:"danger"})}this.loading=!1},async removeRecoveryKeyFromServer(){if(await this.getRef("msgBoxConfirm").show("Are you sure you want to remove your recovery key from the server?",{title:"Confirm",okVariant:"danger",okTitle:"Remove Recovery Key?",cancelTitle:"Cancel",hideHeaderClose:!1})){this.loading=!0;try{await this.apiReq("/client/encryption/removeRecoveryKeyFromServer",{userId:this.userId}),this.isCurrentUser?(await this.RefreshCurrentUser(!0),await this.loadData()):await this.loadData(),this.$emit("updated")}catch(e){this.showToast("Error removing keys: "+e.message,{variant:"danger"})}this.loading=!1}},async saveRecoveryKeyOnServer(){if(await this.confirmModal("Are you sure you want to store your recovery key on the server?  This will be less secure but also make it easier to recover your data if you forget your password.")){this.loading=!0;try{await this.apiReq("/client/encryption/saveRecoveryKeyOnServer",{userId:this.userId}),this.isCurrentUser?(await this.RefreshCurrentUser(!0),await this.loadData()):await this.loadData(),this.$emit("updated")}catch(e){this.showToast("Error: "+e.message,{variant:"danger"})}this.loading=!1}},async getRecoveryKey(){this.loading=!0;try{const t=await this.apiReq("/client/encryption/getRecoveryKey",{userId:this.userId});this.recoveryKey=t.result,this.showModal("enc-recovery-key-modal")}catch(t){this.showToast("Error: "+t.message,{variant:"danger"})}this.loading=!1},async encryptAllItems(){if(await this.getRef("msgBoxConfirm").show("Are you sure you want to encrypt all items?",{title:"Confirm",okVariant:"danger",okTitle:"Encrypt All Items?",cancelTitle:"Cancel",hideHeaderClose:!1})){this.loading=!0;try{await this.apiReq("/client/item/encryptItems",{userId:this.userId}),await this.loadData()}catch(e){this.showToast("Error encrypting items: "+e.message,{variant:"danger"})}this.loading=!1}},async removeAllAccountKeys(){if(await this.getRef("msgBoxConfirm").show("WARNING: Are you sure you want to delete all account encryption keys, this will render all encrypted data unreadable for everyone that uses this account?",{title:"Confirm",okVariant:"danger",okTitle:"Delete Encryption Keys?",cancelTitle:"Cancel",hideHeaderClose:!1})){this.loading=!0;try{await this.apiReq("/user/encryption/removeAllAccountKeys"),await this.loadData(),await this.RefreshCurrentUser(),await this.LoadEncStatus(!0),this.$emit("updated")}catch(e){this.showToast("Error removing keys: "+e.message,{variant:"danger"})}this.loading=!1}},async testEncryption(){this.loading=!0,this.testPassed=!1,this.testComplete=!1;try{const t=await this.apiReq("/client/encryption/encrypt",{test:"yes"});h("Encrypted:",t);const e=await this.apiReq("/client/encryption/decrypt",{encrypted:t.result});h("Decrypted: ",e),e.result.test=="yes"?(this.testMessage="Test Passed",this.testPassed=!0):this.testMessage="Test Failed"}catch(t){console.error("Error while testing:",t),this.testMessage="Test Failed with error: "+t}this.testComplete=!0,this.loading=!1},async loadEncSettings(){this.targetUser&&this.targetUser.encSettings&&(this.encSettings=this.targetUser.encSettings)},async clearCachedEncValues(){this.loading=!0;try{const t=await this.apiReq("/client/encryption/clearCachedEncValues",{userId:this.userId});await this.loadData(),this.$emit("updated")}catch(t){this.showToast("Error: "+t.message,{variant:"danger"})}this.loading=!1},async deleteRecoveryKeyForTesting(){this.loading=!0;try{await this.apiReq("/user/encryption/deleteRecoveryKey",{userId:this.userId}),await this.loadData(),await this.RefreshCurrentUser(),await this.LoadEncStatus(!0),this.$emit("updated")}catch(t){this.showToast("Error: "+t.message,{variant:"danger"})}this.loading=!1},async updatePassword(t){this.password=t,await this.loadData(),this.closeModal("update-password-modal")},async loadUserEncStatus(){this.loading=!0;try{const t=await this.apiReq("/client/encryption/status",{force:!0,userId:this.userId});this.userEncStatus=t.result}catch(t){this.showToast("Error: "+t.message,{variant:"danger"})}this.loading=!1},async shareAccountKey(){this.loading=!0;try{const t=await this.apiReq("/client/encryption/shareAccountKey",{userId:this.userId});await this.loadData(),this.$emit("updated")}catch(t){this.showToast("Error: "+t.message,{variant:"danger"})}this.loading=!1},async loadData(){this.loadingComponent=!0;try{this.targetUser=this.user||this.currentUser,h("loadData user",this.targetUser),this.userId=this.targetUser._id,await this.refreshKeyList(),await this.loadEncSettings(),this.isCurrentUser?(await this.LoadEncStatus(!0),this.userEncStatus=this.encStatus):await this.loadUserEncStatus()}finally{this.loadingComponent=!1}}},created(){this.loadData()}}),W={key:0},Y={class:"m-2 border rounded p-2 text-center"},G={key:0,class:"row"},Q={key:1,class:"mb-2"},J={class:"col"},X={key:0},Z={class:"mt-2"},x={key:1},_={key:2},ee={class:"d-flex flex-gap-1 align-items-center flex-wrap mt-3"},te={key:2},se={class:"mt-5 text-center"},re={key:0,class:"row"},ie={class:"col"},ne={class:"mt-3"},oe={key:1,class:"row"},ae={class:"col"},le={class:"mt-3"},de={key:0,class:"mt-4"},ue={key:2,class:"row"},ye={key:0,class:"col"},me={class:"mt-3"},pe={class:"mt-3"},ce={key:1,class:"mt-2 small text-muted"},he={key:3,class:"mt-2"},ge={class:"col"},ve={class:"alert alert-warning"},fe={key:4,class:"mt-4"},we={class:"col"},ke={key:1},Ce={class:"d-flex flex-gap-1"},Ee={class:"mt-3"},Se={class:"d-flex flex-gap-1"},be=["title"],Ue=["title"],Re={key:0,class:"mt-4"},Ie={key:1,class:"mt-4"},Ke={key:2,class:"mt-4"},Te={key:3,class:"mt-3"},Ae={key:4,class:"mt-5 text-center"};function De(t,e,m,$e,Pe,Ve){var C,E,S,b,U,R,I,K,T,A;const D=y("UpdatePassword"),w=y("b-modal"),u=y("b-button"),$=y("b-link"),P=y("b-form-input"),k=y("b-spinner"),c=y("b-icon"),g=y("b-form-checkbox"),v=y("b-form-group"),V=y("b-table"),q=z("b-modal");return t.targetUser&&t.userEncStatus?(i(),n("div",W,[o(w,{lazy:"true",id:"update-password-modal",title:"Set User Password","hide-footer":""},{default:l(()=>[o(D,{needCurrentPassword:t.userEncStatus.userEncSetup,user:t.targetUser,onPassword:t.updatePassword},null,8,["needCurrentPassword","user","onPassword"])]),_:1}),o(w,{lazy:"true",id:"enc-recovery-key-modal",title:"Recovery Key","hide-footer":"","no-close-on-esc":"","no-close-on-backdrop":""},{default:l(()=>{var r;return[s("div",null,[e[18]||(e[18]=s("div",{class:"text-muted small"}," Store this in a safe place. This will allow you to recover you encrypted data if you lose your password. ",-1)),s("div",Y,f((r=t.recoveryKey)==null?void 0:r.keyString),1)])]}),_:1}),s("div",null,[t.isAdminUser?d("",!0):(i(),n("div",G,e[19]||(e[19]=[s("div",{class:"col"},[s("div",{class:"mb-3 mt-3 text-muted alert alert-warning"},"You must be an admin to change encryption settings")],-1)]))),t.isAdminUser&&!t.loading?(i(),n("div",Q,[s("div",J,[!t.isCurrentUser&&!t.userEncStatus.hasPassword?(i(),n("div",X,[e[21]||(e[21]=a(" A password must be set before encryption can be enabled ")),s("div",Z,[H((i(),p(u,null,{default:l(()=>e[20]||(e[20]=[a(" Set Password")])),_:1})),[[q,void 0,void 0,{"update-password-modal":!0}]])])])):!t.isCurrentUser&&!((C=t.encStatus)!=null&&C.acntEncSetup)?(i(),n("div",x,[e[23]||(e[23]=a(" You must enable encryption with an admin user before you can enable encryption for a restricted user. ")),o($,{class:"ms-2",to:"/settings/encryption"},{default:l(()=>e[22]||(e[22]=[a("Click here")])),_:1}),e[24]||(e[24]=a(" to enable encryption for your user. "))])):(E=t.userEncStatus)!=null&&E.userEncSetup?d("",!0):(i(),n("div",_,[s("div",ee,[o(P,{modelValue:t.password,"onUpdate:modelValue":e[0]||(e[0]=r=>t.password=r),placeholder:t.isCurrentUser?"Enter your password":`Confirm ${t.targetUser.username}'s current password`,type:"password"},null,8,["modelValue","placeholder"]),!t.loading&&t.password?(i(),p(u,{key:0,variant:"primary",onClick:t.enableEncryption},{default:l(()=>e[25]||(e[25]=[a(" Enable Encryption")])),_:1},8,["onClick"])):d("",!0)])]))])])):t.loading?(i(),n("div",te,[s("div",se,[o(k)])])):d("",!0),(i(),n(O,{key:3},[(S=t.userEncStatus)!=null&&S.hasPassword&&((b=t.userEncStatus)!=null&&b.userEncSetup)&&((U=t.userEncStatus)!=null&&U.acntEncSetup)&&!t.isCurrentUser?(i(),n("div",re,[s("div",ie,[s("div",ne,[o(c,{icon:"check-circle",class:"me-1",style:{color:"green"}}),e[26]||(e[26]=a(" Encryption is setup for this user "))])])])):d("",!0),(R=t.userEncStatus)!=null&&R.hasPassword&&((I=t.userEncStatus)!=null&&I.userEncSetup)&&!((K=t.userEncStatus)!=null&&K.acntEncSetup)&&!t.isCurrentUser?(i(),n("div",oe,[s("div",ae,[s("div",le,[o(c,{icon:"exclamation-triangle",class:"me-1",style:{color:"orange"}}),e[28]||(e[28]=a(" User does not have account key. ")),t.isAdminUser&&t.encStatus.acntEncEnabled?(i(),n("div",de,[o(u,{variant:"primary",onClick:e[1]||(e[1]=r=>t.shareAccountKey())},{default:l(()=>e[27]||(e[27]=[a("Share Account Key")])),_:1})])):d("",!0)])])])):d("",!0),t.isAdminUser&&((T=t.userEncStatus)!=null&&T.userEncEnabled)?(i(),n("div",ue,[t.userEncStatus.userRecoveryKeyExists?(i(),n("div",ye,[s("div",me,[s("div",{role:"button",class:"btn btn-outline-success",onClick:e[2]||(e[2]=r=>t.getRecoveryKey())},"View recovery key"),e[29]||(e[29]=s("div",{class:"text-muted small mt-2"}," Recovery Key can be used to recover your data if you lose your password. ",-1))]),s("div",pe,[(A=t.targetUser)!=null&&A.hasRecoveryKeyStored?(i(),p(u,{key:1,variant:"outline-danger",onClick:e[4]||(e[4]=r=>t.removeRecoveryKeyFromServer())},{default:l(()=>e[31]||(e[31]=[a("Remove Recovery Key From Server")])),_:1})):(i(),p(u,{key:0,variant:"info",onClick:e[3]||(e[3]=r=>t.saveRecoveryKeyOnServer())},{default:l(()=>e[30]||(e[30]=[a("Store Recovery Key on server")])),_:1})),e[32]||(e[32]=s("div",{class:"mt-2 small text-muted"}," Storing a recovery key on the server will make it easier to recover your data if you forget your password, but also slightly less secure. ",-1))])])):(i(),n("div",ce,[e[34]||(e[34]=a(" No recovery key found. ")),t.isAdminUser&&t.userEncStatus.userEncSetup?(i(),p(u,{key:0,variant:"info",onClick:e[5]||(e[5]=r=>t.generateRecoveryKey())},{default:l(()=>e[33]||(e[33]=[a("Create recovery key")])),_:1})):d("",!0)]))])):d("",!0),t.testComplete&&!t.testPassed?(i(),n("div",he,[s("div",ge,[s("div",ve,[e[35]||(e[35]=a(" There appears to be an issues with the encryption keys. ")),e[36]||(e[36]=s("br",null,null,-1)),a(" "+f(t.testMessage),1)])])])):d("",!0),t.keyList&&t.isAdminUser?(i(),n("div",fe,[s("div",we,[t.showDetails?d("",!0):(i(),n("div",{key:0,role:"button",class:"small linkcolor",onClick:e[6]||(e[6]=r=>t.showDetails=!0)},[e[37]||(e[37]=a(" advanced options ")),o(c,{icon:`chevron-${t.showDetails?"up":"down"}`},null,8,["icon"])])),t.showDetails?(i(),n("div",ke,[e[54]||(e[54]=s("hr",null,null,-1)),s("div",Ce,[e[38]||(e[38]=s("div",{class:"h5"},"Advanced Options",-1)),s("div",{role:"button",class:"linkcolor",onClick:e[7]||(e[7]=r=>t.showDetails=!1)},[o(c,{icon:"chevron-up"})])]),e[55]||(e[55]=s("div",{class:"alert alert-danger my-2"}," CAUTION: Please do not make changes to these settings unless you are sure of what you are doing. ",-1)),s("div",Ee,[o(v,{class:"form-group"},{default:l(()=>[o(g,{modelValue:t.encSettings.encryptHistory,"onUpdate:modelValue":e[8]||(e[8]=r=>t.encSettings.encryptHistory=r),onChange:e[9]||(e[9]=r=>t.updateEncSettings())},{default:l(()=>e[39]||(e[39]=[a(" Encrypt History")])),_:1},8,["modelValue"]),e[40]||(e[40]=s("div",{class:"text-muted small mt-1"},"Activity logs will be encrypted by default",-1))]),_:1}),o(v,{class:"form-group"},{default:l(()=>[o(g,{modelValue:t.encSettings.encryptItems,"onUpdate:modelValue":e[10]||(e[10]=r=>t.encSettings.encryptItems=r),onChange:e[11]||(e[11]=r=>t.updateEncSettings())},{default:l(()=>e[41]||(e[41]=[a(" Encrypt Items")])),_:1},8,["modelValue"]),e[42]||(e[42]=s("div",{class:"text-muted small mt-1"},"Library Items will be encrypted by default",-1))]),_:1}),o(v,{class:"form-group"},{default:l(()=>[o(g,{modelValue:t.encSettings.encryptPostsAndComments,"onUpdate:modelValue":e[12]||(e[12]=r=>t.encSettings.encryptPostsAndComments=r),onChange:e[13]||(e[13]=r=>t.updateEncSettings())},{default:l(()=>e[43]||(e[43]=[a(" Encrypt Posts and Comments")])),_:1},8,["modelValue"]),e[44]||(e[44]=s("div",{class:"text-muted small mt-1"},"Posts and comments will be encrypted by default",-1))]),_:1}),e[53]||(e[53]=s("div",{class:"mt-3 text-muted small"},"Key Manager Status and current key access",-1)),o(V,{responsive:"",class:"small mt-2 rounded border",items:t.keyList,fields:t.keyFields()},{"cell(description)":l(r=>[s("div",Se,[r.item.groupType=="user"?(i(),n("div",{key:0,title:r.item.keyId},f(t.getUserName(r.item.groupId))+" user key ",9,be)):r.item.groupType=="acnt"?(i(),n("div",{key:1,title:r.item.keyId},"Account key",8,Ue)):d("",!0)])]),_:1},8,["items","fields"]),t.isAdminUser&&t.developerMode?(i(),n("div",Re,[o(u,{variant:"secondary",onClick:e[14]||(e[14]=r=>t.clearCachedEncValues())},{default:l(()=>e[45]||(e[45]=[a("Clear Cached Encryption Values (Developer Option - for testing)")])),_:1}),e[46]||(e[46]=s("div",{class:"text-muted small mt-1"},"Clear Cached Password (Used for testing recovery)",-1))])):d("",!0),t.isAdminUser&&t.developerMode&&t.userEncStatus.userRecoveryKeyExists?(i(),n("div",Ie,[o(u,{variant:"secondary",onClick:e[15]||(e[15]=r=>t.deleteRecoveryKeyForTesting())},{default:l(()=>e[47]||(e[47]=[a("Delete Recovery Key (Developer Option - for testing)")])),_:1}),e[48]||(e[48]=s("div",{class:"text-muted small mt-1"},"Delete Recovery Key (Used for testing recovery)",-1))])):d("",!0),t.isAdminUser&&t.isCurrentUser&&t.developerMode?(i(),n("div",Ke,[o(u,{variant:"secondary",onClick:e[16]||(e[16]=r=>t.encryptAllItems())},{default:l(()=>e[49]||(e[49]=[a("Encrypt all Items ")])),_:1}),e[50]||(e[50]=s("div",{class:"text-muted small mt-1"},"Encrypt all unencrypted items in your library.",-1))])):d("",!0),t.isAdminUser&&t.isCurrentUser&&t.developerMode?(i(),n("div",Te,[o(u,{variant:"danger",onClick:e[17]||(e[17]=r=>t.removeAllAccountKeys())},{default:l(()=>e[51]||(e[51]=[a("Reset Encryption")])),_:1}),e[52]||(e[52]=s("div",{class:"text-muted small mt-1"}," This will delete all encryption keys for this account and it's users. All encrypted data will be unreadable. ",-1))])):d("",!0)])])):d("",!0)])])):d("",!0)],64)),t.loading||t.loadingComponent?(i(),n("div",Ae,[o(k)])):d("",!0)])])):d("",!0)}const Be=N(j,[["render",De]]);export{Be as U};
