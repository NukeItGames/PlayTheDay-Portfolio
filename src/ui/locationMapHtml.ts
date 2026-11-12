import { Coordinates } from "../game/types";

export type LocationMapProps = {
  center: Coordinates;
  selected?: Coordinates;
  onSelect: (point: Coordinates) => void;
  onError: (message: string) => void;
};

export function mapHtml(center: Coordinates, selected?: Coordinates) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<style>html,body,#map{height:100%;margin:0}body{background:#242b35}.pin{background:#7954e8;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 5px #0008}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map" role="application" aria-label="Location map"></div>
<script>
function send(data){var text=JSON.stringify(data);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(text);else parent.postMessage(text,'*')}
var loading=setTimeout(function(){send({type:'error',message:'Map could not load. Check your connection, retry, or select a search result.'})},15000);
</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
if(window.L){
clearTimeout(loading);
var map=L.map('map').setView([${center.latitude},${center.longitude}],13),pin;
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'}).on('tileerror',function(){send({type:'error',message:'Some map tiles are unavailable. Check your connection or search for a place.'})}).addTo(map);
function select(p,move){if(pin)map.removeLayer(pin);pin=L.marker([p.latitude,p.longitude],{icon:L.divIcon({className:'pin',iconSize:[24,24],iconAnchor:[12,24]}),title:'Selected location'}).addTo(map);if(move)map.setView([p.latitude,p.longitude],Math.max(map.getZoom(),13));}
window.selectLocation=function(p){select(p,true)};
${selected ? `select(${JSON.stringify({ latitude: selected.latitude, longitude: selected.longitude })},false);` : ""}
map.on('click',function(e){var p={latitude:e.latlng.lat,longitude:((e.latlng.lng+180)%360+360)%360-180};select(p,false);send({type:'select',point:p})});
window.addEventListener('message',function(e){if(e.source!==parent)return;try{var d=JSON.parse(e.data);if(d.type==='select')select(d.point,true)}catch(_){}});
send({type:'ready'});
}
</script></body></html>`;
}
