import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedRef, useAnimatedReaction, useAnimatedScrollHandler, useSharedValue, scrollTo, withTiming, runOnJS } from 'react-native-reanimated';

/** Shared screen-space zoom: all rows use one scale and horizontal translation. */
export function useReaderZoom(width:number,height:number,onTap:()=>void,onActive?:(active:boolean)=>void) {
 const scale=useSharedValue(1),x=useSharedValue(0),scrollY=useSharedValue(0);
 const startScale=useSharedValue(1),startX=useSharedValue(0),anchorScroll=useSharedValue(0),anchorY=useSharedValue(0),anchorX=useSharedValue(0);
 const scrollRef=useAnimatedRef<any>();
 const scrollHandler=useAnimatedScrollHandler(event=>{scrollY.value=event.contentOffset.y});
 useAnimatedReaction(()=>scale.value,(next,previous)=>{
  if(previous===null||next===previous)return;
  const target=Math.max(0,(anchorScroll.value+anchorY.value)*(next/startScale.value)-anchorY.value);
  scrollTo(scrollRef,0,target,false);
 });
 const gesture=useMemo(()=>{
  const pinch=Gesture.Pinch().simultaneousWithExternalGesture(scrollRef).onStart(e=>{
   startScale.value=scale.value;startX.value=x.value;anchorScroll.value=scrollY.value;anchorY.value=e.focalY;anchorX.value=e.focalX-width/2;
   if(onActive)runOnJS(onActive)(true);
  }).onUpdate(e=>{
   const next=Math.max(.5,Math.min(3,startScale.value*e.scale));
   const limit=Math.max(0,width*(next-1)/2);
   x.value=Math.max(-limit,Math.min(limit,anchorX.value*(1-next/startScale.value)+startX.value*next/startScale.value));
   scale.value=next;
  }).onFinalize(()=>{if(onActive)runOnJS(onActive)(false)});
  const double=Gesture.Tap().numberOfTaps(2).maxDelay(280).maxDistance(12).onEnd((e,ok)=>{
   if(!ok)return;
   startScale.value=scale.value;anchorScroll.value=scrollY.value;anchorY.value=e.y;
   const next=Math.abs(scale.value-1)<.01?2:1,ratio=next/scale.value,limit=Math.max(0,width*(next-1)/2);
   const target=Math.max(-limit,Math.min(limit,(e.x-width/2)*(1-ratio)+x.value*ratio));
   x.value=withTiming(target,{duration:240});scale.value=withTiming(next,{duration:240});
  });
  const tap=Gesture.Tap().maxDistance(12).onEnd((_e,ok)=>{if(ok)runOnJS(onTap)()});
  const pan=Gesture.Pan().activeOffsetX([-12,12]).failOffsetY([-12,12]).simultaneousWithExternalGesture(scrollRef)
   .onStart(()=>{startX.value=x.value}).onUpdate(e=>{const limit=Math.max(0,width*(scale.value-1)/2);x.value=Math.max(-limit,Math.min(limit,startX.value+e.translationX))});
  return Gesture.Simultaneous(pinch,pan,Gesture.Exclusive(double,tap));
 },[width,height,onTap,onActive]);
 return {scale,x,gesture,scrollRef,scrollHandler};
}
