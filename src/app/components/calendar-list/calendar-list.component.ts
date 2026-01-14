import { Component, Input, OnChanges, SimpleChanges, signal, OnInit, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarService, CalendarHeader } from '../../services/calendar.service';
import { LucideAngularModule } from 'lucide-angular';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-calendar-list',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    providers: [DatePipe],
    templateUrl: './calendar-list.component.html',
})
export class CalendarListComponent implements OnChanges, OnInit {
    @Input() refreshTrigger = 0;

    calendars: WritableSignal<CalendarHeader[]>;
    loading: WritableSignal<boolean>;

    constructor(private calendarService: CalendarService) {
        this.calendars = this.calendarService.calendars;
        this.loading = this.calendarService.loading;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['refreshTrigger']) {
            this.calendarService.fetchCalendars();
        }
    }

    ngOnInit() {
        this.calendarService.fetchCalendars();
    }

    viewDetails(id: number) {
        alert("Viewing details for calendar #" + id);
    }

    deleteCalendar(id: number) {
        if (confirm("Are you sure you want to delete this calendar?")) {
            alert("Delete functionality to be implemented");
        }
    }
}
