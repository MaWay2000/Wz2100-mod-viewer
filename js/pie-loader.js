import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.171.0/build/three.module.js";
import { resolveTextureUrl } from './pie.js';

// Ensure getShaderPrecisionFormat never returns null
if (window.WebGLRenderingContext && WebGLRenderingContext.prototype.getShaderPrecisionFormat) {
  const original = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
  WebGLRenderingContext.prototype.getShaderPrecisionFormat = function() {
    return original.apply(this, arguments) || { precision: 0, rangeMin: 0, rangeMax: 0 };
  };
}
if (typeof WebGL2RenderingContext !== 'undefined' && WebGL2RenderingContext.prototype.getShaderPrecisionFormat) {
  const original = WebGL2RenderingContext.prototype.getShaderPrecisionFormat;
  WebGL2RenderingContext.prototype.getShaderPrecisionFormat = function() {
    return original.apply(this, arguments) || { precision: 0, rangeMin: 0, rangeMax: 0 };
  };
}

function isWebGLAvailable(){
  try{
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  }catch(e){
    return false;
  }
}

function parsePieGeometry(text){
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const vertices = [];
  const positions = [];
  const uvs = [];
  const connectors = [];
  let textureFile = null;
  let texW = 256, texH = 256;
  let i = 0;
  while(i < lines.length){
    const line = lines[i];
    if(line.startsWith('TEXTURE')){
      const parts = line.split(/\s+/);
      textureFile = parts[2] || null;
      texW = parseInt(parts[3], 10) || texW;
      texH = parseInt(parts[4], 10) || texH;
    } else if(line.startsWith('POINTS')){
      const count = parseInt(line.split(/\s+/)[1], 10);
      for(let j=0;j<count;j++){
        i++;
        const parts = lines[i].split(/\s+/).map(Number);
        vertices.push(parts);
      }
    } else if(line.startsWith('POLYGONS')){
      const count = parseInt(line.split(/\s+/)[1], 10);
      for(let j=0;j<count;j++){
        i++;
        const parts = lines[i].split(/\s+/).map(Number);
        const vc = parts[1];
        const idx = parts.slice(2, 2+vc);
        const uvParts = parts.slice(2+vc, 2+vc+vc*2);
        for(let k=1;k<vc-1;k++){
          const i0 = idx[0], i1 = idx[k], i2 = idx[k+1];
          const u0 = (uvParts[0*2] || 0) / texW;
          const v0 = (uvParts[0*2+1] || 0) / texH;
          const u1 = (uvParts[k*2] || 0) / texW;
          const v1 = (uvParts[k*2+1] || 0) / texH;
          const u2 = (uvParts[(k+1)*2] || 0) / texW;
          const v2 = (uvParts[(k+1)*2+1] || 0) / texH;
          const vtx0 = vertices[i0];
          const vtx1 = vertices[i1];
          const vtx2 = vertices[i2];
          positions.push(vtx0[0], vtx0[1], vtx0[2],
                         vtx1[0], vtx1[1], vtx1[2],
                         vtx2[0], vtx2[1], vtx2[2]);
          uvs.push(u0, v0, u1, v1, u2, v2);
        }
      }
    } else if(line.startsWith('CONNECTORS')){
      const count = parseInt(line.split(/\s+/)[1], 10);
      for(let j=0;j<count;j++){
        i++;
        const parts = lines[i].split(/\s+/).map(Number);
        connectors.push(parts);
      }
    }
    i++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if(uvs.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.userData.texture = textureFile;
  if(connectors.length) geo.userData.connectors = connectors;
  return geo;
}

async function loadPieGeometry(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('Failed to load PIE '+url);
  const text = await res.text();
  return parsePieGeometry(text);
}

async function render(canvas, url, options={}){
  if(!isWebGLAvailable()){
    console.error('WebGL not supported in this environment.');
    canvas.replaceWith(document.createTextNode('WebGL not supported'));
    return;
  }
  // clean up any previous animation attached to this canvas
  if (canvas.__wzCleanup) {
    try { canvas.__wzCleanup(); } catch (_) {}
    delete canvas.__wzCleanup;
  }

  const urls = Array.isArray(url) ? url : [url];
  const geometries = [];
  for (const u of urls){
    // keep track of source url alongside loaded geometry so we can apply
    // special positioning rules based on where the model comes from
    const g = await loadPieGeometry(u);
    geometries.push({ geometry: g, url: u });
  }
  // Ensure base pieces are processed before any special (#weapon, #stack)
  // components so alignment logic uses the correct reference geometry.
  geometries.sort((a, b) => {
    const aSpecial = /#(?:weapon|stack)\b/i.test(a.url);
    const bSpecial = /#(?:weapon|stack)\b/i.test(b.url);
    return aSpecial - bSpecial;
  });
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 96;
  const h = canvas.clientHeight || 96;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setSize(w*dpr, h*dpr, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000);
  camera.position.set(0,70,70);
  camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x444444,1));
  const group = new THREE.Group();
  const box = new THREE.Box3();
  let baseBox = null;
  // Track separate stack heights for weapons (#weapon) and generic stacks (#stack)
  let baseTop = null;      // top of the base structure
  let weaponTop = null;    // top of the current weapon stack
  let stackTop = null;     // top of the current generic stack
  let baseWeaponConnector = null; // connector on the base for weapon alignment
  for (const { geometry, url: geomUrl } of geometries){
    const materialOptions = { color:0xdddddd };
    if(geometry.userData.texture){
      try {
        const texUrl = resolveTextureUrl('texpages/' + geometry.userData.texture);
        const loader = new THREE.TextureLoader();
        const tex = await loader.loadAsync(texUrl);
        tex.flipY = false;
        materialOptions.map = tex;
      } catch(e){
        console.error('Failed to load texture', e);
      }
    }
    const material = new THREE.MeshStandardMaterial(materialOptions);
    const mesh = new THREE.Mesh(geometry, material);
    geometry.computeBoundingBox();
    if (!baseBox) {
      // first geometry acts as the base; remember its bounding box so
      // subsequent pieces can be positioned relative to it
      baseBox = geometry.boundingBox.clone();
      baseTop = baseBox.max.y;
      weaponTop = baseTop;
      stackTop = baseTop;
      if (geometry.userData && Array.isArray(geometry.userData.connectors) && geometry.userData.connectors.length) {
        baseWeaponConnector = geometry.userData.connectors[0];
      }
    } else if (geomUrl && /#weapon\b/i.test(geomUrl)) {
      // Weapon components align their origin with the base connector when
      // available, ignoring any connectors defined on the component itself.
      // Fall back to stacking behavior if no base connector exists.
      const baseY = baseTop != null ? baseTop : 0;
      let tx = 0, ty = 0, tz = 0;
      if (baseWeaponConnector) {
        const [bcx = 0, bcy = baseY, bcz = 0] = baseWeaponConnector;
        tx = bcx;
        ty = bcy;
        tz = bcz;
      } else {
        const refY = weaponTop != null ? weaponTop : baseY;
        const offset = refY - geometry.boundingBox.min.y;
        tx = 0; ty = offset; tz = 0;
      }
      geometry.translate(tx, ty, tz);
      if (geometry.userData && Array.isArray(geometry.userData.connectors)) {
        geometry.userData.connectors = geometry.userData.connectors.map(([x = 0, y = 0, z = 0]) => [x + tx, y + ty, z + tz]);
      }
      geometry.computeBoundingBox();
      weaponTop = geometry.boundingBox.max.y;
    } else if (geomUrl && /#stack\b/i.test(geomUrl)) {
      // Generic stack components (eg sensors) stack independently from weapons
      const refY = stackTop != null ? stackTop : baseTop;
      const offset = refY - geometry.boundingBox.min.y;
      geometry.translate(0, offset, 0);
      geometry.computeBoundingBox();
      stackTop = geometry.boundingBox.max.y;
    } else {
      // Part of the base structure; update base/top references accordingly
      if (geometry.boundingBox && geometry.boundingBox.max) {
        const ymax = geometry.boundingBox.max.y;
        if (baseTop == null || ymax > baseTop) baseTop = ymax;
        weaponTop = baseTop;
        stackTop = baseTop;
      }
    }
    // three.js's Box3 doesn't have an `expandByBox3` method. The
    // `union` method expands the current box to include the provided
    // box, which is what we want here to encompass all geometry
    // bounding boxes.
    if (geometry.boundingBox) box.union(geometry.boundingBox);
    group.add(mesh);
  }
  // center and scale group
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const radius = size.length() / 2 || 1;
  const zoom = (typeof options.zoom === 'number') ? options.zoom : 1;
  const s = 40 * zoom / radius;
  group.scale.setScalar(s);
  group.position.set(-center.x*s, -center.y*s, -center.z*s);
  scene.add(group);
  let frameId;
  function animate(){
    frameId = requestAnimationFrame(animate);
    group.rotation.y += 0.005;
    renderer.render(scene, camera);
  }
  animate();

  // attach cleanup so subsequent renders can stop the animation
  canvas.__wzCleanup = () => {
    cancelAnimationFrame(frameId);
  };
}

window.PIELoader = { render };
