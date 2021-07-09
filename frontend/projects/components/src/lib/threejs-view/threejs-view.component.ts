import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  EventEmitter,
  Input
} from '@angular/core';
import {BoxService} from "../../../../services/src/lib/box";

@Component({
  selector: 'threejs-view',
  templateUrl: './threejs-view.component.html',
  styleUrls: ['./threejs-view.component.scss']
})
export class ThreejsViewComponent implements OnInit, AfterViewInit, OnDestroy {
  threejsView: any = null;
  @Output() animationInitEmit = new EventEmitter();
  @Input() roseColor: string;
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
        console.log('this.', this.roseColor);
        self.threejsView = new threeViewWebgl.default({
          canvas: this.canvas.nativeElement,
          container: this.container.nativeElement,
          resourcesLoadedCallback: self.threeViewInitCallback.bind(self),
          rose: {
            color: this.roseColor ? this.roseColor : null
          }
        });
        self.threejsView.init();
      });
    }
  }
  threeViewInitCallback() {
    if (this.threejsView) {
      console.log('cb!');
      this.animationInitEmit.emit(this.threejsView);
    }
  }
  ngOnDestroy(): void {

  }

}
