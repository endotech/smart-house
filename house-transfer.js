(function(root){
 'use strict';
 function prepare(raw,kit){
  const house=kit.validate(raw);
  if(!house.parts.some(part=>part.kind==='floor'))throw Error('床のある家を作ってから引き継いでください');
  if(house.parts.filter(part=>part.kind==='solar').length>5)throw Error('太陽光パネルを5枚以下にしてから引き継いでください');
  return house;
 }
 const api={prepare};
 if(typeof module!=='undefined')module.exports=api;
 else root.SmartHouseTransfer=api;
})(globalThis);
