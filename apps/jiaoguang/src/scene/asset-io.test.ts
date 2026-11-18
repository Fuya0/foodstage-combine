import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { manifest } from '../data/manifest';
import { createModelStore } from './assets';
import { getReadyPreview, loadPreview } from './menu-preview-asset';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('model public asset requests', () => {
  it('rebases fetch, parse resource base and preview I/O while keeping prepared cache keys canonical', async () => {
    vi.stubEnv('BASE_URL', './');
    const url = '/models-runtime/asset-boundary-regression.glb';
    const bytes = new ArrayBuffer(8);
    const fetchModel = vi.fn(async () => ({ ok: true, arrayBuffer: async () => bytes }));
    vi.stubGlobal('fetch', fetchModel);
    const scene = new Group();
    scene.add(new Mesh(new BoxGeometry(2, 1, 1), new MeshStandardMaterial()));
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockResolvedValue({ scene } as GLTF);
    const previewRequest = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene } as GLTF);
    const stages = [{ ...manifest[0]!, url }];
    const store = createModelStore(stages);
    expect(await store.load(0)).toMatchObject({ status: 'ready' });
    expect(fetchModel).toHaveBeenCalledWith('./models-runtime/asset-boundary-regression.glb', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(parse).toHaveBeenCalledWith(bytes, './models-runtime/');
    await loadPreview('asset-boundary-regression', url);
    expect(previewRequest).toHaveBeenCalledExactlyOnceWith('./models-runtime/asset-boundary-regression.glb');
    const prepared = getReadyPreview(url);
    expect(prepared).toMatchObject({ url, asset: { scene } });
    const borrowing = createModelStore(stages, prepared);
    expect(await borrowing.load(0)).toMatchObject({ status: 'ready' });
    expect(fetchModel).toHaveBeenCalledTimes(1);
    expect(stages[0]!.url).toBe('/models-runtime/asset-boundary-regression.glb');
  });
});
