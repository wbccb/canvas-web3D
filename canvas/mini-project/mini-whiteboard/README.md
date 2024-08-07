# Vue3 + Vite实现简单的白板

通过白板项目，熟练掌握canvas的常见场景编码，培养canvas坐标、滑动、放大缩小等综合性应用的开发能力，掌握常见的canvas优化方案

## 1. 开发进度

### v0.1.0版本
- [x]  画布背景网格显示
- [x]  支持绘制矩形
- [x]  无限画布
- [x]  无限画布移动时能够正常重绘所有图形(scrollX和scrollY的修正)
- [x]  支持绘制菱形
- [x]  支持绘制自由画笔
- [x]  支持绘制多行文字
- [x]  支持绘制图片
- [x]  支持整体画布放大缩小
- [x]  支持转化为图片下载
- [x]  性能优化总结
- [ ]  支持【选中】、【拖动】、【缩放】、【旋转】
- [ ]  支持框选多个元素
- [ ]  构建插件架构，为后续功能开发做准备
- [ ]  支持切换当前模式为svg
- [ ]  支持转化为svg进行绘制
- [ ]  svg模式支持【选中】、【拖动】、【缩放】、【旋转】

### v0.2.0版本
- [ ]  性能优化实践
- [ ]  交互优化，点击拖拽形成具体的绘制图形，绘制成功后恢复到无状态
- [ ]  增加橡皮擦功能
- [ ]  支持转化为图片逻辑优化: 没有切割完整，还有大量空白的地方

## 2. 代码目录说明

### 2.1 canvas文件夹
实现`canvas`的相关功能，包括背景网格、矩形、菱形、三角形、圆形、线段、箭头、自由画笔、文字、图片的相关封装

> 动画可以参考：https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial/Advanced_animations

### 2.2 其它文件

使用`vue3+vite`进行项目的UI构建，使用`canvas文件夹`作为核心库，在UI界面中进行切换展示`canvas`的相关功能，主要有：

- 基础功能展示
- 性能优化展示（未优化前和优化后的性能对比）

## 3. 设计模式

> 可能涉及到下面这三种设计模式

- 装饰者模式
- 命令模式
- 访问者模式

## 4. 问题总结

### 4.1 wheel移动画布时，原点需不需要移动？移动后的绘制其它图形的坐标需不需要转化？

滑动画布后，会计算得出`scrollX`和`scrollY`值，然后绘制多种元素时，都进行整体的`translate(x+scrollX, y+scrollY)`

这样就不用每个坐标都进行叠加计算了

```js
x = x + scrollX;
y = y + scrollY;
```

### 4.2 绘制文本

- 输入框改变文本后如何位置后，使用统一的fontStyle以及textBaseline="top"进行canvas的绘制
- 多行文本利用textArea+div的宽度比较进行换行符插入，然后利用换行符进行切割，利用y+lineHeight作为偏移量进行每一行文字的绘制
- 绘制textarea的宽度根据div+textarea的宽度比较进行换行符的插入（自动换行）
- 绘制textarea的高度根据换行符进行高度的lineHeight增加（自动调整高度）
- wheel移动画板的时候直接让textarea失去焦点，进行绘制
- （TODO）复制黏贴文本时如何自动实现换行

### 4.3 绘制图片

- 点击上传图片，解析得到图片内容
- 鼠标没有点击之前，图片已经绘制成功，跟随鼠标移动进行图片的移动
- 鼠标点击时，触发图片的canvas的绘制功能，div装载的图片进行销毁
- (TODO) 拖拽卡顿
- (TODO) 从按钮点击后触发拖拽功能，如何触发canvas.pointerMove事件

### 4.4 整体放大缩小

- 整体缩放时，所有值都应该进行`scale`比例的放大或者缩小
- 放大缩小后移动的距离还是原来的值，比如你稍微滑动是scrollX+1px，现在滑动也是scrollX+1px
- 在`baseCanvas.setScale()`中进行所有数据的`scale`比例的放大或者缩小，包括scrollX、scrollY、各种元素的x、y、w、h等等
- 在`baseCanvas.setScale()`处理后，其它代码逻辑就不用改变

### 4.5 元素选中

#### 4.5.1 判断点在多边形内的算法

1. 几何方法-交叉数法

- 以某一点做射线，如果该射线与多边形的边相交的次数为奇数时，则该点在多边形内部，否则在多边形外部

----

2. 几何方法-环绕数法
> 交叉数法在某些场景下，比如几何图形内部有重叠的时候，得出的结果会出现错误。相对来说，环绕数法会更准确一些

- 以某一点做水平向右的射线，如果多边形的某条边的从下往上穿过该射线，则环绕数加一；如果多边形的某条边的从上往下穿过该射线，则环绕数减一；
- 最终的环绕数如果不为 0 则该点在多边形内部，否则在多边形的外部

----

3. 像素检测-基于透明度的检测
> 如果有多个图形，需要重复绘制和清除多次
- 这种检测方案是将每个图形依次在新的 Canvas 渲染
- 由于新的 Canvas 的背景是完全透明的，只需要对检测位置的透明度做出判断即可，如果被检测的点透明度不为 0 则表示该点命中了这个图形

----

4. 像素检测-基于随机颜色的检测
- 画布中每个图形元素产生一个随机的颜色值 colorKey。除了渲染一个为用户展示的 sceneCanvas 之外，还会在内存中绘制一个用于检测点击的 hitCanvas。
- 所有的图形都会在这个 hitCanvas 重新绘制一遍，并且各个图形的大小和位置属性也保持一致，但是图形填充的颜色使用的是对应的 colorKey 值。
- 在用户点击之后，通过获取 hitCanvas 上点击位置的颜色值（即 colorKey），就可以找到是哪个图形元素被点击了

----


#### 4.5.2 hover and select

- 在`hover`的状态下，进行`hoverRect`的绘制，监听点击事件，如果当前`hover`还存在，也就是当前的鼠标仍然放在目前hover的元素上，即可命中选中状态
- 在`select`的状态下，进行`selectRect`的绘制，同时将当前的状态Status改为`Status.select`
- 在`Status.select`的状态下，`pointermove`事件拿到的坐标会实时更新`this.elements[this.selecetId].data.x`坐标

## 5. 性能优化
> https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas

### 5.1 脏矩形渲染

1. 脏矩形：改变某个图形的物理信息后，需要重新渲染的矩形区域，通常为目标图形的当前帧和下一帧组成的包围盒
2. 包围盒：包围图形的最小矩形。通常用作低成本的碰撞检测。因为矩形的碰撞检测的算法是简单高效的，而复杂图形的碰撞检测是复杂且低效的

```js
/**** 局部渲染 ****/
function partRender(targetX, targetY) {
  // 【1】计算需要重绘的区域
  // 为当前红色球和即将渲染的红色球形成的 “包围盒”
  const dirtyBox = getCircleBBox(prevRedBall, {
    x: targetX,
    y: targetY,
    radius: redRadius
  });

  // 【2】计算所有被碰撞的绿色球
  const collisions = []; // 被碰撞的 ball 的坐标
  for (let i = 0; i < greenBalls.length; i++) {
    const { x, y } = greenBalls[i];
    // +1 是为了弥补 strokeWidth 的 1px 宽度所产生的外扩像素
    const circle = { x, y, radius: radius + 1 };
    const circleBBox = getCircleBBox(circle);

    if (isRectIntersect(circleBBox, dirtyBox)) {
      collisions.push({ x, y });
    }
  }
  // console.log(collisions.length);

  // 【2】用 clip 圈定范围，进行局部绘制
  // 范围为上一次的位置到当前位置，所形成的矩形
  ctx.clearRect(dirtyBox.x, dirtyBox.y, dirtyBox.width, dirtyBox.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(dirtyBox.x, dirtyBox.y, dirtyBox.width, dirtyBox.height);
  // 你可以取消这个注释，看看脏矩形范围
  // ctx.stroke();
  ctx.clip();
  // 只绘制被碰撞的绿球
  drawGreenBalls(collisions);
  // 再画红球
  drawRedBall(targetX, targetY);
  ctx.restore();
}
```

参考
1. https://juejin.cn/post/7175706135305912375

### 5.2 为每一个元素创建一个离屏canvas

1. 空间换时间，记录每一个元素的配置数据（坐标、宽度、携带内容等等），然后为每一个元素绘制一个离屏canvas
2. `canvas`可以使用`context.drawImage(canvas)`绘制canvas
3. 元素改变时，可以重新绘制新的离屏canvas，然后重新`context.drawImage(canvas)`绘制canvas

```js
// 在离屏 canvas 上绘制
var canvasOffscreen = document.createElement('canvas');
canvasOffscreen.width = dw;
canvasOffscreen.height = dh;
canvasOffscreen.getContext('2d').drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

// 在绘制每一帧的时候，绘制这个图形
context.drawImage(canvasOffscreen, x, y);
```

### 5.3 多层画布 && 屏幕可见范围内元素才进行绘制

1. 常用的优化手段，绘制/编辑元素时在动态canvas上操作，动态canvas元素少，重绘快
2. 结束绘制/编辑元素时，将在动态canvas的元素加入到全量elements中，然后进行静态canvas的绘制
3. 性能瓶颈在于全量绘制静态canvas的速度
4. 在目前可视区域进行绘制可以减少绘制canvas元素的个数和体积

### 5.4 滑动平移/放大缩小时将canvas转化为图片进行移动

1. 在上面多层画布的基础上，我们全量绘制静态canvas后将canvas转化为图片
2. 图片可以赋值给`<div backgroudImage></div>`，也可以赋值给`<img src>`
3. 然后对`<div>`或者`<img>`进行CSS属性的更新，比如`transform: translate()`，达到平移不触发canvas重绘的目的

> 生成图片如果过大，移动也会卡顿
> 放大操作时，图片放大会变得模糊
> 每次绘制全量静态canvas时，如果元素数量很多，会有点卡顿

### 5.5 静态canvas使用Web worker进行绘制

1. 在上面方案中
- 多层画布绘制结束时需要绘制全量的静态canvas，并且生成对应的图片
- 平移、放大、缩小canvas时直接操作图片，可以大大减少重绘次数
- 平移、缩小结束后可以隐藏图片，直接显示(缩小后的)全量静态canvas
- 放大图片后，需要重新绘制放大后的全量静态canvas + 生成对应的图片隐藏

在上面的方案中，已经极大减少了需要重绘的次数，那么现在的瓶颈就在于重绘的性能
- 通过只绘制屏幕可视范围内的元素可以减少绘制的内容，提高重绘的性能
- 我们还可以通过`Web worker`进行全量静态canvas的绘制

### 5.6 总结
1. 减少绘制图形的个数
2. 减少绘制指令的调用
3. 分层渲染：正在绘制的部分可以使用少量元素的动态canvas不断触发重绘，绘制结束时进行全量静态canvas的绘制，比如拖动rect会不断触发重绘，如果元素非常非常多，不断触发重绘是非常耗费性能的
4. 局部渲染：绘制可见区域（有移动画布的功能情况下） => 进阶：算法计算出动态变化的区域，进行区域重绘
5. Web worker绘制离屏canvas



# 参考
1. [我做了一个在线白板！](https://juejin.cn/post/7091276963146530847)
2. [LogicFlow](https://github.com/didi/LogicFlow)
3. [excalidraw](https://github.com/excalidraw/excalidraw)
4. [用 canvas 搞一个滑动刻度尺](https://juejin.cn/post/6962152799601688613)
5. [canvas 中物体边框和控制点的实现（四）](https://juejin.cn/post/7108618710859907080)
6. [canvas 中如何实现物体的点选（五）](https://juejin.cn/post/7111245657557434398)
7. https://github.com/lgq627628/2020/tree/master/%E5%9B%BE%E5%BD%A2%E5%AD%A6