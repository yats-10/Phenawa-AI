import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonChip, IonLabel } from '@ionic/angular/standalone';

export interface GarmentOption {
  label: string;
  group: 'men' | 'women';
}

const GARMENTS: GarmentOption[] = [
  { label: 'Kurta (Men)', group: 'men' },
  { label: 'Shirt (Men)', group: 'men' },
  { label: 'Pant (Men)', group: 'men' },
  { label: 'Sherwani', group: 'men' },
  { label: 'Pajama', group: 'men' },
  { label: 'Suit (Men)', group: 'men' },
  { label: 'Blazer', group: 'men' },
  { label: 'Coat', group: 'men' },
  { label: 'Sherwani + Pant', group: 'men' },
  { label: 'Kurti (Women)', group: 'women' },
  { label: 'Salwar Kameez', group: 'women' },
  { label: 'Lehenga', group: 'women' },
  { label: 'Anarkali', group: 'women' },
];

@Component({
  selector: 'app-garment-selector',
  templateUrl: 'garment-selector.component.html',
  styleUrls: ['garment-selector.component.scss'],
  standalone: true,
  imports: [CommonModule, IonChip, IonLabel],
})
export class GarmentSelectorComponent implements OnInit {
  @Input() selected: string | null = null;
  @Output() garmentSelected = new EventEmitter<string>();

  menGarments: GarmentOption[] = [];
  womenGarments: GarmentOption[] = [];

  ngOnInit(): void {
    this.menGarments = GARMENTS.filter((g) => g.group === 'men');
    this.womenGarments = GARMENTS.filter((g) => g.group === 'women');
  }

  select(label: string): void {
    this.selected = label;
    this.garmentSelected.emit(label);
  }
}
