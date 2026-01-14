import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';
import clientData from '../../config/clients.json';
import { LucideAngularModule } from 'lucide-angular';

@Component({
    selector: 'app-upload-flow',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './upload-flow.component.html',
})
export class UploadFlowComponent {
    @Output() uploadSuccess = new EventEmitter<void>();

    clients = clientData.clients;
    selectedClient = signal('');
    selectedFile = signal<File | null>(null);
    uploading = signal(false);
    progress = signal(0);

    constructor(private calendarService: CalendarService) { }

    handleDownloadTemplate() {
        if (!this.selectedClient()) {
            alert("Please select a client first");
            return;
        }
        const link = document.createElement('a');
        link.href = '/assets/template.xlsx';
        link.download = `Template_${this.selectedClient()}.xlsx`;
        link.click();
    }

    handleFileChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile.set(file);
        }
    }

    async handleUpload(forceOverwrite = false) {
        if (!this.selectedClient() || !this.selectedFile()) {
            alert("Please select a client and choose a file");
            return;
        }

        this.uploading.set(true);
        this.progress.set(10);

        const formData = new FormData();
        formData.append('file', this.selectedFile()!);
        formData.append('clientName', this.selectedClient());
        formData.append('uploadedBy', 'User');
        if (forceOverwrite) {
            formData.append('overwrite', 'true');
        }

        try {
            const interval = setInterval(() => {
                this.progress.update(p => Math.min(p + 10, 90));
            }, 200);

            const res: any = await this.calendarService.uploadFile(formData);
            clearInterval(interval);

            this.progress.set(100);
            alert("Calendar uploaded successfully!");
            this.selectedFile.set(null);
            this.uploadSuccess.emit();
        } catch (error: any) {
            this.progress.set(0);
            if (error.status === 409 && error.error?.requiresOverwrite) {
                if (confirm(`${error.error.error} Do you want to overwrite it?`)) {
                    await this.handleUpload(true);
                    return;
                }
            } else {
                alert("Upload Failed: " + (error.error?.error || error.message));
            }
        } finally {
            this.uploading.set(false);
            setTimeout(() => this.progress.set(0), 2000);
        }
    }
}
