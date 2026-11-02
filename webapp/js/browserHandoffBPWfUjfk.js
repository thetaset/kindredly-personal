function n(e,o=400){setTimeout(()=>{const t=e.options.history.state.back;if(typeof t=="string"&&t.length>0&&!t.includes("returnToBrowser=")){e.back();return}e.replace("/")},o)}export{n as l};
