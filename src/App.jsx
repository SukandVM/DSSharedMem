import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Users, TrendingUp, Database, Lock, Unlock, 
  Utensils, ChefHat, Clock, Calendar, RotateCcw, 
  AlertCircle, ShieldCheck, ShieldAlert, Coffee,
  ChevronRight, History, CheckCircle2, ListOrdered
} from 'lucide-react';

const App = () => {
  const [counts, setCounts] = useState({ delicious: 0, average: 0, poor: 0 });
  const [users, setUsers] = useState(['Student_101', 'Student_102', 'Student_103']);
  const [currentUser, setCurrentUser] = useState('');
  const [logs, setLogs] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [memoryHighlight, setMemoryHighlight] = useState(null);
  const [lockStatus, setLockStatus] = useState('unlocked');
  const [activeUser, setActiveUser] = useState(null);
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [useMutex, setUseMutex] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [lastVoted, setLastVoted] = useState(null);

  const sharedMemory = useRef({
    data: { delicious: 0, average: 0, poor: 0 },
    semaphore: 1,
    waiting: []
  });

  const addLog = useCallback((message, type) => {
    setLogs(prev => [{ message, type, time: new Date().toLocaleTimeString(), id: Math.random() }, ...prev].slice(0, 50));
  }, []);

  const wait = async (userId) => {
    if (!useMutex) return;
    return new Promise((resolve) => {
      const attempt = () => {
        if (sharedMemory.current.semaphore > 0) {
          sharedMemory.current.semaphore--;
          setLockStatus('locked');
          setActiveUser(userId);
          addLog(`${userId} acquired system lock.`, 'lock');
          resolve();
        } else {
          setWaitingQueue(prev => [...prev, userId]);
          addLog(`${userId} blocked: Waiting for Mutex...`, 'wait');
          sharedMemory.current.waiting.push(() => {
            sharedMemory.current.semaphore--;
            setLockStatus('locked');
            setActiveUser(userId);
            setWaitingQueue(prev => prev.filter(u => u !== userId));
            resolve();
          });
        }
      };
      attempt();
    });
  };

  const signal = (userId) => {
    if (!useMutex) return;
    if (sharedMemory.current.waiting.length > 0) {
      const next = sharedMemory.current.waiting.shift();
      next();
    } else {
      sharedMemory.current.semaphore++;
      setLockStatus('unlocked');
      setActiveUser(null);
    }
    addLog(`${userId} released lock.`, 'unlock');
  };

  const handleVote = async (userId, type) => {
    if (userVotes[userId] || !userId) return;
    
    await wait(userId);
    
    try {
      setMemoryHighlight({ type, op: 'READ' });
      await new Promise(r => setTimeout(r, 600));
      
      const current = sharedMemory.current.data[type];
      setMemoryHighlight({ type, op: 'WRITE' });
      await new Promise(r => setTimeout(r, 600));
      
      sharedMemory.current.data[type] = current + 1;
      setCounts({ ...sharedMemory.current.data });
      setUserVotes(prev => ({ ...prev, [userId]: type }));
      setLastVoted({ user: userId, type });
      addLog(`${userId} vote recorded: ${type}`, 'success');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setLastVoted(null), 3000);
    } finally {
      setMemoryHighlight(null);
      signal(userId);
    }
  };

  const simulateConcurrency = () => {
    const students = users.filter(u => !userVotes[u]);
    const choices = ['delicious', 'average', 'poor'];
    // Trigger them all at once to show queuing
    students.forEach((u, i) => handleVote(u, choices[i % 3]));
  };

  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#FFFBF2] text-[#4A3728] pb-10">
      {/* Navbar */}
      <nav className="bg-orange-600 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Utensils className="w-6 h-6" />
            </div>
            <h1 className="font-black text-xl tracking-tight">CAMPUS BITES (CH.SC.U4CSE23056)</h1>
          </div>
          <div className="flex gap-4 items-center">
            <span className="hidden md:block text-orange-100 text-sm font-medium italic">"Quality food for bright minds"</span>
            <button 
              onClick={() => setShowAdmin(!showAdmin)}
              className="bg-orange-700 hover:bg-orange-800 p-2 rounded-full transition-all"
              title="Admin Console"
            >
              <ShieldCheck size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Feedback Success Pop-up */}
          {lastVoted && (
            <div className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3 shadow-xl animate-in slide-in-from-top-4 duration-300">
              <CheckCircle2 size={24} />
              <div>
                <p className="font-bold">Thank you, {lastVoted.user}!</p>
                <p className="text-xs opacity-90">Your {lastVoted.type} rating has been safely written to memory.</p>
              </div>
            </div>
          )}

          {/* Voting Terminal */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-orange-100">
            <div className="mb-8">
              <h2 className="text-2xl font-black mb-1">Meal Feedback</h2>
              <p className="text-gray-500 text-sm">Please identify yourself to enable voting</p>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <input 
                  type="text"
                  value={currentUser}
                  onChange={(e) => setCurrentUser(e.target.value)}
                  placeholder="Enter Student ID / Roll No."
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:border-orange-400 outline-none transition-all text-lg font-medium"
                />
                <button 
                  onClick={() => { if(currentUser) { setUsers([currentUser, ...users]); setCurrentUser(''); } }}
                  className="absolute right-2 top-2 bottom-2 bg-orange-600 text-white px-6 rounded-xl font-bold hover:bg-orange-700 transition-colors"
                >
                  Join
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'delicious', label: 'Delicious', emoji: '😋' },
                  { id: 'average', label: 'Average', emoji: '😐' },
                  { id: 'poor', label: 'Poor', emoji: '😞' }
                ].map((item) => {
                  const isVoted = users[0] && userVotes[users[0]] === item.id;
                  return (
                    <button
                      key={item.id}
                      disabled={!users[0] || userVotes[users[0]]}
                      onClick={() => handleVote(users[0], item.id)}
                      className={`group p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${
                        isVoted ? 'border-orange-500 bg-orange-50' : 'border-gray-50 bg-gray-50 hover:border-orange-200 hover:bg-white'
                      }`}
                    >
                      <span className="text-4xl transition-transform group-hover:scale-110">{item.emoji}</span>
                      <span className="font-bold text-xs uppercase tracking-wider text-gray-600">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Analytics Card */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-orange-100">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <History className="text-orange-500" /> Live Response Distribution
            </h3>
            <div className="space-y-5">
              {['delicious', 'average', 'poor'].map((type) => {
                const pct = totalVotes > 0 ? (counts[type]/totalVotes)*100 : 0;
                return (
                  <div key={type} className="group">
                    <div className="flex justify-between text-xs font-black uppercase mb-2 text-gray-400 group-hover:text-orange-600 transition-colors">
                      <span>{type}</span>
                      <span>{counts[type]} Votes ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${type === 'delicious' ? 'bg-emerald-500' : type === 'average' ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: OS Monitoring */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* OS Engine / Memory */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-orange-400 text-xs font-black uppercase tracking-tighter">Shared Memory Space</h3>
                <p className="text-[10px] text-slate-500 font-mono">Process: mess_feedback_v1.0</p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${lockStatus === 'locked' ? 'border-rose-500 text-rose-500' : 'border-emerald-500 text-emerald-500'}`}>
                {lockStatus.toUpperCase()}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {['delicious', 'average', 'poor'].map((type) => (
                <div key={type} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${memoryHighlight?.type === type ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 bg-slate-800/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                    <span className="text-xs font-mono text-slate-400">count_{type}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {memoryHighlight?.type === type && (
                      <span className="text-[10px] font-bold text-orange-400 animate-pulse">{memoryHighlight.op}ING...</span>
                    )}
                    <span className="text-2xl font-mono font-bold text-orange-50">{sharedMemory.current.data[type]}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Waiting Queue Visualizer */}
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
              <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                <ListOrdered size={12} /> Semaphore Wait Queue
              </h4>
              <div className="flex flex-wrap gap-2">
                {waitingQueue.length > 0 ? (
                  waitingQueue.map((u, i) => (
                    <span key={i} className="bg-rose-500/20 text-rose-400 px-2 py-1 rounded text-[10px] font-bold border border-rose-500/30 animate-pulse">
                      {u}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-600 italic">Queue empty: CPU idle</span>
                )}
              </div>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-orange-100 flex flex-col h-[400px]">
            <h3 className="text-sm font-black uppercase text-gray-400 mb-4 flex items-center gap-2">
              <History size={16} /> Activity Stream
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs scrollbar-thin">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 border-l-2 border-gray-100 pl-3 py-1">
                  <span className="text-gray-300 font-mono shrink-0">{log.time.split(' ')[0]}</span>
                  <p className={`${
                    log.type === 'lock' ? 'text-amber-600 font-bold' :
                    log.type === 'success' ? 'text-emerald-600 font-black' : 'text-gray-500'
                  }`}>
                    {log.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Tools */}
          {showAdmin && (
            <div className="bg-orange-600 rounded-[2rem] p-6 text-white shadow-xl animate-in zoom-in-95">
              <h3 className="font-bold mb-4">Laboratory Controls</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setUseMutex(!useMutex)}
                  className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-inner ${useMutex ? 'bg-orange-700' : 'bg-rose-500'}`}
                >
                  {useMutex ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                  {useMutex ? "MUTEX: ON (SAFE)" : "MUTEX: OFF (DANGEROUS)"}
                </button>
                <button 
                  onClick={simulateConcurrency}
                  className="w-full bg-white text-orange-600 py-3 rounded-xl font-black text-xs hover:bg-orange-50 transition-colors"
                >
                  RUN CONCURRENCY STRESS TEST
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;