'use client';

import React, { useState, useEffect } from 'react';
import { knowledgeCardsAPI, quizzesAPI } from '@/app/lib/storage';
import { KnowledgeCard, Quiz, QuizQuestion } from '@/app/lib/models';
import { ollamaService } from '@/app/lib/ollama';
import { toast } from 'react-hot-toast';

export default function Learn() {
  const [loading, setLoading] = useState<boolean>(true);
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentQuizCard, setCurrentQuizCard] = useState<KnowledgeCard | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const [generatingQuiz, setGeneratingQuiz] = useState<boolean>(false);
  
  // Load knowledge cards and quizzes
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load knowledge cards
        const cards = await knowledgeCardsAPI.getAll();
        setKnowledgeCards(cards);
        
        // Load existing quizzes
        const existingQuizzes = await quizzesAPI.getAll();
        setQuizzes(existingQuizzes);
        
        // If there are quizzes, select the most recent one
        if (existingQuizzes.length > 0) {
          const mostRecentQuiz = existingQuizzes.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          
          setCurrentQuiz(mostRecentQuiz);
          
          // Find matching knowledge card
          const card = await knowledgeCardsAPI.getById(mostRecentQuiz.knowledgeCardId);
          if (card) {
            setCurrentQuizCard(card);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load learning data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Generate a new quiz from a knowledge card
  const generateQuiz = async (card: KnowledgeCard) => {
    try {
      setGeneratingQuiz(true);
      
      // Check if a quiz already exists for this card
      const existingQuizzes = await quizzesAPI.getByKnowledgeCardId(card.id);
      
      if (existingQuizzes.length > 0) {
        // Use existing quiz
        setCurrentQuiz(existingQuizzes[0]);
        setCurrentQuizCard(card);
        resetQuiz();
        toast.success('Quiz loaded from your knowledge base');
      } else {
        // Generate new quiz
        const response = await ollamaService.generateQuiz({
          content: card.content,
          numberOfQuestions: 5,
          options: {
            model: 'gemma3:4b',
            temperature: 0.7
          }
        });
        
        if (response.questions.length === 0) {
          throw new Error('Failed to generate questions');
        }
        
        // Convert Ollama questions to our quiz format
        const quizQuestions: QuizQuestion[] = response.questions.map(q => ({
          id: crypto.randomUUID(),
          question: q.question,
          options: q.options,
          correctOptionIndex: q.correctAnswer,
          explanation: q.explanation
        }));
        
        // Create a new quiz
        const newQuiz: Omit<Quiz, 'id'> = {
          knowledgeCardId: card.id,
          questions: quizQuestions,
          createdAt: new Date()
        };
        
        // Save to storage
        const savedQuiz = await quizzesAPI.add(newQuiz);
        
        setCurrentQuiz(savedQuiz);
        setCurrentQuizCard(card);
        resetQuiz();
        
        toast.success('New quiz generated successfully!');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Failed to generate quiz. Please try again.');
    } finally {
      setGeneratingQuiz(false);
    }
  };
  
  // Reset quiz state for a new attempt
  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setScore(0);
    setQuizCompleted(false);
  };
  
  // Handle option selection
  const handleOptionSelect = (optionIndex: number) => {
    if (isAnswerChecked) return; // Prevent changing answer after checking
    setSelectedOption(optionIndex);
  };
  
  // Check if the selected answer is correct
  const checkAnswer = () => {
    if (currentQuiz && selectedOption !== null) {
      const currentQuestion = currentQuiz.questions[currentQuestionIndex];
      const isCorrectAnswer = selectedOption === currentQuestion.correctOptionIndex;
      
      setIsCorrect(isCorrectAnswer);
      setIsAnswerChecked(true);
      
      if (isCorrectAnswer) {
        setScore(prev => prev + 1);
      }
    }
  };
  
  // Move to the next question or complete the quiz
  const nextQuestion = () => {
    if (!currentQuiz) return;
    
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      // Quiz completed
      setQuizCompleted(true);
    }
  };
  
  // Render a card for selecting content to quiz on
  const renderKnowledgeCardSelector = () => {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Generate Quiz from Your Knowledge</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Select a knowledge card to generate a quiz based on its content:
        </p>
        
        <div className="max-h-96 overflow-y-auto">
          {knowledgeCards.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic">
              No knowledge cards found. Please import some content first.
            </p>
          ) : (
            <div className="space-y-2">
              {knowledgeCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => generateQuiz(card)}
                  disabled={generatingQuiz}
                  className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">{card.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {card.contentType} • {new Date(card.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render the current quiz question
  const renderQuizQuestion = () => {
    if (!currentQuiz || currentQuiz.questions.length === 0) return null;
    
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];
    
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Quiz: {currentQuizCard?.title || 'Knowledge Quiz'}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}
          </span>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
          <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">
            {currentQuestion.question}
          </p>
          
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => (
              <div 
                key={idx} 
                className={`flex items-start p-2 rounded-md ${
                  isAnswerChecked && idx === currentQuestion.correctOptionIndex
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : isAnswerChecked && idx === selectedOption
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : selectedOption === idx
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : ''
                }`}
              >
                <input
                  id={`answer-${idx}`}
                  name="quiz-answer"
                  type="radio"
                  checked={selectedOption === idx}
                  onChange={() => handleOptionSelect(idx)}
                  disabled={isAnswerChecked}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`answer-${idx}`} className="ml-3 block text-gray-700 dark:text-gray-300">
                  {option}
                </label>
              </div>
            ))}
          </div>
          
          {isAnswerChecked && currentQuestion.explanation && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-1">Explanation:</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {currentQuestion.explanation}
              </p>
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            {!isAnswerChecked ? (
              <button 
                onClick={checkAnswer}
                disabled={selectedOption === null}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Check Answer
              </button>
            ) : (
              <button 
                onClick={nextQuestion}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                {currentQuestionIndex < currentQuiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Render quiz results when completed
  const renderQuizResults = () => {
    if (!currentQuiz) return null;
    
    const percentage = Math.round((score / currentQuiz.questions.length) * 100);
    let resultMessage = '';
    
    if (percentage >= 90) {
      resultMessage = 'Excellent! You have mastered this content.';
    } else if (percentage >= 70) {
      resultMessage = 'Great job! You have a good understanding of this content.';
    } else if (percentage >= 50) {
      resultMessage = 'Good effort! You might want to review this content again.';
    } else {
      resultMessage = 'Keep learning! We recommend reviewing this content more thoroughly.';
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quiz Results</h2>
        
        <div className="text-center py-8">
          <div className="inline-block rounded-full bg-gray-100 dark:bg-gray-700 p-8 mb-4">
            <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{percentage}%</span>
          </div>
          
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
            {resultMessage}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You answered {score} out of {currentQuiz.questions.length} questions correctly.
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={resetQuiz}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry Quiz
            </button>
            
            <button
              onClick={() => setCurrentQuiz(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Choose Another Quiz
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Center</h1>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : generatingQuiz ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Generating quiz questions...</p>
        </div>
      ) : currentQuiz ? (
        quizCompleted ? renderQuizResults() : renderQuizQuestion()
      ) : (
        renderKnowledgeCardSelector()
      )}
      
      {/* Spaced Repetition */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Spaced Repetition</h2>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Strengthen your memory with cards due for review based on spaced repetition intervals.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium mb-1">Today</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">0</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">cards due</p>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-800 rounded-lg text-center">
              <p className="text-sm text-orange-700 dark:text-orange-300 font-medium mb-1">This Week</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">0</p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">cards due</p>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg text-center">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">0</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">cards due</p>
            </div>
          </div>
          
          <div className="mt-4 flex justify-center">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Start Review Session
            </button>
          </div>
        </div>
      </div>
      
      {/* Learning Stats */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Learning Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Daily Streak</p>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Quizzes Completed</p>
            <p className="text-2xl font-bold text-blue-600">{quizzes.length}</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Accuracy Rate</p>
            <p className="text-2xl font-bold text-blue-600">0%</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Knowledge Cards</p>
            <p className="text-2xl font-bold text-blue-600">{knowledgeCards.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 