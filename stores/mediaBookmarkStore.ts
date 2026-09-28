import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appPersistStorage } from '@/stores/persistStorage';
export type MediaBookmark={id:string;mediaId:string;kind:'manga'|'anime';unitId:string;unitTitle:string;position:number;createdAt:number};
type State={bookmarks:MediaBookmark[];toggle:(bookmark:Omit<MediaBookmark,'id'|'createdAt'>)=>void;remove:(id:string)=>void};
export const useMediaBookmarkStore=create<State>()(persist((set)=>({bookmarks:[],toggle:bookmark=>{
 if(!bookmark.mediaId||!bookmark.unitId||!Number.isFinite(bookmark.position)||bookmark.position<0)return;
 const position=Math.floor(bookmark.position),id=JSON.stringify([bookmark.kind,bookmark.mediaId,bookmark.unitId,position]);
 set(state=>({bookmarks:state.bookmarks.some(b=>b.id===id)?state.bookmarks.filter(b=>b.id!==id):[{...bookmark,position,id,createdAt:Date.now()},...state.bookmarks]}));
},remove:id=>set(state=>({bookmarks:state.bookmarks.filter(b=>b.id!==id)}))}),{name:'media-bookmarks',storage:createJSONStorage(()=>appPersistStorage),skipHydration:true}));
