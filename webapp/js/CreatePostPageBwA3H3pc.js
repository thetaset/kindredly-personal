import p from"./CreatePostBAHA8aF_.js";import{d as c,m as d,z as o,r,i as l,K as e,k as u}from"./@vueC3Nhqlrl.js";import{_}from"./components.global5n24RCIC.js";import"./SelectImageC6eE4eIL.js";import"./ItemImageBounipmB.js";import"./TIIconDefaultDZ-9wHcm.js";import"./AddItemBupo5MFl.js";import"./PopCollectionSelectorDtsi0cBR.js";import"./CreateCollectionCvnp9GSK.js";import"./ai_lookup_utilszDX_hcwM.js";import"./vue3-toastifyDll2FbVh.js";import"./@capacitorCjBcbZvA.js";import"./bootstrap-vue-nextDnMzdrWQ.js";import"./CollectionButtonListDy0-Tbdc.js";import"./ItemTypese0F2nuP7.js";import"./AddItemFromLibraryResultsB-9vIRhu.js";import"./SelectUsersB1nJ5zhc.js";import"./EmojiPickerDMFiK4Hc.js";import"./@iconifyDLzQZ07j.js";import"./@iconify-iconsCsSCFVIT.js";import"./item.storeJyG03RbI.js";const f=c({name:"CreatePostPage",components:{CreatePost:p},data(){return{itemIds:void 0}},mounted(){},computed:{},methods:{viewPost(t){t?this.$router.push("/p/"+t):this.$router.push("/feeds/sharing")}},created(){this.$route.query.itemIds&&(this.itemIds=String(this.$route.query.itemIds).split(","))}});function h(t,s,C,P,$,b){const i=r("b-col"),n=r("b-row"),m=r("CreatePost"),a=r("b-container");return l(),d(a,{class:"container"},{default:o(()=>[e(n,{class:"row"},{default:o(()=>[e(i,{class:"col"},{default:o(()=>s[0]||(s[0]=[u("h4",null,"Share in Post",-1)])),_:1})]),_:1}),e(n,{class:"mt-4"},{default:o(()=>[e(i,{class:"col"},{default:o(()=>[e(m,{itemIds:t.itemIds,onClose:t.viewPost},null,8,["itemIds","onClose"])]),_:1})]),_:1})]),_:1})}const J=_(f,[["render",h]]);export{J as default};
