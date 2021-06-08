import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomepageRoutingModule } from './homepage-routing.module';
import { HomepageComponent } from './homepage.component';
import {ThreejsViewModule} from "../../../../components/src/lib/threejs-view/threejs-view.module";


@NgModule({
  declarations: [HomepageComponent],
  imports: [
    CommonModule,
    HomepageRoutingModule,
    ThreejsViewModule
  ],
  exports: [
    HomepageComponent
  ]
})
export class HomepageModule { }
