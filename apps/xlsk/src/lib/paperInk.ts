import * as THREE from "three";

// Silhouette pass adapted from jiaoguang's FoodInkEffect, independent of React/R3F.
export function createPaperInk() {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType });
  const normals = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType });
  const normalMaterials = new WeakMap<THREE.Material, THREE.MeshNormalMaterial>();
  const ownedNormals = new Set<THREE.MeshNormalMaterial>();
  const normalFor = (source: THREE.Material) => {
    let normal = normalMaterials.get(source);
    if (!normal) { normal = new THREE.MeshNormalMaterial(); normalMaterials.set(source, normal); ownedNormals.add(normal); }
    // The normal layer must fade with the visible food, including depth writes.
    const interior = source.userData.paperInterior === true, transparent = interior || source.transparent;
    if (normal.transparent !== transparent || normal.side !== source.side) normal.needsUpdate = true;
    // Exposed bite interiors keep texture detail without drawing a grid of cutter creases.
    normal.opacity = interior ? 0 : source.opacity; normal.transparent = transparent;
    normal.blending = interior && source.opacity > 0 ? THREE.NoBlending : source.blending;
    normal.depthWrite = source.opacity > 0 && source.depthWrite; normal.depthTest = source.depthTest; normal.side = source.side;
    return normal;
  };
  const material = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    uniforms: { food: { value: target.texture }, surfaceNormals: { value: normals.texture }, texel: { value: new THREE.Vector2(1, 1) }, stroke: { value: 1.25 }, shadowOffset: { value: new THREE.Vector2(2, -3) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D food; uniform sampler2D surfaceNormals; uniform vec2 texel; uniform float stroke; uniform vec2 shadowOffset; varying vec2 vUv;
      float coverage(vec2 p) { if(p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) return 0.; return texture2D(food,p).a; }
      void main() { vec4 source=texture2D(food,vUv); float expanded=source.a;
        for(int i=0;i<8;i++) { float a=float(i)*6.2831853/8.; expanded=max(expanded,coverage(vUv+vec2(cos(a),sin(a))*texel*stroke)); }
        float ink=max(0.,expanded-source.a); vec2 s=vUv-shadowOffset*texel;
        float shadow=(coverage(s)+coverage(s+texel*1.5)+coverage(s-texel*1.5))/3.*.16;
        gl_FragColor=vec4(source.rgb/max(source.a,.0001),source.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec3 color=gl_FragColor.rgb;
        vec4 normal=texture2D(surfaceNormals,vUv); float crease=0.;
        for(int i=0;i<8;i++) { float a=float(i)*6.2831853/8.; vec2 offset=vec2(cos(a),sin(a))*texel*stroke*.8;
          vec4 neighbor=texture2D(surfaceNormals,vUv+offset);
          crease=max(crease,smoothstep(.28,.48,length(normal.rgb-neighbor.rgb))*step(.9,normal.a)*step(.9,neighbor.a)); }
        color=mix(color,vec3(.20,.17,.11),crease*.45);
        float shade=shadow*(1.-expanded);
        gl_FragColor=vec4(color*source.a+vec3(.09,.16,.12)*ink+vec3(.20,.13,.07)*shade,source.a+ink+shade);
      }` });
  const geometry = new THREE.PlaneGeometry(2, 2), screen = new THREE.Scene(), camera = new THREE.Camera();
  const quad = new THREE.Mesh(geometry, material); quad.frustumCulled = false; screen.add(quad);
  const size = new THREE.Vector2(), previousColor = new THREE.Color();
  return {
    render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, view: THREE.Camera, cssWidth: number) {
      renderer.getDrawingBufferSize(size);
      if (target.width !== size.x || target.height !== size.y) { target.setSize(size.x, size.y); normals.setSize(size.x, size.y); }
      const ratio = size.x / Math.max(cssWidth, 1);
      material.uniforms.texel.value.set(1 / size.x, 1 / size.y);
      material.uniforms.stroke.value = 1.15 * ratio;
      material.uniforms.shadowOffset.value.set(2 * ratio, -3 * ratio);
      const previousTarget = renderer.getRenderTarget(), alpha = renderer.getClearAlpha(), auto = renderer.autoClear, previousOverride = scene.overrideMaterial;
      renderer.getClearColor(previousColor);
      const replaced: Array<[THREE.Mesh, THREE.Material | THREE.Material[]]> = [];
      try { renderer.autoClear = true; renderer.setClearColor(0, 0); renderer.setRenderTarget(target); renderer.render(scene, view);
        scene.overrideMaterial = null;
        scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const original = object.material; replaced.push([object, original]);
          object.material = Array.isArray(original) ? original.map(normalFor) : normalFor(original);
        });
        renderer.setRenderTarget(normals); renderer.render(scene, view);
        scene.overrideMaterial = previousOverride; renderer.setRenderTarget(previousTarget); renderer.render(screen, camera);
      } finally { replaced.forEach(([mesh, original]) => { mesh.material = original; }); scene.overrideMaterial = previousOverride; renderer.setRenderTarget(previousTarget); renderer.setClearColor(previousColor, alpha); renderer.autoClear = auto; }
    },
    dispose() { target.dispose(); normals.dispose(); ownedNormals.forEach(normal => normal.dispose()); ownedNormals.clear(); material.dispose(); geometry.dispose(); },
  };
}
