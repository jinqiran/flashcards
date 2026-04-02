Flashcardo：只往 images 傳圖就自動更新

你以後只要做這件事：
1. 把新圖片上傳到 images/
2. Commit / Push 到 GitHub

GitHub Actions 會自動：
- 掃描 images 裡的圖片
- 重建 cards.json
- 更新頁面內嵌卡片資料
- 更新快取版本

注意：
- 建議圖片檔名保持有序，例如：89.三（2026.4.3）.png
- 上傳後等 GitHub Actions 跑完，再刷新手機 App
- 如果手機還是舊內容，刪掉主畫面 App 再重新加入主畫面
