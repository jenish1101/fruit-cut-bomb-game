import { useCallback, useEffect, useState } from "react";
import { HIGH_SCORE_KEY, MAX_HIGH_SCORES, type HighScoreEntry } from "./types";

function loadScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.score === "number")
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HIGH_SCORES);
  } catch {
    return [];
  }
}

export function useHighScores() {
  const [scores, setScores] = useState<HighScoreEntry[]>(() => loadScores());

  useEffect(() => {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
    } catch {
      // ignore quota errors
    }
  }, [scores]);

  const qualifies = useCallback(
    (score: number) => {
      if (score <= 0) return false;
      if (scores.length < MAX_HIGH_SCORES) return true;
      return score > scores[scores.length - 1].score;
    },
    [scores],
  );

  const addScore = useCallback((entry: HighScoreEntry) => {
    setScores((prev) => {
      const next = [...prev, entry].sort((a, b) => b.score - a.score).slice(0, MAX_HIGH_SCORES);
      return next;
    });
  }, []);

  return { scores, qualifies, addScore };
}
