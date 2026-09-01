import { HashRouter, Routes, Route } from 'react-router-dom';
import ReadingPage from './modules/reading/ReadingPage';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<div className="p-8">IELTS Pro — Bootstrap OK</div>} />
        <Route path="/reading/:testId" element={<ReadingPage />} />
      </Routes>
    </HashRouter>
  );
}
