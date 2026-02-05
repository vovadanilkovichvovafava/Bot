import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Favourites() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('teams');

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="bg-white px-5 pt-4 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold">Favourites</h1>
        </div>
        <div className="flex border-b border-gray-100">
          {['teams', 'leagues'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium relative capitalize ${
                tab === t ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {t}
              {tab === t && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary-600 rounded-full"/>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            No favourite {tab}
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Add {tab} for quick access
          </p>
          <button className="btn-outline max-w-[200px] flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            Add {tab === 'teams' ? 'team' : 'league'}
          </button>
        </div>
      </div>
    </div>
  );
}
