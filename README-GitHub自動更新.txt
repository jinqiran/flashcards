Flashcardo

這個版本已經改成：你每天只要往 images/ 裡新增圖片，GitHub 就會自動更新 cards.json 和 App 快取版本。

你每天的操作：
1. 打開你的 GitHub 倉庫。
2. 進入 images/ 資料夾。
3. 點 Add file → Upload files。
4. 把新圖片拖進去。
5. 點 Commit changes。
6. 等 30 秒到 2 分鐘，GitHub Actions 會自動：
   - 更新 cards.json
   - 更新 build-meta.json
   - 更新 sw.js 的快取版本
7. 手機重新打開 App，通常就會抓到新內容；若還沒更新，手動下拉重新整理一次即可。

第一次在 GitHub 上的設定：
A. 建立一個 GitHub 倉庫。
B. 把這個資料夾裡的所有檔案全部上傳到倉庫根目錄。
C. 到 Settings → Pages：
   - Source 選 Deploy from a branch
   - Branch 選 main
   - Folder 選 /(root)
D. 到倉庫的 Actions 頁面，若 GitHub 要你啟用 workflows，就按 Enable。

重要：
- 圖片請放在 images/ 裡。
- 支援 png / jpg / jpeg / webp / gif。
- 建議檔名仍然維持數字開頭，例如：89.某某字（2026.4.3）.png
- 如果你不手動改 cards.json，系統會自動用檔名生成標題。
- 既有圖片的原標題會保留，不會亂改。

如果你刪除 images/ 裡的某張圖片：
- 下次 GitHub Actions 也會自動把那張卡從 cards.json 移除。
