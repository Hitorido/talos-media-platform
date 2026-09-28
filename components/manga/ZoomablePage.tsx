import { useState } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { MangaPage } from '@/types/manga';
import { useReaderZoom } from './useReaderZoom';

export function FittedPage({page,width,height,paged=false,scale,x}:{page:MangaPage;width:number;height:number;paged?:boolean;scale:SharedValue<number>;x:SharedValue<number>}) {
 const [ratio,setRatio]=useState(page.aspectRatio||.67);
 const baseWidth=paged&&ratio>=.5?Math.min(width,height*ratio):width;
 const row=useAnimatedStyle(()=>({height:baseWidth*scale.value/ratio,width}));
 const image=useAnimatedStyle(()=>({width:baseWidth*scale.value,height:baseWidth*scale.value/ratio,left:(width-baseWidth*scale.value)/2+x.value}));
 return <Animated.View style={row}><Animated.View style={image}>
  {page.imageUrl?.trim()?<Image source={{uri:page.imageUrl}} style={{width:'100%',height:'100%'}} resizeMode="contain" onLoad={event=>{const {width:w,height:h}=event.nativeEvent.source;if(w>0&&h>0)setRatio(w/h)}}/>:<Text style={{color:'white',padding:20}}>Page image unavailable</Text>}
 </Animated.View></Animated.View>;
}
export function ZoomablePage({page,onTapScreen,paged=false,onGestureActive}:{page:MangaPage;onTapScreen:()=>void;paged?:boolean;onGestureActive?:(active:boolean)=>void}) {
 const {width,height}=useWindowDimensions();const viewportHeight=Math.max(100,height-100);
 const zoom=useReaderZoom(width,viewportHeight,onTapScreen,onGestureActive);
 return <GestureDetector gesture={zoom.gesture}><View style={{width,height:viewportHeight,backgroundColor:'black',overflow:'hidden'}} collapsable={false}>
  <Animated.ScrollView ref={zoom.scrollRef} onScroll={zoom.scrollHandler} scrollEventThrottle={16} contentContainerStyle={{minHeight:viewportHeight,justifyContent:'center'}}>
   <FittedPage key={page.imageUrl} page={page} width={width} height={viewportHeight} paged={paged} scale={zoom.scale} x={zoom.x}/>
  </Animated.ScrollView>
 </View></GestureDetector>;
}
