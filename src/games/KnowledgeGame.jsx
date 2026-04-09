import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  QUESTION_BANK_BY_TOPIC,
  QUESTION_BANK_SIZE,
  QUESTION_TOPICS,
  localizeQuestion
} from "../data/questionBank";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";

const QUESTIONS_PER_ROUND = 12;
const QUESTION_TIME = 40;
const ANSWER_LABELS = ["A", "B", "C", "D"];
const MAX_PER_TOPIC = 3;

const COPY_BY_LOCALE = {
  es: {
    modeTitle: "Modo Conocimiento",
    poolLabel: "Bolsa activa",
    questionsLabel: "preguntas",
    startRound: "Iniciar ronda",
    restartRound: "Reiniciar ronda",
    startPrompt: "La partida aun no ha comenzado.",
    startHint: "Pulsa el boton para iniciar el quiz y activar el temporizador.",
    feedbackIdle: "Inicia la ronda para comenzar.",
    feedbackStarted: "Ronda iniciada. Mantiene la racha para puntuar mas.",
    feedbackNext: "Siguiente pregunta.",
    feedbackCorrectPrefix: "Correcto.",
    feedbackWrongPrefix: "Incorrecto.",
    feedbackCorrectAnswer: "Correcta",
    feedbackTimeUp: "Tiempo agotado.",
    pointsShort: "pts",
    finalResult: "Resultado final",
    pointsLabel: "Puntos",
    accuracyLabel: "Precision",
    rankLabel: "Rango",
    bestStreakLabel: "Mejor racha",
    progressLabel: "Progreso",
    questionLabel: "Pregunta",
    correctAnswersLabel: "aciertos",
    streakLabel: "Racha",
    categoriesLabel: "Categorias",
    timeRemainingLabel: "Tiempo restante",
    roundProgressLabel: "Avance de ronda",
    precisionSuffix: "precision",
    nextQuestion: "Siguiente pregunta",
    rankMaster: "Gran maestro",
    rankExpert: "Experto",
    rankAdvanced: "Avanzado",
    rankIntermediate: "Intermedio",
    rankLearning: "En progreso"
  },
  en: {
    modeTitle: "Knowledge Mode",
    poolLabel: "Active pool",
    questionsLabel: "questions",
    startRound: "Start round",
    restartRound: "Restart round",
    startPrompt: "The match has not started yet.",
    startHint: "Press the button to begin the quiz and activate the timer.",
    feedbackIdle: "Start the round to begin.",
    feedbackStarted: "Round started. Keep your streak to score more points.",
    feedbackNext: "Next question.",
    feedbackCorrectPrefix: "Correct.",
    feedbackWrongPrefix: "Incorrect.",
    feedbackCorrectAnswer: "Correct answer",
    feedbackTimeUp: "Time is up.",
    pointsShort: "pts",
    finalResult: "Final result",
    pointsLabel: "Points",
    accuracyLabel: "Accuracy",
    rankLabel: "Rank",
    bestStreakLabel: "Best streak",
    progressLabel: "Progress",
    questionLabel: "Question",
    correctAnswersLabel: "correct",
    streakLabel: "Streak",
    categoriesLabel: "Categories",
    timeRemainingLabel: "Time remaining",
    roundProgressLabel: "Round progress",
    precisionSuffix: "accuracy",
    nextQuestion: "Next question",
    rankMaster: "Grand master",
    rankExpert: "Expert",
    rankAdvanced: "Advanced",
    rankIntermediate: "Intermediate",
    rankLearning: "In progress"
  }
};

const shuffleArray = (items) => {
  const cloned = [...items];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }
  return cloned;
};

const getDifficultyFactor = (difficultyLabel) => {
  const normalized = (difficultyLabel ?? "").toLowerCase();
  if (normalized.includes("alta") || normalized.includes("hard")) {
    return 1.35;
  }
  if (normalized.includes("media") || normalized.includes("medium")) {
    return 1.18;
  }
  return 1;
};

const pickRoundQuestions = () => {
  const topicPools = QUESTION_TOPICS.reduce((accumulator, topic) => {
    accumulator[topic] = shuffleArray(QUESTION_BANK_BY_TOPIC[topic] ?? []);
    return accumulator;
  }, {});

  const selected = [];
  const selectedPromptSet = new Set();
  const topicUsage = {};

  for (const topic of shuffleArray(QUESTION_TOPICS)) {
    if (selected.length >= QUESTIONS_PER_ROUND) {
      break;
    }
    const candidate = topicPools[topic].shift();
    if (!candidate) {
      continue;
    }
    selected.push(candidate);
    selectedPromptSet.add(candidate.prompt);
    topicUsage[topic] = 1;
  }

  while (selected.length < QUESTIONS_PER_ROUND) {
    const orderedTopics = [...QUESTION_TOPICS].sort((topicA, topicB) => {
      return (topicUsage[topicA] ?? 0) - (topicUsage[topicB] ?? 0);
    });

    let picked = false;
    for (const topic of orderedTopics) {
      const currentUsage = topicUsage[topic] ?? 0;
      if (currentUsage >= MAX_PER_TOPIC) {
        continue;
      }

      const pool = topicPools[topic];
      const nextQuestion = pool.find((item) => !selectedPromptSet.has(item.prompt));
      if (!nextQuestion) {
        continue;
      }

      selected.push(nextQuestion);
      selectedPromptSet.add(nextQuestion.prompt);
      topicUsage[topic] = currentUsage + 1;
      topicPools[topic] = pool.filter((item) => item.prompt !== nextQuestion.prompt);
      picked = true;
      break;
    }

    if (picked) {
      continue;
    }

    const fallbackPool = shuffleArray(
      Object.values(topicPools).flat().filter((item) => !selectedPromptSet.has(item.prompt))
    );

    if (!fallbackPool.length) {
      break;
    }

    const fallbackQuestion = fallbackPool[0];
    selected.push(fallbackQuestion);
    selectedPromptSet.add(fallbackQuestion.prompt);
    topicUsage[fallbackQuestion.topic] = (topicUsage[fallbackQuestion.topic] ?? 0) + 1;
  }

  return shuffleArray(selected);
};

const createInitialState = (idleFeedback) => ({
  status: "idle",
  questions: pickRoundQuestions(),
  currentIndex: 0,
  selectedIndex: null,
  locked: false,
  score: 0,
  points: 0,
  streak: 0,
  bestStreak: 0,
  timeLeft: QUESTION_TIME,
  feedback: idleFeedback
});

const getRank = (score, total, copy) => {
  const ratio = score / total;
  if (ratio >= 0.92) return copy.rankMaster;
  if (ratio >= 0.8) return copy.rankExpert;
  if (ratio >= 0.65) return copy.rankAdvanced;
  if (ratio >= 0.45) return copy.rankIntermediate;
  return copy.rankLearning;
};

const resolveTimeTick = (previous, locale, copy) => {
  if (previous.status !== "playing" || previous.locked) {
    return previous;
  }

  if (previous.timeLeft <= 1) {
    const question = previous.questions[previous.currentIndex];
    const localizedQuestion = localizeQuestion(question, locale);
    return {
      ...previous,
      locked: true,
      selectedIndex: null,
      streak: 0,
      timeLeft: 0,
      feedback: `${copy.feedbackTimeUp} ${copy.feedbackCorrectAnswer}: ${localizedQuestion.options[question.answer]}.`
    };
  }

  return {
    ...previous,
    timeLeft: previous.timeLeft - 1
  };
};

function KnowledgeGame() {
  const locale = useMemo(resolveBrowserLanguage, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const [state, setState] = useState(() => createInitialState(copy.feedbackIdle));

  const currentQuestion = useMemo(() => {
    return state.questions[state.currentIndex];
  }, [state.currentIndex, state.questions]);
  const localizedQuestion = useMemo(() => {
    return localizeQuestion(currentQuestion, locale);
  }, [currentQuestion, locale]);
  const roundTopicCount = useMemo(() => {
    return new Set(state.questions.map((question) => question.topic)).size;
  }, [state.questions]);

  useEffect(() => {
    if (state.status !== "playing" || state.locked) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setState((previous) => resolveTimeTick(previous, locale, copy));
    }, 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [copy, locale, state.locked, state.status, state.timeLeft]);

  const startRound = () => {
    setState({
      ...createInitialState(copy.feedbackIdle),
      status: "playing",
      feedback: copy.feedbackStarted
    });
  };

  const selectAnswer = (answerIndex) => {
    setState((previous) => {
      if (previous.status !== "playing" || previous.locked) {
        return previous;
      }

      const question = previous.questions[previous.currentIndex];
      const localized = localizeQuestion(question, locale);
      const isCorrect = answerIndex === question.answer;
      const nextStreak = isCorrect ? previous.streak + 1 : 0;
      const nextScore = previous.score + (isCorrect ? 1 : 0);
      const difficultyFactor = getDifficultyFactor(question.difficulty);
      const gainedPoints = isCorrect
        ? Math.round(100 * difficultyFactor + previous.streak * 20)
        : 0;
      const feedback = isCorrect
        ? `${copy.feedbackCorrectPrefix} +${gainedPoints} ${copy.pointsShort}. ${localized.explanation}`
        : `${copy.feedbackWrongPrefix} ${copy.feedbackCorrectAnswer}: ${localized.options[question.answer]}. ${localized.explanation}`;

      return {
        ...previous,
        selectedIndex: answerIndex,
        locked: true,
        score: nextScore,
        points: previous.points + gainedPoints,
        streak: nextStreak,
        bestStreak: Math.max(previous.bestStreak, nextStreak),
        feedback
      };
    });
  };

  const nextQuestion = () => {
    setState((previous) => {
      if (previous.status !== "playing" || !previous.locked) {
        return previous;
      }

      const isLastQuestion = previous.currentIndex >= previous.questions.length - 1;
      if (isLastQuestion) {
        return {
          ...previous,
          status: "finished"
        };
      }

      return {
        ...previous,
        currentIndex: previous.currentIndex + 1,
        selectedIndex: null,
        locked: false,
        timeLeft: QUESTION_TIME,
        feedback: copy.feedbackNext
      };
    });
  };

  if (!localizedQuestion) {
    return null;
  }

  const timeProgress = (state.timeLeft / QUESTION_TIME) * 100;
  const roundProgress =
    ((state.currentIndex + (state.status === "finished" ? 1 : 0)) /
      state.questions.length) *
    100;
  const answeredCount = state.status === "idle"
    ? 0
    : Math.min(
      state.questions.length,
      state.currentIndex + (state.locked || state.status === "finished" ? 1 : 0)
    );
  const accuracy = answeredCount === 0
    ? 0
    : Math.round((state.score / answeredCount) * 100);

  const optionClass = (index) => {
    if (!state.locked) return "answer-btn";
    if (index === currentQuestion.answer) return "answer-btn correct";
    if (index === state.selectedIndex && index !== currentQuestion.answer) {
      return "answer-btn wrong";
    }
    return "answer-btn";
  };

  const buildTextPayload = useCallback((snapshot) => {
    const question = snapshot.questions[snapshot.currentIndex];
    const localized = question ? localizeQuestion(question, locale) : null;
    return {
      mode: "knowledge",
      coordinates: "ui_based_no_grid",
      locale,
      status: snapshot.status,
      progress: {
        currentIndex: snapshot.currentIndex,
        total: snapshot.questions.length,
        score: snapshot.score,
        points: snapshot.points,
        streak: snapshot.streak,
        bestStreak: snapshot.bestStreak,
        timeLeft: snapshot.timeLeft
      },
      question: localized
        ? {
          topic: localized.topic,
          difficulty: localized.difficulty,
          prompt: localized.prompt,
          options: localized.options,
          answerIndex: snapshot.locked ? question.answer : null,
          selectedIndex: snapshot.selectedIndex
        }
        : null,
      feedback: snapshot.feedback
    };
  }, [locale]);

  const advanceTime = useCallback((ms) => {
    const steps = Math.floor(ms / 1000);
    if (steps <= 0) {
      return;
    }

    setState((previous) => {
      let next = previous;
      for (let index = 0; index < steps; index += 1) {
        next = resolveTimeTick(next, locale, copy);
      }
      return next;
    });
  }, [copy, locale]);

  useGameRuntimeBridge(state, buildTextPayload, advanceTime);

  return (
    <div className="mini-game knowledge-game">
      <div className="mini-head">
        <div>
          <h4>{copy.modeTitle}</h4>
          <p>
            {copy.poolLabel}: <strong>{QUESTION_BANK_SIZE}</strong> {copy.questionsLabel}.
          </p>
        </div>
        <button type="button" onClick={startRound}>
          {state.status === "playing" ? copy.restartRound : copy.startRound}
        </button>
      </div>

      {state.status === "finished" ? (
        <section className="quiz-summary">
          <p className="summary-score">
            {copy.finalResult}: {state.score}/{state.questions.length}
          </p>
          <p>{copy.pointsLabel}: {state.points}</p>
          <p>{copy.accuracyLabel}: {accuracy}%</p>
          <p>{copy.rankLabel}: {getRank(state.score, state.questions.length, copy)}</p>
          <p>{copy.bestStreakLabel}: {state.bestStreak}</p>
          <div className="meter-line compact">
            <p>{copy.progressLabel}</p>
            <div className="meter-track">
              <span className="meter-fill quiz" style={{ width: "100%" }} />
            </div>
          </div>
        </section>
      ) : (
        <section className="knowledge-shell">
          {state.status === "idle" ? (
            <div className="knowledge-start-panel">
              <p className="knowledge-start-title">{copy.startPrompt}</p>
              <p className="knowledge-start-hint">{copy.startHint}</p>
              <button
                type="button"
                className="next-btn knowledge-start-btn"
                onClick={startRound}
              >
                {copy.startRound}
              </button>
            </div>
          ) : null}

          <div className="quiz-progress">
            <span>
              {copy.questionLabel} {state.currentIndex + 1}/{state.questions.length}
            </span>
            <strong>{state.score} {copy.correctAnswersLabel}</strong>
          </div>

          <div className="knowledge-chips">
            <span className="topic-chip">{localizedQuestion.topic}</span>
            <span className="difficulty-chip">{localizedQuestion.difficulty}</span>
            <span className="streak-chip">{copy.streakLabel}: {state.streak}</span>
            <span className="coverage-chip">{copy.categoriesLabel}: {roundTopicCount}</span>
            <span className="coverage-chip">{copy.pointsLabel}: {state.points}</span>
          </div>

          <div className="meter-line compact">
            <p>{copy.timeRemainingLabel}</p>
            <div className="meter-track">
              <span
                className="meter-fill timer"
                style={{ width: `${Math.max(0, timeProgress)}%` }}
              />
            </div>
            <strong>{state.timeLeft}s</strong>
          </div>

          <div className="meter-line compact">
            <p>{copy.roundProgressLabel}</p>
            <div className="meter-track">
              <span
                className="meter-fill quiz"
                style={{ width: `${Math.min(100, roundProgress)}%` }}
              />
            </div>
            <strong>{accuracy}% {copy.precisionSuffix}</strong>
          </div>

          <article className="question-card">
            <p className="quiz-question">{localizedQuestion.prompt}</p>
          </article>

          <div className="answer-list two-column">
            {localizedQuestion.options.map((option, index) => (
              <button
                key={`${option}-${index}`}
                type="button"
                className={optionClass(index)}
                disabled={state.locked || state.status !== "playing"}
                onClick={() => selectAnswer(index)}
              >
                <span className="answer-letter">{ANSWER_LABELS[index]}</span>
                <span>{option}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="next-btn"
            disabled={!state.locked || state.status !== "playing"}
            onClick={nextQuestion}
          >
            {copy.nextQuestion}
          </button>
        </section>
      )}

      <p className="game-message">{state.feedback}</p>
    </div>
  );
}

export default KnowledgeGame;
