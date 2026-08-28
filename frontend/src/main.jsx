import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ModeProvider } from './context/ModeContext';
import Preloader from './components/UI/Preloader';
import App from './App.jsx';
import './index.css';

function Root() {
  const [ready, setReady] = useState(false);
  return (
    <>
      <Preloader onDone={() => setReady(true)} />
      {ready && <App />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ModeProvider>
        <Root />
      </ModeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
