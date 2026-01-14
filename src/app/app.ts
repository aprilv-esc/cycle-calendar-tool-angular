import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadFlowComponent } from './components/upload-flow/upload-flow.component';
import { CalendarListComponent } from './components/calendar-list/calendar-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, UploadFlowComponent, CalendarListComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  refreshTrigger = signal(0);

  refreshTable() {
    this.refreshTrigger.update(v => v + 1);
  }
}
