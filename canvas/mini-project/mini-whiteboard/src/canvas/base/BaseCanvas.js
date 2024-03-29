import CoordinateHelper from "./CoordinateHelper.js";
import {throttle} from "../util/utils.js";
import EventListener from "../util/eventListener.js";
import {nanoid} from "nanoid";
import TextHelper from "./TextHelper.js";
import {EventType, globalConfig, HTMLEventType} from "../config/config.js";
import ImageHelper from "./ImageHelper.js";
import {containsPoint, getHoverElement} from "../util/algorithm.js";

/**
 * 封装通用方法，在这个类中进行canvas的初始化，然后将canvas传入到管理类中
 * 宽度和高度由domId的css对应的width和height控制
 */
class BaseCanvas extends EventListener {
  constructor(domId, isGrid = false) {
    super(domId);
    // 外部传入的canvas，为了所有元素都绘制在同一个canvas上面
    const canvasDom = document.getElementById(domId);
    if (!canvasDom) {
      console.error("document.getElmentById为空");
      return;
    }
    const ctx = canvasDom.getContext("2d");

    this.canvasDom = canvasDom;
    this.ctx = ctx;

    const {offsetWidth, offsetHeight} = canvasDom;
    this.width = offsetWidth;
    this.height = offsetHeight;

    this.state = {
      scrollX: 0,
      scrollY: 0,
      oldZoom: 1,
      zoom: 1,
      itemValueX: 100,
      itemValueY: 100,
    };
    this.coordinateHelper = new CoordinateHelper(this);
    if (!isGrid) {
      this.textHelper = new TextHelper(this);
      this.imageHelper = new ImageHelper(this);
    }

    this.renderCanvas();

    // 所有绘制数据的管理，用于清除某一个数据进行重绘
    // this.elements = {};

    this.initListener();

    // TODO 调试方便，可以很好跟踪this.elements的数据辩护
    this.elements = new Proxy(
      {},
      {
        get(target, key, receiver) {
          return Reflect.get(target, key);
        },
        set(target, prop, val, receiver) {
          return Reflect.set(target, prop, val, receiver);
        },
      },
    );
  }

  initListener() {
    const forceRender = throttle(this.reRender, 0);
    // 注册滑动事件，由于有两个canvas，因此wheel事件注册在它们的parent上
    this.canvasDom.parentElement.addEventListener("wheel", (event) => {
      if (document.activeElement && document.activeElement.tagName === "TEXTAREA") {
        document.activeElement.blur();
      }

      const {deltaX, deltaY} = event;
      const oldScrollX = this.state.scrollX;
      const oldScrollY = this.state.scrollY;

      // console.info("wheel", deltaX, deltaY);

      this.state.scrollX = oldScrollX - deltaX;
      this.state.scrollY = oldScrollY - deltaY;

      // 滑动的同时要设置对应的
      // this.ctx.translate(this.state.scrollX, this.state.scrollY);

      forceRender.call(this);
      this.emitEvent("wheelChange", {
        scrollX,
        scrollY,
      });
    });
  }

  getTouchCanvasPoint(event) {
    const scrollX = this.state.scrollX;
    const scrollY = this.state.scrollY;
    return this.coordinateHelper.getTouchCanvasPoint(event, scrollX, scrollY);
  }

  getTouchBoundaryMaxRect(event) {
    return this.coordinateHelper.getTouchBoundaryMaxRect(event);
  }

  getCanvasDom() {
    return this.canvasDom;
  }

  renderCanvas() {
    const canvasDom = this.canvasDom;
    const ctx = this.ctx;

    const width = this.width;
    const height = this.height;
    const devicePixelRatio = window.devicePixelRatio;
    canvasDom.width = width * devicePixelRatio;
    canvasDom.height = height * devicePixelRatio;
    console.warn("目前得到的width和height", width, height);
    console.warn(
      "目前得到的canvasDom放大devicePixelRatio后",
      width * devicePixelRatio,
      height * devicePixelRatio,
    );
    // 如果<canvasDom>的宽度和高度是800px，那么乘以devicePixelRatio=2就会变成1600px
    // <canvasDom width=1600 height=1600>，那么整体会缩小0.5倍，为了适应800px的CSS限制
    // 2个物理像素就会填充1个CSS像素，会更加清晰，也就是2px（物理像素）= 1pt（CSS像素）
    // 但是带来的影响也就是所有绘制的东西都缩小了一半，因此我们得手动放大两倍
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  getContext() {
    return this.ctx;
  }

  getWidth() {
    return this.width;
  }

  getHeight() {
    return this.height;
  }

  /**
   * 清除画布
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  clearAll() {
    this.elements = {};
    this.reRender();
  }

  /**
   * 封装ctx一系列操作，增强代码复用
   */
  baseDrawRect(id, data, isTouch = false) {
    // 目前scrollX和scrollY都已经在点击中计算出来了，因此这里的x和y都是有偏移量scroll的值
    let {x, y, w, h, scrollX: lastScrollX, scrollY: lastScrollY} = data;
    this.ctx.save();
    const state = this.state;
    const {zoom} = state;

    // 我去！！！你要记住一件事，你下面是要this.ctx.translate(state.scrollX, state.scrollY)
    // 因此你的rect可以恢复到没有scrollX的位置啊啊啊啊！！也就是x和y一直都不变！！！！！然后原点translate即可！！！啊啊啊啊
    // 其它也是这样啊！！！！无论如何滑动，绘制时的x和y都是一样的，我们只操作ctx.translate！！！

    this.ctx.translate(state.scrollX, state.scrollY);

    this.ctx.strokeStyle = "blue";
    this.ctx.strokeRect(x, y, w, h);

    this.drawHoverRect(id);
    this.drawSelectRect(id);

    this.ctx.restore();

    // 此时的x和y都是相对坐标，无论如何偏移，x和y都是一样的
    // 因为我们每次都ctx.translate(state.scrollX, state.scrollY)
    // 因此不用考虑偏移量
    this.saveItem(id, "baseDrawRect", {
      x,
      y,
      w,
      h,
      scrollX: state.scrollX,
      scrollY: state.scrollY,
    });
  }

  baseDrawDiamond(id, data) {
    const ctx = this.ctx;
    const state = this.state;
    const {x, y, w, h} = data;
    ctx.save();
    ctx.translate(state.scrollX, state.scrollY);
    ctx.strokeStyle = "red";
    ctx.lineWidth = "2px";
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x, y - h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.closePath();
    ctx.stroke();
    this.drawHoverRect(id);
    this.drawSelectRect(id);
    ctx.restore();
    this.saveItem(id, "baseDrawDiamond", {
      x,
      y,
      w,
      h,
    });
  }

  setDrawPenStartPoint(data) {
    this.penDataArray = data;
  }

  addDrawPenPoint(id, data) {
    const {x, y} = data;
    const len = this.penDataArray.length;
    const [lastX, lastY] = this.penDataArray[len - 1];

    const distance = Math.abs(x - lastX) + Math.abs(y - lastY);
    if (distance > 5) {
      // 稀释点位，不然会非常非常多，绘制的时候要时刻触发，不然会有闪闪的情况
      // 虽然我们绘制的时候很多时候都是同样数据绘制一次，但是感官比较流畅
      this.penDataArray.push([x, y]);
    }
    // 触发自由画笔绘制
    this.baseDrawPen(id, this.penDataArray);
  }

  baseDrawPen(id, array) {
    const [firstPointX, firstPointY] = array[0];
    const ctx = this.ctx;
    const state = this.state;

    ctx.save();
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.translate(state.scrollX, state.scrollY);
    ctx.beginPath();
    ctx.moveTo(firstPointX, firstPointY);
    // 点效率太低，直接线
    for (let i = 1; i < array.length; i++) {
      const [x, y] = array[i];
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    this.drawHoverRect(id);
    this.drawSelectRect(id);
    ctx.restore();
    this.saveItem(id, "baseDrawPen", array);
  }

  // ---------------------------- 文本 ----------------------------
  baseStartDrawText(id, data, finishDrawTextFn) {
    const {x, y, w, h} = data;
    const ctx = this.ctx;

    this.textHelper.showTextArea(x, y, w, h, (textAreaValue, fontStyle) => {
      // onblur时回调该方法，进行canvas的绘制
      data.textAreaValue = textAreaValue;
      data.fontStyle = fontStyle;
      this.baseDrawText(id, data);
      finishDrawTextFn && finishDrawTextFn();
    });
  }

  isShowTextArea() {
    return this.textHelper.isShowTextArea();
  }

  baseDrawText(id, data) {
    const {x, y, w, h, textAreaValue, fontStyle} = data;
    const ctx = this.ctx;
    // 1.点击位置后，使用document.createElement("textArea")，然后根据点击的位置，设置width+height+border+innerText
    // 2.还要判断是否是距离canvasWidth边缘地方，进行换行操作（在外部传入w和h时已经做判断了！）
    // 3.失去焦点后，我们要将textArea的内容绘制到canvas上面，使用context.fillText()

    // TODO (这个放在后面选中做)4.再次点击时，检测是否命中该text，获取到该text的内容，然后放入到textArea中

    ctx.save();
    ctx.translate(this.state.scrollX, this.state.scrollY);

    const keys = Object.keys(fontStyle);
    for (const key of keys) {
      ctx[key] = fontStyle[key];
    }
    const textArray = textAreaValue.split("\n");
    for (let i = 0; i < textArray.length; i++) {
      // 切割为多行文字，然后偏移y进行绘制
      ctx.fillText(textArray[i], x, y + globalConfig.fontLineHeight * i);
    }

    this.drawHoverRect(id);
    this.drawSelectRect(id);
    ctx.restore();

    this.saveItem(id, "baseDrawText", data);
  }

  // ---------------------------- 文本 ----------------------------

  getBase64Image() {
    return this.imageHelper.getBase64Image();
  }

  /**
   * 点击按钮触发选择图片以及可以拖拽图片
   */
  baseStartDrawImage(cancelCallBack) {
    this.imageHelper.selectImage(() => {
      cancelCallBack && cancelCallBack();
    });
  }

  baseUpdateDrawImage(x, y) {
    this.imageHelper.updateDraggingPosition(x, y);
  }

  /**
   * 点击canvas触发绘制图片
   */
  baseDrawImage(id, data) {
    const {x, y, imageData} = data;
    // 拿到目前imageHelper持有的image数据(从外部传入，这样saveItem才能保存)
    // 将数据绘制到canvas上
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(this.state.scrollX, this.state.scrollY);
    const image = new Image();
    image.width = 100;
    image.height = 100;
    image.src = imageData;
    ctx.drawImage(image, x, y);
    ctx.restore();

    this.imageHelper.removeDraggingElement();

    // 移除imageHelper持有的DOM对象
    // 缓存数据
    this.saveItem(id, "baseDrawImage", data);
  }

  deleteItem(id) {
    if (!this.elements[id]) {
      // 不存在的话不用触发重绘
      return;
    }
    // 清除指定item
    delete this.elements[id];
    // 重绘其它元素
    this.reRender();
  }

  saveItem(id, type, data = {}) {
    // 存储的data={x,y}中的x和y应该是去除scrollX和scrollY的值
    if (!data) {
      return;
    }
    this.elements[id] = {
      type: type,
      data: data,
    };
    if (!window.test) {
      window.test = {};
    }
    if (!window.test[id]) {
      window.test[id] = [JSON.stringify(data)];
    } else {
      window.test[id].push(JSON.stringify(data));
    }
  }

  reRender() {
    // 清除所有画布
    this.clearCanvas();

    const keys = Object.keys(this.elements);
    for (const id of keys) {
      const {type, data} = this.elements[id];
      // data携带scrollX以及已经加上scrollX的x和y
      this[type](id, data, false);
    }
  }

  addEventListener(type, fn) {
    this.canvasDom.addEventListener(type, fn);
  }

  removeEventListener(type, fn) {
    this.canvasDom.removeEventListener(type, fn);
  }

  setScale(scale) {
    this.state.oldZoom = this.state.zoom;
    this.state.zoom = scale;
    const oldZoom = this.state.oldZoom;
    const newZoom = this.state.zoom;

    // TODO (手机端)定点缩放需要先缩放，然后再进行位置的平移，因为你得保持缩放后的这个点仍然在你手心的位置:如果是在某一个点进行放大/缩小，那么需要先zoom + 将canvas平移到zoom后的点的位置
    // TODO 但是(PC端)不需要，可以直接整体放大/缩小

    // 原来放大倍数为1.1倍数，目前坐标值为 1.1
    // 现在放大倍数为1.2倍数，那么坐标值应该变为 1.2
    this.state.scrollX = (this.state.scrollX / oldZoom) * newZoom;
    this.state.scrollY = (this.state.scrollY / oldZoom) * newZoom;

    this.state.itemValueX = (this.state.itemValueX / oldZoom) * newZoom;
    this.state.itemValueY = (this.state.itemValueY / oldZoom) * newZoom;

    const keys = Object.keys(this.elements);
    for (const id of keys) {
      const item = this.elements[id];
      if (item.data) {
        item.data.x = (item.data.x / oldZoom) * newZoom;
        item.data.y = (item.data.y / oldZoom) * newZoom;
        if (item.data.w) {
          item.data.w = (item.data.w / oldZoom) * newZoom;
          item.data.h = (item.data.h / oldZoom) * newZoom;
        }
      }
    }

    // 触发重新更新
    this.reRender();
    this.emitEvent(EventType.SCALE_CHANGE, {
      oldZoom: oldZoom,
      newZoom: newZoom,
    });
  }

  setData(data) {
    for (let key in data) {
      this.elements[key] = data[key];
    }
  }

  drawHoverRect(id) {
    const ctx = this.ctx;
    const {hoverRectData} = this.elements[id];
    if (hoverRectData) {
      const {x, y, w, h} = hoverRectData;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "red";
      ctx.strokeRect(x, y, w, h);

      this.hoverRectData = this.elements[id].hoverRectData;
      this.hoverId = id;

      // 移动鼠标时，由于hover数据已经被清空，因此不会再绘制同样位置的rect
      // 只有下次移动检测更新对应this.elements[id].hover才会触发hoverRect的绘制
      this.elements[id].hoverRectData = null;
    }
  }

  drawSelectRect(id) {
    if (this.selectId !== id || !this.selectRectData) {
      return;
    }
    const {x, y, w, h} = this.selectRectData;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeWidth = 10;
    ctx.strokeStyle = "green";
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  getHoverElementId() {
    // 目前不仅hover在某一个元素，还对这个元素进行了点击，那么这个元素就被选中了
    return this.hoverId;
  }

  getHoverElementRect() {
    return this.hoverRectData;
  }

  setHoverElement(id, hoverRectData) {
    // this.hoverId = id;
    // this.hoverRectData = hoverRectData;
    this.elements[id].hoverRectData = hoverRectData;
    this.reRender();
  }

  setSelectElement(id, selectRectData) {
    this.selectId = id; // 用于更新对应id的data.x和data.y
    this.selectRectData = selectRectData; // 用于绘制选中矩形，包括x、y、w、h
    this.reRender();
  }

  getSelectElementId() {
    return this.selectId;
  }

  updateSelectElement(x, y) {
    // 移动过程中就应该清除掉selectRect
    this.selectRectData = null;
    if (this.elements.type === "baseDrawPen") {
      // 暂时无法移动画笔
      console.error("暂时无法移动画笔");
    } else {
      this.elements[this.selectId].data.x = x;
      this.elements[this.selectId].data.y = y;
    }
    this.reRender();
  }

  removeSelectStatus() {
    this.selectId = null;
    this.selectRectData = null;
  }
}

export default BaseCanvas;
