import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreejsViewComponent } from './threejs-view.component';



@NgModule({
  declarations: [ThreejsViewComponent],
  imports: [
    CommonModule
  ],
  exports: [
    ThreejsViewComponent
  ]
})
export class ThreejsViewModule { }
