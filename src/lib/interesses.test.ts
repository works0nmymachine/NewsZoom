import { describe, expect, it } from 'vitest';
import { past, termen } from './interesses';

describe('interesses', () => {
  it('matcht op het begin van een woord', () => {
    const i = { naam: 'Haven', zoektermen: ['haven'], uitsluitingen: [] };
    expect(past('Open Havendag in Den Helder', i)).toBe(true);
    expect(past('De voorhaven is dicht', i)).toBe(false);
  });

  it('gebruikt de naam als er geen zoektermen zijn', () => {
    expect(past('Databricks haalt geld op', { naam: 'Databricks', zoektermen: [], uitsluitingen: [] })).toBe(true);
  });

  it('uitsluitingen gaan voor', () => {
    const i = { naam: 'AI-modellen', zoektermen: ['model', 'GPT', 'Claude'], uitsluitingen: ['beurs'] };
    expect(past('Nieuw Claude-model scoort beter bij programmeren', i)).toBe(true);
    expect(past('Model van beurswaarde AI-bedrijven', i)).toBe(false);
  });

  it('termen splitst en ontdubbelt', () => {
    expect(termen('Nvidia, nvidia,\nJensen Huang, x')).toEqual(['Nvidia', 'Jensen Huang']);
  });
});
