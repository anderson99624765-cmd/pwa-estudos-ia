// Web Speech API: entrada por voz (SpeechRecognition) e saída (SpeechSynthesis).
// Nada é exposto em `window`; cada tela cria sua própria instância e chama stop() ao sair.
export function createVoice({ onResult, onError, onListeningChange } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supportsInput = Boolean(SR);
  const supportsOutput = 'speechSynthesis' in window;
  let recognition = null;
  let listening = false;

  if (SR) {
    recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { listening = true; onListeningChange?.(true); };
    recognition.onend = () => { listening = false; onListeningChange?.(false); };
    recognition.onresult = e => onResult?.(e.results[0][0].transcript.trim());
    recognition.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      onError?.(e.error === 'not-allowed'
        ? 'Permissão do microfone negada.'
        : `Erro ao reconhecer voz (${e.error}).`);
    };
  }

  return {
    supportsInput,
    supportsOutput,
    toggleListening() {
      if (!recognition) return onError?.('Reconhecimento de voz não suportado neste navegador.');
      if (listening) recognition.stop();
      else recognition.start();
    },
    speak(text) {
      if (!supportsOutput) return onError?.('Síntese de voz não suportada neste navegador.');
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'pt-BR';
      speechSynthesis.speak(utter);
    },
    stop() {
      try { recognition?.abort(); } catch (_) { /* ignore */ }
      if (supportsOutput) speechSynthesis.cancel();
    }
  };
}
