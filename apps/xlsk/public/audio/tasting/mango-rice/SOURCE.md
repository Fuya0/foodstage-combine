# 素材来源：mango-rice（芒果椰浆糯米饭）

## 原始录音

- 文件：`Watermelon Eating`（20.46 s）
- 来源：<https://freesound.org/people/KrypticKnight/sounds/523704/>
- 作者：KrypticKnight
- 授权：**CC0（公有领域）** <https://creativecommons.org/publicdomain/zero/1.0/>

选它的理由：Freesound 上**没有**"糯米饭 / sticky rice"的进食录音（搜 `sticky rice`、`glutinous`、`rice cake` 均无结果）。这道甜点的两个要素是"软糯的米"和"多汁的芒果"，因此选了名字匹配"吃水果"的 `Watermelon Eating`，再用强低通把它压成软糯质感——保留果汁的湿润感，去掉水果的脆。

## 切片

| 文件 | 起点 | 成品 | 用途 |
| --- | --- | --- | --- |
| `bite.mp3` | 12.58 s | 0.75 s | 阶段第 1 口 |
| `chew-1.mp3` | 12.72 s | 0.72 s | 中间口 |
| `chew-2.mp3` | 12.84 s | 0.68 s | 中间口 |
| `finish.mp3` | 12.55 s | 1.00 s | 阶段最后 1 口 |

## 处理

1. `highpass=f=60` 去低频；
2. `lowpass=f=1800,lowpass=f=1800` —— **两级级联**，等效 −24 dB/oct。单级 2 kHz 低通后高频仍占 0.44（水果的脆还在），两级才压到 0.09–0.11；
3. `highshelf=f=1000:g=-4` 再削一层；
4. `lowshelf=f=200:g=3` 补糯米的厚度；
5. `acompressor`（−30 dB / 3:1）；
6. 8 ms 淡入 / 80 ms 淡出；峰值 ≤ **−2.5 dBFS**，RMS **−21 dBFS**；
7. 单声道、44.1 kHz、96 kbps。

成品实测：重心 1.4–1.5 kHz、低频 0.22–0.24、中频 0.65–0.68、高频 0.09–0.11——是"软 + 湿"而不是"脆"。
