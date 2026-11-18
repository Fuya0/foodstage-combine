# 素材来源：tom-yum（冬阴功虾汤）

## 原始录音

| 用途 | 文件 | 来源 | 作者 | 授权 |
| --- | --- | --- | --- | --- |
| 入口与中间几口 | `Drinking Noisily the Broth` | <https://freesound.org/people/StePrince/sounds/556417/> | StePrince | CC0 |
| 阶段收尾 | `Slurping Soup` | <https://freesound.org/people/Eakoontz/sounds/153528/> | Eakoontz | CC0 |

选它们的理由：冬阴功是汤，入口动作是"啜"而不是"咬"。这两条录音的名字直接对应"喝汤/啜汤"，频谱重心 1.7–2.0 kHz、中频 0.37–0.53，是液体被吸入口腔的声音，没有咀嚼类的高频碎裂。

## 切片

| 文件 | 来源 | 起点 | 成品 | 用途 |
| --- | --- | --- | --- | --- |
| `bite.mp3` | Drinking Noisily the Broth | 0.55 s | 0.62 s | 阶段第 1 口 |
| `chew-1.mp3` | Drinking Noisily the Broth | 0.68 s | 0.58 s | 中间口 |
| `chew-2.mp3` | Drinking Noisily the Broth | 0.80 s | 0.52 s | 中间口 |
| `finish.mp3` | Slurping Soup | 0.70 s | 0.95 s | 阶段最后 1 口 |

## 处理

1. `highpass=f=80` 去掉低频隆隆（汤碗/桌面震动）；
2. `lowpass=f=5200`（口段）/ `f=4200`（收尾）收掉勺碗碰撞的金属毛刺；
3. `lowshelf=f=200:g=1.5` 补一点汤体的厚度；
4. `acompressor`（−30 dB / 3:1）压低波峰因数；
5. 8 ms 淡入 / 80 ms 淡出；峰值 ≤ **−2.5 dBFS**，RMS 收到 **−21 dBFS**；
6. 单声道、44.1 kHz、96 kbps。

成品实测：重心 1.7–2.0 kHz、低频 0.26–0.46、中频 0.37–0.53。
