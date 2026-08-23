
const fs=require('fs');
const code=fs.readFileSync('C:/projects/OnSite/assets/i18n.js','utf8');
const noop=()=>{};
global.window=global; global.document={readyState:'complete',addEventListener:noop,documentElement:{setAttribute:noop},body:null,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({setAttribute:noop,appendChild:noop,classedList:{},style:{}}),createTreeWalker:()=>({nextNode:()=>null}),dispatchEvent:noop};
global.localStorage={getItem:()=>null,setItem:noop};
global.CustomEvent=function(){};
try{eval(code);}catch(e){console.log('EVAL ERR',e.message);}
console.log('OnsiteI18n type:', typeof OnsiteI18n);
console.log(OnsiteI18n.format(79.99));
OnsiteI18n.setLang('de');
console.log('de ok:', OnsiteI18n.lang);
