// src/voice.js
// Wrapper for Web Speech API – voice input (SpeechRecognition) and output (SpeechSynthesis)
// The module exports an initVoice function that receives callbacks.

export function initVoice({ onResult, onSpeak }) {
  // Speech Recognition (input)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript.trim();
      onResult && onResult(transcript);
    };
    recognition.onerror = event => {
      console.warn('SpeechRecognition error:', event.error);
      alert('Erro ao reconhecer voz: ' + event.error);
    };
    // Expose globally for UI to start/stop
    window.speechRecognition = recognition;
  } else {
    console.info('SpeechRecognition not supported in this browser');
    window.speechRecognition = null;
  }

  // Speech Synthesis (output) – simple helper
  window.speakText = function (text) {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not supported');
      alert('Synth de voz não suportada neste navegador.');
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.onstart = () => onSpeak && onSpeak();
    speechSynthesis.speak(utter);
  };
}
