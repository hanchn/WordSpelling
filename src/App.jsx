import React, { useState, useEffect, useRef } from 'react';
import { Volume2, RefreshCw, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

function App() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, checking, correct, wrong
  const [userInputs, setUserInputs] = useState([]);
  const [revealedIndices, setRevealedIndices] = useState([]);
  const inputRefs = useRef([]);

  const [difficulty, setDifficulty] = useState('simple'); // simple, general, medium, hard

  useEffect(() => {
    fetchWords();
  }, []);

  useEffect(() => {
    if (words.length > 0) {
      initWord(currentIndex);
    }
  }, [currentIndex, words, difficulty]); // Re-init if difficulty changes

  const fetchWords = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/words');
      const data = await res.json();
      const shuffled = data.sort(() => Math.random() - 0.5);
      setWords(shuffled);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch words', error);
      setLoading(false);
    }
  };

  const initWord = (index) => {
    const wordObj = words[index];
    if (!wordObj) return;
    
    const word = wordObj.word;
    const length = word.length;
    
    let numHide = 0;
    switch (difficulty) {
      case 'simple':
        numHide = 1;
        break;
      case 'general':
        numHide = Math.max(2, Math.floor(length * 0.3));
        break;
      case 'medium':
        numHide = Math.max(3, Math.floor(length * 0.5));
        break;
      case 'hard':
        numHide = Math.max(length - 1, Math.floor(length * 0.8));
        break;
      default:
        numHide = 1;
    }
    
    // Ensure we don't hide more than length
    numHide = Math.min(numHide, length);

    const indicesToHide = new Set();
    while (indicesToHide.size < numHide) {
      indicesToHide.add(Math.floor(Math.random() * length));
    }
    
    // Revealed are those NOT in indicesToHide
    const revealed = [];
    for (let i = 0; i < length; i++) {
      if (!indicesToHide.has(i)) {
        revealed.push(i);
      }
    }
    setRevealedIndices(revealed);

    // Initialize inputs
    const inputs = new Array(length).fill('');
    revealed.forEach(idx => {
      inputs[idx] = word[idx];
    });
    setUserInputs(inputs);
    setGameState('playing');
    
    // Focus first empty input
    setTimeout(() => {
      const firstEmpty = inputs.findIndex(c => c === '');
      if (firstEmpty !== -1 && inputRefs.current[firstEmpty]) {
        inputRefs.current[firstEmpty].focus();
      }
    }, 100);

    // Auto play sound
    speakWord(word);
  };

  const speakWord = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleInput = (index, value) => {
    if (gameState !== 'playing' && gameState !== 'wrong') return; // Allow editing if playing or wrong (retry)
    
    // Only allow single letter
    const char = value.slice(-1);
    
    const newInputs = [...userInputs];
    newInputs[index] = char;
    setUserInputs(newInputs);

    // Reset to playing if they edit after wrong
    if (gameState === 'wrong') {
      setGameState('playing');
    }

    // Move to next empty input if char is entered
    if (char) {
      const nextEmpty = newInputs.findIndex((val, idx) => idx > index && val === '');
      if (nextEmpty !== -1 && inputRefs.current[nextEmpty]) {
        inputRefs.current[nextEmpty].focus();
      } else {
        // Check if all filled
        if (newInputs.every(c => c !== '')) {
          startCheck(newInputs);
        }
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !userInputs[index]) {
      // Move to previous editable input
      let prev = index - 1;
      while (prev >= 0 && revealedIndices.includes(prev)) {
        prev--;
      }
      if (prev >= 0 && inputRefs.current[prev]) {
        inputRefs.current[prev].focus();
      }
    }
  };

  const startCheck = (inputs) => {
    setGameState('checking');
    // Wait 3 seconds before showing result
    setTimeout(() => {
      checkAnswer(inputs);
    }, 3000);
  };

  const checkAnswer = (inputs) => {
    const currentWord = words[currentIndex].word;
    const userWord = inputs.join('');
    
    // Strict case comparison
    if (userWord === currentWord) {
      setGameState('correct');
      const audio = new Audio('/correct.mp3'); // Optional
      // speakWord('Correct');
    } else {
      setGameState('wrong');
      speakWord('Wrong, try again');
    }
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Loop back or finish?
      setCurrentIndex(0); // Loop for now
      // Maybe reshuffle?
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setWords(shuffled);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>;
  if (words.length === 0) return <div className="min-h-screen flex items-center justify-center bg-gray-100">No words found in words folder.</div>;

  const currentWordObj = words[currentIndex];
  const isCorrect = gameState === 'correct';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden">
        {/* Progress */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex justify-between items-center mb-8">
          <span className="text-gray-400 text-sm">Word {currentIndex + 1} of {words.length}</span>
          
          <div className="flex items-center gap-2">
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
              <option value="simple">Simple (Hide 1)</option>
              <option value="general">General (Hide ~30%)</option>
              <option value="medium">Medium (Hide ~50%)</option>
              <option value="hard">Hard (Hide ~80%)</option>
            </select>

            <button 
              onClick={() => initWord(currentIndex)} 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Reset Word"
            >
              <RefreshCw size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Definition Area */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-4">
            Definition
          </div>
          <h2 className="text-2xl md:text-3xl text-gray-800 font-medium leading-relaxed">
            {currentWordObj.definition || "No definition provided"}
          </h2>
        </div>

        {/* Word Spelling Area */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {currentWordObj.word.split('').map((char, idx) => {
            const isRevealed = revealedIndices.includes(idx);
            const isUserCorrect = isCorrect; // If whole word is correct
            
            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <input
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  maxLength={1}
                  value={userInputs[idx] || ''}
                  disabled={isRevealed || isCorrect || gameState === 'checking'}
                  onChange={(e) => handleInput(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`w-12 h-16 md:w-14 md:h-20 text-3xl md:text-4xl text-center border-b-4 outline-none transition-all rounded-t-lg
                    ${isRevealed 
                      ? 'border-gray-300 bg-gray-50 text-gray-500' 
                      : isCorrect
                        ? 'border-green-500 bg-green-50 text-green-600'
                        : gameState === 'wrong'
                          ? 'border-red-500 bg-red-50 text-red-600'
                          : userInputs[idx] 
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-300 bg-white focus:border-blue-500 focus:bg-blue-50'
                    }
                    font-bold shadow-sm
                  `}
                />
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-6">
          <button 
            onClick={() => speakWord(currentWordObj.word)}
            className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-transform active:scale-95 shadow-sm"
          >
            <Volume2 size={28} />
          </button>

          {isCorrect && (
            <button 
              onClick={nextWord}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-lg shadow-lg shadow-green-200 transition-all flex items-center gap-2 animate-bounce-short"
            >
              Next Word <ArrowRight size={20} />
            </button>
          )}
        </div>

        {/* Feedback Message */}
        {gameState === 'checking' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg animate-pulse font-medium text-lg">
              Checking...
            </div>
          </div>
        )}
        
        {gameState === 'wrong' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
             <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-medium text-lg flex items-center gap-2">
               <XCircle size={24} />
               Wrong! Try again.
             </div>
          </div>
        )}

        {isCorrect && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
             {/* Confetti or just a nice overlay could go here, keeping it simple for now */}
             <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg font-medium text-lg flex items-center gap-2 animate-bounce-short">
               <CheckCircle2 size={24} />
               Correct!
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
