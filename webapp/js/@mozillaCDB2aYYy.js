var he=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function oe(E){return E&&E.__esModule&&Object.prototype.hasOwnProperty.call(E,"default")?E.default:E}var Z={exports:{}};(function(E){function R(e,t){if(t&&t.documentElement)e=t,t=arguments[2];else if(!e||!e.documentElement)throw new Error("First argument to Readability constructor should be a document object.");if(t=t||{},this._doc=e,this._docJSDOMParser=this._doc.firstChild.__JSDOMParser__,this._articleTitle=null,this._articleByline=null,this._articleDir=null,this._articleSiteName=null,this._attempts=[],this._debug=!!t.debug,this._maxElemsToParse=t.maxElemsToParse||this.DEFAULT_MAX_ELEMS_TO_PARSE,this._nbTopCandidates=t.nbTopCandidates||this.DEFAULT_N_TOP_CANDIDATES,this._charThreshold=t.charThreshold||this.DEFAULT_CHAR_THRESHOLD,this._classesToPreserve=this.CLASSES_TO_PRESERVE.concat(t.classesToPreserve||[]),this._keepClasses=!!t.keepClasses,this._serializer=t.serializer||function(i){return i.innerHTML},this._disableJSONLD=!!t.disableJSONLD,this._allowedVideoRegex=t.allowedVideoRegex||this.REGEXPS.videos,this._flags=this.FLAG_STRIP_UNLIKELYS|this.FLAG_WEIGHT_CLASSES|this.FLAG_CLEAN_CONDITIONALLY,this._debug){let i=function(r){if(r.nodeType==r.TEXT_NODE)return`${r.nodeName} ("${r.textContent}")`;let l=Array.from(r.attributes||[],function(a){return`${a.name}="${a.value}"`}).join(" ");return`<${r.localName} ${l}>`};this.log=function(){if(typeof console<"u"){let l=Array.from(arguments,a=>a&&a.nodeType==this.ELEMENT_NODE?i(a):a);l.unshift("Reader: (Readability)"),console.log.apply(console,l)}else if(typeof dump<"u"){var r=Array.prototype.map.call(arguments,function(l){return l&&l.nodeName?i(l):l}).join(" ");dump("Reader: (Readability) "+r+`
`)}}}else this.log=function(){}}R.prototype={FLAG_STRIP_UNLIKELYS:1,FLAG_WEIGHT_CLASSES:2,FLAG_CLEAN_CONDITIONALLY:4,ELEMENT_NODE:1,TEXT_NODE:3,DEFAULT_MAX_ELEMS_TO_PARSE:0,DEFAULT_N_TOP_CANDIDATES:5,DEFAULT_TAGS_TO_SCORE:"section,h2,h3,h4,h5,h6,p,td,pre".toUpperCase().split(","),DEFAULT_CHAR_THRESHOLD:500,REGEXPS:{unlikelyCandidates:/-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,okMaybeItsACandidate:/and|article|body|column|content|main|shadow/i,positive:/article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,negative:/-ad-|hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|foot|footer|footnote|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget/i,extraneous:/print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,byline:/byline|author|dateline|writtenby|p-author/i,replaceFonts:/<(\/?)font[^>]*>/gi,normalize:/\s{2,}/g,videos:/\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,shareElements:/(\b|_)(share|sharedaddy)(\b|_)/i,nextLink:/(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,prevLink:/(prev|earl|old|new|<|«)/i,tokenize:/\W+/g,whitespace:/^\s*$/,hasContent:/\S$/,hashUrl:/^#.+/,srcsetUrl:/(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/g,b64DataUrl:/^data:\s*([^\s;,]+)\s*;\s*base64\s*,/i,commas:/\u002C|\u060C|\uFE50|\uFE10|\uFE11|\u2E41|\u2E34|\u2E32|\uFF0C/g,jsonLdArticleTypes:/^Article|AdvertiserContentArticle|NewsArticle|AnalysisNewsArticle|AskPublicNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReportageNewsArticle|ReviewNewsArticle|Report|SatiricalArticle|ScholarlyArticle|MedicalScholarlyArticle|SocialMediaPosting|BlogPosting|LiveBlogPosting|DiscussionForumPosting|TechArticle|APIReference$/},UNLIKELY_ROLES:["menu","menubar","complementary","navigation","alert","alertdialog","dialog"],DIV_TO_P_ELEMS:new Set(["BLOCKQUOTE","DL","DIV","IMG","OL","P","PRE","TABLE","UL"]),ALTER_TO_DIV_EXCEPTIONS:["DIV","ARTICLE","SECTION","P"],PRESENTATIONAL_ATTRIBUTES:["align","background","bgcolor","border","cellpadding","cellspacing","frame","hspace","rules","style","valign","vspace"],DEPRECATED_SIZE_ATTRIBUTE_ELEMS:["TABLE","TH","TD","HR","PRE"],PHRASING_ELEMS:["ABBR","AUDIO","B","BDO","BR","BUTTON","CITE","CODE","DATA","DATALIST","DFN","EM","EMBED","I","IMG","INPUT","KBD","LABEL","MARK","MATH","METER","NOSCRIPT","OBJECT","OUTPUT","PROGRESS","Q","RUBY","SAMP","SCRIPT","SELECT","SMALL","SPAN","STRONG","SUB","SUP","TEXTAREA","TIME","VAR","WBR"],CLASSES_TO_PRESERVE:["page"],HTML_ESCAPE_MAP:{lt:"<",gt:">",amp:"&",quot:'"',apos:"'"},_postProcessContent:function(e){this._fixRelativeUris(e),this._simplifyNestedElements(e),this._keepClasses||this._cleanClasses(e)},_removeNodes:function(e,t){if(this._docJSDOMParser&&e._isLiveNodeList)throw new Error("Do not pass live node lists to _removeNodes");for(var i=e.length-1;i>=0;i--){var r=e[i],l=r.parentNode;l&&(!t||t.call(this,r,i,e))&&l.removeChild(r)}},_replaceNodeTags:function(e,t){if(this._docJSDOMParser&&e._isLiveNodeList)throw new Error("Do not pass live node lists to _replaceNodeTags");for(const i of e)this._setNodeTag(i,t)},_forEachNode:function(e,t){Array.prototype.forEach.call(e,t,this)},_findNode:function(e,t){return Array.prototype.find.call(e,t,this)},_someNode:function(e,t){return Array.prototype.some.call(e,t,this)},_everyNode:function(e,t){return Array.prototype.every.call(e,t,this)},_concatNodeLists:function(){var e=Array.prototype.slice,t=e.call(arguments),i=t.map(function(r){return e.call(r)});return Array.prototype.concat.apply([],i)},_getAllNodesWithTag:function(e,t){return e.querySelectorAll?e.querySelectorAll(t.join(",")):[].concat.apply([],t.map(function(i){var r=e.getElementsByTagName(i);return Array.isArray(r)?r:Array.from(r)}))},_cleanClasses:function(e){var t=this._classesToPreserve,i=(e.getAttribute("class")||"").split(/\s+/).filter(function(r){return t.indexOf(r)!=-1}).join(" ");for(i?e.setAttribute("class",i):e.removeAttribute("class"),e=e.firstElementChild;e;e=e.nextElementSibling)this._cleanClasses(e)},_fixRelativeUris:function(e){var t=this._doc.baseURI,i=this._doc.documentURI;function r(s){if(t==i&&s.charAt(0)=="#")return s;try{return new URL(s,t).href}catch{}return s}var l=this._getAllNodesWithTag(e,["a"]);this._forEachNode(l,function(s){var h=s.getAttribute("href");if(h)if(h.indexOf("javascript:")===0)if(s.childNodes.length===1&&s.childNodes[0].nodeType===this.TEXT_NODE){var o=this._doc.createTextNode(s.textContent);s.parentNode.replaceChild(o,s)}else{for(var n=this._doc.createElement("span");s.firstChild;)n.appendChild(s.firstChild);s.parentNode.replaceChild(n,s)}else s.setAttribute("href",r(h))});var a=this._getAllNodesWithTag(e,["img","picture","figure","video","audio","source"]);this._forEachNode(a,function(s){var h=s.getAttribute("src"),o=s.getAttribute("poster"),n=s.getAttribute("srcset");if(h&&s.setAttribute("src",r(h)),o&&s.setAttribute("poster",r(o)),n){var c=n.replace(this.REGEXPS.srcsetUrl,function(_,A,N,b){return r(A)+(N||"")+b});s.setAttribute("srcset",c)}})},_simplifyNestedElements:function(e){for(var t=e;t;){if(t.parentNode&&["DIV","SECTION"].includes(t.tagName)&&!(t.id&&t.id.startsWith("readability"))){if(this._isElementWithoutContent(t)){t=this._removeAndGetNext(t);continue}else if(this._hasSingleTagInsideElement(t,"DIV")||this._hasSingleTagInsideElement(t,"SECTION")){for(var i=t.children[0],r=0;r<t.attributes.length;r++)i.setAttribute(t.attributes[r].name,t.attributes[r].value);t.parentNode.replaceChild(i,t),t=i;continue}}t=this._getNextNode(t)}},_getArticleTitle:function(){var e=this._doc,t="",i="";try{t=i=e.title.trim(),typeof t!="string"&&(t=i=this._getInnerText(e.getElementsByTagName("title")[0]))}catch{}var r=!1;function l(c){return c.split(/\s+/).length}if(/ [\|\-\\\/>»] /.test(t))r=/ [\\\/>»] /.test(t),t=i.replace(/(.*)[\|\-\\\/>»] .*/gi,"$1"),l(t)<3&&(t=i.replace(/[^\|\-\\\/>»]*[\|\-\\\/>»](.*)/gi,"$1"));else if(t.indexOf(": ")!==-1){var a=this._concatNodeLists(e.getElementsByTagName("h1"),e.getElementsByTagName("h2")),s=t.trim(),h=this._someNode(a,function(c){return c.textContent.trim()===s});h||(t=i.substring(i.lastIndexOf(":")+1),l(t)<3?t=i.substring(i.indexOf(":")+1):l(i.substr(0,i.indexOf(":")))>5&&(t=i))}else if(t.length>150||t.length<15){var o=e.getElementsByTagName("h1");o.length===1&&(t=this._getInnerText(o[0]))}t=t.trim().replace(this.REGEXPS.normalize," ");var n=l(t);return n<=4&&(!r||n!=l(i.replace(/[\|\-\\\/>»]+/g,""))-1)&&(t=i),t},_prepDocument:function(){var e=this._doc;this._removeNodes(this._getAllNodesWithTag(e,["style"])),e.body&&this._replaceBrs(e.body),this._replaceNodeTags(this._getAllNodesWithTag(e,["font"]),"SPAN")},_nextNode:function(e){for(var t=e;t&&t.nodeType!=this.ELEMENT_NODE&&this.REGEXPS.whitespace.test(t.textContent);)t=t.nextSibling;return t},_replaceBrs:function(e){this._forEachNode(this._getAllNodesWithTag(e,["br"]),function(t){for(var i=t.nextSibling,r=!1;(i=this._nextNode(i))&&i.tagName=="BR";){r=!0;var l=i.nextSibling;i.parentNode.removeChild(i),i=l}if(r){var a=this._doc.createElement("p");for(t.parentNode.replaceChild(a,t),i=a.nextSibling;i;){if(i.tagName=="BR"){var s=this._nextNode(i.nextSibling);if(s&&s.tagName=="BR")break}if(!this._isPhrasingContent(i))break;var h=i.nextSibling;a.appendChild(i),i=h}for(;a.lastChild&&this._isWhitespace(a.lastChild);)a.removeChild(a.lastChild);a.parentNode.tagName==="P"&&this._setNodeTag(a.parentNode,"DIV")}})},_setNodeTag:function(e,t){if(this.log("_setNodeTag",e,t),this._docJSDOMParser)return e.localName=t.toLowerCase(),e.tagName=t.toUpperCase(),e;for(var i=e.ownerDocument.createElement(t);e.firstChild;)i.appendChild(e.firstChild);e.parentNode.replaceChild(i,e),e.readability&&(i.readability=e.readability);for(var r=0;r<e.attributes.length;r++)try{i.setAttribute(e.attributes[r].name,e.attributes[r].value)}catch{}return i},_prepArticle:function(e){this._cleanStyles(e),this._markDataTables(e),this._fixLazyImages(e),this._cleanConditionally(e,"form"),this._cleanConditionally(e,"fieldset"),this._clean(e,"object"),this._clean(e,"embed"),this._clean(e,"footer"),this._clean(e,"link"),this._clean(e,"aside");var t=this.DEFAULT_CHAR_THRESHOLD;this._forEachNode(e.children,function(i){this._cleanMatchedNodes(i,function(r,l){return this.REGEXPS.shareElements.test(l)&&r.textContent.length<t})}),this._clean(e,"iframe"),this._clean(e,"input"),this._clean(e,"textarea"),this._clean(e,"select"),this._clean(e,"button"),this._cleanHeaders(e),this._cleanConditionally(e,"table"),this._cleanConditionally(e,"ul"),this._cleanConditionally(e,"div"),this._replaceNodeTags(this._getAllNodesWithTag(e,["h1"]),"h2"),this._removeNodes(this._getAllNodesWithTag(e,["p"]),function(i){var r=i.getElementsByTagName("img").length,l=i.getElementsByTagName("embed").length,a=i.getElementsByTagName("object").length,s=i.getElementsByTagName("iframe").length,h=r+l+a+s;return h===0&&!this._getInnerText(i,!1)}),this._forEachNode(this._getAllNodesWithTag(e,["br"]),function(i){var r=this._nextNode(i.nextSibling);r&&r.tagName=="P"&&i.parentNode.removeChild(i)}),this._forEachNode(this._getAllNodesWithTag(e,["table"]),function(i){var r=this._hasSingleTagInsideElement(i,"TBODY")?i.firstElementChild:i;if(this._hasSingleTagInsideElement(r,"TR")){var l=r.firstElementChild;if(this._hasSingleTagInsideElement(l,"TD")){var a=l.firstElementChild;a=this._setNodeTag(a,this._everyNode(a.childNodes,this._isPhrasingContent)?"P":"DIV"),i.parentNode.replaceChild(a,i)}}})},_initializeNode:function(e){switch(e.readability={contentScore:0},e.tagName){case"DIV":e.readability.contentScore+=5;break;case"PRE":case"TD":case"BLOCKQUOTE":e.readability.contentScore+=3;break;case"ADDRESS":case"OL":case"UL":case"DL":case"DD":case"DT":case"LI":case"FORM":e.readability.contentScore-=3;break;case"H1":case"H2":case"H3":case"H4":case"H5":case"H6":case"TH":e.readability.contentScore-=5;break}e.readability.contentScore+=this._getClassWeight(e)},_removeAndGetNext:function(e){var t=this._getNextNode(e,!0);return e.parentNode.removeChild(e),t},_getNextNode:function(e,t){if(!t&&e.firstElementChild)return e.firstElementChild;if(e.nextElementSibling)return e.nextElementSibling;do e=e.parentNode;while(e&&!e.nextElementSibling);return e&&e.nextElementSibling},_textSimilarity:function(e,t){var i=e.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean),r=t.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);if(!i.length||!r.length)return 0;var l=r.filter(s=>!i.includes(s)),a=l.join(" ").length/r.join(" ").length;return 1-a},_checkByline:function(e,t){if(this._articleByline)return!1;if(e.getAttribute!==void 0)var i=e.getAttribute("rel"),r=e.getAttribute("itemprop");return(i==="author"||r&&r.indexOf("author")!==-1||this.REGEXPS.byline.test(t))&&this._isValidByline(e.textContent)?(this._articleByline=e.textContent.trim(),!0):!1},_getNodeAncestors:function(e,t){t=t||0;for(var i=0,r=[];e.parentNode&&(r.push(e.parentNode),!(t&&++i===t));)e=e.parentNode;return r},_grabArticle:function(e){this.log("**** grabArticle ****");var t=this._doc,i=e!==null;if(e=e||this._doc.body,!e)return this.log("No body found in document. Abort."),null;for(var r=e.innerHTML;;){this.log("Starting grabArticle loop");var l=this._flagIsActive(this.FLAG_STRIP_UNLIKELYS),a=[],s=this._doc.documentElement;let K=!0;for(;s;){s.tagName==="HTML"&&(this._articleLang=s.getAttribute("lang"));var h=s.className+" "+s.id;if(!this._isProbablyVisible(s)){this.log("Removing hidden node - "+h),s=this._removeAndGetNext(s);continue}if(s.getAttribute("aria-modal")=="true"&&s.getAttribute("role")=="dialog"){s=this._removeAndGetNext(s);continue}if(this._checkByline(s,h)){s=this._removeAndGetNext(s);continue}if(K&&this._headerDuplicatesTitle(s)){this.log("Removing header: ",s.textContent.trim(),this._articleTitle.trim()),K=!1,s=this._removeAndGetNext(s);continue}if(l){if(this.REGEXPS.unlikelyCandidates.test(h)&&!this.REGEXPS.okMaybeItsACandidate.test(h)&&!this._hasAncestorTag(s,"table")&&!this._hasAncestorTag(s,"code")&&s.tagName!=="BODY"&&s.tagName!=="A"){this.log("Removing unlikely candidate - "+h),s=this._removeAndGetNext(s);continue}if(this.UNLIKELY_ROLES.includes(s.getAttribute("role"))){this.log("Removing content with role "+s.getAttribute("role")+" - "+h),s=this._removeAndGetNext(s);continue}}if((s.tagName==="DIV"||s.tagName==="SECTION"||s.tagName==="HEADER"||s.tagName==="H1"||s.tagName==="H2"||s.tagName==="H3"||s.tagName==="H4"||s.tagName==="H5"||s.tagName==="H6")&&this._isElementWithoutContent(s)){s=this._removeAndGetNext(s);continue}if(this.DEFAULT_TAGS_TO_SCORE.indexOf(s.tagName)!==-1&&a.push(s),s.tagName==="DIV"){for(var o=null,n=s.firstChild;n;){var c=n.nextSibling;if(this._isPhrasingContent(n))o!==null?o.appendChild(n):this._isWhitespace(n)||(o=t.createElement("p"),s.replaceChild(o,n),o.appendChild(n));else if(o!==null){for(;o.lastChild&&this._isWhitespace(o.lastChild);)o.removeChild(o.lastChild);o=null}n=c}if(this._hasSingleTagInsideElement(s,"P")&&this._getLinkDensity(s)<.25){var _=s.children[0];s.parentNode.replaceChild(_,s),s=_,a.push(s)}else this._hasChildBlockElement(s)||(s=this._setNodeTag(s,"P"),a.push(s))}s=this._getNextNode(s)}var A=[];this._forEachNode(a,function(d){if(!(!d.parentNode||typeof d.parentNode.tagName>"u")){var y=this._getInnerText(d);if(!(y.length<25)){var Q=this._getNodeAncestors(d,5);if(Q.length!==0){var G=0;G+=1,G+=y.split(this.REGEXPS.commas).length,G+=Math.min(Math.floor(y.length/100),3),this._forEachNode(Q,function(L,V){if(!(!L.tagName||!L.parentNode||typeof L.parentNode.tagName>"u")){if(typeof L.readability>"u"&&(this._initializeNode(L),A.push(L)),V===0)var j=1;else V===1?j=2:j=V*3;L.readability.contentScore+=G/j}})}}}});for(var N=[],b=0,T=A.length;b<T;b+=1){var v=A[b],p=v.readability.contentScore*(1-this._getLinkDensity(v));v.readability.contentScore=p,this.log("Candidate:",v,"with score "+p);for(var S=0;S<this._nbTopCandidates;S++){var I=N[S];if(!I||p>I.readability.contentScore){N.splice(S,0,v),N.length>this._nbTopCandidates&&N.pop();break}}}var u=N[0]||null,x=!1,g;if(u===null||u.tagName==="BODY"){for(u=t.createElement("DIV"),x=!0;e.firstChild;)this.log("Moving child out:",e.firstChild),u.appendChild(e.firstChild);e.appendChild(u),this._initializeNode(u)}else if(u){for(var D=[],C=1;C<N.length;C++)N[C].readability.contentScore/u.readability.contentScore>=.75&&D.push(this._getNodeAncestors(N[C]));var M=3;if(D.length>=M)for(g=u.parentNode;g.tagName!=="BODY";){for(var H=0,k=0;k<D.length&&H<M;k++)H+=Number(D[k].includes(g));if(H>=M){u=g;break}g=g.parentNode}u.readability||this._initializeNode(u),g=u.parentNode;for(var U=u.readability.contentScore,te=U/3;g.tagName!=="BODY";){if(!g.readability){g=g.parentNode;continue}var $=g.readability.contentScore;if($<te)break;if($>U){u=g;break}U=g.readability.contentScore,g=g.parentNode}for(g=u.parentNode;g.tagName!="BODY"&&g.children.length==1;)u=g,g=u.parentNode;u.readability||this._initializeNode(u)}var m=t.createElement("DIV");i&&(m.id="readability-content");var ie=Math.max(10,u.readability.contentScore*.2);g=u.parentNode;for(var W=g.children,B=0,Y=W.length;B<Y;B++){var f=W[B],P=!1;if(this.log("Looking at sibling node:",f,f.readability?"with score "+f.readability.contentScore:""),this.log("Sibling has score",f.readability?f.readability.contentScore:"Unknown"),f===u)P=!0;else{var q=0;if(f.className===u.className&&u.className!==""&&(q+=u.readability.contentScore*.2),f.readability&&f.readability.contentScore+q>=ie)P=!0;else if(f.nodeName==="P"){var z=this._getLinkDensity(f),J=this._getInnerText(f),F=J.length;(F>80&&z<.25||F<80&&F>0&&z===0&&J.search(/\.( |$)/)!==-1)&&(P=!0)}}P&&(this.log("Appending node:",f),this.ALTER_TO_DIV_EXCEPTIONS.indexOf(f.nodeName)===-1&&(this.log("Altering sibling:",f,"to div."),f=this._setNodeTag(f,"DIV")),m.appendChild(f),W=g.children,B-=1,Y-=1)}if(this._debug&&this.log("Article content pre-prep: "+m.innerHTML),this._prepArticle(m),this._debug&&this.log("Article content post-prep: "+m.innerHTML),x)u.id="readability-page-1",u.className="page";else{var O=t.createElement("DIV");for(O.id="readability-page-1",O.className="page";m.firstChild;)O.appendChild(m.firstChild);m.appendChild(O)}this._debug&&this.log("Article content after paging: "+m.innerHTML);var X=!0,w=this._getInnerText(m,!0).length;if(w<this._charThreshold)if(X=!1,e.innerHTML=r,this._flagIsActive(this.FLAG_STRIP_UNLIKELYS))this._removeFlag(this.FLAG_STRIP_UNLIKELYS),this._attempts.push({articleContent:m,textLength:w});else if(this._flagIsActive(this.FLAG_WEIGHT_CLASSES))this._removeFlag(this.FLAG_WEIGHT_CLASSES),this._attempts.push({articleContent:m,textLength:w});else if(this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY))this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY),this._attempts.push({articleContent:m,textLength:w});else{if(this._attempts.push({articleContent:m,textLength:w}),this._attempts.sort(function(d,y){return y.textLength-d.textLength}),!this._attempts[0].textLength)return null;m=this._attempts[0].articleContent,X=!0}if(X){var re=[g,u].concat(this._getNodeAncestors(g));return this._someNode(re,function(d){if(!d.tagName)return!1;var y=d.getAttribute("dir");return y?(this._articleDir=y,!0):!1}),m}}},_isValidByline:function(e){return typeof e=="string"||e instanceof String?(e=e.trim(),e.length>0&&e.length<100):!1},_unescapeHtmlEntities:function(e){if(!e)return e;var t=this.HTML_ESCAPE_MAP;return e.replace(/&(quot|amp|apos|lt|gt);/g,function(i,r){return t[r]}).replace(/&#(?:x([0-9a-z]{1,4})|([0-9]{1,4}));/gi,function(i,r,l){var a=parseInt(r||l,r?16:10);return String.fromCharCode(a)})},_getJSONLD:function(e){var t=this._getAllNodesWithTag(e,["script"]),i;return this._forEachNode(t,function(r){if(!i&&r.getAttribute("type")==="application/ld+json")try{var l=r.textContent.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g,""),a=JSON.parse(l);if(!a["@context"]||!a["@context"].match(/^https?\:\/\/schema\.org$/)||(!a["@type"]&&Array.isArray(a["@graph"])&&(a=a["@graph"].find(function(n){return(n["@type"]||"").match(this.REGEXPS.jsonLdArticleTypes)})),!a||!a["@type"]||!a["@type"].match(this.REGEXPS.jsonLdArticleTypes)))return;if(i={},typeof a.name=="string"&&typeof a.headline=="string"&&a.name!==a.headline){var s=this._getArticleTitle(),h=this._textSimilarity(a.name,s)>.75,o=this._textSimilarity(a.headline,s)>.75;o&&!h?i.title=a.headline:i.title=a.name}else typeof a.name=="string"?i.title=a.name.trim():typeof a.headline=="string"&&(i.title=a.headline.trim());a.author&&(typeof a.author.name=="string"?i.byline=a.author.name.trim():Array.isArray(a.author)&&a.author[0]&&typeof a.author[0].name=="string"&&(i.byline=a.author.filter(function(n){return n&&typeof n.name=="string"}).map(function(n){return n.name.trim()}).join(", "))),typeof a.description=="string"&&(i.excerpt=a.description.trim()),a.publisher&&typeof a.publisher.name=="string"&&(i.siteName=a.publisher.name.trim()),typeof a.datePublished=="string"&&(i.datePublished=a.datePublished.trim());return}catch(n){this.log(n.message)}}),i||{}},_getArticleMetadata:function(e){var t={},i={},r=this._doc.getElementsByTagName("meta"),l=/\s*(article|dc|dcterm|og|twitter)\s*:\s*(author|creator|description|published_time|title|site_name)\s*/gi,a=/^\s*(?:(dc|dcterm|og|twitter|weibo:(article|webpage))\s*[\.:]\s*)?(author|creator|description|title|site_name)\s*$/i;return this._forEachNode(r,function(s){var h=s.getAttribute("name"),o=s.getAttribute("property"),n=s.getAttribute("content");if(n){var c=null,_=null;o&&(c=o.match(l),c&&(_=c[0].toLowerCase().replace(/\s/g,""),i[_]=n.trim())),!c&&h&&a.test(h)&&(_=h,n&&(_=_.toLowerCase().replace(/\s/g,"").replace(/\./g,":"),i[_]=n.trim()))}}),t.title=e.title||i["dc:title"]||i["dcterm:title"]||i["og:title"]||i["weibo:article:title"]||i["weibo:webpage:title"]||i.title||i["twitter:title"],t.title||(t.title=this._getArticleTitle()),t.byline=e.byline||i["dc:creator"]||i["dcterm:creator"]||i.author,t.excerpt=e.excerpt||i["dc:description"]||i["dcterm:description"]||i["og:description"]||i["weibo:article:description"]||i["weibo:webpage:description"]||i.description||i["twitter:description"],t.siteName=e.siteName||i["og:site_name"],t.publishedTime=e.datePublished||i["article:published_time"]||null,t.title=this._unescapeHtmlEntities(t.title),t.byline=this._unescapeHtmlEntities(t.byline),t.excerpt=this._unescapeHtmlEntities(t.excerpt),t.siteName=this._unescapeHtmlEntities(t.siteName),t.publishedTime=this._unescapeHtmlEntities(t.publishedTime),t},_isSingleImage:function(e){return e.tagName==="IMG"?!0:e.children.length!==1||e.textContent.trim()!==""?!1:this._isSingleImage(e.children[0])},_unwrapNoscriptImages:function(e){var t=Array.from(e.getElementsByTagName("img"));this._forEachNode(t,function(r){for(var l=0;l<r.attributes.length;l++){var a=r.attributes[l];switch(a.name){case"src":case"srcset":case"data-src":case"data-srcset":return}if(/\.(jpg|jpeg|png|webp)/i.test(a.value))return}r.parentNode.removeChild(r)});var i=Array.from(e.getElementsByTagName("noscript"));this._forEachNode(i,function(r){var l=e.createElement("div");if(l.innerHTML=r.innerHTML,!!this._isSingleImage(l)){var a=r.previousElementSibling;if(a&&this._isSingleImage(a)){var s=a;s.tagName!=="IMG"&&(s=a.getElementsByTagName("img")[0]);for(var h=l.getElementsByTagName("img")[0],o=0;o<s.attributes.length;o++){var n=s.attributes[o];if(n.value!==""&&(n.name==="src"||n.name==="srcset"||/\.(jpg|jpeg|png|webp)/i.test(n.value))){if(h.getAttribute(n.name)===n.value)continue;var c=n.name;h.hasAttribute(c)&&(c="data-old-"+c),h.setAttribute(c,n.value)}}r.parentNode.replaceChild(l.firstElementChild,a)}}})},_removeScripts:function(e){this._removeNodes(this._getAllNodesWithTag(e,["script","noscript"]))},_hasSingleTagInsideElement:function(e,t){return e.children.length!=1||e.children[0].tagName!==t?!1:!this._someNode(e.childNodes,function(i){return i.nodeType===this.TEXT_NODE&&this.REGEXPS.hasContent.test(i.textContent)})},_isElementWithoutContent:function(e){return e.nodeType===this.ELEMENT_NODE&&e.textContent.trim().length==0&&(e.children.length==0||e.children.length==e.getElementsByTagName("br").length+e.getElementsByTagName("hr").length)},_hasChildBlockElement:function(e){return this._someNode(e.childNodes,function(t){return this.DIV_TO_P_ELEMS.has(t.tagName)||this._hasChildBlockElement(t)})},_isPhrasingContent:function(e){return e.nodeType===this.TEXT_NODE||this.PHRASING_ELEMS.indexOf(e.tagName)!==-1||(e.tagName==="A"||e.tagName==="DEL"||e.tagName==="INS")&&this._everyNode(e.childNodes,this._isPhrasingContent)},_isWhitespace:function(e){return e.nodeType===this.TEXT_NODE&&e.textContent.trim().length===0||e.nodeType===this.ELEMENT_NODE&&e.tagName==="BR"},_getInnerText:function(e,t){t=typeof t>"u"?!0:t;var i=e.textContent.trim();return t?i.replace(this.REGEXPS.normalize," "):i},_getCharCount:function(e,t){return t=t||",",this._getInnerText(e).split(t).length-1},_cleanStyles:function(e){if(!(!e||e.tagName.toLowerCase()==="svg")){for(var t=0;t<this.PRESENTATIONAL_ATTRIBUTES.length;t++)e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[t]);this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.indexOf(e.tagName)!==-1&&(e.removeAttribute("width"),e.removeAttribute("height"));for(var i=e.firstElementChild;i!==null;)this._cleanStyles(i),i=i.nextElementSibling}},_getLinkDensity:function(e){var t=this._getInnerText(e).length;if(t===0)return 0;var i=0;return this._forEachNode(e.getElementsByTagName("a"),function(r){var l=r.getAttribute("href"),a=l&&this.REGEXPS.hashUrl.test(l)?.3:1;i+=this._getInnerText(r).length*a}),i/t},_getClassWeight:function(e){if(!this._flagIsActive(this.FLAG_WEIGHT_CLASSES))return 0;var t=0;return typeof e.className=="string"&&e.className!==""&&(this.REGEXPS.negative.test(e.className)&&(t-=25),this.REGEXPS.positive.test(e.className)&&(t+=25)),typeof e.id=="string"&&e.id!==""&&(this.REGEXPS.negative.test(e.id)&&(t-=25),this.REGEXPS.positive.test(e.id)&&(t+=25)),t},_clean:function(e,t){var i=["object","embed","iframe"].indexOf(t)!==-1;this._removeNodes(this._getAllNodesWithTag(e,[t]),function(r){if(i){for(var l=0;l<r.attributes.length;l++)if(this._allowedVideoRegex.test(r.attributes[l].value))return!1;if(r.tagName==="object"&&this._allowedVideoRegex.test(r.innerHTML))return!1}return!0})},_hasAncestorTag:function(e,t,i,r){i=i||3,t=t.toUpperCase();for(var l=0;e.parentNode;){if(i>0&&l>i)return!1;if(e.parentNode.tagName===t&&(!r||r(e.parentNode)))return!0;e=e.parentNode,l++}return!1},_getRowAndColumnCount:function(e){for(var t=0,i=0,r=e.getElementsByTagName("tr"),l=0;l<r.length;l++){var a=r[l].getAttribute("rowspan")||0;a&&(a=parseInt(a,10)),t+=a||1;for(var s=0,h=r[l].getElementsByTagName("td"),o=0;o<h.length;o++){var n=h[o].getAttribute("colspan")||0;n&&(n=parseInt(n,10)),s+=n||1}i=Math.max(i,s)}return{rows:t,columns:i}},_markDataTables:function(e){for(var t=e.getElementsByTagName("table"),i=0;i<t.length;i++){var r=t[i],l=r.getAttribute("role");if(l=="presentation"){r._readabilityDataTable=!1;continue}var a=r.getAttribute("datatable");if(a=="0"){r._readabilityDataTable=!1;continue}var s=r.getAttribute("summary");if(s){r._readabilityDataTable=!0;continue}var h=r.getElementsByTagName("caption")[0];if(h&&h.childNodes.length>0){r._readabilityDataTable=!0;continue}var o=["col","colgroup","tfoot","thead","th"],n=function(_){return!!r.getElementsByTagName(_)[0]};if(o.some(n)){this.log("Data table because found data-y descendant"),r._readabilityDataTable=!0;continue}if(r.getElementsByTagName("table")[0]){r._readabilityDataTable=!1;continue}var c=this._getRowAndColumnCount(r);if(c.rows>=10||c.columns>4){r._readabilityDataTable=!0;continue}r._readabilityDataTable=c.rows*c.columns>10}},_fixLazyImages:function(e){this._forEachNode(this._getAllNodesWithTag(e,["img","picture","figure"]),function(t){if(t.src&&this.REGEXPS.b64DataUrl.test(t.src)){var i=this.REGEXPS.b64DataUrl.exec(t.src);if(i[1]==="image/svg+xml")return;for(var r=!1,l=0;l<t.attributes.length;l++){var a=t.attributes[l];if(a.name!=="src"&&/\.(jpg|jpeg|png|webp)/i.test(a.value)){r=!0;break}}if(r){var s=t.src.search(/base64\s*/i)+7,h=t.src.length-s;h<133&&t.removeAttribute("src")}}if(!((t.src||t.srcset&&t.srcset!="null")&&t.className.toLowerCase().indexOf("lazy")===-1)){for(var o=0;o<t.attributes.length;o++)if(a=t.attributes[o],!(a.name==="src"||a.name==="srcset"||a.name==="alt")){var n=null;if(/\.(jpg|jpeg|png|webp)\s+\d/.test(a.value)?n="srcset":/^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/.test(a.value)&&(n="src"),n){if(t.tagName==="IMG"||t.tagName==="PICTURE")t.setAttribute(n,a.value);else if(t.tagName==="FIGURE"&&!this._getAllNodesWithTag(t,["img","picture"]).length){var c=this._doc.createElement("img");c.setAttribute(n,a.value),t.appendChild(c)}}}}})},_getTextDensity:function(e,t){var i=this._getInnerText(e,!0).length;if(i===0)return 0;var r=0,l=this._getAllNodesWithTag(e,t);return this._forEachNode(l,a=>r+=this._getInnerText(a,!0).length),r/i},_cleanConditionally:function(e,t){this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)&&this._removeNodes(this._getAllNodesWithTag(e,[t]),function(i){var r=function(g){return g._readabilityDataTable},l=t==="ul"||t==="ol";if(!l){var a=0,s=this._getAllNodesWithTag(i,["ul","ol"]);this._forEachNode(s,g=>a+=this._getInnerText(g).length),l=a/this._getInnerText(i).length>.9}if(t==="table"&&r(i)||this._hasAncestorTag(i,"table",-1,r)||this._hasAncestorTag(i,"code"))return!1;var h=this._getClassWeight(i);this.log("Cleaning Conditionally",i);var o=0;if(h+o<0)return!0;if(this._getCharCount(i,",")<10){for(var n=i.getElementsByTagName("p").length,c=i.getElementsByTagName("img").length,_=i.getElementsByTagName("li").length-100,A=i.getElementsByTagName("input").length,N=this._getTextDensity(i,["h1","h2","h3","h4","h5","h6"]),b=0,T=this._getAllNodesWithTag(i,["object","embed","iframe"]),v=0;v<T.length;v++){for(var p=0;p<T[v].attributes.length;p++)if(this._allowedVideoRegex.test(T[v].attributes[p].value))return!1;if(T[v].tagName==="object"&&this._allowedVideoRegex.test(T[v].innerHTML))return!1;b++}var S=this._getLinkDensity(i),I=this._getInnerText(i).length,u=c>1&&n/c<.5&&!this._hasAncestorTag(i,"figure")||!l&&_>n||A>Math.floor(n/3)||!l&&N<.9&&I<25&&(c===0||c>2)&&!this._hasAncestorTag(i,"figure")||!l&&h<25&&S>.2||h>=25&&S>.5||b===1&&I<75||b>1;if(l&&u){for(var x=0;x<i.children.length;x++)if(i.children[x].children.length>1)return u;let g=i.getElementsByTagName("li").length;if(c==g)return!1}return u}return!1})},_cleanMatchedNodes:function(e,t){for(var i=this._getNextNode(e,!0),r=this._getNextNode(e);r&&r!=i;)t.call(this,r,r.className+" "+r.id)?r=this._removeAndGetNext(r):r=this._getNextNode(r)},_cleanHeaders:function(e){let t=this._getAllNodesWithTag(e,["h1","h2"]);this._removeNodes(t,function(i){let r=this._getClassWeight(i)<0;return r&&this.log("Removing header with low class weight:",i),r})},_headerDuplicatesTitle:function(e){if(e.tagName!="H1"&&e.tagName!="H2")return!1;var t=this._getInnerText(e,!1);return this.log("Evaluating similarity of header:",t,this._articleTitle),this._textSimilarity(this._articleTitle,t)>.75},_flagIsActive:function(e){return(this._flags&e)>0},_removeFlag:function(e){this._flags=this._flags&~e},_isProbablyVisible:function(e){return(!e.style||e.style.display!="none")&&(!e.style||e.style.visibility!="hidden")&&!e.hasAttribute("hidden")&&(!e.hasAttribute("aria-hidden")||e.getAttribute("aria-hidden")!="true"||e.className&&e.className.indexOf&&e.className.indexOf("fallback-image")!==-1)},parse:function(){if(this._maxElemsToParse>0){var e=this._doc.getElementsByTagName("*").length;if(e>this._maxElemsToParse)throw new Error("Aborting parsing document; "+e+" elements found")}this._unwrapNoscriptImages(this._doc);var t=this._disableJSONLD?{}:this._getJSONLD(this._doc);this._removeScripts(this._doc),this._prepDocument();var i=this._getArticleMetadata(t);this._articleTitle=i.title;var r=this._grabArticle();if(!r)return null;if(this.log("Grabbed: "+r.innerHTML),this._postProcessContent(r),!i.excerpt){var l=r.getElementsByTagName("p");l.length>0&&(i.excerpt=l[0].textContent.trim())}var a=r.textContent;return{title:this._articleTitle,byline:i.byline||this._articleByline,dir:this._articleDir,lang:this._articleLang,content:this._serializer(r),textContent:a,length:a.length,excerpt:i.excerpt,siteName:i.siteName||this._articleSiteName,publishedTime:i.publishedTime}}},E.exports=R})(Z);var ae=Z.exports,ee={exports:{}};(function(E){var R={unlikelyCandidates:/-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,okMaybeItsACandidate:/and|article|body|column|content|main|shadow/i};function e(i){return(!i.style||i.style.display!="none")&&!i.hasAttribute("hidden")&&(!i.hasAttribute("aria-hidden")||i.getAttribute("aria-hidden")!="true"||i.className&&i.className.indexOf&&i.className.indexOf("fallback-image")!==-1)}function t(i,r={}){typeof r=="function"&&(r={visibilityChecker:r});var l={minScore:20,minContentLength:140,visibilityChecker:e};r=Object.assign(l,r);var a=i.querySelectorAll("p, pre, article"),s=i.querySelectorAll("div > br");if(s.length){var h=new Set(a);[].forEach.call(s,function(n){h.add(n.parentNode)}),a=Array.from(h)}var o=0;return[].some.call(a,function(n){if(!r.visibilityChecker(n))return!1;var c=n.className+" "+n.id;if(R.unlikelyCandidates.test(c)&&!R.okMaybeItsACandidate.test(c)||n.matches("li p"))return!1;var _=n.textContent.trim().length;return _<r.minContentLength?!1:(o+=Math.sqrt(_-r.minContentLength),o>r.minScore)})}E.exports=t})(ee);var se=ee.exports,le=ae,ne=se,ce={Readability:le,isProbablyReaderable:ne};export{he as c,oe as g,ce as r};
