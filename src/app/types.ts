import type { ModalKind as ConfigModalKind, Page as ConfigPage, RoleConfig } from '../types/config.types';

export type Role = RoleConfig;
export type Profile = { fullName: string; email: string; jobTitle: string; phone: string; location: string; timezone: string; about: string };
export type Page = ConfigPage;
export type Notification = { text: string; time: string; read: boolean };
export type ModalKind = ConfigModalKind;
