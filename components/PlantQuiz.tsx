import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { I18nContext } from '../contexts/I18nContext';
import { getPlants } from '../services/dbService';
import { KnowledgeBasePlant } from '../types';

interface Question {
  plant: KnowledgeBasePlant;
  options: string[];
  correctAnswer: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const PlantQuiz: React.FC = () => {
  const { language, t } = useContext(I18nContext);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'finished'>('start');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [allPlants, setAllPlants] = useState<KnowledgeBasePlant[]>([]);

  useEffect(() => {
    setAllPlants(getPlants());
  }, []);

  const generateQuestions = useCallback(() => {
    if (allPlants.length < 4) {
      return;
    }
    
    const shuffledPlants = shuffleArray(allPlants);
    const quizPlants = shuffledPlants.slice(0, 10);
    
    const newQuestions = quizPlants.map(correctPlant => {
      const wrongAnswers = shuffledPlants
        .filter(p => p.id !== correctPlant.id)
        .slice(0, 3)
        .map(p => p.plantName[language]);

      const options = shuffleArray([...wrongAnswers, correctPlant.plantName[language]]);
      
      return {
        plant: correctPlant,
        options,
        correctAnswer: correctPlant.plantName[language]
      };
    });

    setQuestions(newQuestions);
  }, [allPlants, language]);


  const startGame = () => {
    generateQuestions();
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setGameState('playing');
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    
    setIsAnswered(true);
    setSelectedAnswer(answer);

    if (answer === questions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setGameState('finished');
    }
  };

  const getButtonClass = (option: string) => {
    if (!isAnswered) {
      return 'bg-white hover:bg-gray-100 border-gray-300';
    }
    const currentQuestion = questions[currentQuestionIndex];
    if (option === currentQuestion.correctAnswer) {
      return 'bg-green-500 text-white border-green-500 transform scale-105';
    }
    if (option === selectedAnswer) {
      return 'bg-red-500 text-white border-red-500';
    }
    return 'bg-white border-gray-300 opacity-70';
  };
  
  const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);

  if (allPlants.length < 4) {
     return (
        <div className="text-center py-12 text-gray-500">
          <h3 className="text-xl font-semibold">Quiz Not Available</h3>
          <p>We need at least 4 plants in the knowledge base to start a quiz.</p>
        </div>
      );
  }

  if (gameState === 'start') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg animate-fade-in text-center">
        <h2 className="text-2xl font-bold text-gray-800">{t('quizTitle')}</h2>
        <p className="text-gray-600 mt-2 mb-6">{t('quizDescription')}</p>
        <button
          onClick={startGame}
          className="px-8 py-3 border border-transparent text-base font-medium rounded-full text-white bg-primary hover:bg-primary-dark transition-transform transform hover:scale-105"
        >
          {t('startQuiz')}
        </button>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg animate-fade-in text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('finalScore')}</h2>
        <p className="text-5xl font-bold text-primary my-4">{score} / {questions.length}</p>
        <button
          onClick={startGame}
          className="mt-4 px-8 py-3 border border-transparent text-base font-medium rounded-full text-white bg-primary hover:bg-primary-dark transition-transform transform hover:scale-105"
        >
          {t('playAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg animate-fade-in">
      {currentQuestion && (
        <>
          <div className="flex justify-between items-center mb-4 text-sm font-semibold text-gray-600">
            <span>{t('questionOf').replace('{current}', String(currentQuestionIndex + 1)).replace('{total}', String(questions.length))}</span>
            <span>{t('score')}: {score}</span>
          </div>
          <div className="text-center mb-4">
            <img 
              src={currentQuestion.plant.image.replace('{PLANT_NAME}', encodeURIComponent(currentQuestion.plant.scientificName))} 
              alt="Plant for quiz" 
              className="w-full max-w-sm h-56 object-cover rounded-lg mx-auto shadow-md"
            />
          </div>
          <h3 className="text-lg font-bold text-center text-gray-800 mb-4">{t('selectCorrectAnswer')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map(option => (
              <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={isAnswered}
                className={`w-full p-4 border rounded-lg text-center font-semibold transition-all duration-300 ${getButtonClass(option)}`}
              >
                {option}
              </button>
            ))}
          </div>
          {isAnswered && (
            <div className="text-center mt-4 animate-fade-in-up">
              {selectedAnswer === currentQuestion.correctAnswer ? (
                <p className="font-bold text-green-600">{t('correct')}</p>
              ) : (
                <div className="font-bold text-red-600">
                  <p>{t('wrong')}</p>
                  <p className="text-sm text-gray-600 font-medium">{t('correctAnswerWas').replace('{plantName}', currentQuestion.correctAnswer)}</p>
                </div>
              )}
              <button 
                onClick={handleNext}
                className="mt-4 px-8 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
              >
                {currentQuestionIndex < questions.length - 1 ? t('nextQuestion') : t('viewResults')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlantQuiz;