import assert from "node:assert/strict";
import test from "node:test";
import { getReaderChapterLabel } from "../src/app/(app)/(lingocafe)/books/_components/reader-chapter-label.ts";
import type { ReaderBookPage } from "../src/app/(app)/(lingocafe)/books/_components/book-types.ts";

test("chapter numbering excludes parts and front matter", () => {
  const pages = [
    {pageId:"intro",kind:"other",title:"Introduction"},
    {pageId:"part",kind:"part",prefix:"Part I",title:"Beginning"},
    ...Array.from({length:27},(_,i)=>({pageId:`ch${i+1}`,kind:"chapter",prefix:`Kapitel ${i+1}`,title:"A chapter"})),
  ];
  const book = { pages, page:pages[8] } as unknown as ReaderBookPage;
  assert.equal(getReaderChapterLabel(book), "Chapter 7 / 27");
  assert.equal(getReaderChapterLabel({...book,page:pages[0]} as ReaderBookPage), "Introduction");
  assert.equal(getReaderChapterLabel({...book,page:pages[1]} as ReaderBookPage), "Part I");
});

test("missing contents never invent a chapter index", () => {
  assert.equal(getReaderChapterLabel({pages:[],page:{kind:"chapter",pageId:"a",prefix:"Chapter VII",title:"The visitor"}} as unknown as ReaderBookPage),"Chapter VII");
});
