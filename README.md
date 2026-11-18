# 食刻美食街 · FoodStage Combine

一个入口，两家餐厅：食刻的汉堡、薯条与冷饮，以及暹罗食刻的冬阴功、沙嗲和金边粉。支持可旋转3D菜单、分阶段虚拟试吃和浏览器本地演示点单。

## 本地运行

使用 Node.js 22.12 或更高版本；从本仓库根目录执行：

```sh
npm ci
npm run build
npm run preview
```

打开 http://127.0.0.1:5196/ 。入口地址由预览命令输出；端口可用 `npm run preview -- --port 5200` 修改。`npm run dev` 会先重新构建再启动同一个入口；它是组合站点的生产预览。各店源码也可以单独使用其 workspace 的 Vite 开发模式。

无需启动同级旧项目、配置本机路径或单独部署两家店。默认入口、美食街选店、两家菜单都位于同一个站点：

- `/`：美食街开始页；`/#shops`：选店。
- `/jiaoguang/`：食刻。
- `/xlsk/`：暹罗食刻。

进入店内后，可用浏览器返回回到美食街。原有点单和试吃流程保持，各店浏览器存储键独立。演示订单保存在浏览器，不包含真实支付或餐厅服务端。

## 构建和部署

`npm run build` 生成一个完整的 `dist/`，包含根 `index.html` 与两家店的子目录。将 **dist 里面的全部内容** 上传到同一个静态站点；保留子目录和文件名。仅部署静态成品，无需上传源码、node_modules 或本地过程记录。食刻的图片按当前菜单引用生成发布清单，动态饮品封面也包含在内；旧阶段图、参考图和重复封面不进入部署包。旧组件保留的插画只留源码，不参与生产构建。

魔搭创空间可沿用两个原项目的 **Static HTML** 方式，启动文件为根目录 `index.html`。创建新空间时保留平台生成的卡片与Git配置，再上传此静态目录。平台空间Git地址与本源码GitHub地址是两种仓库，分别存放部署成品和源码。

资源使用相对路径，也支持将整个 dist 挂在 `/event/demo/` 等子目录下。静态服务器应提供目录首页和末尾 `/` 的标准重定向；不需要将所有请求重写到根入口。单独访问或刷新 `/jiaoguang/`、`/xlsk/` 都能加载各自应用。

## 验证

```sh
npm test
npm run typecheck
npx playwright install chromium
npm run test:browser
```

浏览器检查覆盖根路径和多级子路径、同站进店/刷新/返回、手机和平板布局、两店12口/结束/重玩以及音频/GLB资源目录。可设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 使用已安装的Chrome。截图和过程结果写入忽略的 `.codex/`。

## 源码结构

```text
apps/
  food-street/   美食街入口（沿用 wsw_start/food-street）
  jiaoguang/     食刻源码与最终运行资产
  xlsk/          暹罗食刻源码与最终运行资产
scripts/        组合构建、检查与单站静态预览
package-lock.json 统一npm依赖锁定
```

三个应用分别构建，各店保留各自Three版本和视觉风格。入口不运行3D引擎或预取模型。在选店时，鼠标停留或键盘聚焦营业店铺会尝试低优先级预取该店页面、脚本和样式；全次访问预算最多2 MiB，省流量或慢网络时跳过，正常链接跳转独立运行。构建会自动生成对应当前资源名的 shop-preload.json。模型和录音均为已验收的最终运行文件；原始生成数据和历史过程保留在原工作区，没有并入新仓库。

## 来源与署名

- 美食街入口：[Fuya0/foodstage-3d 的 wsw_start/food-street](https://github.com/Fuya0/foodstage-3d/tree/b447683df329caa4448eb2640f9f6b65771f6fd7/food-street)。保留原入口设计、插画与店铺布局，本仓库将本机跳转改为站内入口。
- 食刻：[foodstage-3d，0ee60c8](https://github.com/Fuya0/foodstage-3d/commit/0ee60c8f8aec466ea9a841ab210b64de7577df02)。包含已验收音频、汉堡减面和鸡腿阶段朝向对齐。
- 暹罗食刻：[ConputerWEI/xlsk，125c870](https://github.com/ConputerWEI/xlsk/commit/125c870334a3a3f979b1203cfe503eb194961945)。保留真实食物模型、手绘界面、音效和试吃完成反馈。

第三方素材的来源与署名见各店 public/audio 内 SOURCE / LICENSE 等文件；本次整合不改变原有素材授权。
