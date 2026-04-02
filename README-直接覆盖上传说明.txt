这是可直接覆盖上传到 GitHub 仓库根目录的完整包。

做法：
1. 在 GitHub Desktop 里先 Abort merge
2. Pull origin
3. 把这个包解压
4. 把里面所有内容覆盖到仓库根目录
5. Commit
6. Push

以后只要往 images/ 上传图片并 push，
GitHub Actions 会自动更新 cards.json、页面内嵌数据和缓存版本。
