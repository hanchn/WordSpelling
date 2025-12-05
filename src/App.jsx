import React, { useState, useEffect, useRef } from 'react';
import { Volume2, RefreshCw, ArrowRight, CheckCircle2, XCircle, Eye } from 'lucide-react';

function App() {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState('start'); // start, playing, checking, correct, wrong, finished
  const [userInputs, setUserInputs] = useState([]);
  const [revealedIndices, setRevealedIndices] = useState([]);
  const [skippedWords, setSkippedWords] = useState([]);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const [structure, setStructure] = useState({});
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [difficulty, setDifficulty] = useState('simple'); // simple, general, medium, hard

  const inputRefs = useRef([]);

  useEffect(() => {
    fetchStructure();
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && words.length > 0) {
      initWord(currentIndex);
    }
  }, [currentIndex, gameState]); 

  const fetchStructure = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/structure');
      const data = await res.json();
      setStructure(data);
      // Optionally select first book
      const books = Object.keys(data);
      if (books.length > 0) {
        // setSelectedBook(books[0]);
      }
    } catch (error) {
      console.error('Failed to fetch structure', error);
    }
  };

  const startGame = async () => {
    setLoading(true);
    try {
      let url = 'http://localhost:3002/api/words';
      const params = new URLSearchParams();
      
      if (selectedBook) {
        params.append('book', selectedBook);
        if (selectedFile) {
          params.append('file', selectedFile);
        }
      }
      
      const res = await fetch(`${url}?${params.toString()}`);
      const data = await res.json();
      
      if (data.length === 0) {
        alert('No words found!');
        setLoading(false);
        return;
      }

      const shuffled = data.sort(() => Math.random() - 0.5);
      setWords(shuffled);
      setSkippedWords([]);
      setCurrentIndex(0);
      setIsGameFinished(false);
      setGameState('playing');
    } catch (error) {
      console.error('Failed to fetch words', error);
      alert('Failed to start game');
    } finally {
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
    setShowHint(false);
    
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
    if (gameState !== 'playing' && gameState !== 'wrong') return;
    
    const char = value.slice(-1);
    const newInputs = [...userInputs];
    newInputs[index] = char;
    setUserInputs(newInputs);

    if (gameState === 'wrong') {
      setGameState('playing');
    }

    if (char) {
      const nextEmpty = newInputs.findIndex((val, idx) => idx > index && val === '');
      if (nextEmpty !== -1 && inputRefs.current[nextEmpty]) {
        inputRefs.current[nextEmpty].focus();
      } else {
        if (newInputs.every(c => c !== '')) {
          startCheck(newInputs);
        }
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !userInputs[index]) {
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
    // Reduced delay to 0.5s
    setTimeout(() => {
      checkAnswer(inputs);
    }, 500);
  };

  const checkAnswer = (inputs) => {
    const currentWord = words[currentIndex].word;
    const userWord = inputs.join('');
    
    if (userWord === currentWord) {
      setGameState('correct');
      const audio = new Audio('/correct.mp3'); // Optional
    } else {
      setGameState('wrong');
      speakWord('Wrong, try again');
    }
  };

  const handlePass = () => {
    const currentWordObj = words[currentIndex];
    if (!skippedWords.find(w => w.word === currentWordObj.word)) {
      setSkippedWords(prev => [...prev, currentWordObj]);
    }
    nextWord();
  };

  const handlePeek = () => {
    setShowHint(true);
    setTimeout(() => {
      setShowHint(false);
    }, 1000);
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setGameState('playing');
    } else {
      setIsGameFinished(true);
      setGameState('finished');
    }
  };

  const restartGame = (onlySkipped = false) => {
    if (onlySkipped && skippedWords.length > 0) {
      setWords([...skippedWords]);
      setSkippedWords([]);
      setCurrentIndex(0);
      setIsGameFinished(false);
      setGameState('playing');
    } else {
      setGameState('start');
      setWords([]);
      setSkippedWords([]);
      setIsGameFinished(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>;

  // Start Screen
  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Volume2 size={40} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Spelling Bee</h1>
          <p className="text-gray-500 mb-8">Master your vocabulary with audio support</p>

          <div className="space-y-4 mb-8 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Word Book</label>
              <select 
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">All Words (Default)</option>
                {books.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="simple">Simple (Hide 1 letter)</option>
                <option value="general">General (Hide ~30%)</option>
                <option value="medium">Medium (Hide ~50%)</option>
                <option value="hard">Hard (Hide ~80%)</option>
              </select>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            Start Challenge
          </button>
        </div>
      </div>
    );
  }

  // Finished Screen
  if (isGameFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-8 font-sans">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Session Complete!</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-blue-50 p-6 rounded-xl text-center">
               <div className="text-4xl font-bold text-blue-600 mb-2">{words.length}</div>
               <div className="text-gray-600">Total Words</div>
             </div>
             <div className="bg-green-50 p-6 rounded-xl text-center">
               <div className="text-4xl font-bold text-green-600 mb-2">{words.length - skippedWords.length}</div>
               <div className="text-gray-600">Correct</div>
             </div>
             <div className="bg-red-50 p-6 rounded-xl text-center">
               <div className="text-4xl font-bold text-red-600 mb-2">{skippedWords.length}</div>
               <div className="text-gray-600">Passed / Wrong</div>
             </div>
          </div>

          {skippedWords.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Review Mistakes (Passed Words)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {skippedWords.map((item, idx) => (
                  <div key={idx} className="border border-red-100 bg-red-50 rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-lg font-bold text-red-700">{item.word}</span>
                      <button onClick={() => speakWord(item.word)} className="text-red-400 hover:text-red-600">
                        <Volume2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{item.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button 
              onClick={() => restartGame(false)}
              className="px-6 py-3 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} /> Back to Menu
            </button>
            {skippedWords.length > 0 && (
              <button 
                onClick={() => restartGame(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={18} /> Review Mistakes
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (words.length === 0) return <div className="min-h-screen flex items-center justify-center bg-gray-100">No words found.</div>;

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
          
          <button 
            onClick={() => setGameState('start')} 
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Quit
          </button>
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
            
            // Determine display char
            let displayChar = userInputs[idx] || '';
            let isHint = false;
            
            if (showHint && !displayChar && !isRevealed) {
              displayChar = char;
              isHint = true;
            }

            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <input
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  maxLength={1}
                  value={displayChar}
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
                          : isHint
                            ? 'border-yellow-400 bg-yellow-50 text-yellow-600'
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
            title="Listen"
          >
            <Volume2 size={28} />
          </button>

          <button 
            onClick={handlePeek}
            className="w-14 h-14 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center hover:bg-yellow-200 transition-transform active:scale-95 shadow-sm"
            title="Peek Answer (1s)"
          >
            <Eye size={28} />
          </button>

          <button 
            onClick={handlePass}
            className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-transform active:scale-95 shadow-sm"
            title="Pass / Skip"
          >
             PASS
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
