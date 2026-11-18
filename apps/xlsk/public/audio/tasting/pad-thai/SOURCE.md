# 素材来源：pad-thai（虾仁炒金边粉）

## 原始录音

- 文件：`Man Eating Teriyaki Noodles.wav`（45.5 s）
- 来源：<https://freesound.org/people/marcjunker/sounds/204114/>
- 作者：marcjunker
- 授权：**CC0（公有领域）** <https://creativecommons.org/publicdomain/zero/1.0/>

选它的理由：金边粉是**带汁的米粉**，入口有吸溜、咀嚼时是软的阻力，没有脆响。这条录音名字直接是"男人吃面"，取自其中段 34 秒附近的高能量段落，频谱重心 1.4–1.5 kHz、中频 0.45–0.50，符合"软面条"的预期。

## 切片

| 文件 | 起点 | 成品 | 用途 |
| --- | --- | --- | --- |
| `bite.mp3` | 34.40 s | 0.75 s | 阶段第 1 口（吸入口） |
| `chew-1.mp3` | 34.55 s | 0.70 s | 中间口 |
| `chew-2.mp3` | 34.65 s | 0.65 s | 中间口 |
| `finish.mp3` | 34.35 s | 1.00 s | 阶段最后 1 口 |

## 处理

1. `highpass=f=60` 去低频；
2. `lowpass=f=4200` 去掉餐具与高频气声；
3. `lowshelf=f=250:g=-4` 压掉面条本身过重的低频轰鸣；
4. `equalizer=f=1200:width_type=o:w=1.5:g=4` 补回咀嚼的"阻力感"；
5. `acompressor`（−30 dB / 3:1）；
6. 8 ms 淡入 / 80 ms 淡出；峰值 ≤ **−2.5 dBFS**，RMS **−21 dBFS**；
7. 单声道、44.1 kHz、96 kbps。

成品实测：重心 1.4–1.5 kHz、低频 0.40–0.42、中频 0.45–0.50、高频 0.10–0.13。
