(function(root){
 'use strict';
 const checked='2026-11-04';
 const sources={
  wallFormula:'https://www.mlit.go.jp/jutakukentiku/build/content/001753667.pdf',
  platformFormula:'https://www.mlit.go.jp/common/001769651.pdf',
  layout:'https://www.mlit.go.jp/common/001845916.pdf',
  loads:'https://www.mlit.go.jp/common/001066156.pdf',
  wallFactors:'https://www.jpma.jp/data/kouzou-3/kouzou-3-1_pr.pdf',
  roofFrame:'https://www.jaeic.or.jp/assets/pdf/koshu/teiki/teiki-inf/R5_seigo_20250513_4.pdf',
  currentLaw:'https://laws.e-gov.go.jp/law/325CO0000000338'
 };
 // Prices are frozen references for a representative product, not offers for the CAD model.
 // "included" prices are converted before adding tax, so tax is charged only once.
 const equipment={
  light:{model:'Panasonic LGC21158KA・6畳用',price:38500,tax:'excluded',source:'https://esctlg.panasonic.biz/iportal/CatalogPageGroupDetail.do?catalogID=7712060000&method=initial_screen&pageGroupID=377&volumeID=PEWJ0001',basis:'2026年カタログ希望小売価格。天井取付工事は別途。'},
  ac:{model:'ダイキン S225ATCS・6畳用',price:340000,tax:'excluded',source:'https://ec.daikinaircon.com/ecatalog/CR24218D-1/images/CR24218D-1004.pdf',basis:'2025年6月カタログ。室内機・室外機セット。配管・設置工事は別途。'},
  fan:{model:'SwitchBot スタンド型サーキュレーター',price:15980,tax:'included',source:'https://www.switchbot.jp/products/switchbot-standing-circulator-fan',basis:'公式掲載価格。教材の扇風機に対する代表機種。'},
  tv:{model:'アイリス LT-40FSX-F1・40V型',price:36800,tax:'included',source:'https://www.irisplaza.co.jp/index.php?CID=7521&KB=KAISO',basis:'公式通販の確認時セール価格を固定。配送・設置条件は別途。'},
  fridge:{model:'アイリス IRSD-17A',price:49800,tax:'included',source:'https://shopping.jreast.co.jp/shop/s243/cat/An040102',basis:'アイリス公式出店ページの参考機種価格。CADの形状・容量とは一致しない。'},
  washer:{model:'アイリス OSH fit・5kg',price:36540,tax:'included',source:'https://shopping.geocities.jp/irisplaza/store/sale_d.html',basis:'公式通販掲載の通常価格。確認時の値引きは採用しない。'},
  microwave:{model:'アイリス IMB-T178-W・17L',price:9980,tax:'unknown',source:'https://www.city.yokohama.lg.jp/izumi/kusei/shiteikanrisha/kuminshitei/shiteikanri.files/0756_20250729.pdf',basis:'横浜市公開の2024年度購入実績。税区分未確認のため追加課税しない。台の価格は未算入。'},
  lock:{model:'SwitchBot ロック Pro',price:17980,tax:'included',source:'https://www.switchbot.jp/products/switchbot-lock-pro',basis:'本体1個の公式掲載価格。ハブ・指紋パッド・ドア本体は含まない。'},
  camera:{model:'SwitchBot 見守りカメラPlus 3MP',price:3980,tax:'included',source:'https://www.switchbot.jp/blogs/announcement/price-revision-notice',basis:'2025年11月改定の本体価格。クラウド契約・記録媒体は含まない。'},
  vacuum:{model:'SwitchBot K11＋',price:59800,tax:'included',source:'https://www.switchbot.jp/products/switchbot-robot-vacuum-cleaner-k11',basis:'公式掲載価格。充電・集じんステーションを含む参考セット。'},
  solar:{model:'EcoFlow 160W軽量両面パネル相当',price:50600,tax:'included',source:'https://jp.ecoflow.com/pages/2026-price-revisions',basis:'2026年8月改定価格。可搬型製品を比較基準に使用。教材の150W部材の実製品価格ではない。屋根架台・PCS・蓄電池・工事は別途。'},
  shutter:{model:'YKK AP リモコンシャッター参考例',price:325000,tax:'included',range:[300000,350000],source:'https://www.ykkap.co.jp/consumer/reform/columns/5145',basis:'2020年9月の材工税込30～35万円の中間値。幅168×高さ208cmの改修例。CAD窓寸法の見積ではなく、新築への適用も未確認。'},
  kitchen:{model:'LIXIL シエラ 開き扉・食洗機なし',price:738000,tax:'excluded',source:'https://www.lixil.co.jp/lineup/kitchen/shiera/price/price03/',basis:'255cmパッケージの公表下限価格。CADの240cmキッチンの見積ではない。搬入・設置・配管工事は別途。'},
  bath:{model:'LIXIL 洋風バス参考仕様',price:244500,tax:'excluded',source:'https://www.lixil.co.jp/lineup/bathroom/simple/',basis:'1300～1600サイズ群の公表下限価格を使用。給湯器・配管・浴室防水・設置は別途。'},
  toilet:{model:'TOTO CS232B＋SH232BA参考セット',price:93500,tax:'excluded',source:'https://jp.toto.com/pdf01-325/',basis:'公開カタログの便器43,300円＋タンク50,200円。資料時点の参考値。便座・給排水・設置は別途。'},
  vegetable:{model:'家庭用自動給水スマートプランター（参考品）',price:14100,tax:'included',source:'https://store.shopping.yahoo.co.jp/baris/intea90103.html',basis:'家庭用LED・ポンプ付き水耕栽培器の販売価格を概算に使用。CADの土壌センサ付きプランターと同一仕様ではない。土・種苗・改造費は別途。'},
  flower:{model:'家庭用自動給水スマートプランター（参考品）',price:14100,tax:'included',source:'https://store.shopping.yahoo.co.jp/baris/intea90103.html',basis:'家庭用LED・ポンプ付き水耕栽培器の販売価格を概算に使用。CADの土壌センサ付きプランターと同一仕様ではない。土・種苗・改造費は別途。'}
 };
 const loads={
  roof:{metal:200,slate:440,tile:640},
  roofFrame:200,ceiling:150,floor:150,floorFinish:{oak:150,walnut:150,tatami:340,tile:550},floorBeams:100,live:600,
  wallFrame:150,wallInner:100,wallFinish:{wood:100,plaster:640,brick:400},
  roofInsulation:100,wallInsulation:70,solar:260,window:400,balcony:1000
 };
 const api={checked,sources,equipment,loads};
 if(typeof module!=='undefined')module.exports=api;
 else root.HouseEvidenceData=api;
})(globalThis);
