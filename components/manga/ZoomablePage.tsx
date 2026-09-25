import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import type { MangaPage } from '@/types/manga';

/** Fit from decoded image dimensions, never a guessed portrait ratio for a webtoon. */
export function ZoomablePage({page,onTapScreen,paged=false}:{page:MangaPage;onTapScreen:()=>void;paged?:boolean}) {
 const {width,height}=useWindowDimensions();
 const [ratio,setRatio]=useState(page.aspectRatio || .67);
 const [zoom,setZoom]=useState(1);
 const zoomRef=useRef(1),pinch=useRef<{distance:number;zoom:number}|null>(null);
 const update=(value:number)=>{const next=Math.max(.5,Math.min(3,value));zoomRef.current=next;setZoom(next)};
 useEffect(()=>{setRatio(page.aspectRatio||.67);update(1)},[page.imageUrl]);
 const gesture=useMemo(()=>PanResponder.create({
  onMoveShouldSetPanResponderCapture:e=>e.nativeEvent.touches.length===2,
  onStartShouldSetPanResponder:e=>e.nativeEvent.touches.length===2,
  onMoveShouldSetPanResponder:e=>e.nativeEvent.touches.length===2,
  onPanResponderGrant:e=>{const [a,b]=e.nativeEvent.touches;if(a&&b)pinch.current={distance:Math.hypot(a.pageX-b.pageX,a.pageY-b.pageY),zoom:zoomRef.current}},
  onPanResponderMove:e=>{const [a,b]=e.nativeEvent.touches;const start=pinch.current;if(a&&b&&start&&start.distance>0)update(start.zoom*Math.hypot(a.pageX-b.pageX,a.pageY-b.pageY)/start.distance)},
  onPanResponderRelease:()=>{pinch.current=null},onPanResponderTerminate:()=>{pinch.current=null},
 }),[]);
 const baseWidth=paged&&ratio>=.5?Math.min(width,(height-100)*ratio):width;
 const imageWidth=baseWidth*zoom, imageHeight=imageWidth/ratio;
 const image=<ScrollView horizontal nestedScrollEnabled centerContent scrollEnabled={imageWidth>width} style={{height:imageHeight}} contentContainerStyle={{minWidth:width,justifyContent:'center'}} showsHorizontalScrollIndicator={zoom>1}>
  <Pressable onPress={onTapScreen} {...gesture.panHandlers} style={{width:imageWidth,height:imageHeight,backgroundColor:'#111'}}>
   {page.imageUrl?.trim()?<Image source={{uri:page.imageUrl}} style={{width:imageWidth,height:imageHeight}} resizeMode="contain" onLoad={event=>{const {width:w,height:h}=event.nativeEvent.source;if(w>0&&h>0)setRatio(w/h)}}/>:<Text style={{color:'white',padding:20}}>Page image unavailable</Text>}
  </Pressable>
 </ScrollView>;
 return <View style={{width,backgroundColor:'black',...(paged?{height:height-100}:{} )}}>
  {paged?<ScrollView nestedScrollEnabled contentContainerStyle={{minHeight:height-100,justifyContent:'center'}}>{image}</ScrollView>:image}
  <View style={{position:'absolute',right:8,top:8,flexDirection:'row',gap:8,backgroundColor:'#000b',borderRadius:16,padding:8}}>
   <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Zoom out" onPress={()=>update(zoomRef.current-.25)}><Text style={{color:'white',fontSize:18}}>−</Text></Pressable>
   <Pressable accessibilityLabel="Reset page fit" onPress={()=>update(1)}><Text style={{color:'white'}}>{Math.round(zoom*100)}%</Text></Pressable>
   <Pressable accessibilityLabel="Zoom in" onPress={()=>update(zoomRef.current+.25)}><Text style={{color:'white',fontSize:18}}>+</Text></Pressable>
  </View>
 </View>;
}
