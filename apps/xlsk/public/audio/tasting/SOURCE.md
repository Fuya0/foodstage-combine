# 试吃音频来源总表

当前播放映射为本项目 `src/data/eating-audio.json`：沙嗲和冬阴功使用 v3，炒金边粉和芒果糯米饭使用 v2。四道菜共 64 段阶段录音，详细切点、混合比例、处理记录与 SHA-256 见当前版本的 manifest.json。

| 菜品 | 当前版本与来源 | 授权与说明 |
| --- | --- | --- |
| 沙嗲鸡肉串 | v3：R1nkata / Freesound #723596，软鸡肉口腔实录 | CC0；去噪并保留咬合细节 |
| 炒金边粉 | v2：marcjunker / Freesound #204114，面条进食实录 | CC0 |
| 冬阴功 | v3：Eakoontz / #153528 汤声与 R1nkata / #723596 软鸡肉声混合 | CC0；鸡肉声作为固体食材拟音，并非虾仁实录 |
| 芒果糯米饭 | v2：用户提供的奶油蛋糕口腔声与 zebraphone / #35700 芒果录音 | 芒果录音为 CC BY 4.0，分发须保留 zebraphone 署名；奶油录音使用范围以用户原素材授权为准 |

当前署名与来源链接以 [satay/v3/SOURCE.md](satay/v3/SOURCE.md)、[pad-thai/v2/SOURCE.md](pad-thai/v2/SOURCE.md)、[tom-yum/v3/SOURCE.md](tom-yum/v3/SOURCE.md)、[mango-rice/v2/SOURCE.md](mango-rice/v2/SOURCE.md) 为准。当前素材不能统称为全部 CC0。

播放保持原速；播放增益/低通分别为沙嗲 0.55/6500 Hz、金边粉 0.39/6200 Hz、芒果饭 0.36/3600 Hz、冬阴功 0.32/6500 Hz。实际编码后响度以各 manifest 为准。

本项目的音频、映射与 Node 校验脚本可独立构建和部署，不读取另一个仓库或原始录音目录。

---

## 首版来源与处理记录（历史资料，不代表当前映射）

四道菜的音效已从"沿用其它项目的占位音频"换成**按菜名在互联网上检索、再按质地处理**的实录。

| 菜品 | 音频 | 来源（Freesound） | 作者 | 授权 |
| --- | --- | --- | --- | --- |
| 冬阴功虾汤 `tom-yum` | `Drinking Noisily the Broth` + `Slurping Soup` | [#556417](https://freesound.org/people/StePrince/sounds/556417/) · [#153528](https://freesound.org/people/Eakoontz/sounds/153528/) | StePrince / Eakoontz | CC0 |
| 炭烤沙嗲鸡串 `satay` | `Eating Juicy Meat.wav` | [#234237](https://freesound.org/people/ProductionNow/sounds/234237/) | ProductionNow | CC0 |
| 虾仁炒金边粉 `pad-thai` | `Man Eating Teriyaki Noodles.wav` | [#204114](https://freesound.org/people/marcjunker/sounds/204114/) | marcjunker | CC0 |
| 芒果椰浆糯米饭 `mango-rice` | `Watermelon Eating` | [#523704](https://freesound.org/people/KrypticKnight/sounds/523704/) | KrypticKnight | CC0 |

这一历史版本的四个来源全部为 **CC0**，无需署名即可随项目分发；此处仍保留来源与作者记录。

## 检索思路

1. 先按**菜名**精确搜：`pad thai`、`tom yum`、`satay`、`mango sticky rice`。Freesound 上只有曼谷炒粉摊、泰拳馆之类的环境音，没有进食声。
2. 退回按**食材/动作名**搜：`eating soup`、`slurping soup`、`eating noodles`、`eating juicy meat`、`eating fruit`。这一步命中了可用的实录。
3. `sticky rice` / `glutinous` / `rice cake` 均无结果，糯米饭改用"吃水果"的实录做软糯化处理（见该目录 SOURCE.md）。

## 统一处理规格

- 单声道、44.1 kHz、MP3 96 kbps
- 峰值 ≤ **−2.5 dBFS**，RMS **−21 dBFS**（各段响度一致）
- 8 ms 淡入、80 ms 淡出，去掉切点爆音
- 每段都按菜品做过 **lowpass / lowshelf / equalizer**，让"汤像汤、肉像肉、面像面、糯米像糯米"
- 播放层的音量与低通仍由 `src/lib/sound.ts` 的 `biteProfiles` 控制（satay 2900 Hz、pad-thai 2600 Hz、mango-rice 1900 Hz、tom-yum 2300 Hz）

各目录 `SOURCE.md` 记录具体切点与处理参数。
