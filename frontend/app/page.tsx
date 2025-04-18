"use client";

import { useState, useEffect, useRef } from "react";

type KeyboardColors = { [key: string]: string };

export default function WordleGame() {
  const [words, setWords] = useState<string[]>([""]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [response, setResponse] = useState<string>("");
  const [attempts, setAttempts] = useState<number>(6);
  const [results, setResults] = useState<string[][]>([]);
  const [keyboardColors, setKeyboardColors] = useState<KeyboardColors>({});
  const [showMessage, setShowMessage] = useState<boolean>(false);
  const [isFinalMessage, setIsFinalMessage] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // ----------------------
  // COOKIE HELPERS
  // ----------------------

  function setCookie(name: string, value: string) {
    const now = new Date();
    const expires = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, 
      0, 0, 0, 0         
    ).toUTCString();
  
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  } 

  function getCookie(name: string): string | null {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1] || null;
  }

  function deleteCookie(name: string) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  // ----------------------
  // GAME INIT
  // ----------------------
  const startGame = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/start`, { method: "POST" });
      const data = await res.json();
      setAttempts(data.attempts);
      setResponse(data.message);
      setWords([""]);
      setGuesses([]);
      setResults([]);
      setKeyboardColors({});
      deleteCookie("wordleState"); 
    } catch (error) {
      console.error("Oyun başlatma hatası:", error);
    }
  };

  // ----------------------
  // LOAD FROM COOKIE
  // ----------------------
  useEffect(() => {
    const savedState = getCookie("wordleState");
    if (savedState) {
      try {
        const parsed = JSON.parse(decodeURIComponent(savedState));
        setWords(parsed.words || [""]);
        setGuesses(parsed.guesses || []);
        setResults(parsed.results || []);
        setKeyboardColors(parsed.keyboardColors || {});
        setAttempts(parsed.attempts ?? 6);
        setResponse(parsed.response || "");
        setIsFinalMessage(parsed.isFinalMessage ?? false); 
        if (parsed.isFinalMessage) setShowMessage(true);
      } catch (e) {
        console.error("Çerez okunamadı:", e);
        startGame(); 
      }
    } else {
      startGame();
    }
  }, []);

  // ----------------------
  // SAVE TO COOKIE
  // ----------------------
  useEffect(() => {
    const stateToSave = {
      words,
      guesses,
      results,
      keyboardColors,
      attempts,
      response,
      isFinalMessage,
    };
    setCookie("wordleState", JSON.stringify(stateToSave));
  }, [words, guesses, results, keyboardColors, attempts, response, isFinalMessage]);

  // ----------------------
  // KEYBOARD EVENTS
  // ----------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") e.preventDefault();
      processInput(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [words, attempts, keyboardColors]);

  // ----------------------
  // GAME LOGIC
  // ----------------------
  const processInput = async (char: string) => {
    if (attempts <= 0) return;
    char = char.toLocaleLowerCase("tr");

    let lastWord = words[words.length - 1] || "";

    if (words.length > 6) return;

    if (/^[a-zA-ZğüşöçıİĞÜŞÖÇ]$/.test(char) && lastWord.length < 5) {
      char = char.toLocaleUpperCase("tr");
      setWords((prev) => {
        const newWords = [...prev];
        newWords[newWords.length - 1] += char;
        return newWords;
      });
    }

    if (char === "del" || char === "backspace") {
      setWords((prev) => {
        const newWords = [...prev];
        newWords[newWords.length - 1] = lastWord.slice(0, -1);
        return newWords;
      });
    }

    if (char === "enter") {
      if (lastWord.length !== 5 || isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/guess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guess: lastWord.toUpperCase() }),
        });

        const data = await res.json();

        if (data.message) {
          setResponse(data.message);

          const isFinal =
            data.message.includes("Tebrikler!") ||
            data.message.includes("Kaybettiniz!");

          if (isFinal) {
            setIsFinalMessage(true);
            setShowMessage(true);
          } else {
            setIsFinalMessage(false);
            setShowMessage(true);
            setTimeout(() => setShowMessage(false), 2000);
          }
        }

        if (data.result) {
          setResults((prev) => [...prev, data.result]);

          const newColors = { ...keyboardColors };
          lastWord.split("").forEach((letter, idx) => {
            const resultColor = getColorByCode(data.result[idx]);
            const key = letter.toLocaleLowerCase("tr");
            const current = newColors[key];
            if (
              !current ||
              (current === "#c9b458" && resultColor === "#6aaa64") ||
              (current === "#787c7e" && resultColor !== "#787c7e")
            ) {
              newColors[key] = resultColor;
            }
          });
          setKeyboardColors(newColors);
        }

        if (data.message === "Böyle bir kelime yok.") {
          setWords((prev) => {
            const newWords = [...prev];
            newWords[newWords.length - 1] = "";
            return newWords;
          });
          return;
        }

        if (data.attempts !== undefined) {
          setAttempts(data.attempts);
          setGuesses((prev) => [...prev, lastWord]);

          if (data.attempts > 0 || data.message.includes("Tebrikler")) {
            setWords((prev) => [...prev, ""]);
          }
        }
      } catch (error) {
        console.error("API Hatası:", error);
        setResponse("Sunucu hatası!");
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  // ----------------------
  // UI HELPERS
  // ----------------------
  const getColorByCode = (code: string): string => {
    switch (code) {
      case "g":
        return "#6aaa64";
      case "y":
        return "#c9b458";
      case "r":
        return "#787c7e";
      default:
        return "#fff";
    }
  };

  const getTextColor = (bgColor: string): string => {
    return bgColor === "#fff" ? "#000" : "#fff";
  };

  const getBorderColor = (bgColor: string): string => {
    return bgColor === "#fff" ? "#d3d6da" : bgColor;
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const key = e.currentTarget.getAttribute("data-key") || "";
    processInput(key);
  };

  // ----------------------
  // UI RENDER
  // ----------------------
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <header>
        <div className="wordle-title">WORDLE TR</div>
      </header>

      {(showMessage || isFinalMessage) && (
        <div className="message">{response}</div>
      )}

      <div className="board">
        {[...Array(6)].map((_, rowIndex) =>
          [...Array(5)].map((_, colIndex) => {
            const char = words[rowIndex]?.[colIndex] || "";
            const bgColor = getColorByCode(results[rowIndex]?.[colIndex]);
            const textColor = getTextColor(bgColor);
            const borderColor = getBorderColor(bgColor);
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="square"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  border: `2px solid ${borderColor}`,
                }}
              >
                {char}
              </div>
            );
          })
        )}
      </div>

      <div id="keyboard-container">
        {[
          ["e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
          ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i"],
          ["enter", "z", "c", "v", "b", "n", "m", "ö", "ç", "del"],
        ].map((row, rowIndex) => (
          <div
            className={`keyboard-row ${rowIndex === 1 ? "middle-row" : ""}`}
            key={`row-${rowIndex}`}
          >
            {row.map((key) => {
              const bg = keyboardColors[key] || "#d3d6da";
              const color =
                bg === "#6aaa64" || bg === "#c9b458" || bg === "#787c7e"
                  ? "#fff"
                  : "#000";
              return (
                <button
                  key={key}
                  data-key={key}
                  className={key === "enter" || key === "del" ? "wide-button" : ""}
                  onClick={handleButtonClick}
                  style={{ backgroundColor: bg, color }}
                >
                  {key.toLocaleUpperCase("tr")}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
