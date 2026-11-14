import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createProfile, createProject, uid } from '../../core/config/defaults.js';
import { OwnerSettingsComponent } from './owner-settings.component';

@Component({
  imports: [CommonModule, FormsModule, OwnerSettingsComponent],
  selector: 'app-configuration-page',
  templateUrl: './configuration-page.component.html'
})
export class ConfigurationPageComponent {
  @Input({ required: true }) config: any;
  @Input({ required: true }) labels: any;
  @Output() closed = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();
  @Output() profileSelected = new EventEmitter<string>();
  @Output() projectSelected = new EventEmitter<string>();

  get pageInfo(): any {
    return this.config.pageInfo;
  }

  objectKeys(value: any): string[] {
    return Object.keys(value || {});
  }

  addProfile(): void {
    const profile = createProfile('Nowy profil');
    this.config.profiles.push(profile);
    this.config.defaultProfileId = profile.id;
    this.profileSelected.emit(profile.id);
  }

  removeProfile(profile: any): void {
    if (this.config.profiles.length < 2) return;
    this.config.profiles = this.config.profiles.filter((item: any) => item.id !== profile.id);
    if (this.config.defaultProfileId === profile.id) {
      this.config.defaultProfileId = this.config.profiles[0].id;
      this.profileSelected.emit(this.config.defaultProfileId);
    }
    this.changed.emit();
  }

  addProject(): void {
    const project = createProject('Nowy projekt');
    this.config.projects.push(project);
    this.config.defaultProjectId = project.id;
    this.projectSelected.emit(project.id);
  }

  removeProject(project: any): void {
    if (this.config.projects.length < 2) return;
    this.config.projects = this.config.projects.filter((item: any) => item.id !== project.id);
    if (this.config.defaultProjectId === project.id) {
      this.config.defaultProjectId = this.config.projects[0].id;
      this.projectSelected.emit(this.config.defaultProjectId);
    }
    this.changed.emit();
  }

  addAboutCard(): void {
    this.pageInfo.cards ||= [];
    this.pageInfo.cards.push({ id: uid('aboutcard'), title: 'Nowa karta', body: '' });
    this.changed.emit();
  }

  removeItem(items: any[], index: number): void {
    items.splice(index, 1);
    this.changed.emit();
  }
}