import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sparklesOutline } from 'ionicons/icons';

const MESSAGES = [
  'Analyzing your fabric...',
  'Stitching the garment...',
  'Fitting it on...',
  'Adding the final touches...',
];

@Component({
  selector: 'app-loading-overlay',
  templateUrl: 'loading-overlay.component.html',
  styleUrls: ['loading-overlay.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
})
export class LoadingOverlayComponent implements OnDestroy {
  @Input() visible = false;

  currentMessageIndex = 0;
  currentMessage = MESSAGES[0]!;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    addIcons({ sparklesOutline });
    this.startMessageCycle();
  }

  private startMessageCycle(): void {
    this.intervalId = setInterval(() => {
      this.currentMessageIndex =
        (this.currentMessageIndex + 1) % MESSAGES.length;
      this.currentMessage = MESSAGES[this.currentMessageIndex]!;
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }
}
