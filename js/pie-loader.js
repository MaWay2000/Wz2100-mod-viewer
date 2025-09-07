import * as THREE from './three.module.js';

function isWebGLAvailable(){
  try{
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  }catch(e){
    return false;
  }
}

function parsePieGeometry(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l && !l.startsWith('#'));
  const vertices = [];
  const faces = [];
  let i=0;
  while(i<lines.length){
    const line = lines[i];
    if(line.startsWith('POINTS')){
      const count = parseInt(line.split(/\s+/)[1],10);
      for(let j=0;j<count;j++){
        i++;
        const parts = lines[i].split(/\s+/).map(Number);
        vertices.push(parts);
      }
    } else if(line.startsWith('POLYGONS')){
      const count = parseInt(line.split(/\s+/)[1],10);
      for(let j=0;j<count;j++){
        i++;
        const parts = lines[i].split(/\s+/).map(Number);
        const vc = parts[1];
        const idx = parts.slice(2,2+vc);
        for(let k=1;k<vc-1;k++){
          faces.push([idx[0], idx[k], idx[k+1]]);
        }
      }
    }
    i++;
  }
  const positions = [];
  for(const f of faces){
    for(const vi of f){
      const v = vertices[vi];
      positions.push(v[0], v[1], v[2]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geo.computeVertexNormals();
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
  const material = new THREE.MeshStandardMaterial({ color:0xdddddd });
  const mesh = new THREE.Mesh(geometry, material);
  geometry.computeBoundingSphere();
  if(geometry.boundingSphere){
    const s = 40/geometry.boundingSphere.radius;
    mesh.scale.setScalar(s);
    mesh.position.set(
      -geometry.boundingSphere.center.x*s,
      -geometry.boundingSphere.center.y*s,
      -geometry.boundingSphere.center.z*s
    );
  }
  scene.add(mesh);
  renderer.render(scene, camera);
}

window.PIELoader = { render };
