/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Play, 
  Languages, 
  Info, 
  ChevronRight,
  Eye,
  Zap,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

enum Language {
  ZH = 'ZH',
  EN = 'EN'
}

type GameStatus = 'START' | 'PLAYING' | 'GAMEOVER';

interface Translations {
  title: string;
  subtitle: string;
  start: string;
  easy: string;
  normal: string;
  hard: string;
  score: string;
  time: string;
  level: string;
  gameOver: string;
  finalScore: string;
  restart: string;
  diffExplanation: string;
  artStudentNote: string;
  highestLevel: string;
  accuracy: string;
}

const i18n: Record<Language, Translations> = {
  [Language.ZH]: {
    title: "色彩敏感度挑战",
    subtitle: "专为艺术生设计的视觉训练",
    start: "开始挑战",
    easy: "入门级",
    normal: "专业级",
    hard: "大师级",
    score: "得分",
    time: "剩余时间",
    level: "关卡",
    gameOver: "挑战结束",
    finalScore: "最终得分",
    restart: "重新开始",
    diffExplanation: "色彩差异说明",
    artStudentNote: "艺术生的眼睛能分辨更细微的色差。难度随关卡提升，色块间的HSL值差异会逐渐减小。",
    highestLevel: "最高关卡",
    accuracy: "准确率"
  },
  [Language.EN]: {
    title: "Chroma Vision",
    subtitle: "Color Sensitivity Challenge for Artists",
    start: "Start Challenge",
    easy: "Beginner",
    normal: "Professional",
    hard: "Master",
    score: "Score",
    time: "Time Left",
    level: "Level",
    gameOver: "Game Over",
    finalScore: "Final Score",
    restart: "Play Again",
    diffExplanation: "Color Difference Info",
    artStudentNote: "Artists can distinguish subtle shifts. Difficulty increases as the HSL difference between blocks decreases.",
    highestLevel: "Highest Level",
    accuracy: "Accuracy"
  }
};

// --- Game Constants ---
const INITIAL_TIME = 30;
const GRID_SIZE = 5;

// --- Components ---

export default function App() {
  const [status, setStatus] = useState<GameStatus>('START');
  const [language, setLanguage] = useState<Language>(Language.ZH);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [grid, setGrid] = useState<{ color: string; isTarget: boolean }[]>([]);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [diffInfo, setDiffInfo] = useState<{ base: string; target: string; diff: number } | null>(null);
  const [wrongClicks, setWrongClicks] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const t = i18n[language];

  // --- Color Logic ---
  const generateColors = useCallback(() => {
    // Generate a random base color
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 40) + 40; // 40-80%
    const l = Math.floor(Math.random() * 40) + 30; // 30-70%

    // Calculate difference based on level and difficulty
    // Easy: starts at 20, decreases slowly
    // Normal: starts at 15, decreases medium
    // Hard: starts at 10, decreases fast
    let baseDiff = 15;
    let decay = 0.95;

    if (difficulty === Difficulty.EASY) { baseDiff = 25; decay = 0.97; }
    if (difficulty === Difficulty.HARD) { baseDiff = 12; decay = 0.92; }

    const currentDiff = Math.max(1, baseDiff * Math.pow(decay, level - 1));
    
    // Randomly decide which component to shift (H, S, or L)
    const shiftType = Math.random();
    let targetH = h, targetS = s, targetL = l;

    if (shiftType < 0.33) {
      targetH = (h + currentDiff) % 360;
    } else if (shiftType < 0.66) {
      targetS = Math.min(100, Math.max(0, s + (Math.random() > 0.5 ? currentDiff : -currentDiff)));
    } else {
      targetL = Math.min(100, Math.max(0, l + (Math.random() > 0.5 ? currentDiff : -currentDiff)));
    }

    const baseColor = `hsl(${h}, ${s}%, ${l}%)`;
    const targetColor = `hsl(${targetH}, ${targetS}%, ${targetL}%)`;

    const newTargetIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
    const newGrid = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      color: i === newTargetIndex ? targetColor : baseColor,
      isTarget: i === newTargetIndex
    }));

    setGrid(newGrid);
    setTargetIndex(newTargetIndex);
    setDiffInfo({ base: baseColor, target: targetColor, diff: Number(currentDiff.toFixed(2)) });
  }, [level, difficulty]);

  // --- Game Actions ---
  const startGame = () => {
    setScore(0);
    setLevel(1);
    setTimeLeft(INITIAL_TIME);
    setWrongClicks(0);
    setStatus('PLAYING');
    generateColors();
  };

  const handleBlockClick = (index: number) => {
    if (status !== 'PLAYING') return;

    if (index === targetIndex) {
      setScore(prev => prev + 1);
      setLevel(prev => prev + 1);
      setTimeLeft(prev => Math.min(INITIAL_TIME, prev + 2)); // Add time bonus
      generateColors();
    } else {
      setWrongClicks(prev => prev + 1);
      setTimeLeft(prev => Math.max(0, prev - 3)); // Penalty
    }
  };

  // --- Timer ---
  useEffect(() => {
    if (status === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setStatus('GAMEOVER');
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {status === 'START' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-200/50 p-8 text-center border border-slate-100"
          >
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Eye className="text-white w-8 h-8" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">{t.title}</h1>
            <p className="text-slate-500 mb-8">{t.subtitle}</p>

            <div className="flex justify-center gap-2 mb-8">
              <button 
                onClick={() => setLanguage(Language.ZH)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  language === Language.ZH ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                中文
              </button>
              <button 
                onClick={() => setLanguage(Language.EN)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  language === Language.EN ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                English
              </button>
            </div>

            <div className="space-y-3 mb-8">
              {(Object.keys(Difficulty) as Array<keyof typeof Difficulty>).map((key) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(Difficulty[key])}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group",
                    difficulty === Difficulty[key] 
                      ? "border-indigo-600 bg-indigo-50/50" 
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      key === 'EASY' ? "bg-emerald-500" : key === 'NORMAL' ? "bg-amber-500" : "bg-rose-500"
                    )} />
                    <span className={cn(
                      "font-semibold",
                      difficulty === Difficulty[key] ? "text-indigo-900" : "text-slate-700"
                    )}>
                      {t[key.toLowerCase() as keyof Translations]}
                    </span>
                  </div>
                  {difficulty === Difficulty[key] && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                </button>
              ))}
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              {t.start}
            </button>
          </motion.div>
        )}

        {status === 'PLAYING' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-2xl flex flex-col items-center"
          >
            {/* Stats Header */}
            <div className="w-full flex justify-between items-center mb-6 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.score}</span>
                  <span className="text-2xl font-black text-indigo-600 tabular-nums">{score}</span>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.level}</span>
                  <span className="text-2xl font-black text-slate-900 tabular-nums">{level}</span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.time}</span>
                <div className={cn(
                  "flex items-center gap-2 text-2xl font-black tabular-nums",
                  timeLeft < 10 ? "text-rose-500 animate-pulse" : "text-slate-900"
                )}>
                  <Timer className="w-5 h-5" />
                  {timeLeft}s
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="grid-container bg-white p-3 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 mb-8">
              <div 
                className="grid gap-2 w-full h-full"
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
              >
                {grid.map((item, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleBlockClick(i)}
                    className="rounded-xl w-full h-full transition-shadow hover:shadow-inner"
                    style={{ backgroundColor: item.color }}
                  />
                ))}
              </div>
            </div>

            {/* Info Panel */}
            <div className="w-full bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
              <div className="flex items-center gap-2 mb-3 text-indigo-400">
                <Info className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">{t.diffExplanation}</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-10 h-10 rounded-full border-2 border-slate-800" style={{ backgroundColor: diffInfo?.base }} />
                    <div className="w-10 h-10 rounded-full border-2 border-slate-800" style={{ backgroundColor: diffInfo?.target }} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t.level} {level}</div>
                    <div className="font-mono font-bold text-lg">Δ {diffInfo?.diff}%</div>
                  </div>
                </div>
                <div className="flex-1 text-xs text-slate-400 leading-relaxed">
                  {t.artStudentNote}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'GAMEOVER' && (
          <motion.div 
            key="gameover"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                <Trophy className="text-amber-600 w-10 h-10" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-6">{t.gameOver}</h2>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">{t.finalScore}</div>
                <div className="text-3xl font-black text-indigo-600">{score}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">{t.highestLevel}</div>
                <div className="text-3xl font-black text-slate-900">{level}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl col-span-2">
                <div className="text-xs text-slate-400 uppercase font-bold mb-1">{t.accuracy}</div>
                <div className="text-3xl font-black text-emerald-600">
                  {score + wrongClicks > 0 ? Math.round((score / (score + wrongClicks)) * 100) : 0}%
                </div>
              </div>
            </div>

            <button
              onClick={() => setStatus('START')}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              {t.restart}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-12 text-slate-400 text-xs flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500 fill-current" />
          <span>Powered by Gemini AI</span>
        </div>
        <div className="w-px h-3 bg-slate-200" />
        <span>© 2026 Chroma Vision</span>
      </footer>
    </div>
  );
}
