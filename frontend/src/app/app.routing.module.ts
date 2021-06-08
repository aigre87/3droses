import { NgModule } from '@angular/core';
import {Routes, RouterModule} from "@angular/router";

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('../../projects/pages/src/lib/homepage/homepage.module')
      .then((m) => m.HomepageModule),
  },
]
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
