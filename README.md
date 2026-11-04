# スマートハウス実習・単独公開版

このZIPは、このアプリだけを1つのGitHubリポジトリで公開するためのファイルです。相手のサイトを一緒にアップロードする必要はありません。

## GitHub Pagesで公開

1. ZIPを解凍します。
2. フォルダーの中身を、公開用リポジトリの一番上へアップロードします。`index.html` が直下にあるようにしてください。
3. Settings → Pages → Source: **Deploy from a branch** を選びます。
4. Branch: **main**、Folder: **/(root)** を選び、Saveを押します。
5. 公開完了後、Pages設定画面に表示されたURLそのものを開きます。**Enforce HTTPS** を有効にしてください。

ビルド・APIキー・GitHub Actions用ワークフローの追加は不要です。2つのアプリを公開する場合は、リポジトリを2つ作り、それぞれのZIPの中身を別々にアップロードします。

## 使い方

1. `index.html` を開くと、既定の平屋の固定間取りで開始します。
2. 家設計用CADから保存したJSONを、「CADで作った家を開く」で読み込みます。
3. 間取り・家具・仕上げ・機器を引き継ぎ、間取りを固定して機器の追加・配置・制御を行えます。「基本の平屋に戻る」で既定の家へ戻れます。

家設計用サイトと同じドメイン・リポジトリである必要はありません。家設計用のファイルは不要です。作品の引き継ぎは利用者が選んだJSONファイルだけで行います。

micro:bit実機の接続は、公開後のHTTPS URLをChrome / Edgeで開き、「USBで接続」から使用するポートを選んでください。MakeCode用コードは同梱の `makecode-custom.ts` です。画面には取得リンクを表示しません。

## ローカルで確認

ZIPの中から直接起動せず、すべて解凍してから `index.html` を開いてください。ブラウザー保存やUSBの可否はブラウザーによるため、授業の実機接続は公開後のHTTPSで確認してください。

作品は閲覧者のブラウザーに保存されます。端末・ブラウザー・公開先が変わった場合の作品の受け渡しはJSONで行ってください。作品JSON・生徒名簿・住所・パスワード・秘密情報はリポジトリへアップロードしないでください。

セキュリティの確認範囲と制限は `SECURITY.md` を参照してください。

GitHub公式手順：
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
