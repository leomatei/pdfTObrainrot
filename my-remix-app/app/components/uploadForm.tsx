import { useState, useEffect } from 'react';
import { Form } from '@remix-run/react';

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [extractingTextSucces, setExtractingTextSucces] =
    useState<boolean>(false);
  const [text, setText] = useState<string>('');

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);

  useEffect(() => {
    const fetchVoices = () => {
      const availableVoices = speechSynthesis.getVoices();

      // only microsoft voices work on windows
      const microsoftVoices = availableVoices.filter((voice) =>
        voice.name.includes('Microsoft')
      );
      setVoices(microsoftVoices);

      if (microsoftVoices.length > 0) {
        setSelectedVoice(microsoftVoices[0]);
      }
    };

    fetchVoices();

    speechSynthesis.onvoiceschanged = fetchVoices;
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setMessage('No PDF selected');
      return;
    }

    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error during file upload');
      }

      const data = await response.json();
      setExtractingTextSucces(true);
      setText(data.text);
      setMessage(data.message || 'File processed successfully!');
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage('Error during file upload: ' + error.message);
      } else {
        setMessage('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    if (!selectedVoice) return;

    if (speechSynthesis.speaking || speechSynthesis.paused) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    speechSynthesis.speak(utterance);
  };

  const pauseSpeech = () => {
    speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeech = () => {
    speechSynthesis.resume();
    setIsPaused(false);
  };

  const stopSpeech = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return (
    <div>
      <h2>Upload PDF for Text Extraction</h2>
      <Form onSubmit={handleSubmit} encType='multipart/form-data'>
        <div>
          <label htmlFor='pdfFile'>Choose a PDF file to upload:</label>
          <input
            type='file'
            id='pdfFile'
            name='file'
            accept='.pdf'
            onChange={handleFileChange}
          />
        </div>
        <div>
          <button type='submit' disabled={loading}>
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </Form>

      {extractingTextSucces && (
        <div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            style={{
              width: '100%',
              resize: 'both',
              minWidth: '200px',
              height: '150px',
            }}
          />
          <div>
            <div>
              <label htmlFor='voice'>Select Microsoft Voice:</label>
              <select
                id='voice'
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = voices.find((v) => v.name === e.target.value);
                  if (voice) setSelectedVoice(voice);
                }}
              >
                {voices.length === 0 ? (
                  <option value=''>No Microsoft voices available</option>
                ) : (
                  voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name}
                    </option>
                  ))
                )}
              </select>
              {voices.length === 0 && (
                <p>
                  No Microsoft voices available. This might be due to
                  browser/platform limitations.
                </p>
              )}
            </div>

            <div>
              <label htmlFor='rate'>Rate:</label>
              <input
                id='rate'
                type='range'
                min='0.1'
                max='2'
                step='0.1'
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
              <span>{rate}</span>
            </div>

            <div>
              <label htmlFor='pitch'>Pitch:</label>
              <input
                id='pitch'
                type='range'
                min='0'
                max='2'
                step='0.1'
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
              />
              <span>{pitch}</span>
            </div>

            <button onClick={() => speak(text)} disabled={isSpeaking}>
              {isSpeaking ? 'Speaking...' : 'Read Text'}
            </button>
            <button onClick={pauseSpeech} disabled={!isSpeaking || isPaused}>
              Pause
            </button>
            <button onClick={resumeSpeech} disabled={!isPaused}>
              Resume
            </button>
            <button onClick={stopSpeech} disabled={!isSpeaking}>
              Stop
            </button>
          </div>
        </div>
      )}

      {message && (
        <div style={{ marginTop: '20px', color: loading ? 'blue' : 'green' }}>
          {message}
        </div>
      )}
    </div>
  );
}
