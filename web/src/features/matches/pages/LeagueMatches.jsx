import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import footballApi from '../api/footballApi';

// Map league codes to API-Football league IDs
const LEAGUE_MAP = {
  PL: { id: 39, name: 'Premier League' },
  PD: { id: 140, name: 'La Liga' },
  BL1: { id: 78, name: 'Bundesliga' },
  SA: { id: 135, name: 'Serie A' },
  FL1: { id: 61, name: 'Ligue 1' },
  CL: { id: 2, name: 'Champions League' },
  EL: { id: 3, name: 'Europa League' },
  ECL: { id: 848, name: 'Conference League' },
  ERE: { id: 88, name: 'Eredivisie' },
  PPL: { id: 94, name: 'Primeira Liga' },
  TUR: { id: 203, name: 'Süper Lig' },
  SAU: { id: 307, name: 'Saudi Pro League' },
  MLS: { id: 253, name: 'MLS' },
};

export default function LeagueMatches() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const leagueInfo = LEAGUE_MAP[code] || { id: null, name: code };

  useEffect(() => {
    loadMatches();
  }, [code]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      if (leagueInfo.id) {
        const data = await footballApi.getLeagueFixtures(leagueInfo.id, 30);
        setFixtures(data || []);
      } else {
        setFixtures([]);
      }
    } catch (e) {
      console.error(e);
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  // Group fixtures by date
  const groupedFixtures = fixtures.reduce((acc, fixture) => {
    const dateKey = new Date(fixture.fixture.date).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(fixture);
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
          <h1 className="text-lg font-bold text-gray-900">{leagueInfo.name}</h1>
        </div>
      </div>

      <div className="px-5 pt-4 pb-8 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl p-4">
                <div className="shimmer h-16 w-full rounded-lg"/>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedFixtures).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">{t('leagueMatches.noUpcomingMatches')}</p>
          </div>
        ) : (
          Object.entries(groupedFixtures).map(([date, dayFixtures]) => (
            <div key={date}>
              <h3 className="text-primary-600 font-semibold text-sm mb-2">{date}</h3>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                {dayFixtures.map(f => (
                  <FixtureCard
                    key={f.fixture.id}
                    fixture={f}
                    onClick={() => navigate(`/match/${f.fixture.id}`)}
                    t={t}
                  />
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

function FixtureCard({ fixture, onClick, t }) {
  const f = fixture;
  const date = new Date(f.fixture.date);
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const status = f.fixture.status.short;

  return (
    <div
      className="bg-white cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
      onClick={onClick}
    >
      <div className="flex items-center py-3 px-3">
        {/* Teams column */}
        <div className="flex-1 min-w-0">
          {/* Home team */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <img
              src={f.teams.home.logo}
              alt=""
              className="w-5 h-5 object-contain flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-sm text-gray-900 truncate">{f.teams.home.name}</span>
          </div>
          {/* Away team */}
          <div className="flex items-center gap-2.5">
            <img
              src={f.teams.away.logo}
              alt=""
              className="w-5 h-5 object-contain flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-sm text-gray-900 truncate">{f.teams.away.name}</span>
          </div>
        </div>

        {/* Time/Score column */}
        <div className="flex-shrink-0 text-right ml-3">
          {status === 'NS' ? (
            <span className="text-sm text-gray-500">{time}</span>
          ) : status === 'FT' ? (
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{f.goals.home}</span>
              <span className="text-sm font-bold text-gray-900">{f.goals.away}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">{t('leagueMatches.fullTime')}</span>
            </div>
          ) : ['1H', '2H', 'HT', 'ET', 'P'].includes(status) ? (
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{f.goals.home ?? 0}</span>
              <span className="text-sm font-bold text-gray-900">{f.goals.away ?? 0}</span>
              <span className="text-[10px] text-red-500 font-medium mt-0.5">{status}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">{status}</span>
          )}
        </div>
      </div>
    </div>
  );
}
