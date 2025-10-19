import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomPage } from './routes/CustomPage';
import { ResultPage } from './routes/ResultPage';
import { TopPage } from './routes/TopPage';
import { TrainingPage } from './routes/TrainingPage';

const App = () => (
  <Routes>
    <Route path="/" element={<TopPage />} />
    <Route path="/custom" element={<CustomPage />} />
    <Route path="/training" element={<TrainingPage />} />
    <Route path="/result" element={<ResultPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
