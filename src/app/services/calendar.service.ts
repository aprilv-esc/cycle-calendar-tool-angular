import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CalendarHeader {
    header_id: number;
    cycle_code: string;
    year: number;
    cycles: number;
    uploaded_date: string;
    uploaded_by: string;
    client?: { name: string };
}

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    private apiUrl = 'http://localhost:3001/api';

    calendars = signal<CalendarHeader[]>([]);
    loading = signal(false);

    constructor(private http: HttpClient) { }

    async fetchCalendars() {
        this.loading.set(true);
        try {
            const data = await firstValueFrom(this.http.get<CalendarHeader[]>(`${this.apiUrl}/calendars`));
            this.calendars.set(data);
        } catch (error) {
            console.error('Failed to fetch calendars', error);
        } finally {
            this.loading.set(false);
        }
    }

    async uploadFile(formData: FormData) {
        return firstValueFrom(this.http.post(`${this.apiUrl}/upload`, formData));
    }
}
