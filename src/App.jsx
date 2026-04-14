import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, RefreshCw, CheckCircle2, XCircle, Volume1, Flag } from 'lucide-react';

const WORD_LIST = [
  'Aluminium',
  'Merry',
  'Marry',
  'Mary',
  'Colour',
  'Lieutenant',
  'Clerk',
  'Basil',
  'Pyjamas',
  'Manoeuvre'
];

const SUMMARIES = [
  { max: 1, text: "Absolute rubbish! Yank detected. 🦅 Please surrender your tea and crumpets immediately and return to spelling things without the letter 'U'." },
  { max: 4, text: "Bit of a sticky wicket, isn't it? 🏏 Your spelling is looking rather American today. Best pop the kettle on and try again." },
  { max: 7, text: "Not bad, mate. 🚊 You're hovering somewhere between knowing your way around the Tube and ordering a cheeky Nando's." },
  { max: 9, text: "Splendid job! 🎩 You certainly know your way around a Sunday Roast. Just a minor hiccup along the way." },
  { max: 10, text: "You are the Queen's Corgi! 👑 Utterly infallible. Go make yourself a celebratory cuppa, you've earned it." }
];

export default function App() {
  const [gameState, setGameState] = useState('start'); // start, playing, feedback, end
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  const inputRef = useRef(null);

  // Initialize Audio Context on first interaction to comply with browser autoplay policies
  const initAudio = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(ctx);
    } else if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  };

  // Ensure voices are loaded
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
      setVoicesLoaded(true);
    };
    
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Auto-focus input when playing
  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState]);

  const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const startGame = () => {
    initAudio();
    const shuffledWords = shuffleArray(WORD_LIST);
    setWords(shuffledWords);
    setCurrentIndex(0);
    setScore(0);
    setGameState('playing');
    setTimeout(() => playTTS(shuffledWords[0]), 100);
  };

  const playTTS = (word) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-GB';
    utterance.rate = 0.85; // Speak slightly slower for spelling clarity
    
    const voices = window.speechSynthesis.getVoices();
    const gbVoices = voices.filter(v => v.lang === 'en-GB' || v.lang === 'en_GB');
    
    // Prefer higher quality voices if available
    const preferredVoice = gbVoices.find(v => v.name.includes('Google') || v.name.includes('Daniel')) || gbVoices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const playSoundEffect = (type) => {
    if (!audioContext) return;
    const now = audioContext.currentTime;

    if (type === 'correct') {
      // Ding-Ding sound
      const playTone = (freq, startTime) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      };
      playTone(880, now); // A5
      playTone(1108.73, now + 0.15); // C#6
    } else {
      // Sad Trombone sound - Enhanced for realism with wah-wah and vibrato
      const notes = [311.13, 293.66, 277.18, 261.63]; // Eb4, D4, Db4, C4
      notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.type = 'sawtooth';
        
        const startTime = now + i * 0.45; // Slightly slower pacing
        const duration = i === notes.length - 1 ? 1.5 : 0.4; // Longer final note
        
        // Wah-wah mute effect using a lowpass filter envelope
        filter.type = 'lowpass';
        filter.Q.value = 5; // Adds a bit of resonance to the brass sound
        filter.frequency.setValueAtTime(200, startTime);
        filter.frequency.exponentialRampToValueAtTime(1200, startTime + 0.1);
        filter.frequency.exponentialRampToValueAtTime(200, startTime + duration);

        osc.frequency.setValueAtTime(freq, startTime);

        if (i === notes.length - 1) {
          // Pitch slide down heavily on the final note
          osc.frequency.exponentialRampToValueAtTime(freq * 0.6, startTime + duration);
          
          // Add vibrato to the final note using an LFO
          const lfo = audioContext.createOscillator();
          const lfoGain = audioContext.createGain();
          lfo.type = 'sine';
          lfo.frequency.value = 5; // 5 Hz vibrato rate (speed)
          lfoGain.gain.value = 15; // Vibrato depth (how much the pitch bends)
          
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(startTime);
          lfo.stop(startTime + duration);
        } else {
          // Slight pitch bend for intermediate notes
          osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startTime + duration);
        }
        
        // Volume envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const currentWord = words[currentIndex];
    const correct = userInput.trim().toLowerCase() === currentWord.toLowerCase();
    
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
    
    playSoundEffect(correct ? 'correct' : 'wrong');
    setGameState('feedback');
  };

  const handleNextWord = () => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex(c => c + 1);
      setUserInput('');
      setGameState('playing');
      setTimeout(() => playTTS(words[currentIndex + 1]), 100);
    } else {
      setGameState('end');
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter' && gameState === 'feedback') {
        e.preventDefault();
        handleNextWord();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, currentIndex, words]);

  const getSummary = () => {
    return SUMMARIES.find(s => score <= s.max)?.text || "You broke the system. Jolly good show!";
  };

  return (
    <div className="min-h-screen bg-[#012169] text-slate-800 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor (Proper Union Jack) */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
          <clipPath id="t">
            <path d="M30,15 h30 v15 z v-15 h-30 z h-30 v-15 z v15 h30 z"/>
          </clipPath>
          <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
          <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
        </svg>
      </div>

      <div className="max-w-md w-full bg-slate-50 rounded-2xl shadow-2xl border-t-8 border-red-600 overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="bg-white p-6 border-b border-slate-200 flex flex-col items-center">
          <div className="text-4xl mb-2">💂☕🇬🇧</div>
          <h1 className="text-2xl font-bold text-blue-900 text-center tracking-tight">The Ultimate British Spelling Test</h1>
        </div>

        {/* Start Screen */}
        {gameState === 'start' && (
          <div className="p-8 text-center space-y-10">
            <p className="text-lg text-slate-600">
              Think you know your British English? Listen to the King's English and spell the word you hear. 
            </p>
            <button 
              onClick={startGame}
              className="margin-hack w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              <Play size={20} /> Let's Begin, Shall We?
            </button>
          </div>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && (
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center text-sm font-semibold text-slate-500 uppercase tracking-wider">
              <span>Word {currentIndex + 1} of {words.length}</span>
              <span>Score: {score}</span>
            </div>

            <div className="bg-blue-50 rounded-xl p-8 flex flex-col items-center justify-center gap-4 border border-blue-100">
              <button 
                onClick={() => {
                  playTTS(words[currentIndex]);
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
                className="w-20 h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-90"
                title="Replay Audio"
              >
                <Volume2 size={32} />
              </button>
              <span className="text-blue-900 font-medium text-sm">Click to listen</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input 
                  ref={inputRef}
                  type="text" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type the spelling here..."
                  className="w-full px-4 py-4 text-center text-xl border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
              <button 
                type="submit"
                disabled={!userInput.trim()}
                className="w-full py-4 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                Submit Spelling
              </button>
            </form>
          </div>
        )}

        {/* Feedback Screen */}
        {gameState === 'feedback' && (
          <div className="p-8 text-center space-y-6">
            <div className={`p-6 rounded-2xl ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isCorrect ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle2 size={64} className="text-green-600" />
                  <h2 className="text-3xl font-bold">Spot On!</h2>
                  <p>Brilliant spelling.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <XCircle size={64} className="text-red-600" />
                  <h2 className="text-3xl font-bold">Oh Dear...</h2>
                  <p className="text-lg">The correct spelling is:</p>
                  <p className="text-2xl font-black tracking-widest uppercase bg-white px-4 py-2 rounded-lg shadow-sm">
                    {words[currentIndex]}
                  </p>
                </div>
              )}
            </div>

            <button 
              onClick={handleNextWord}
              className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              {currentIndex + 1 < words.length ? 'Next Word ➔' : 'See Final Result'}
            </button>
          </div>
        )}

        {/* End Screen */}
        {gameState === 'end' && (
          <div className="p-8 text-center space-y-8">
            <div>
              <h2 className="text-xl text-slate-500 font-semibold mb-2">Final Score</h2>
              <div className="text-6xl font-black text-blue-900 mb-4">
                {score}<span className="text-3xl text-slate-400">/{words.length}</span>
              </div>
            </div>

            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl">📜</div>
              <p className="text-lg font-medium text-slate-700 mt-2 leading-relaxed">
                {getSummary()}
              </p>
            </div>

            <button 
              onClick={() => setGameState('start')}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              <RefreshCw size={20} /> Next, please!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
