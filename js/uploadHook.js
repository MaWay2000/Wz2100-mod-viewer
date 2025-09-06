// uploadHook.js — tolerant file input -> PIE preview bridge
import { showPie, setPieAssetBase } from "./piePreview.js";

export function installUploadHook(selector = 'input[type="file"]') {
  const inputs = Array.from(document.querySelectorAll(selector));
  inputs.forEach(inp => {
    inp.addEventListener("change", async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        // Use selected file's directory as base (best effort)
        if (f.webkitRelativePath) {
          const path = f.webkitRelativePath.split("/").slice(0, -1).join("/") + "/";
          setPieAssetBase(path);
        }
        await showPie(f);
        // Save to "downloads": we cannot force browser to save automatically,
        // but we can provide a download link for the file the user selected.
        const url = URL.createObjectURL(f);
        let link = document.getElementById("lastUploadLink");
        if (!link) {
          link = document.createElement("a");
          link.id = "lastUploadLink";
          link.download = f.name;
          link.textContent = "Download last uploaded file";
          link.style.display = "inline-block";
          link.style.marginLeft = "12px";
          const host = document.querySelector("#uiBar") || document.body;
          host.appendChild(link);
        }
        link.href = url;
      } catch (e) {
        console.error("uploadHook error:", e);
        alert("Upload failed: " + e.message);
      }
    });
  });
}

// Auto-install if DOM already has inputs
document.addEventListener("DOMContentLoaded", () => installUploadHook());