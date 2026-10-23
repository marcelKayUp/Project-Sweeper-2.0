export function stagePointer(canvas: HTMLCanvasElement, event: { clientX: number; clientY: number }): { x: number; y: number } {
  const box = canvas.getBoundingClientRect();
  const scaleX = box.width > 0 ? canvas.clientWidth / box.width : 1;
  const scaleY = box.height > 0 ? canvas.clientHeight / box.height : 1;
  return {
    x: (event.clientX - box.left) * scaleX,
    y: (event.clientY - box.top) * scaleY,
  };
}
