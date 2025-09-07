// pie-mini-viewer.js — render tiny PIE thumbnails into given container
import * as THREE from "./three.module.js";
import { parsePie } from "./pie.js";

export async function renderPieThumbnail(container, fileOrText) {
  if (!container) throw new Error("mini-viewer: missing container");

  const w = container.clientWidth || 128, h = container.clientHeight || 128;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, w/h, 0.1, 100);
  camera.position.set(0, 1.5, 1.5);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.9);
  scene.add(hemi);

  let geo;
  if (fileOrText instanceof File) {
    const txt = await fileOrText.text();
    geo = parsePie(txt);
  } else if (typeof fileOrText === "string") {
    // treat as PIE text
    geo = parsePie(fileOrText);
  } else {
    throw new Error("mini-viewer: unsupported input");
  }

  const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  geo.computeBoundingSphere();
  if (geo.boundingSphere?.radius) {
    const s = 1.2 / geo.boundingSphere.radius;
    mesh.scale.setScalar(s);
    mesh.position.set(-geo.boundingSphere.center.x*s, -geo.boundingSphere.center.y*s, -geo.boundingSphere.center.z*s);
  }
  scene.add(mesh);

  function tick() {
    mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}