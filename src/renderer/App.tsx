import { HashRouter, Routes, Route } from 'react-router-dom';
import ReadingPage from './modules/reading/ReadingPage';
import ListeningPage from './modules/listening/ListeningPage';
import WritingEditor from './modules/writing/WritingEditor';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<div className="p-8">IELTS Pro — Bootstrap OK</div>} />
        <Route path="/reading/:testId" element={<ReadingPage />} />
        <Route path="/listening/:testId" element={<ListeningPage />} />
        <Route path="/writing/:testId" element={<WritingEditor />} />
      </Routes>
    </HashRouter>
  );
}
