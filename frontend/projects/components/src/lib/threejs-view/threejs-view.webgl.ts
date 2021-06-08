import * as THREE from 'three';
import * as dat from 'dat.gui';
import { default as deepmerge } from 'deepmerge';
import { isPlainObject } from 'is-plain-object';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders//OBJLoader';
import Stats from 'three/examples/jsm/libs/stats.module';
import {BehaviorSubject, fromEvent, Subject} from "rxjs";
import {debounceTime, takeUntil} from "rxjs/operators";
import { isDevMode } from '@angular/core';
import {MTLLoader} from "three/examples/jsm/loaders/MTLLoader";

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
  loadingManager: THREE.LoadingManager;
  allInitPromises: Promise<any>[] = [];
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
  }
  initThree(){
    if (!THREE.WebGLRenderer) {
      console.warn('THREE not defined on window');
      return;
    }
    this.scene = new THREE.Scene();
    console.log(this.width, this.height);
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.width / this.height,
      1,
      10000,
    );
    this.camera.position.y = 2000;
    this.camera.position.x = -1000;
    this.camera.position.z = 1000;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.options.canvas,
      alpha: true,
      antialias: true,
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

    // this.mtlLoader.load(
    //   '/resources/models-3d/3d_rose_hipoli_lowpoli/3d_rose_hipoli_lowpoli.mtl',
    //   (mtl) => {
    //     mtl.preload();
    //     // mtl.materials.Material.side = THREE.DoubleSide;
    //     this.objLoader.setMaterials(mtl);
    //     this.objLoader.load(
    //       // resource URL
    //       '/resources/models-3d/3d_rose_hipoli_lowpoli/3d_rose_hipoli_lowpoli.obj',
    //       // called when resource is loaded
    //       ( object ) => {
    //         // object.setScale(0.5,0.5);
    //         console.log( 'resource is loaded' );
    //         object.traverse( function ( child ) {
    //           if(child instanceof THREE.Mesh){
    //             child.material.map = texture;
    //           }
    //         } );
    //         this.scene.add( object );
    //       },
    //       // called when loading is in progresses
    //       ( xhr ) => {
    //         console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    //       },
    //       // called when loading has errors
    //       ( error ) => {
    //         console.log( 'An error happened' );
    //       }
    //     );
    //   },
    //   () => {
    //
    //   },
    //   () => {
    //
    //   }
    // )

    this.objLoader.load(
      // resource URL
      '/resources/models-3d/3d_rose_hipoli_lowpoli/3d_rose_hipoli_lowpoli.obj',
      // called when resource is loaded
      ( object ) => {
        const materials = {
          // wire_177027088: new THREE.MeshPhysicalMaterial({
          //   metalness: 0,
          //   roughness: 1,
          //   envMapIntensity: 0.1,
          //   clearcoat: 1,
          //   transparent: true,
          //   transmission: .95,
          //   opacity: 1,
          //   reflectivity: 0.2,
          // }),
          wire_177027088: new THREE.MeshPhysicalMaterial({
            metalness: .9,
            roughness: .05,
            envMapIntensity: 0.9,
            clearcoat: 1,
            transparent: true,
            // transmission: .95,
            opacity: .5,
            reflectivity: 0.2,
            refractionRatio: 0.985,
            ior: 0.9,
            side: THREE.BackSide,
          }),
          wire_228214153: new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            opacity: 1,
            transparent: false,
            side: THREE.DoubleSide
          }),
        };
        const guiGlassFolder = this.gui.addFolder('glass');
        guiGlassFolder.add(materials['wire_177027088'], 'metalness', 0 , 1, 0.1);
        guiGlassFolder.add(materials['wire_177027088'], 'roughness', 0 , 1, 0.1)
        guiGlassFolder.add(materials['wire_177027088'], 'envMapIntensity', 0 , 1, 0.1)
        guiGlassFolder.add(materials['wire_177027088'], 'clearcoat', 0 , 10, 0.1)
        guiGlassFolder.add(materials['wire_177027088'], 'transmission', 0 , 1, 0.1)
        guiGlassFolder.add(materials['wire_177027088'], 'opacity', 0 , 1, 0.1)
        guiGlassFolder.add(materials['wire_177027088'], 'reflectivity', 0 , 1, 0.1);
        guiGlassFolder.add(materials['wire_177027088'], 'refractionRatio', 0 , 5, 0.1);
        guiGlassFolder.add(materials['wire_177027088'], 'ior', 0 , 5, 0.1);


        // guiGlassFolder.add(materials['wire_177027088'], 'metalness', 0 , 1, 0.1);
        // guiGlassFolder.add(materials['wire_177027088'], 'roughness', 0 , 1, 0.1)
        // guiGlassFolder.add(materials['wire_177027088'], 'envMapIntensity', 0 , 1, 0.1)
        // guiGlassFolder.add(materials['wire_177027088'], 'clearcoat', 0 , 1, 0.1)
        // guiGlassFolder.add(materials['wire_177027088'], 'transmission', 0 , 1, 0.1)
        // guiGlassFolder.add(materials['wire_177027088'], 'opacity', 0 , 1, 0.1)
        // guiGlassFolder.add(materials['wire_177027088'], 'reflectivity', 0 , 1, 0.1)

        console.log( 'resource is loaded' );
        // object.traverse( function ( child ) {
        //   if(child instanceof THREE.Mesh){
        //     child.material.map = texture;
        //   }
        // } );
        object.traverse(node => {
          if(node instanceof THREE.Mesh){
            if(typeof node.material?.name !== 'undefined'){
              const material = materials[node.material?.name];
              console.log('node.material?.name:', node.material?.name);
              if (material) {
                node.material = material;
              }
            }
          }
        })
        this.scene.add( object );
      },
      // called when loading is in progresses
      ( xhr ) => {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      },
      // called when loading has errors
      ( error ) => {
        console.log( 'An error happened' );
      }
    );

    function loadModel(obj, texture) {
      obj.traverse( function ( child ) {
        if ( child.isMesh ) child.material.map = texture;
      } );
      this.scene.add( obj );
    }
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
    if (this.isOnScreen()) {
      this.isOnScreenStatus$.next(true);
      if (this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera)
      }
      if (this.stats) {
        this.stats.update();
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
