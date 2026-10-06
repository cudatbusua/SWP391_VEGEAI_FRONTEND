import { icons } from './icons';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 mb-6" dangerouslySetInnerHTML={{ __html: icons.leaf }} />
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">VEGEAI Vietnam</h1>
    </div>
  );
}

export default App;
