# 自定义词云

基于G2自定义Shape组件实现自定义的词云库

- 基于V4版本进行改造
- 先绘制出文本内容，再进行文本框的绘制
- 使用polygon绘制矩形（无法实现borderRadius)
- 使用path模式，根据svg规则，进行二次贝塞尔曲线的绘制

## 需要解决的问题
1. 位置计算错误导致有一些overflow被遮盖问题
2. 位置计算错误导致的不美观问题

> 参考G2-v5版本中的d3算法


## 参考
- [g2-2.3.13版本实现词云](https://antv.vision/old-site/g2/demo/18-other/cloud.html)
- https://g2-v4.antv.vision/zh/docs/manual/dataset/transform/#tag-cloud-%E8%AF%8D%E4%BA%91%E5%B8%83%E5%B1%80