export class CanvasManager {
  canvasRef;
  ctxRef;
  previousX = 0;
  previousY = 0;
  viewportTransform = {
    x: 0,
    y: 0,
    scale: 1,
  };

  constructor(canvasRef) {
    if (!!canvasRef) {
      this.canvasRef = canvasRef;
      this.ctxRef = canvasRef.getContext("2d");
      this.setupListeners();
    } else {
      throw new Error("Invalid canvas ref");
    }
  }
  setupListeners() {
    this.canvasRef.addEventListener("mousedown", (e) => {
      this.previousX = e.clientX;
      this.previousY = e.clientY;
      this.canvasRef.addEventListener("mousemove", this.onMouseMove);
    });

    this.canvasRef.addEventListener("mouseup", (e) => {
      this.canvasRef.removeEventListener("mousemove", this.onMouseMove);
    });

    this.canvasRef.addEventListener("wheel", this.onMouseWheel);
  }
  updatePanning(e) {
    const { clientX: localX, clientY: localY } = e;
    this.viewportTransform.x += localX - this.previousX;
    this.viewportTransform.y += localY - this.previousY;
    this.previousX = localX;
    this.previousY = localY;
  }
  updateZooming(e) {
    const { scale: oldScale, x: oldX, y: oldY } = this.viewportTransform;
    const { clientX: localX, clientY: localY } = e;

    const newScale = (this.viewportTransform.scale += e.deltaY * -0.01);
    const newX = localX - (localX - oldX) * (newScale / oldScale);
    const newY = localY - (localY - oldY) * (newScale / oldScale);
    this.viewportTransform = {
      x: newX,
      y: newY,
      scale: newScale,
    };
  }
  onMouseMove = (e) => {
    this.updatePanning(e);
    this.render();
  };
  onMouseWheel = (e) => {
    this.updateZooming(e);
    this.render();
  };
  drawRect(x, y, width, height, color) {
    this.ctxRef.fillStyle = color;
    this.ctxRef.fillRect(x, y, width, height);
  }
  render() {
    const { scale, x, y } = this.viewportTransform;
    this.ctxRef.setTransform(1, 0, 0, 1, 0, 0);
    this.ctxRef.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
    this.ctxRef.setTransform(scale, 0, 0, scale, x, y);

    this.drawRect(0, 0, 100, 100, "red");
    this.drawRect(200, 200, 100, 100, "blue");
  }
}
