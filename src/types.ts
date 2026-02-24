export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum Language {
  ZH = 'ZH',
  EN = 'EN'
}

export interface GameState {
  status: 'START' | 'PLAYING' | 'GAMEOVER';
  score: 0;
  timeLeft: number;
  difficulty: Difficulty;
  level: number;
  language: Language;
}

export interface ColorInfo {
  base: string;
  target: string;
  diff: number;
}
