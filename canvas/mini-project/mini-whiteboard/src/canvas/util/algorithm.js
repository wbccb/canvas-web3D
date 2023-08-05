export function containsPoint(point, {x, y, w, h}) {
  const lines = getLines(x, y, w, h);
  const xPoints = findCrossPoints(point, lines);
  // if xPoints is odd then point is inside the object
  return xPoints !== 0 && xPoints % 2 === 1;
}

/**
 * 得到选中的矩形对应的四条边lines
 */
export function getLines(x, y, w, h) {
  const minX = x;
  const maxX = x + w;
  const minY = y;
  const maxY = y + h;

  return [
    {
      o: {
        x: minX,
        y: minY,
      },
      d: {
        x: minX,
        y: maxY,
      },
    },
    {
      o: {
        x: minX,
        y: maxY,
      },
      d: {
        x: maxX,
        y: maxY,
      },
    },
    {
      o: {
        x: maxX,
        y: maxY,
      },
      d: {
        x: maxX,
        y: minY,
      },
    },
    {
      o: {
        x: maxX,
        y: minY,
      },
      d: {
        x: minX,
        y: minY,
      },
    },
  ];
}

/**
 * @param point 屏幕点击的坐标
 * @param lines 选中的矩形对应的四条边lines
 * @returns {number} 屏幕点击的坐标与选中矩形的交边个数，偶数说明点在矩形中，奇数说明点在矩形内
 */
function findCrossPoints(point, lines) {
  // 借鉴https://github.com/fabricjs/fabric.js/blob/8ecbdb10f797ce07fb4dccca348fe63ff1558b62/dist/fabric.js#L16499
  var b1,
    b2,
    a1,
    a2,
    xi, // yi,
    xcount = 0,
    iLine;

  for (var lineKey in lines) {
    iLine = lines[lineKey];
    // optimisation 1: line below point. no cross
    if (iLine.o.y < point.y && iLine.d.y < point.y) {
      continue;
    }
    // optimisation 2: line above point. no cross
    if (iLine.o.y >= point.y && iLine.d.y >= point.y) {
      continue;
    }
    // optimisation 3: vertical line case
    if (iLine.o.x === iLine.d.x && iLine.o.x >= point.x) {
      xi = iLine.o.x;
      // yi = point.y;
    }
    // calculate the intersection point
    else {
      b1 = 0; // 射线的斜率，为0，表示水平直线
      b2 = (iLine.d.y - iLine.o.y) / (iLine.d.x - iLine.o.x); // 边的斜率
      a1 = point.y - b1 * point.x; // 由y=kx+b算出b是多少
      a2 = iLine.o.y - b2 * iLine.o.x; // 由y=kx+b算出b是多少

      // 射线与边的交点，知道射线的y，比如边的x和y
      //????TODO 不是很懂
      xi = -(a1 - a2) / (b1 - b2);
      // yi = a1 + b1 * xi;
    }
    // dont count xi < point.x cases
    if (xi >= point.x) {
      xcount += 1;
    }
    // optimisation 4: specific for square images
    if (xcount === 2) {
      break;
    }
  }
  return xcount;
}
