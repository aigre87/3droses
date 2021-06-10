import * as THREE from 'three';
import * as dat from 'dat.gui';
import { default as deepmerge } from 'deepmerge';
import { isPlainObject } from 'is-plain-object';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders//OBJLoader';
import Stats from 'three/examples/jsm/libs/stats.module';
import {BehaviorSubject, fromEvent, Observable, Observer, Subject} from "rxjs";
import {debounceTime, takeUntil} from "rxjs/operators";
import { isDevMode } from '@angular/core';
import {MTLLoader} from "three/examples/jsm/loaders/MTLLoader";
import {ImageLoader} from "three";
const particlesVs = require('!raw-loader!./particles-vs.glsl').default;
const particlesFs = require('!raw-loader!./particles-fs.glsl').default;

export interface threeViewWebglParameters {
  name?: string,
  canvas: HTMLCanvasElement;
  container: HTMLElement;
}

export type threeViewWebglInitOptions = {
  callback: VoidFunction;
};

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
  objLoader: OBJLoader;
  mtlLoader: MTLLoader;
  imageLoader: ImageLoader;
  loadingManager: THREE.LoadingManager;
  allInitPromises: Promise<any>[] = [];
  canvasImageHelper: HTMLCanvasElement;
  imageObject: any = {};
  clock: THREE.Clock;
  particlesMaterial: THREE.ShaderMaterial;
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

  init(options: threeViewWebglInitOptions) {
    this.initCommon();
    this.setSize();
    this.initThree();
    this.resize();

    if (this.isDevMode) {
      this.initDebug();
    }
    this.customFnc();
    this.animationLoop();

    fromEvent(window, 'resize')
      .pipe(takeUntil(this.destroyed$), debounceTime(20))
      .subscribe(() => {
        this.resize();
        this.animationTick();
      });
    window.requestAnimationFrame(this.resize); // Force a resize after the first frame
    Promise.all(this.allInitPromises).then(
      () => {
        // console.log('allInitPromises');
        if (options && options.callback) {
          options.callback();
        }
        // this.fpsCheck.fpsIsLow$.pipe(delay(1)).subscribe((v) => {
        //   if (v === true) {
        //     window.cancelAnimationFrame(this.req);
        //   }
        // });
      },
      (error) => {
        console.error('error allInitPromises', error);
      },
    );
  }
  initDebug(){
    this.stats = Stats();
    this.gui = new dat.GUI();
    document.body.appendChild(this.stats.dom);
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.scene.add(new THREE.AxesHelper(500));
    // this.scene.add(new THREE.CameraHelper(this.camera));
  }
  initCommon(){
    this.canvasImageHelper = document.createElement('canvas');
    document.body.appendChild(this.canvasImageHelper);
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
    this.camera.position.z = 2;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.options.canvas,
      alpha: true,
      antialias: true,
    });
  }

  private loadImage(imagePath: string): Observable<HTMLImageElement> {
    return new Observable((observer: Observer<HTMLImageElement>) => {
      let img = new Image();
      img.src = imagePath;
      img.onload = () => {
        observer.next(img);
        observer.complete();
      };
      img.onerror = err => {
        observer.error(err);
      };
    });
  }

  customFnc(){
    {
      const light = new THREE.AmbientLight( 0x404040, 1 ); // soft white light
      this.scene.add(light);
      this.gui.addFolder('light').add(light, 'intensity', 0 , 10);
    }

    // manager, loaders
    this.loadingManager = new THREE.LoadingManager(
      () => {
        console.log()
      },
      // Progress
      (itemUrl, itemsLoaded, itemsTotal) =>
      {
        const progressRatio = itemsLoaded / itemsTotal
        console.log('progressRatio', progressRatio);
      },
      () => {

      }
    );
    this.objLoader = new OBJLoader(this.loadingManager);
    this.mtlLoader = new MTLLoader(this.loadingManager);
    this.imageLoader = new ImageLoader(this.loadingManager);

    this.imageLoader.load(
      // resource URL
      //'/resources/images/pic-4000x5000.jpg',
      '/resources/images/pic-400x400.jpg',

      // onLoad callback
      ( image ) => {
        this.getImageData(image);
        this.createPointsFromImgData();
      },
      // onProgress callback currently not supported
      undefined,
      // onError callback
      function () {
        console.error( 'An error happened.' );
      }
    );
  }
  getImageData(img){
    const ctx = this.canvasImageHelper.getContext('2d');
    this.canvasImageHelper.width = img.naturalWidth;
    this.canvasImageHelper.height = img.naturalHeight;

    ctx.drawImage(img,0,0);
    let data = ctx.getImageData(0,0,this.canvasImageHelper.width,this.canvasImageHelper.height);
    let buffer = data.data;
    let rgb = [];
    let c = new THREE.Color();
    for (let i = 0; i < buffer.length; i=i+4) {
      c.setRGB(buffer[i],buffer[i+1],buffer[i+2]);
      rgb.push({c: c.clone(),id: i/4});
    }
    let result = new Float32Array(img.width*img.height*2);
    let j = 0;
    const target = {h:0,s:0,l:0};
    rgb.sort( function( a, b ) {
      return a.c.getHSL(target).s - b.c.getHSL(target).s;
    });

    rgb.forEach(e => {
      result[j] = e.id % img.width;
      result[j+1] = Math.floor(e.id / img.height);
      j= j +2;
    });

    console.log(result,'result');

    this.imageObject.image = img;
    this.imageObject.texture = new THREE.Texture(img);
    this.imageObject.buffer = result;
    this.imageObject.texture.needsUpdate = true;
    this.imageObject.texture.flipY = false;
    console.log(this.imageObject);
  }
  createPointsFromImgData(){
    let w = this.imageObject.image.width;
    let h = this.imageObject.image.height;

    let positions = new Float32Array(w*h*3);
    let index = 0;
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        positions[index*3] = j;
        positions[index*3+1] = i;
        positions[index*3+2] = 0;
        index++;
      }
    }

    let geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
    geometry.setAttribute('source',new THREE.BufferAttribute(this.imageObject.buffer,2));

    console.log(this.imageObject);
    console.log(new THREE.Vector2(w,h));
    this.particlesMaterial = new THREE.RawShaderMaterial( {
      uniforms: {
        u_sourceTex: { value: this.imageObject.texture },
        u_blend: { value: 0 },
        u_time: { value: 1 },
        u_size: { value: Math.min(window.devicePixelRatio, 2) },//window.devicePixelRatio },
        u_dimensions: { value: new THREE.Vector2(w,h) },
      },
      vertexShader: particlesVs,
      fragmentShader: particlesFs,
    });

    let points = new THREE.Points(geometry,this.particlesMaterial);
    this.scene.add(points);
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
      const elapsedTime = this.clock.getElapsedTime();
      // particles
      if(this.particlesMaterial){
        this.particlesMaterial.uniforms.u_time.value = elapsedTime
      }
      this.isOnScreenStatus$.next(true);
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
