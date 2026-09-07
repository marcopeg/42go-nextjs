import assert from "node:assert/strict";
import test from "node:test";
import { getPaginationGeometry, snapReaderOffset, getVisibleReaderRect, sizeReaderColumns } from "../src/app/(app)/(lingocafe)/books/_components/reader-pagination.ts";
import { sanitizeReaderReadingMode, sanitizeReaderPreferencesStore, readStoredReaderPreferencesStore } from "../src/app/(app)/(lingocafe)/books/_components/reader-preferences.ts";
import { createElementReaderScrollTarget, getReaderScrollProgressBps, scrollReaderToProgressBps, isReaderElementVisible, centerReaderElement } from "../src/app/(app)/(lingocafe)/books/_components/reader-scroll-target.ts";
import { restoreReaderContentAnchor, isReaderContentAnchor } from "../src/app/(app)/(lingocafe)/books/_components/reader-content-anchor.ts";

class Viewport extends EventTarget {
  dataset: Record<string,string> = { readerPaginated: "true" };
  clientWidth = 350; clientHeight = 600; scrollWidth = 1400; scrollHeight = 600;
  scrollLeft = 0; scrollTop = 0;
  getBoundingClientRect() { return {left:20,right:370,top:80,bottom:680,width:350,height:600} as DOMRect; }
  scrollTo(options: ScrollToOptions) { if(options.left !== undefined) this.scrollLeft=options.left; if(options.top !== undefined) this.scrollTop=options.top; }
}

test("pagination tolerates rounded DOM widths, empty chapters, and clamps movement",()=>{
  assert.deepEqual(getPaginationGeometry(350,1400),{pitch:350,count:4,max:1050});
  assert.equal(getPaginationGeometry(350,1401).count,4);
  assert.equal(getPaginationGeometry(350,1402).count,5);
  assert.equal(getPaginationGeometry(0,0).count,1);
  assert.equal(snapReaderOffset(-100,350,1050),0);
  assert.equal(snapReaderOffset(540,350,1050),700);
  assert.equal(snapReaderOffset(10000,350,1050),1050);
});

test("shared progress maps screens to chapter position and preserves vertical behavior",()=>{
  const element=new Viewport(); const target=createElementReaderScrollTarget(element as unknown as HTMLElement);
  assert.equal(getReaderScrollProgressBps(target),0);
  scrollReaderToProgressBps(target,5000);
  assert.equal(element.scrollLeft,700);
  assert.equal(getReaderScrollProgressBps(target),6667);
  scrollReaderToProgressBps(target,10000);
  assert.equal(element.scrollLeft,1050);
  assert.equal(getReaderScrollProgressBps(target),10000);
  element.scrollWidth=350;element.scrollLeft=0;
  assert.equal(getReaderScrollProgressBps(target),0);
  element.dataset={};element.scrollHeight=1800;element.scrollTop=600;
  assert.equal(getReaderScrollProgressBps(target),5000);
  target.setScrollTop(275);
  assert.equal(element.scrollTop,275);
});

test("a sentence bounding box spanning hidden columns does not imply visibility",()=>{
  const e=new Viewport();const target=createElementReaderScrollTarget(e as unknown as HTMLElement);
  const before={left:-330,right:0,top:80,bottom:110,width:330,height:30} as DOMRect;
  const after={left:400,right:730,top:80,bottom:110,width:330,height:30} as DOMRect;
  const span={getClientRects:()=>[before,after], getBoundingClientRect:()=>({left:-330,right:730,top:80,bottom:110,width:1060,height:30})} as unknown as HTMLElement;
  assert.equal(getVisibleReaderRect(span,e.getBoundingClientRect()),undefined);
  assert.equal(isReaderElementVisible(target,span),false);
  const next={getClientRects:()=>[after],getBoundingClientRect:()=>after} as unknown as HTMLElement;
  centerReaderElement(target,next);
  assert.equal(e.scrollLeft,350);
});

test("pagination requires exact opt-in and is independent of theme profiles",()=>{
  for(const value of [undefined,null,true,"pages","",{},1]) assert.equal(sanitizeReaderReadingMode(value),"scroll");
  assert.equal(sanitizeReaderReadingMode("paginated"),"paginated");
  const store=sanitizeReaderPreferencesStore({readingMode:"paginated",light:{fontSizeIndex:2},dark:{fontSizeIndex:7}});
  assert.equal(store.readingMode,"paginated");
  assert.equal(store.light?.fontSizeIndex,2);
  assert.equal(store.dark?.fontSizeIndex,7);
  assert.equal(sanitizeReaderPreferencesStore({readingMode:"invalid"}).readingMode,"scroll");
});

test("blocked or malformed local storage safely defaults to vertical reading",()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  try {
    Object.defineProperty(globalThis,"localStorage",{configurable:true,get(){throw new Error("blocked");}});
    assert.deepEqual(readStoredReaderPreferencesStore(),{});
    Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:()=>"{broken"}});
    assert.deepEqual(readStoredReaderPreferencesStore(),{});
  } finally {if(descriptor)Object.defineProperty(globalThis,"localStorage",descriptor);else Reflect.deleteProperty(globalThis,"localStorage");}
});

test("content anchors survive reflow and reject changed text or invalid offsets",()=>{
  const e=new Viewport();const target=createElementReaderScrollTarget(e as unknown as HTMLElement);
  const text="A long sentence that spans several columns.";
  const element={dataset:{readerSentenceId:"book:chapter:3"},textContent:text};
  Object.assign(e,{querySelectorAll:()=>[element]});
  const documentDescriptor=Object.getOwnPropertyDescriptor(globalThis,"document");
  const filterDescriptor=Object.getOwnPropertyDescriptor(globalThis,"NodeFilter");
  let charactersPerPage=10;let offset=0;
  try {
    Object.defineProperty(globalThis,"NodeFilter",{configurable:true,value:{SHOW_TEXT:4}});
    Object.defineProperty(globalThis,"document",{configurable:true,value:{
      createTreeWalker:()=>{let read=false;return{nextNode:()=>read?null:(read=true,{textContent:text})};},
      createRange:()=>({setStart:(_node:unknown,n:number)=>{offset=n;},setEnd:()=>{},getBoundingClientRect:()=>({left:20+Math.floor(offset/charactersPerPage)*350+300-e.scrollLeft,top:80})}),
    }});
    const anchor={sentenceId:"book:chapter:3",text,offset:24,atStart:false};
    assert.equal(restoreReaderContentAnchor(target,anchor),true);assert.equal(e.scrollLeft,700);
    e.scrollLeft=0;e.scrollWidth=350;
    assert.equal(restoreReaderContentAnchor(target,anchor),false);assert.equal(e.scrollLeft,0);
    e.scrollWidth=1400;
    charactersPerPage=20;
    assert.equal(restoreReaderContentAnchor(target,anchor),true);assert.equal(e.scrollLeft,350);
    assert.equal(restoreReaderContentAnchor(target,{...anchor,text:"changed"}),false);
    assert.equal(isReaderContentAnchor({...anchor,offset:-1}),false);
    assert.equal(isReaderContentAnchor({...anchor,offset:text.length+1}),false);
    assert.equal(restoreReaderContentAnchor(target,{...anchor,atStart:true}),true);assert.equal(e.scrollLeft,0);
  } finally {
    for(const [key,descriptor] of [["document",documentDescriptor],["NodeFilter",filterDescriptor]] as const) {
      if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);
    }
  }
});

test("columns get a definite viewport height before overflow measurement and release it in scroll mode", () => {
  const style = { height: "", columnWidth: "", removeProperty: (name: string) => { if (name === "height") style.height = ""; if (name === "column-width") style.columnWidth = ""; } };
  const viewport = {
    dataset: { readerPaginated: "true" }, clientHeight: 510, clientWidth: 350,
    querySelector: () => ({ style }),
  };
  sizeReaderColumns(viewport as unknown as HTMLElement);
  assert.equal(style.height, "510px");
  assert.equal(style.columnWidth, "350px");
  viewport.clientHeight = 620;
  viewport.clientWidth = 680;
  sizeReaderColumns(viewport as unknown as HTMLElement);
  assert.equal(style.height, "620px");
  assert.equal(style.columnWidth, "680px");
  viewport.clientHeight = 0;
  sizeReaderColumns(viewport as unknown as HTMLElement);
  assert.equal(style.height, "620px", "hidden surfaces must not collapse the columns");
  viewport.dataset.readerPaginated = "false";
  sizeReaderColumns(viewport as unknown as HTMLElement);
  assert.equal(style.height, "");
  assert.equal(style.columnWidth, "");
});
