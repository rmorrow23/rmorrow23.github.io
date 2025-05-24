function toggleControls() {
  const panel = document.getElementById("controlPanel");
  panel.classList.toggle("settingsVisible");
}

function zoomEditor(factor) {
  const editor = document.querySelector(".editor");
  const currentZoom = parseFloat(editor.style.zoom || "1");
  editor.style.zoom = currentZoom * factor;
}

function resetZoom() {
  const editor = document.querySelector(".editor");
  editor.style.zoom = 1;
}

function addOverlayImage() {
  const overlay = document.createElement("div");
  overlay.textContent = "Overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "20%";
  overlay.style.left = "20%";
  overlay.style.padding = "1rem";
  overlay.style.background = "rgba(0,255,255,0.1)";
  overlay.style.border = "1px solid #00ffff";
  overlay.style.color = "#00ffff";
  overlay.style.borderRadius = "8px";
  overlay.style.zIndex = "5";
  overlay.style.cursor = "move";

  // Drag functionality (mouse and touch)
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function startDrag(e) {
    isDragging = true;
    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    offsetX = clientX - overlay.offsetLeft;
    offsetY = clientY - overlay.offsetTop;
    e.preventDefault();
  }

  function duringDrag(e) {
    if (!isDragging) return;
    const clientX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    overlay.style.left = `${clientX - offsetX}px`;
    overlay.style.top = `${clientY - offsetY}px`;
  }

  function stopDrag() {
    isDragging = false;
  }

  overlay.addEventListener("mousedown", startDrag);
  overlay.addEventListener("touchstart", startDrag, { passive: false });

  document.addEventListener("mousemove", duringDrag);
  document.addEventListener("touchmove", duringDrag, { passive: false });

  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchend", stopDrag);

  document.querySelector(".editor").appendChild(overlay);
}

function saveScreenshot() {
  const editor = document.querySelector(".editor");
  html2canvas(editor).then(canvas => {
    const link = document.createElement("a");
    link.download = "pixelfrost_canvas.png";
    link.href = canvas.toDataURL();
    link.click();
  });
}

// Upload image into canvas
document.getElementById("upload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    let img = document.querySelector(".editor img");
    if (!img) {
      img = document.createElement("img");
      img.style.position = "absolute";
      img.style.top = "0";
      img.style.left = "0";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.style.borderRadius = "inherit";
      document.querySelector(".editor").appendChild(img);
      document.querySelector(".editor").style.color = "#000";
    }
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Canvas size selector
document.getElementById("resolutionSelect").addEventListener("change", function () {
  const [w, h] = this.value.split("x");
  const editor = document.querySelector(".editor");
  editor.style.aspectRatio = `${w} / ${h}`;
});