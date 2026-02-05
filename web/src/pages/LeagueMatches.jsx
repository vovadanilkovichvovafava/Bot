import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import MatchCard from '../components/MatchCard';

const LEAGUE_NAMES = {
  PL: 'Premier League', PD: 'La Liga', BL1: 'Bundesliga',
  SA: 'Serie A', FL1: 'Ligue 1', CL: 'Champions League', EL: 'Europa League',
};

export default function LeagueMatches() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [code]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await api.getUpcomingMatches(14, code);
      setMatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Group matches by date
  const groupedMatches = matches.reduce((acc, match) => {
    const dateKey = new Date(match.match_date).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(match);
    return acc;
  }, {});

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
     <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="bg-white px-5 pt-4 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">{LEAGUE_NAMES[code] || code}</h1>
        </div>
      </div>

      <div className="px-5 pt-4 pb-8 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="card"><div className="shimmer h-16 w-full"/></div>
            ))}
          </div>
        ) : Object.keys(groupedMatches).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No upcoming matches</p>
          </div>
        ) : (
          Object.entries(groupedMatches).map(([date, dayMatches]) => (
            <div key={date}>
              <h3 className="text-primary-600 font-semibold text-sm mb-2">{date}</h3>
              <div className="space-y-2">
                {dayMatches.map(match => (
                  <MatchCard key={match.id} match={match} showLeague={false} compact/>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
     </div>
    </div>
  );
}
