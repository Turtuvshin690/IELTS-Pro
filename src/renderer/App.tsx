import { HashRouter, Routes, Route } from 'react-router-dom';
import ReadingListPage from './modules/reading/ReadingListPage';
import ReadingPage from './modules/reading/ReadingPage';
import ListeningListPage from './modules/listening/ListeningListPage';
import ListeningPage from './modules/listening/ListeningPage';
import WritingListPage from './modules/writing/WritingListPage';
import WritingEditor from './modules/writing/WritingEditor';
import SpeakingListPage from './modules/speaking/SpeakingListPage';
import SpeakingPage from './modules/speaking/SpeakingPage';
import Dashboard from './shared/progress/Dashboard';
import Sidebar from './app/shell/Sidebar';
import SettingsPage from './app/shell/SettingsPage';
import ImportPage from './shared/import/ImportPage';
import ResourcesPage from './modules/resources/ResourcesPage';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/reading" element={<ReadingListPage />} />
            <Route path="/reading/:testId" element={<ReadingPage />} />
            <Route path="/listening" element={<ListeningListPage />} />
            <Route path="/listening/:testId" element={<ListeningPage />} />
            <Route path="/writing" element={<WritingListPage />} />
            <Route path="/writing/:testId" element={<WritingEditor />} />
            <Route path="/speaking" element={<SpeakingListPage />} />
            <Route path="/speaking/:testId" element={<SpeakingPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
