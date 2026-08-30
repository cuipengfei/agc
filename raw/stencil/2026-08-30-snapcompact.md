# Stencil.so：Snapcompact

> Source: https://stencil.so/blog/snapcompact
> Author: Can Bölük (OMP 创始人)
> Published: 2026-06-10
> Collected: 2026-08-30

## 核心想法：把文本变成图片

方法：用像素字体把文本渲染成 PNG 图片喂给 vision model。

## 字体优化

| 字体 | px²/字符 | 字符/图 | transcription | 标识符 recall |
|---|---|---|---|---|
| 8×13 | 104 | 23,520 | 1.00 | 20/20 |
| 6×10 | 60 | 40,716 | 0.79 | 20/20 |
| 5×8 | 40 | 61,348 | 0.37 | 17/19 |
| 5×7 | 35 | 70,112 | 0.30 | 10/20 |
| 4×6 | 24 | 102,312 | 0.02 | 9/20 |

可读性悬崖在 35-40 px²/字符。

## SQuAD 基准

| 技术 | fable-5 | opus-4.8 | gpt-5.5 | gemini-3.5-flash |
|---|---|---|---|---|
| text（天花板） | 0.904 | 0.911 | 0.861 | 0.898 |
| handoff | 0.540 | 0.248 | 0.368 | 0.889 |
| compact | 0.406 | 0.000 | 0.896 | 0.000 |
| img-6×10-sent | 0.882 | 0.601 | 0.822 | 0.805 |
| img-6×10-bw | 0.856 | 0.652 | 0.792 | 0.767 |
| img-5×8-bw | 0.830 | 0.425 | 0.778 | 0.674 |

## 隐藏状态分析

本地 Qwen2.5-VL-7B-Instruct：text 和 image 状态余弦相似度 0.66（第 19 层），相似度矩阵相关 r=0.94。

## 局限

- image 输入省钱，但模型需要更多 thinking/output token 来解码
- 实现细节关键：字体大小、颜色、对齐、重复、padding
- 只在需要 compact 的 long-horizon session 有意义
