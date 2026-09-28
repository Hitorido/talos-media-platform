import assert from 'node:assert/strict';
import {loadProviderTs} from './phase6.5-test-loader.mjs';
const gestures=[],timings=[],scrolls=[];let reaction;
const shared=v=>{let value=v;return {get value(){return value},set value(n){const old=value;value=n;if(this.isScale)reaction?.(n,old)}}};let count=0;
const native={useSharedValue:v=>{const ref=shared(v);if(count++===0)ref.isScale=true;return ref},useAnimatedRef:()=>({current:{}}),useAnimatedReaction:(_read,fn)=>{reaction=fn},useAnimatedScrollHandler:fn=>fn,scrollTo:(_ref,_x,y)=>scrolls.push(y),withTiming:(value,config)=>{timings.push(config.duration);return value},runOnJS:fn=>fn};
function recognizer(kind){const g={kind};for(const name of ['simultaneousWithExternalGesture','numberOfTaps','maxDelay','maxDistance','activeOffsetX','failOffsetY'])g[name]=value=>{g[name+'Value']=value;return g};for(const name of ['onStart','onUpdate','onEnd','onFinalize'])g[name]=fn=>{g[name+'Fn']=fn;return g};gestures.push(g);return g;}
const Gesture={Pinch:()=>recognizer('pinch'),Tap:()=>recognizer('tap'),Pan:()=>recognizer('pan'),Simultaneous:(...args)=>args,Exclusive:(...args)=>args};
const {useReaderZoom}=loadProviderTs('components/manga/useReaderZoom.ts',{'react':{useMemo:fn=>fn()},'react-native-gesture-handler':{Gesture},'react-native-reanimated':native});
let taps=0;const zoom=useReaderZoom(400,700,()=>taps++);
const pinch=gestures.find(g=>g.kind==='pinch'),double=gestures.find(g=>g.numberOfTapsValue===2),tap=gestures.find(g=>g.kind==='tap'&&g.numberOfTapsValue!==2);
zoom.scrollHandler({contentOffset:{y:1000}});pinch.onStartFn({focalX:200,focalY:350});pinch.onUpdateFn({scale:2});assert.equal(zoom.scale.value,2);assert.equal(zoom.x.value,0,'pinch stays centered horizontally');assert.equal(scrolls.at(-1),2350,'pinch preserves screen-center content point');
double.onEndFn({x:300,y:200},true);assert.equal(zoom.scale.value,1,'manual zoom first fits');
zoom.scrollHandler({contentOffset:{y:0}});double.onEndFn({x:300,y:200},true);assert.equal(zoom.scale.value,2);assert.equal(zoom.x.value,-100,'double tap anchors at the pressed x coordinate');assert.equal(scrolls.at(-1),200,'double tap anchors at the pressed y coordinate');assert.ok(timings.every(t=>t===240));assert.equal(taps,0,'double tap does not invoke single-tap controls');tap.onEndFn({},true);assert.equal(taps,1);
pinch.onStartFn({focalX:200,focalY:350});pinch.onUpdateFn({scale:.01});assert.equal(zoom.scale.value,.5);double.onEndFn({x:200,y:200},true);assert.equal(zoom.scale.value,1);
pinch.onStartFn({focalX:300,focalY:250});pinch.onUpdateFn({scale:2});assert.equal(zoom.x.value,-100,'pinch follows focal x');assert.equal(zoom.scale.value,2);pinch.onStartFn({focalX:300,focalY:250});pinch.onUpdateFn({scale:.25});assert.equal(zoom.x.value,0,'below fit recenters');
console.log('PASS actual native zoom hook: screen-center pinch, tap-coordinate anchoring, smooth timing, fit cycle, bounds and separate single tap');
// Structural sharing prevents accidental reintroduction of per-page webtoon zoom controllers.
const fs=await import('node:fs');const source=fs.readFileSync('components/manga/VerticalReader.tsx','utf8');assert.equal((source.match(/useReaderZoom\(/g)||[]).length,1);assert.match(source,/scale=\{zoom.scale\} x=\{zoom.x\}/);assert.doesNotMatch(source,/<ZoomablePage/);assert.match(source,/height:0/);
console.log('PASS webtoon list owns one zoom controller and supplies the same scale/pan to every page without page gaps');
