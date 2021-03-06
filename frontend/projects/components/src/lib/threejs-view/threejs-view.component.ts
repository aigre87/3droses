import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Output, ViewChild, EventEmitter} from '@angular/core';
import {BoxService} from "../../../../services/src/lib/box";

@Component({
  selector: 'threejs-view',
  templateUrl: './threejs-view.component.html',
  styleUrls: ['./threejs-view.component.scss']
})
export class ThreejsViewComponent implements OnInit, AfterViewInit, OnDestroy {
  threejsView: any = null;
  @Output() animationInitEmit = new EventEmitter();
  @ViewChild('canvas') canvas: ElementRef;
  @ViewChild('container') container: ElementRef;
  constructor(
    private boxService: BoxService
  ) { }

  ngOnInit(): void {

  }
  ngAfterViewInit() {
    const self = this;
    if (this.boxService.isBrowser) {
      import('./threejs-view.webgl').then((threeViewWebgl) => {
        self.threejsView = new threeViewWebgl.default({
          canvas: this.canvas.nativeElement,
          container: this.container.nativeElement,
        });
        self.threejsView.init({ callback: self.threeViewInitCallback.bind(self) });
      });
    }
  }
  threeViewInitCallback() {
    if (this.threejsView) {
      this.animationInitEmit.emit(this.threejsView);
    }
  }
  ngOnDestroy(): void {

  }

}
