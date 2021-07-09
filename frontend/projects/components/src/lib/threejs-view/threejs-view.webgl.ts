import * as THREE from 'three';
import * as dat from 'dat.gui';
import { default as deepmerge } from 'deepmerge';
import { isPlainObject } from 'is-plain-object';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module';
import {BehaviorSubject, fromEvent, Subject} from "rxjs";
import {debounceTime, takeUntil} from "rxjs/operators";
import { isDevMode } from '@angular/core';
import {Mesh, Vector3} from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

export interface threeViewWebglParameters {
  name?: string,
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  resourcesLoadedCallback?: any;
  rose?: {
    color?: string;
  }
}

class threeViewWebgl {
  public isOnScreenStatus$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private destroyed$ = new Subject();
  isDevMode: boolean = isDevMode();
  options: threeViewWebglParameters;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  orbitControls: OrbitControls;
  scene: THREE.Scene;
  stats: Stats;
  gui: dat.GUI;
  width: number;
  height: number;
  req: number;
  loadingManager: THREE.LoadingManager;
  gltfLoader: GLTFLoader;
  clock: THREE.Clock;
  defaultParameters: Partial<threeViewWebglParameters> = {
    name: 'name-placeholder',
  }

  constructor(options?: threeViewWebglParameters) {
    const overwriteMerge = (destinationArray, sourceArray) => sourceArray;
    this.options = deepmerge(this.defaultParameters, options, {
      arrayMerge: overwriteMerge,
      isMergeableObject: isPlainObject,
    });
    this.resize = this.resize.bind(this);
  }

  init() {
    this.setSize();
    this.initThree();
    this.initCamera();
    this.resize();
    // if (this.isDevMode) {
    //   this.initDebug();
    // }
    this.initLoaders();
    this.initLights();
    this.loadModel();

    this.animationLoop();
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.destroyed$), debounceTime(20))
      .subscribe(() => {
        this.resize();
        this.animationTick();
      });
    window.requestAnimationFrame(this.resize); // Force a resize after the first frame
  }
  initDebug(){
    this.stats = Stats();
    this.gui = new dat.GUI();
    document.body.appendChild(this.stats.dom);
    this.scene.add(new THREE.AxesHelper(500));
    // this.scene.add(new THREE.CameraHelper(this.camera));
  }
  initThree(){
    if (!THREE.WebGLRenderer) {
      console.warn('THREE not defined on window');
      return;
    }
    this.clock = new THREE.Clock()
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.width / this.height,
      0.1,
      10,
    );
    this.camera.position.z = 1.5;
    this.camera.position.y = 1.5;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.options.canvas,
      alpha: true,
      antialias: true,
    });
  }

  initCamera(){
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.autoRotate = true;
    this.orbitControls.autoRotateSpeed = 0.75;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.minDistance = 1;
    this.orbitControls.maxDistance = 3;
    this.orbitControls.minPolarAngle = Math.PI/6; // radians
    this.orbitControls.maxPolarAngle = Math.PI/2; // radians
    this.orbitControls.enablePan = false;
  }

  initLights(){
    let colorFolder;
    const lightOptions = {
      ambient: {
        color: 0xffffff
      },
      point: {
        color: 0xffffff
      }
    }

    const ambientLight = new THREE.AmbientLight( lightOptions.ambient.color, 3 ); // soft white light
    this.scene.add(ambientLight);

    if(this.gui && this.isDevMode){
      colorFolder = this.gui.addFolder('light');
      const ambientFolder = colorFolder.addFolder('ambient')
      ambientFolder.add(ambientLight, 'intensity', 0 , 10);
      ambientFolder.addColor(lightOptions.ambient, 'color').onChange(val=>{
        ambientLight.color.setHex( val );
      });
    }

    const pointLight = new THREE.PointLight( lightOptions.point.color, 1, 5 );
    pointLight.position.set( 0.5, 1, 0.5 );
    this.scene.add( pointLight );
    if(this.gui){
      const pointFolder = colorFolder.addFolder('point')
      pointFolder.add(pointLight, 'intensity', 0 , 10);
      pointFolder.addColor(lightOptions.point, 'color').onChange(val=>{
        pointLight.color.setHex( val );
      });
      const sphereSize = 0.2;
      const pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize, 0xff0000 );
      this.scene.add( pointLightHelper );
    }
  }

  initLoaders(){
    this.loadingManager = new THREE.LoadingManager(
      () => {
        if (this.options && this.options.resourcesLoadedCallback) {
          this.options.resourcesLoadedCallback();
        }
        this.animationTick();
      },
      // Progress
      (itemUrl, itemsLoaded, itemsTotal) =>
      {
        const progressRatio = itemsLoaded / itemsTotal
        console.log('progressRatio', progressRatio);
      },
      () => {}
    );
    this.gltfLoader = new GLTFLoader(this.loadingManager);
  }

  loadModel(){
    this.gltfLoader.load(
      // resource URL
      '/resources/models-3d/rise-55/1623429219_r55.gltf',
      // called when the resource is loaded
      ( gltf ) => {

        this.scene.add( gltf.scene );

        // console.log('anima', gltf.animations); // Array<THREE.AnimationClip>
        // console.log('scene', gltf.scene); // THREE.Group
        // console.log('scene', gltf.scenes); // Array<THREE.Group>
        // console.log('camer', gltf.cameras); // Array<THREE.Camera>
        // console.log('asset', gltf.asset); // Object
        gltf.scenes[0].children[0].children.forEach( (mesh:Mesh, index) => {
          console.log('name', mesh.name);
          if(mesh.name === 'Object415_Detached406'){
            const calizStella_mat = new THREE.MeshPhysicalMaterial({
              metalness: .9,
              roughness: .05,
              envMapIntensity: 0.9,
              clearcoat: 1,
              color: '0x0000ff',
              transparent: true,
              // transmission: .95,
              opacity: .5,
              reflectivity: 0.2,
              refractionRatio: 0.985,
              ior: 0.9,
              side: THREE.BackSide,
            })
            // const mesh1 = mesh as THREE.Mesh;
            // const mesh1Mat = mesh1.material as THREE.MeshStandardMaterial;
            mesh.material = calizStella_mat;
            // mesh1Mat.transparent = true;
            // mesh1Mat.opacity = 0.5;
            // mesh1.dispose();
            // gltf.scenes[0].children.splice(index, 1);
            const meshSize = new THREE.Box3().setFromObject( mesh ).getSize(new THREE.Vector3(0,0,0));
            this.camera.lookAt(0, meshSize.y/2, 0);
            this.orbitControls.target = new Vector3(0, meshSize.y/2, 0);

            // const boxOptions = {
            //   color: 0x0000ff
            // }
            // const boxFolder = this.gui.addFolder('box')
            // boxFolder
            //   .addColor(boxOptions, 'color')
            //   .onChange(() =>
            //   {
            //     calizStella_mat.color.set(boxOptions.color)
            //   });
          }
          if(mesh.name === 'Object426'){
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.side = THREE.DoubleSide;
          }
          if(mesh.name === 'Object427'){
            // бутон
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.side = THREE.DoubleSide;

            const roseOptions = {
              color: this.options?.rose?.color ? this.options.rose.color : 0xff0000,
            }
            material.color.set(roseOptions.color);

            const new_mat = new THREE.MeshPhysicalMaterial({
              metalness: .9,
              roughness: .05,
              envMapIntensity: 0.9,
              clearcoat: 1,
              color: roseOptions.color,
              transparent: true,
              // transmission: .95,
              opacity: 1,
              reflectivity: 0.2,
              refractionRatio: 0.985,
              ior: 0.9,
              side: THREE.DoubleSide,
            })
            mesh.material = new_mat;

            if(this.gui && this.isDevMode){
              const roseFolder = this.gui.addFolder('rose')
              roseFolder
                .addColor(roseOptions, 'color')
                .onChange(() =>
                {
                  new_mat.color.set(roseOptions.color)
                });
            }
          }
        })
      },
      // called while loading is progressing
      function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      // called when loading has errors
      function ( error ) {
        console.log( 'An error happened' );
      }
    );
  }
  isOnScreen() {
    const elHeight = this.options.canvas.offsetHeight;
    const elRect = this.options.canvas.getBoundingClientRect();
    const scrollTop =
      window.pageYOffset ||
      (document.documentElement || (document.body.parentNode as Element) || document.body).scrollTop;
    const offsetTop = elRect.top + scrollTop;
    const minScrollTop = offsetTop - window.innerHeight;
    const maxScrollTop = offsetTop + elHeight;
    return minScrollTop <= scrollTop && scrollTop <= maxScrollTop;
  }
  animationTick() {
    if (this.stats) {
      this.stats.update();
    }
    if (this.isOnScreen()) {
      // const elapsedTime = this.clock.getElapsedTime();
      this.isOnScreenStatus$.next(true);
      if(this.orbitControls){
        this.orbitControls.update();
      }
      if (this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera)
      }
    } else {
      this.isOnScreenStatus$.next(false);
    }
  }
  animationLoop() {
    this.animationTick();
    return (this.req = window.requestAnimationFrame(this.animationLoop.bind(this)));
  }
  setSize() {
    this.width = this.options.container.offsetWidth;
    this.height = this.options.container.offsetHeight;
  }
  resize() {
    this.setSize();
    if (this.camera) {
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }
  destroy() {
    this.destroyed$.next();
    window.cancelAnimationFrame(this.req);
    if (this.gui) {
      this.gui.destroy();
    }
  }
}
export { threeViewWebgl as default };
