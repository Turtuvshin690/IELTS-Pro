import { HashRouter, Routes, Route } from 'react-router-dom';
import ReadingPage from './modules/reading/ReadingPage';
import ListeningPage from './modules/listening/ListeningPage';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<div className="p-8">IELTS Pro — Bootstrap OK</div>} />
        <Route path="/reading/:testId" element={<ReadingPage />} />
        <Route path="/listening/:testId" element={<ListeningPage />} />
      </Routes>
    </HashRouter>
  );
}
