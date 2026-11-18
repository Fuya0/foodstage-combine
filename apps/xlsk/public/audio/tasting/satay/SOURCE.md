# 素材来源：satay（炭烤沙嗲鸡串）

## 原始录音

- 文件：`Eating Juicy Meat.wav`（17.36 s）
- 来源：<https://freesound.org/people/ProductionNow/sounds/234237/>
- 作者：ProductionNow
- 授权：**CC0（公有领域）** <https://creativecommons.org/publicdomain/zero/1.0/>

选它的理由：沙嗲是**腌过再烤的鸡肉**，咬下去先是焦边、随后是带汁的肉。这条录音名字就是"吃多汁的肉"，频谱重心 2.0–2.4 kHz、中频 0.45–0.52，既有肉纤维的阻力、又带汁水声，比通用咀嚼声更贴。

## 切片

| 文件 | 起点 | 成品 | 用途 |
| --- | --- | --- | --- |
| `bite.mp3` | 2.35 s | 0.75 s | 阶段第 1 口（咬断焦边） |
| `chew-1.mp3` | 2.50 s | 0.72 s | 中间口 |
| `chew-2.mp3` | 2.65 s | 0.68 s | 中间口 |
| `finish.mp3` | 2.40 s | 1.02 s | 阶段最后 1 口 |

## 处理

1. `highpass=f=60` 去低频；
2. `lowpass=f=3600` 收掉烤架/油脂的尖锐高频，保留"肉"而不是"脆"；
3. `lowshelf=f=180:g=1` 补厚度；
4. `acompressor`（−30 dB / 3:1）压低波峰因数；
5. 8 ms 淡入 / 80 ms 淡出；峰值 ≤ **−2.5 dBFS**，RMS **−21 dBFS**；
6. 单声道、44.1 kHz、96 kbps。

成品实测：重心 2.0–2.4 kHz、低频 0.16–0.31、中频 0.45–0.52。
