
import React, { useState, useEffect } from 'react';
import { PlateAppearance, GameBatchRecord, BatterStats, PitcherStats, Player, Opponent, PitchRecord, PitcherPlayRecord } from '../types';
import { getPARecords, getBatchRecords, getPitcherRecords, exportUnifiedCSV, getPlayers, getOpponents, getPitchRecords, getPitcherPlayRecords } from '../services/dataService';
import { calculateBatterStats, calculatePitcherStats, calculateLeagueStats, formatStat, analyzePitchData, PitchAnalysis, ZoneStats } from '../services/statsService';
import { Download, BarChart2, TrendingUp, RefreshCw, User, Target, MapPin, Calendar, Activity, Info, Filter, Shield, Swords, Crown, Medal, BookOpen, ArrowRight, Grid3X3, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { MetricsGuideModal } from './MetricsGuideModal';

type FilterType = 'all' | 'month' | 'custom';
type TrendMetric = 'avg' | 'ops' | 'era' | 'whip';
type AnalysisMode = 'team' | 'scouting';
type DashboardTab = 'general' | 'advanced'; // New Tab State

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('general');
  const [mode, setMode] = useState<AnalysisMode>('team');
  const [view, setView] = useState<'batter' | 'pitcher'>('batter');
  
  // New Filter State
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [customStart, setCustomStart] = useState<string>(''); // YYYY-MM-DD
  const [customEnd, setCustomEnd] = useState<string>('');   // YYYY-MM-DD
  
  // Data State
  const [batterStats, setBatterStats] = useState<BatterStats[]>([]);
  const [pitcherStats, setPitcherStats] = useState<PitcherStats[]>([]);
  const [teamBatterTotal, setTeamBatterTotal] = useState<BatterStats | null>(null);
  const [teamPitcherTotal, setTeamPitcherTotal] = useState<PitcherStats | null>(null);
  const [activePlayers, setActivePlayers] = useState<Player[]>([]);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  
  // Pitch Data State
  const [pitchAnalysis, setPitchAnalysis] = useState<PitchAnalysis | null>(null);
  const [heatmapMetric, setHeatmapMetric] = useState<'count'|'avg'|'swing'|'contact'>('count');

  // Selection State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('ALL'); // 'ALL' or UUID
  const [selectedOpponent, setSelectedOpponent] = useState<string>(''); // Opponent Name
  
  // Spray Chart Data
  const [sprayData, setSprayData] = useState<Array<{x: number, y: number, result: string, isHit: boolean}>>([]);
  const [pitcherSprayData, setPitcherSprayData] = useState<Array<{x: number, y: number, result: string, isOut: boolean}>>([]);

  // Trend State
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('avg');
  const [trendData, setTrendData] = useState<any[]>([]);

  // Modal State
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const opps = getOpponents();
    setOpponents(opps);
    if(opps.length > 0 && !selectedOpponent) setSelectedOpponent(opps[0].name);
    loadData();
  }, [filterType, selectedMonth, customStart, customEnd, mode, selectedOpponent]);

  // Effect: When Stats or Selected Player changes, update Charts (Spray & Trend)
  useEffect(() => {
      updateCharts();
      updatePitchAnalysis();
  }, [selectedPlayerId, batterStats, pitcherStats, view, trendMetric]);

  // Date Filtering Logic
  const isInDateRange = (dateStr: string) => {
      if (mode === 'scouting') return true; // Scouting ignores date filter (uses opponent filter)
      
      if (filterType === 'all') return true;
      
      if (filterType === 'month') {
          return dateStr.startsWith(selectedMonth);
      }
      
      if (filterType === 'custom') {
          if (!customStart && !customEnd) return true;
          if (customStart && dateStr < customStart) return false;
          if (customEnd && dateStr > customEnd) return false;
          return true;
      }
      return true;
  };

  const loadData = () => {
    const currentPlayers = getPlayers();
    setActivePlayers(currentPlayers);

    // --- BATTERS ---
    const allPLive = getPARecords();
    const allPBatch = getBatchRecords();

    let pLive = allPLive;
    let pBatch = allPBatch;

    // Filter by Date (Team Mode) or Opponent (Scouting Mode)
    if (mode === 'team') {
        pLive = pLive.filter(r => isInDateRange(r.date));
        pBatch = pBatch.filter(r => isInDateRange(r.date));
    } else {
        if (selectedOpponent) {
            pLive = pLive.filter(r => r.opponent === selectedOpponent);
            pBatch = pBatch.filter(r => r.opponent === selectedOpponent);
        } else {
            pLive = []; pBatch = [];
        }
    }

    const finalBStats: BatterStats[] = [];
    const tempStatsForLeague: BatterStats[] = [];

    // Calculate Individual Stats
    currentPlayers.filter(p => p.type !== 'pitcher').forEach(p => {
        const pRecs = pLive.filter(r => r.playerId === p.id && r.opponent !== 'My Team');
        const bRecs = pBatch.filter(r => r.playerId === p.id);
        
        // In Scouting mode, only include players with stats against this opponent
        if (mode === 'scouting' && pRecs.length === 0 && bRecs.length === 0) return;
        if (mode === 'team' && pRecs.length === 0 && bRecs.length === 0) return;
        
        const s = calculateBatterStats(pRecs, bRecs);
        tempStatsForLeague.push(s);
    });

    // Calculate League (Team) Totals for Context
    let l_pa=0, l_rc=0, l_xr=0, l_runs=0;
    tempStatsForLeague.forEach(b => { l_pa+=b.pa; l_rc+=b.rc; l_xr+=b.xr; l_runs+=b.r; });
    const lgBatterStats = { totalPA: l_pa, totalRC: l_rc, totalXR: l_xr, totalRuns: l_runs, totalInnings: l_pa/4.2 };

    // Re-calculate with League Context (RCAA etc) & Create Total Object
    let totalB = calculateBatterStats([], [], lgBatterStats); // Initialize empty
    totalB.name = "チーム合計";
    
    tempStatsForLeague.forEach(pStats => {
        const pRecs = pLive.filter(r => r.playerId === pStats.playerId && r.opponent !== 'My Team');
        const bRecs = pBatch.filter(r => r.playerId === pStats.playerId);
        const finalS = calculateBatterStats(pRecs, bRecs, lgBatterStats);
        finalBStats.push(finalS);
    });
    
    // Calculate Team Total manually by summing counting stats
    if (finalBStats.length > 0) {
        // Pseudo-aggregate records
        const allLiveFiltered = pLive.filter(r => r.opponent !== 'My Team');
        const allBatchFiltered = pBatch;
        totalB = calculateBatterStats(allLiveFiltered, allBatchFiltered, lgBatterStats);
        totalB.name = "チーム合計";
    }

    setBatterStats(finalBStats.sort((a,b) => b.ops - a.ops));
    setTeamBatterTotal(totalB);

    // --- PITCHERS ---
    const allPRecords = getPitcherRecords(); 
    let pRecords = allPRecords;

    if (mode === 'team') {
        pRecords = pRecords.filter(r => isInDateRange(r.date));
    } else {
        if (selectedOpponent) pRecords = pRecords.filter(r => r.opponent === selectedOpponent);
        else pRecords = [];
    }

    const leagueStats = calculateLeagueStats(pRecords); 

    const finalPStats: PitcherStats[] = [];
    currentPlayers.filter(p => p.type !== 'batter').forEach(p => {
        const batchRecs = pRecords.filter(r => r.playerId === p.id);
        if (stats => stats.games > 0) {
            const stats = calculatePitcherStats(batchRecs, leagueStats);
            if (stats.games > 0) finalPStats.push(stats);
        }
    });

    // Team Pitching Total
    let totalP: PitcherStats | null = null;
    if (pRecords.length > 0) {
        totalP = calculatePitcherStats(pRecords, leagueStats);
        totalP.name = "チーム合計";
    }

    setPitcherStats(finalPStats.sort((a,b) => {
        if (a.era === 0 && a.outs > 0) return -1;
        if (b.era === 0 && b.outs > 0) return 1;
        if (a.era === 0 && a.outs === 0) return 1;
        return a.era - b.era;
    }));
    setTeamPitcherTotal(totalP);
  };

  const updateCharts = () => {
      // 1. Update Spray Charts
      if (view === 'batter') {
          let sprays: Array<{x: number, y: number, result: string, isHit: boolean}> = [];
          
          if (selectedPlayerId === 'ALL') {
              // Aggregate all players
              batterStats.forEach(s => {
                  s.spray_data.forEach(d => {
                      const isHit = ['1B','2B','3B','HR'].includes(d.result);
                      sprays.push({ x: d.x, y: d.y, result: d.result, isHit });
                  });
              });
          } else {
              // Single Player
              const p = batterStats.find(s => s.playerId === selectedPlayerId);
              if (p && p.spray_data) {
                  sprays = p.spray_data.map(d => ({
                      x: d.x, y: d.y, result: d.result, 
                      isHit: ['1B','2B','3B','HR'].includes(d.result)
                  }));
              }
          }
          setSprayData(sprays);
      } else {
          // Pitcher View
          let sprays: Array<{x: number, y: number, result: string, isOut: boolean}> = [];
          if (selectedPlayerId === 'ALL') {
              pitcherStats.forEach(s => {
                  s.spray_data.forEach(d => {
                      const isOut = ['GO','FO','SO','SAC','SF','GIDP'].includes(d.result);
                      sprays.push({ x: d.x, y: d.y, result: d.result, isOut });
                  });
              });
          } else {
              const p = pitcherStats.find(s => s.playerId === selectedPlayerId);
              if (p && p.spray_data) {
                  sprays = p.spray_data.map(d => ({
                      x: d.x, y: d.y, result: d.result,
                      isOut: ['GO','FO','SO','SAC','SF','GIDP'].includes(d.result)
                  }));
              }
          }
          setPitcherSprayData(sprays);
      }

      // 2. Update Trend Data
      const targetId = selectedPlayerId === 'ALL' 
          ? (view === 'batter' ? batterStats[0]?.playerId : pitcherStats[0]?.playerId) 
          : selectedPlayerId;
      
      if (targetId) {
          calculateTrends(targetId);
      } else {
          setTrendData([]);
      }
  };

  const updatePitchAnalysis = () => {
      // Fetch Raw Data
      let pitches = getPitchRecords();
      let paRecords: PlateAppearance[] | PitcherPlayRecord[] = [];

      // Filter by Common Criteria (Date/Opponent)
      if (mode === 'team') {
          pitches = pitches.filter(p => isInDateRange(p.date));
      } else if (selectedOpponent) {
          pitches = pitches.filter(p => p.gameId.includes(selectedOpponent)); // Rough check, better to store opponent in pitch
      }

      // Filter by View & Player
      if (view === 'batter') {
          if (selectedPlayerId !== 'ALL') {
              pitches = pitches.filter(p => p.batterId === selectedPlayerId);
          }
          // Get Batter PA Records for result linking
          let pa = getPARecords();
          if (mode === 'team') pa = pa.filter(r => isInDateRange(r.date));
          paRecords = pa;
      } else {
          // Pitcher
          if (selectedPlayerId !== 'ALL') {
              pitches = pitches.filter(p => p.pitcherId === selectedPlayerId);
          }
          // Get Pitcher Play Records for result linking
          let pp = getPitcherPlayRecords();
          if (mode === 'team') pp = pp.filter(r => isInDateRange(r.date));
          paRecords = pp;
      }

      if (pitches.length === 0) {
          setPitchAnalysis(null);
          return;
      }

      const analysis = analyzePitchData(pitches, paRecords);
      setPitchAnalysis(analysis);
  };

  const calculateTrends = (playerId: string) => {
      const chartData: any[] = [];
      
      if (view === 'batter') {
          let allLive = getPARecords().filter(r => r.playerId === playerId && r.opponent !== 'My Team');
          let allBatch = getBatchRecords().filter(r => r.playerId === playerId);
          
          if (mode === 'scouting' && selectedOpponent) {
              allLive = allLive.filter(r => r.opponent === selectedOpponent);
              allBatch = allBatch.filter(r => r.opponent === selectedOpponent);
          } else if (mode === 'team') {
              allLive = allLive.filter(r => isInDateRange(r.date));
              allBatch = allBatch.filter(r => isInDateRange(r.date));
          }

          const events = [
              ...allLive.map(r => ({ date: r.date, type: 'live', data: r })),
              ...allBatch.map(r => ({ date: r.date, type: 'batch', data: r }))
          ].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          let accH = 0, accAB = 0, accBB = 0, accHBP = 0, accSF = 0, accTB = 0;

          events.forEach(e => {
              let h=0, ab=0, bb=0, hbp=0, sf=0, tb=0;
              if (e.type === 'live') {
                  const r = e.data as PlateAppearance;
                  if (['1B','2B','3B','HR','SO','GO','FO','ROE','FC','GIDP'].includes(r.result)) ab=1;
                  if (['1B','2B','3B','HR'].includes(r.result)) h=1;
                  if (r.result==='1B') tb=1;
                  if (r.result==='2B') tb=2;
                  if (r.result==='3B') tb=3;
                  if (r.result==='HR') tb=4;
                  if (r.result==='BB'||r.result==='IBB') bb=1;
                  if (r.result==='HBP') hbp=1;
                  if (r.result==='SF') sf=1;
              } else {
                  const r = e.data as GameBatchRecord;
                  ab=r.ab; h=r.h; bb=r.bb+(r.ibb||0); hbp=r.hbp; sf=r.sf;
                  const singles = r.h - (r.double+r.triple+r.hr);
                  tb = singles + r.double*2 + r.triple*3 + r.hr*4;
              }
              
              accH += h; accAB += ab; accBB += bb; accHBP += hbp; accSF += sf; accTB += tb;
              
              let val = 0;
              if (trendMetric === 'avg') val = accAB > 0 ? accH / accAB : 0;
              if (trendMetric === 'ops') {
                  const obp = (accAB+accBB+accHBP+accSF) > 0 ? (accH+accBB+accHBP)/(accAB+accBB+accHBP+accSF) : 0;
                  const slg = accAB > 0 ? accTB / accAB : 0;
                  val = obp + slg;
              }

              const existing = chartData.find(c => c.date === e.date);
              if (existing) {
                  existing.value = val;
              } else {
                  chartData.push({ date: e.date.substring(5), fullDate: e.date, value: val });
              }
          });
      } else {
          let allRecs = getPitcherRecords().filter(r => r.playerId === playerId);
          
          if (mode === 'scouting' && selectedOpponent) {
              allRecs = allRecs.filter(r => r.opponent === selectedOpponent);
          } else if (mode === 'team') {
              allRecs = allRecs.filter(r => isInDateRange(r.date));
          }
          
          allRecs = allRecs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          let accER = 0, accIP = 0, accH = 0, accBB = 0;

          allRecs.forEach(r => {
             accER += r.er;
             accIP += (Math.floor(r.outs/3) + (r.outs%3)/3);
             accH += r.h;
             accBB += r.bb + (r.ibb||0) + r.hbp;

             let val = 0;
             if (trendMetric === 'era') val = accIP > 0 ? (accER * 9) / accIP : 0;
             if (trendMetric === 'whip') val = accIP > 0 ? (accH + accBB) / accIP : 0;

             chartData.push({ date: r.date.substring(5), fullDate: r.date, value: val });
          });
      }
      setTrendData(chartData);
  };

  const getOpsColor = (ops: number) => {
    if (ops >= 1.000) return 'text-red-600 font-extrabold';
    if (ops >= 0.800) return 'text-team-red font-bold';
    return 'text-slate-900';
  };

  // Find Leaders
  const getQualifiedLeader = (stats: BatterStats[], key: keyof BatterStats, minPaPercent: number = 0.3) => {
      if (stats.length === 0) return null;
      const maxPa = Math.max(...stats.map(s => s.pa));
      const threshold = Math.max(1, maxPa * minPaPercent); // Min 1 to show something
      const qualified = stats.filter(s => s.pa >= threshold);
      if (qualified.length === 0) return stats[0];
      return qualified.sort((a,b) => (b[key] as number) - (a[key] as number))[0];
  };

  // Sabermetrics MVP: Best RCWIN (Batter) / RSWIN (Pitcher)
  const getSaberMvpBatter = () => {
      if (batterStats.length === 0) return null;
      return [...batterStats].sort((a,b) => b.rcwin - a.rcwin)[0];
  };
  const getSaberMvpPitcher = () => {
      if (pitcherStats.length === 0) return null;
      return [...pitcherStats].sort((a,b) => b.rswin - a.rswin)[0];
  };

  const saberMvpB = getSaberMvpBatter();
  const saberMvpP = getSaberMvpPitcher();

  // For Scouting Mode - Find Killer Players
  const getKillerBatter = () => {
      if (batterStats.length === 0) return null;
      return [...batterStats].sort((a, b) => b.ops - a.ops)[0];
  };
  
  const getKillerPitcher = () => {
      if (pitcherStats.length === 0) return null;
      return [...pitcherStats].sort((a, b) => a.era - b.era)[0]; // Lower is better
  };

  const killerB = getKillerBatter();

  const getCurrentPlayerName = () => {
      if (selectedPlayerId === 'ALL') return 'チーム全体';
      const p = view === 'batter' 
        ? batterStats.find(s => s.playerId === selectedPlayerId)
        : pitcherStats.find(s => s.playerId === selectedPlayerId);
      return p ? p.name : '選択なし';
  };

  // Heatmap Color Helper
  const getHeatmapColor = (zone: ZoneStats, type: 'count'|'avg'|'swing'|'contact') => {
      if (zone.totalPitches === 0) return '#f1f5f9'; // slate-100
      let val = 0;
      let max = 1;
      
      if (type === 'count') {
          val = zone.totalPitches;
          max = Math.max(...(pitchAnalysis?.zoneStats.map(z=>z.totalPitches)||[]));
          // Normalize
          const pct = Math.min(100, (val / max) * 100);
          return `hsla(0, 70%, ${95 - (pct * 0.5)}%, 1)`; // Light Red scale
      } else if (type === 'avg') {
          val = zone.ab > 0 ? zone.hits / zone.ab : 0;
          if (val >= 0.4) return '#ef4444'; // Red (High)
          if (val >= 0.3) return '#fbbf24'; // Yellow
          if (val >= 0.2) return '#60a5fa'; // Blue
          return '#3b82f6'; // Dark Blue (Low)
      } else if (type === 'swing') {
          val = zone.swings / zone.totalPitches;
          return `rgba(239, 68, 68, ${val})`; // Red opacity based on swing%
      } else if (type === 'contact') {
          val = zone.swings > 0 ? (zone.swings - zone.whiffs) / zone.swings : 0;
          // High Contact = Blue (Safe), Low Contact (Whiff) = Red (Danger for Batter / Good for Pitcher)
          // Let's stick to Heatmap convention: Red = High Value.
          // Contact Rate High = Red.
          return `rgba(234, 88, 12, ${val})`; 
      }
      return '#fff';
  };

  const getHeatmapValueDisplay = (zone: ZoneStats, type: 'count'|'avg'|'swing'|'contact') => {
      if (zone.totalPitches === 0) return '-';
      if (type === 'count') return zone.totalPitches;
      if (type === 'avg') return zone.ab > 0 ? (zone.hits / zone.ab).toFixed(3).replace(/^0/,'') : '.---';
      if (type === 'swing') return `${Math.round((zone.swings/zone.totalPitches)*100)}%`;
      if (type === 'contact') return zone.swings > 0 ? `${Math.round(((zone.swings-zone.whiffs)/zone.swings)*100)}%` : '-';
      return '';
  };

  return (
    <div className="space-y-6 max-w-[95%] mx-auto pb-20">
      
      {/* Dashboard Header & Mode Switch */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-team-navy flex items-center gap-2">
                  {mode === 'team' ? <BarChart2 size={28}/> : <Swords size={28}/>}
                  {mode === 'team' ? 'チーム成績ダッシュボード' : '対戦相手スカウティング'}
              </h2>
              <p className="text-slate-500 text-sm">{mode === 'team' ? '全試合のデータを集計・分析' : '特定の相手との相性を分析'}</p>
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={() => setGuideOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-xs transition">
                    <BookOpen size={16}/> 指標ガイド
                </button>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setMode('team')} className={`px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-2 ${mode==='team' ? 'bg-white shadow text-team-navy' : 'text-slate-400'}`}>
                        <BarChart2 size={16}/> チーム分析
                    </button>
                    <button onClick={() => setMode('scouting')} className={`px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-2 ${mode==='scouting' ? 'bg-white shadow text-red-700' : 'text-slate-400'}`}>
                        <Swords size={16}/> 対戦分析
                    </button>
                </div>
            </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 mt-4 justify-between items-center border-t pt-4">
            {mode === 'team' ? (
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <Calendar size={18} className="text-slate-500 ml-1"/>
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value as FilterType)}
                        className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none p-1"
                    >
                        <option value="all">全期間</option>
                        <option value="month">月別</option>
                        <option value="custom">期間指定</option>
                    </select>

                    {/* Filter Inputs */}
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-300">
                        {filterType === 'month' && (
                            <input 
                                type="month" 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="text-sm border rounded p-1 bg-white"
                            />
                        )}
                        {filterType === 'custom' && (
                            <div className="flex items-center gap-1">
                                <input 
                                    type="date" 
                                    value={customStart} 
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="text-xs border rounded p-1 bg-white w-28"
                                />
                                <span className="text-slate-400">~</span>
                                <input 
                                    type="date" 
                                    value={customEnd} 
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="text-xs border rounded p-1 bg-white w-28"
                                />
                            </div>
                        )}
                        {filterType === 'all' && (
                            <span className="text-xs text-slate-400 px-2">全データの通算成績を表示</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Shield size={20} className="text-red-600"/>
                    <span className="font-bold text-sm text-slate-600">対戦相手:</span>
                    <select 
                        value={selectedOpponent} 
                        onChange={(e) => setSelectedOpponent(e.target.value)}
                        className="p-2 border rounded-lg font-bold text-slate-800 bg-red-50 focus:bg-white"
                    >
                        {opponents.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                    </select>
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={loadData} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition">
                    <RefreshCw size={20} />
                </button>
                <button 
                    onClick={() => exportUnifiedCSV(batterStats, pitcherStats)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-700 transition text-sm"
                >
                    <Download size={16} />
                    CSV出力
                </button>
            </div>
        </div>
      </div>

      {/* Global Filter & View Toggle */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
          <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                  <button onClick={() => { setView('batter'); setSelectedPlayerId('ALL'); setTrendMetric('avg'); }} className={`px-6 py-2 rounded-lg font-bold text-sm transition ${view==='batter' ? 'bg-team-navy text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
                      <span className="flex items-center gap-2"><User size={16}/> 野手成績</span>
                  </button>
                  <button onClick={() => { setView('pitcher'); setSelectedPlayerId('ALL'); setTrendMetric('era'); }} className={`px-6 py-2 rounded-lg font-bold text-sm transition ${view==='pitcher' ? 'bg-team-navy text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
                      <span className="flex items-center gap-2"><Target size={16}/> 投手成績</span>
                  </button>
              </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border mb-2 md:mb-0">
              <Filter size={16} className="text-slate-400"/>
              <span className="text-xs font-bold text-slate-500">対象選手:</span>
              <select 
                  className="p-1 border rounded text-sm font-bold bg-slate-50 min-w-[150px]"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                  <option value="ALL">チーム全体</option>
                  {view === 'batter' 
                    ? batterStats.map(p => <option key={p.playerId} value={p.playerId}>{p.name}</option>)
                    : pitcherStats.map(p => <option key={p.playerId} value={p.playerId}>{p.name}</option>)
                  }
              </select>
          </div>
      </div>

      {/* Main Content Tabs (General vs Advanced) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px] overflow-hidden">
          <div className="flex border-b">
              <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab==='general' ? 'border-b-2 border-team-navy text-team-navy bg-slate-50' : 'text-slate-400 hover:bg-slate-50'}`}>
                  <BarChart2 size={16}/> 基本スタッツ & トレンド
              </button>
              <button onClick={() => setActiveTab('advanced')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab==='advanced' ? 'border-b-2 border-red-600 text-red-600 bg-red-50/50' : 'text-slate-400 hover:bg-slate-50'}`}>
                  <Flame size={16}/> 高度分析 (Heatmap / 球種)
              </button>
          </div>

          <div className="p-6">
              {/* --- GENERAL TAB --- */}
              {activeTab === 'general' && (
                  <div className="space-y-8 animate-in fade-in">
                      {/* Charts Row */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Left Chart (Leaders or Trends) */}
                          <div className="lg:col-span-1 h-64 border rounded-xl p-4">
                              <h4 className="font-bold text-slate-500 mb-2 flex items-center gap-2">
                                  <TrendingUp size={16}/> 
                                  {view === 'batter' ? (mode === 'team' ? 'OPS Leaders' : 'VS 相性OPS') : '防御率 Leaders'}
                              </h4>
                              <ResponsiveContainer width="100%" height="100%">
                                {view === 'batter' ? (
                                    <BarChart data={batterStats.slice(0, 5)} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize:12}} />
                                        <Tooltip />
                                        <Bar dataKey="ops" radius={[0, 4, 4, 0]}>
                                            {batterStats.slice(0,5).map((e,i)=><Cell key={i} fill={e.ops>=0.8?'#ef4444':'#3b82f6'}/>)}
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <BarChart data={pitcherStats.slice(0, 5)} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize:12}} />
                                        <Tooltip />
                                        <Bar dataKey="era" radius={[0, 4, 4, 0]} fill="#ef4444" />
                                    </BarChart>
                                )}
                              </ResponsiveContainer>
                          </div>

                          {/* Middle: Spray Chart */}
                          <div className="lg:col-span-1 h-64 border rounded-xl p-4 flex flex-col items-center relative">
                               <h4 className="font-bold text-slate-500 mb-2 flex items-center gap-2 w-full">
                                   <MapPin size={16}/> 
                                   <span>{view==='batter'?'打球':'被安打'}傾向: {getCurrentPlayerName()}</span>
                               </h4>
                               <div className="relative w-48 h-48 bg-green-700 rounded-lg shadow-inner overflow-hidden">
                                      <svg width="100%" height="100%" viewBox="0 0 100 100">
                                          <rect width="100" height="100" fill="#15803d" />
                                          <line x1="50" y1="85" x2="0" y2="35" stroke="white" strokeWidth="0.5" />
                                          <line x1="50" y1="85" x2="100" y2="35" stroke="white" strokeWidth="0.5" />
                                          <path d="M 50 85 L 75 60 L 50 35 L 25 60 Z" fill="#a36936" opacity="0.8" />
                                          <path d="M 0 35 Q 50 -10 100 35" stroke="white" strokeWidth="0.5" fill="none" />
                                          
                                          {(view === 'batter' ? sprayData : pitcherSprayData).map((d: any, i) => (
                                              <circle key={i} cx={d.x} cy={d.y} r="2" fill={d.isHit||!d.isOut ? '#ef4444' : '#22d3ee'} stroke="white" strokeWidth="0.5" opacity="0.9" />
                                          ))}
                                      </svg>
                               </div>
                          </div>
                          
                          {/* Right: Trend Chart */}
                          <div className="lg:col-span-1 h-64 border rounded-xl p-4 flex flex-col">
                               <div className="flex justify-between items-center mb-2 gap-2">
                                   <h4 className="font-bold text-slate-500 flex items-center gap-2 text-xs"><Activity size={14}/> トレンド</h4>
                                   <select 
                                      className="p-1 border rounded text-xs font-bold bg-white"
                                      value={trendMetric}
                                      onChange={(e) => setTrendMetric(e.target.value as any)}
                                  >
                                      {view==='batter' ? (
                                          <><option value="avg">打率</option><option value="ops">OPS</option></>
                                      ) : (
                                          <><option value="era">防御率</option><option value="whip">WHIP</option></>
                                      )}
                                  </select>
                               </div>
                               <div className="flex-1 w-full min-h-0">
                                  {trendData.length > 1 ? (
                                      <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={trendData}>
                                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                              <XAxis dataKey="date" tick={{fontSize: 10}} />
                                              <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                                              <Tooltip labelStyle={{color:'black'}} />
                                              <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={{r:3}} />
                                          </LineChart>
                                      </ResponsiveContainer>
                                  ) : (
                                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">データ不足</div>
                                  )}
                               </div>
                          </div>
                      </div>

                      {/* Main Data Table */}
                      <div className="overflow-x-auto border rounded-xl shadow-inner bg-white">
                          <table className="w-full text-xs text-left whitespace-nowrap">
                              <thead className="bg-slate-100 text-slate-600 font-bold border-b-2 border-slate-200">
                                  <tr>
                                      <th className="px-3 py-3 sticky left-0 bg-slate-100 z-10 border-r">選手名</th>
                                      {view === 'batter' ? (
                                          <>
                                              <th className="px-2 py-3 bg-blue-50 text-blue-800">OPS</th>
                                              <th className="px-2 py-3">打率</th>
                                              <th className="px-2 py-3">HR</th>
                                              <th className="px-2 py-3">打点</th>
                                              <th className="px-2 py-3">盗塁</th>
                                              <th className="px-2 py-3 bg-yellow-50 border-x">打席</th>
                                              <th className="px-2 py-3">得点圏</th>
                                              <th className="px-2 py-3">RC27</th>
                                              <th className="px-2 py-3 bg-green-50">RCWIN</th>
                                          </>
                                      ) : (
                                          <>
                                              <th className="px-2 py-3 bg-red-50 text-red-800">防御率</th>
                                              <th className="px-2 py-3">勝-負</th>
                                              <th className="px-2 py-3">S</th>
                                              <th className="px-2 py-3">H</th>
                                              <th className="px-2 py-3 bg-yellow-50 border-x">回</th>
                                              <th className="px-2 py-3">奪三振</th>
                                              <th className="px-2 py-3">WHIP</th>
                                              <th className="px-2 py-3">K/BB</th>
                                              <th className="px-2 py-3 bg-green-50">RSAA</th>
                                          </>
                                      )}
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {view === 'batter' ? batterStats.map(s => (
                                      <tr key={s.playerId} className="hover:bg-slate-50 transition">
                                          <td className="px-3 py-2 sticky left-0 bg-white border-r font-bold text-slate-800">{s.name}</td>
                                          <td className={`px-2 py-2 font-mono font-bold ${getOpsColor(s.ops)} bg-blue-50/50`}>{formatStat(s.ops)}</td>
                                          <td className="px-2 py-2 font-mono">{formatStat(s.avg)}</td>
                                          <td className="px-2 py-2 font-mono">{s.hr}</td>
                                          <td className="px-2 py-2 font-mono">{s.rbi}</td>
                                          <td className="px-2 py-2 font-mono">{s.sb}</td>
                                          <td className="px-2 py-2 font-mono bg-yellow-50/50 border-x font-bold">{s.pa}</td>
                                          <td className="px-2 py-2 font-mono">{formatStat(s.risp_avg)}</td>
                                          <td className="px-2 py-2 font-mono">{formatStat(s.rc27, 2)}</td>
                                          <td className="px-2 py-2 font-mono bg-green-50/30">{s.rcwin.toFixed(2)}</td>
                                      </tr>
                                  )) : pitcherStats.map(s => (
                                      <tr key={s.playerId} className="hover:bg-slate-50 transition">
                                          <td className="px-3 py-2 sticky left-0 bg-white border-r font-bold text-slate-800">{s.name}</td>
                                          <td className="px-2 py-2 font-mono font-bold text-red-600 bg-red-50/50">{s.era.toFixed(2)}</td>
                                          <td className="px-2 py-2 font-mono">{s.wins}-{s.losses}</td>
                                          <td className="px-2 py-2 font-mono">{s.saves}</td>
                                          <td className="px-2 py-2 font-mono">{s.holds}</td>
                                          <td className="px-2 py-2 font-mono bg-yellow-50/50 border-x font-bold">{s.ipDisplay}</td>
                                          <td className="px-2 py-2 font-mono">{s.k}</td>
                                          <td className="px-2 py-2 font-mono">{s.whip.toFixed(2)}</td>
                                          <td className="px-2 py-2 font-mono">{s.k_bb.toFixed(2)}</td>
                                          <td className="px-2 py-2 font-mono bg-green-50/30">{s.rsaa.toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* --- ADVANCED TAB --- */}
              {activeTab === 'advanced' && (
                  <div className="animate-in fade-in space-y-8">
                      {!pitchAnalysis ? (
                          <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                              投球詳細データ（ゾーン・球種）がありません
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Left: Heatmap */}
                              <div className="bg-white rounded-xl p-6 border shadow-sm">
                                  <div className="flex justify-between items-center mb-6">
                                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                          <Grid3X3 size={20}/> ゾーン別ヒートマップ
                                      </h3>
                                      <select 
                                          value={heatmapMetric} 
                                          onChange={(e) => setHeatmapMetric(e.target.value as any)}
                                          className="p-2 border rounded-lg text-sm font-bold bg-slate-50"
                                      >
                                          <option value="count">投球数</option>
                                          <option value="avg">{view==='batter'?'打率':'被安打率'}</option>
                                          <option value="swing">スイング率</option>
                                          <option value="contact">コンタクト率</option>
                                      </select>
                                  </div>
                                  
                                  <div className="flex justify-center">
                                      {/* 5x5 Grid */}
                                      <div className="grid grid-cols-5 gap-1 bg-slate-300 p-1 border-2 border-slate-400 w-[300px] h-[300px] rounded relative shadow-inner">
                                          {/* Strike Zone Border Overlay (Inner 3x3) */}
                                          <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] border-2 border-red-500/50 pointer-events-none z-10 box-border rounded-sm"/>
                                          
                                          {pitchAnalysis.zoneStats.map((z) => (
                                              <div 
                                                  key={z.zoneIndex} 
                                                  className="flex items-center justify-center text-xs font-bold text-slate-800 relative group transition-colors"
                                                  style={{ backgroundColor: getHeatmapColor(z, heatmapMetric) }}
                                              >
                                                  {getHeatmapValueDisplay(z, heatmapMetric)}
                                                  {/* Tooltip */}
                                                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black/80 text-white text-[10px] p-2 rounded z-20 whitespace-nowrap">
                                                      Zone {z.zoneIndex}<br/>
                                                      数: {z.totalPitches} / S%: {Math.round(z.swings/z.totalPitches*100 || 0)}%
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="mt-4 text-center text-xs text-slate-400">
                                      ※ 赤枠内がストライクゾーン（目安）です。<br/>
                                      {view==='batter' ? '打者視点' : '投手視点'}での分析結果を表示中
                                  </div>
                              </div>

                              {/* Right: Pitch Breakdown */}
                              <div className="bg-white rounded-xl p-6 border shadow-sm">
                                  <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-6">
                                      <Activity size={20}/> 球種別スタッツ
                                  </h3>
                                  <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-left">
                                          <thead className="bg-slate-100 text-slate-600 font-bold border-b">
                                              <tr>
                                                  <th className="p-2">球種</th>
                                                  <th className="p-2 text-center">割合</th>
                                                  <th className="p-2 text-center">球速</th>
                                                  <th className="p-2 text-center">空振%</th>
                                                  <th className="p-2 text-center">見逃%</th>
                                                  <th className="p-2 text-center">{view==='batter'?'打率':'被安打率'}</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                              {pitchAnalysis.pitchTypeStats.map((pt) => {
                                                  const usage = (pt.count / pitchAnalysis.totalPitches) * 100;
                                                  const whiffRate = pt.swings > 0 ? (pt.whiffs / pt.swings) * 100 : 0;
                                                  const lookRate = pt.count > 0 ? (pt.calledStrikes / pt.count) * 100 : 0;
                                                  const avg = pt.ab > 0 ? pt.hits / pt.ab : 0;
                                                  
                                                  return (
                                                      <tr key={pt.type}>
                                                          <td className="p-2 font-bold text-slate-700">{pt.type}</td>
                                                          <td className="p-2 text-center font-mono">
                                                              {usage.toFixed(1)}% <span className="text-[9px] text-slate-400">({pt.count})</span>
                                                          </td>
                                                          <td className="p-2 text-center font-mono">{pt.avgSpeed > 0 ? `${pt.avgSpeed.toFixed(1)}k` : '-'}</td>
                                                          <td className="p-2 text-center font-mono text-slate-600">{whiffRate.toFixed(1)}%</td>
                                                          <td className="p-2 text-center font-mono text-slate-600">{lookRate.toFixed(1)}%</td>
                                                          <td className={`p-2 text-center font-mono font-bold ${avg >= 0.3 ? (view==='batter'?'text-red-600':'text-blue-600') : ''}`}>
                                                              {formatStat(avg)}
                                                          </td>
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                  </div>
                                  
                                  <div className="mt-6 grid grid-cols-2 gap-4">
                                      <div className="bg-slate-50 p-3 rounded-lg border text-center">
                                          <div className="text-xs text-slate-500 font-bold">総スイング率</div>
                                          <div className="text-xl font-bold text-slate-800">
                                              {((pitchAnalysis.totalSwings / pitchAnalysis.totalPitches) * 100).toFixed(1)}%
                                          </div>
                                      </div>
                                      <div className="bg-slate-50 p-3 rounded-lg border text-center">
                                          <div className="text-xs text-slate-500 font-bold">総空振り率 (Whiff%)</div>
                                          <div className="text-xl font-bold text-slate-800">
                                              {pitchAnalysis.totalSwings > 0 ? ((pitchAnalysis.totalWhiffs / pitchAnalysis.totalSwings) * 100).toFixed(1) : '0.0'}%
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      <MetricsGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
};
