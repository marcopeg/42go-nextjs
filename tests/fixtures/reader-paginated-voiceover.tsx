/**
 * Manual browser regression harness for the production playback and pagination hooks.
 * Copy to src/app/voice-check/page.tsx temporarily, then open localhost:3000/voice-check.
 * Default mode supplies controlled speech events; ?real=1 uses installed device voices.
 * Use a disposable tab: fake speech globals are scoped to this document.
 *
 * Run automated checks executes layout, late-resource, playback, and settings assertions.
 * Checks (Measure reports settled geometry; wait one animation frame after Resize):
 * - Start, Word 400: follow the word to a later screen in chapter 1.
 * - Next screen, Word 410: remain on the manually selected screen.
 * - Pause resume twice: return to the spoken word's screen.
 * - Resize: retain the spoken word after reflow.
 * - Seek end: reveal sentence s1. End sentence: chapter 2 starts at offset zero.
 * - Close audio: stop playback. Remove the temporary route when finished.
 */
/* eslint-disable @next/next/no-img-element -- Exercise native image load and column reflow. */
"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {BookReaderPlaybackControls} from "@/app/(app)/(lingocafe)/books/_components/BookReaderPlaybackControls";
import {captureReaderContentAnchor} from "@/app/(app)/(lingocafe)/books/_components/reader-content-anchor";
import {useReaderPlayback} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/useReaderPlayback";
import {useReaderPagination} from "@/app/(app)/(lingocafe)/books/_components/useReaderPagination";
import {createElementReaderScrollTarget} from "@/app/(app)/(lingocafe)/books/_components/reader-scroll-target";
import "@/app/(app)/(lingocafe)/books/_components/reader-pagination.css";
let utterance: SpeechSynthesisUtterance | null = null;
const text = "Holmes follows Watson along the road beside the river. ".repeat(16);
const sentences = [{id:"s0",text,index:0,paragraphIndex:0},{id:"s1",text:"The next sentence begins here.",index:1,paragraphIndex:1}];
const Check=()=>{
 const root=useRef<HTMLDivElement>(null);
 const [height,setHeight]=useState(180);
 const [chapter,setChapter]=useState(1);
 const [data,setData]=useState("");
 const getScrollTarget=useCallback(()=>root.current?createElementReaderScrollTarget(root.current):null,[]);
 const playback=useReaderPlayback({bookId:"fixture",pageId:String(chapter),language:"en",getScrollTarget,trackEvent:()=>{},onPageEnd:()=>setChapter(x=>x+1),autoStartPageKey:chapter>1?`fixture:${chapter}`:null});
 const {registerSentences}=playback;
 useEffect(()=>registerSentences(sentences),[registerSentences]);
 const pagination=useReaderPagination({scrollRef:root,enabled:true,contentKey:String(chapter),pending:false,nextHref:"next",onNavigatePage:()=>setChapter(x=>x+1)});
 const live=useRef({playback,pagination,chapter});
 useEffect(()=>{live.current={playback,pagination,chapter};});
 const [report,setReport]=useState("");
 const run=async()=>{
  const checks:string[]=[];
  const wait=()=>new Promise<void>(resolve=>setTimeout(resolve,250));
  const assert=(condition:boolean,name:string)=>{if(!condition)throw new Error(name);checks.push(name);};
  const originalPreferences={...live.current.playback.preferences};
  const e=root.current!;
  const visible=(offset:number)=>{
   const node=e.querySelector('[data-reader-sentence-id="s0"]')!.firstChild!;
   const range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+1);
   const r=range.getBoundingClientRect(),v=e.getBoundingClientRect();
   return r.left>=v.left-1&&r.right<=v.right+1&&r.top>=v.top-1&&r.bottom<=v.bottom+1;
  };
  setReport("Running");
  try {
   live.current.playback.close();setHeight(180);await wait();
   e.scrollLeft=0;await wait();
   assert(e.scrollWidth>e.clientWidth*2&&e.scrollHeight<=e.clientHeight+1,"Horizontal columns without vertical clipping");
   const originalChapter=live.current.chapter;
   live.current.pagination.turn(1);await wait();
   assert(e.scrollLeft===e.clientWidth&&live.current.chapter===originalChapter,"Next screen stays within chapter");
   const anchor=captureReaderContentAnchor(createElementReaderScrollTarget(e))!;
   const article=e.querySelector('article')!;
   article.style.fontSize="29px";
   document.fonts.dispatchEvent(new Event("loadingdone"));await wait();
   assert(visible(anchor.offset),"Late font reflow preserves visible text");
   const imageAnchor=captureReaderContentAnchor(createElementReaderScrollTarget(e))!;
   const img=e.querySelector('img')!;
   img.style.height="130px";
   img.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="130"><rect width="100" height="130" fill="gray"/></svg>';
   await img.decode();await wait();
   assert(visible(imageAnchor.offset),"Late image reflow preserves visible text");
   article.style.fontSize="21px";img.style.height="0px";
   img.dispatchEvent(new Event("load"));await wait();
   live.current.playback.start(true);await wait();
   utterance?.onboundary?.({name:"word",charIndex:400,charLength:6} as SpeechSynthesisEvent);await wait();
   assert(e.scrollLeft>0&&visible(400),"Voiceover follows word across columns");
   live.current.pagination.turn(1);await wait();const manual=e.scrollLeft;
   utterance?.onboundary?.({name:"word",charIndex:410,charLength:6} as SpeechSynthesisEvent);await wait();
   assert(e.scrollLeft===manual,"Manual page turn detaches voiceover following");
   live.current.playback.togglePause();await wait();live.current.playback.togglePause();await wait();
   assert(visible(410),"Resume follows spoken word");
   document.querySelector<HTMLButtonElement>('button[aria-controls="reader-playback-settings"]')!.click();await wait();
   const panel=document.querySelector('[role="dialog"][aria-label="Playback settings"]')!;
   const rect=panel.getBoundingClientRect();
   const player=document.querySelector('[aria-label="Page playback"]')!.getBoundingClientRect();
   assert(rect.top>=0&&rect.left>=0&&rect.right<=innerWidth&&rect.bottom<=player.top,"Inline settings fit above player");
   Array.from(panel.querySelectorAll('button')).find(button=>button.textContent==='0.75×')!.click();await wait();
   assert(live.current.playback.speed===0.75,"Inline speed selection changes playback");
   const highlighted=live.current.playback.preferences.wordHighlighting;
   panel.querySelector<HTMLButtonElement>('[aria-label="Word highlighting"]')!.click();await wait();
   assert(live.current.playback.preferences.wordHighlighting!==highlighted,"Inline highlighting toggle changes preference");
   panel.querySelector<HTMLButtonElement>('[aria-label="Close playback settings"]')!.click();await wait();
   assert(!document.querySelector('[role="dialog"][aria-label="Playback settings"]'),"Inline settings close");
   setReport("PASS: "+checks.join("; "));
  } catch(error) {setReport("FAIL after "+checks.length+" checks: "+String(error));}
  finally {live.current.playback.close();live.current.playback.setSpeed(originalPreferences.speed);live.current.playback.setWordHighlighting(originalPreferences.wordHighlighting);}
 };
 const measure=()=>{const e=root.current!;setData(JSON.stringify({left:e.scrollLeft,width:e.clientWidth,height:e.clientHeight,scrollWidth:e.scrollWidth,status:playback.status,sentence:playback.activeSentenceId,word:playback.activeWordRange,chapter}));};
 return <><button onClick={()=>void run()}>Run automated checks</button><p role="status">{report}</p><div style={{display:"flex",flexDirection:"column",width:390,height}}><div ref={root} data-reader-paginated="true" style={{minHeight:0,flex:1}}><article style={{fontSize:21,lineHeight:1.85}}><img alt="Late loading test image" style={{height:0,width:100}} />{sentences.map(s=><p key={s.id} data-reader-sentence-id={s.id}>{s.text}</p>)}</article></div></div>
 <button onClick={()=>{playback.setSpeed(1.25);playback.start();}}>Start</button> | <button onClick={()=>{utterance?.onboundary?.({name:"word",charIndex:400,charLength:6} as SpeechSynthesisEvent);}}>Word 400</button> | <button onClick={()=>{utterance?.onboundary?.({name:"word",charIndex:410,charLength:6} as SpeechSynthesisEvent);}}>Word 410</button> | <button onClick={()=>pagination.turn(1)}>Next screen</button> | <button onClick={playback.togglePause}>Pause resume</button> | <button onClick={()=>setHeight(h=>h===330?240:330)}>Resize</button> | <button onClick={()=>utterance?.onend?.({} as SpeechSynthesisEvent)}>End sentence</button> | <button onClick={()=>playback.seek(10000)}>Seek end</button> | <button onClick={playback.close}>Close audio</button> | <button onClick={measure}>Measure</button><p>{data}</p><p>Capability: {String(playback.canPlay)}; {playback.status}</p><div style={{position:"fixed",bottom:12,left:12,right:12}}><BookReaderPlaybackControls playback={playback} inline /></div></>;
};
const VoiceCheck=()=>{const [ready,setReady]=useState(false);useEffect(()=>{
 if (new URLSearchParams(location.search).has("real")) { requestAnimationFrame(()=>setReady(true)); return; }
 class FakeUtterance {text:string;constructor(text:string){this.text=text;} }
 Object.defineProperty(window,"SpeechSynthesisUtterance",{configurable:true,value:FakeUtterance});
 Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{getVoices:()=>[{lang:"en-US"}],addEventListener:()=>{},removeEventListener:()=>{},speak:(u:SpeechSynthesisUtterance)=>{utterance=u;u.onstart?.({} as SpeechSynthesisEvent);},cancel:()=>{},pause:()=>{},resume:()=>{}}});requestAnimationFrame(()=>setReady(true));
},[]);return ready?<Check/>:null;};
export default VoiceCheck;
