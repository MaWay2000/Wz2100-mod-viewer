import * as THREE from './three.module.js';
import { resolveTextureUrl } from './pie.js';

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
    }
    i++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if(uvs.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.userData.texture = textureFile;
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
  const geometry = await loadPieGeometry(url);
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 96;
  const h = canvas.clientHeight || 96;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setSize(w*dpr, h*dpr, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 1000);
  camera.position.set(0,0,100);
  scene.add(new THREE.HemisphereLight(0xffffff,0x444444,1));
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
  geometry.computeBoundingSphere();
  if(geometry.boundingSphere){
    const zoom = (typeof options.zoom === 'number') ? options.zoom : 1;
    const s = 40 * zoom / geometry.boundingSphere.radius;
    mesh.scale.setScalar(s);
    mesh.position.set(
      -geometry.boundingSphere.center.x*s,
      -geometry.boundingSphere.center.y*s,
      -geometry.boundingSphere.center.z*s
    );
  }
  scene.add(mesh);
  function animate(){
    requestAnimationFrame(animate);
    mesh.rotation.y += 0.005;
    renderer.render(scene, camera);
  }
  animate();
}

window.PIELoader = { render };
