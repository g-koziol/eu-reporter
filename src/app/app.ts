import { AfterViewInit, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements AfterViewInit {
  ngAfterViewInit(): void {
    void import('../legacy-app.js').catch((error: unknown) => {
      console.error('Nie udało się uruchomić aplikacji.', error);
    });
  }
}
