import React, { useState, useEffect } from 'react';
import { Volume2, RefreshCw, Type, MousePointer2, BookOpen, Loader2 } from 'lucide-react';

// 定義字母顏色規則
const LETTER_COLORS = {
  red: 'bg-red-500 text-white shadow-[0_4px_0_#b91c1c]', // Vowels
  blue: 'bg-blue-500 text-white shadow-[0_4px_0_#1d4ed8]', // Consonants (啞音)
  yellow: 'bg-yellow-400 text-slate-800 shadow-[0_4px_0_#ca8a04]', // Modifiers
};

// 鍵盤字母定義 (配合實體玩具，Y提供兩種顏色)
const KEYBOARD_LETTERS = [
  { char: 'a', type: 'red' }, { char: 'b', type: 'blue' }, { char: 'c', type: 'blue' },
  { char: 'd', type: 'blue' }, { char: 'e', type: 'red' }, { char: 'f', type: 'blue' },
  { char: 'g', type: 'blue' }, { char: 'h', type: 'blue' }, { char: 'i', type: 'red' },
  { char: 'j', type: 'blue' }, { char: 'k', type: 'blue' }, { char: 'l', type: 'yellow' },
  { char: 'm', type: 'blue' }, { char: 'n', type: 'blue' }, { char: 'o', type: 'red' },
  { char: 'p', type: 'blue' }, { char: 'q', type: 'blue' }, { char: 'r', type: 'yellow' },
  { char: 's', type: 'blue' }, { char: 't', type: 'blue' }, { char: 'u', type: 'red' },
  { char: 'v', type: 'blue' }, { char: 'w', type: 'yellow' }, { char: 'x', type: 'blue' },
  { char: 'y', type: 'blue' }, { char: 'y', type: 'red' }, { char: 'z', type: 'blue' }
];

// 單一字母的本地音標庫 (解決單一字母 API 查不到的問題，並提供最基礎的 Phonics 認知)
const SINGLE_LETTER_IPA = {
  a: '/æ/ 或 /eɪ/', b: '/b/', c: '/k/ 或 /s/', d: '/d/', e: '/ɛ/ 或 /i/',
  f: '/f/', g: '/ɡ/ 或 /dʒ/', h: '/h/', i: '/ɪ/ 或 /aɪ/', j: '/dʒ/',
  k: '/k/', l: '/l/', m: '/m/', n: '/n/', o: '/ɒ/ 或 /oʊ/',
  p: '/p/', q: '/kw/', r: '/r/', s: '/s/ 或 /z/', t: '/t/',
  u: '/ʌ/ 或 /ju/', v: '/v/', w: '/w/', x: '/ks/', y: '/j/ 或 /aɪ/ 或 /i/', z: '/z/'
};

export default function PhonicsApp() {
  const [mode, setMode] = useState('spell'); // 'spell' 自由拼, 'analyze' 系統解析
  const [spelledWord, setSpelledWord] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // IPA 狀態管理
  const [ipaText, setIpaText] = useState('');
  const [isIpaLoading, setIsIpaLoading] = useState(false);

  // 取得當前正在組合的單字
  const currentWord = mode === 'spell' 
    ? spelledWord.map(item => item.char).join('') 
    : inputText;

  // 使用 useEffect 查詢 IPA (改用更穩定的 Datamuse API)
  useEffect(() => {
    const fetchIPA = async (word) => {
      if (!word) {
        setIpaText('');
        return;
      }
      
      const lowerWord = word.toLowerCase();

      // 1. 如果只有單一個字母，直接使用本地字庫，瞬間顯示不延遲
      if (lowerWord.length === 1) {
        setIpaText(SINGLE_LETTER_IPA[lowerWord] || '');
        return;
      }

      // 2. 如果是大於一個字母的單字，呼叫 Datamuse API
      setIsIpaLoading(true);
      try {
        // Datamuse API: 穩定且沒有嚴格的次數限制。md=r 代表獲取發音資訊
        const res = await fetch(`https://api.datamuse.com/words?sp=${lowerWord}&md=r&max=1`);
        if (!res.ok) throw new Error('API request failed');
        
        const data = await res.json();
        
        // 確保回傳的第一個單字符合我們輸入的單字
        if (data && data.length > 0 && data.word.toLowerCase() === lowerWord) {
          // 在 tags 陣列中尋找 'ipa_pron:' 開頭的標籤
          const ipaTag = data.tags?.find(tag => tag.startsWith('ipa_pron:'));
          if (ipaTag) {
            const ipa = ipaTag.split(':'); // 取得冒號後面的音標
            setIpaText(`/${ipa}/`);
          } else {
            setIpaText(''); // 單字存在但沒有 IPA 資料
          }
        } else {
          setIpaText(''); // 字典裡找不到這個拼出來的字
        }
      } catch (err) {
        console.error("IPA Fetch Error:", err);
        setIpaText(''); 
      } finally {
        setIsIpaLoading(false);
      }
    };

    // 使用 600 毫秒的延遲，避免連續打字時狂發請求
    const timeoutId = setTimeout(() => {
      fetchIPA(currentWord);
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [currentWord]);

  // 發音功能 (使用瀏覽器內建 Text-to-Speech)
  const speakText = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // 英文發音
    utterance.rate = 0.8; // 稍微放慢速度適合學習
    window.speechSynthesis.speak(utterance);
  };

  // --- 模式 1: 自由拼字邏輯 ---
  const addLetterToBoard = (letterObj) => {
    setSpelledWord([...spelledWord, { ...letterObj, id: Date.now() + Math.random() }]);
  };

  const removeLetterFromBoard = (id) => {
    setSpelledWord(spelledWord.filter(item => item.id !== id));
  };

  const clearBoard = () => {
    setSpelledWord([]);
    setIpaText('');
  };

  // --- 模式 2: 自動解析邏輯 ---
  const analyzeWordColor = (char, index, word) => {
    const lowerChar = char.toLowerCase();
    if (['a', 'e', 'i', 'o', 'u'].includes(lowerChar)) return 'red';
    if (['r', 'l', 'w'].includes(lowerChar)) return 'yellow';
    
    // Y 的特殊規則：字首通常為子音(藍)，字中/字尾為母音(紅)
    if (lowerChar === 'y') {
      return index === 0 ? 'blue' : 'red';
    }
    
    // 預設其他為子音(啞音)
    if (/[a-z]/.test(lowerChar)) return 'blue';
    return 'gray'; // 標點符號等
  };

  // IPA 顯示區塊元件
  const IpaDisplay = () => (
    <div className="flex items-center justify-center min-h-[40px] mt-4">
      {isIpaLoading ? (
        <div className="flex items-center text-slate-400 gap-2 font-medium">
          <Loader2 className="animate-spin" size={18} />
          查詢音標中...
        </div>
      ) : ipaText ? (
        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-5 py-2 rounded-full font-mono text-xl font-bold shadow-sm">
          <BookOpen size={20} />
          {ipaText}
        </div>
      ) : currentWord.length >= 2 ? (
        <div className="text-slate-400 text-sm font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
          未能找到該單字的音標 (可能是拼寫錯誤)
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 font-sans">
      
      {/* 標題與模式切換 */}
      <div className="w-full max-w-3xl mb-6 bg-white rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-black text-slate-700 tracking-wider">
          🧩 趣味拼音磁鐵
        </h1>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setMode('spell')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${mode === 'spell' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <MousePointer2 size={18} />
            動手拼字
          </button>
          <button 
            onClick={() => setMode('analyze')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${mode === 'analyze' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Type size={18} />
            單字解析
          </button>
        </div>
      </div>

      {/* 主要內容區塊 */}
      <div className="w-full max-w-3xl">
        
        {/* === 模式 1: 動手拼字 === */}
        {mode === 'spell' && (
          <div className="flex flex-col gap-6">
            {/* 白板區域 (模擬彩色邊框) */}
            <div className="w-full bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 p-3 rounded-2xl shadow-lg">
              <div className="bg-white rounded-xl min-h-[200px] p-6 flex flex-col justify-between">
                
                {/* 磁鐵放置區 */}
                <div className="flex flex-col items-center">
                  <div className="flex flex-wrap gap-2 min-h-[80px] items-center justify-center">
                    {spelledWord.length === 0 ? (
                      <span className="text-slate-300 font-bold text-xl select-none">點擊下方字母開始拼字</span>
                    ) : (
                      spelledWord.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => removeLetterFromBoard(item.id)}
                          className={`text-5xl font-black rounded-lg w-16 h-20 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 ${LETTER_COLORS[item.type]}`}
                          style={{ fontFamily: "'Nunito', 'Comic Sans MS', sans-serif" }}
                        >
                          {item.char}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* IPA 顯示 */}
                  <IpaDisplay />
                </div>

                {/* 白板控制按鈕 */}
                <div className="flex justify-between items-end mt-4 border-t-2 border-slate-100 pt-4">
                  <button 
                    onClick={clearBoard}
                    className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold transition-colors"
                  >
                    <RefreshCw size={20} /> 清除白板
                  </button>
                  <button 
                    onClick={() => speakText(currentWord)}
                    disabled={spelledWord.length === 0}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-6 py-3 rounded-full font-bold shadow-md transition-transform active:scale-95 text-lg"
                  >
                    <Volume2 size={24} /> 讀出發音
                  </button>
                </div>
              </div>
            </div>

            {/* 字母鍵盤區 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <h3 className="font-bold text-slate-500">字母盒 (點擊選取)</h3>
                <div className="flex flex-wrap gap-4 text-sm font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-red-500 flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span> 母音</span>
                  <span className="text-blue-500 flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span> 啞音(子音)</span>
                  <span className="text-yellow-600 flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block"></span> 影響母音</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {KEYBOARD_LETTERS.map((item, idx) => (
                  <button
                    key={`${item.char}-${idx}`}
                    onClick={() => addLetterToBoard(item)}
                    className={`text-3xl font-black rounded-lg w-12 h-14 flex items-center justify-center transition-transform hover:-translate-y-1 active:translate-y-1 ${LETTER_COLORS[item.type]}`}
                    style={{ fontFamily: "'Nunito', 'Comic Sans MS', sans-serif" }}
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === 模式 2: 單字解析 === */}
        {mode === 'analyze' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col items-center gap-8">
            <div className="w-full max-w-md text-center">
              <h2 className="text-xl font-bold text-slate-700 mb-4">輸入單字，系統為你分析結構</h2>
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value.replace(/[^A-Za-z]/g, '').toLowerCase())}
                placeholder="輸入英文單字 (例如: yellow)"
                className="w-full text-center text-3xl font-bold p-4 border-4 border-slate-200 rounded-2xl focus:border-blue-400 focus:outline-none transition-colors"
                maxLength={15}
              />
            </div>

            {/* 解析結果與 IPA 顯示區 */}
            <div className="flex flex-col items-center border-4 border-dashed border-slate-200 w-full rounded-2xl p-6 min-h-[160px]">
              <div className="flex flex-wrap justify-center gap-2 items-center">
                {inputText.length === 0 ? (
                  <span className="text-slate-400 font-bold mt-4">字母將顯示於此...</span>
                ) : (
                  inputText.split('').map((char, idx) => {
                    const colorType = analyzeWordColor(char, idx, inputText);
                    return (
                      <div 
                        key={idx}
                        className={`text-6xl font-black rounded-xl w-20 h-24 flex items-center justify-center transform transition-all hover:scale-110 ${LETTER_COLORS[colorType] || 'bg-slate-300 text-slate-600'}`}
                        style={{ fontFamily: "'Nunito', 'Comic Sans MS', sans-serif" }}
                      >
                        {char}
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* 顯示音標 */}
              {(inputText.length > 0) && <IpaDisplay />}
            </div>

            {/* 發音按鈕 */}
            <button 
              onClick={() => speakText(inputText)}
              disabled={inputText.length === 0}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white px-8 py-4 rounded-full font-black shadow-lg transition-transform active:scale-95 text-xl"
            >
              <Volume2 size={28} /> 聽聽看怎麼唸
            </button>
          </div>
        )}

      </div>
    </div>
  );
}