import React, { useState, useEffect } from 'react';
import { Plus, X, Clock, Settings } from 'lucide-react';
import { StatsigProvider, useClientAsyncInit } from "@statsig/react-bindings";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";
import { StatsigSessionReplayPlugin } from "@statsig/session-replay";

// Import Google Fonts
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Feature gates (simulating Statsig feature flags)
const FEATURE_GATES = {
  HOUR_FORMAT_TOGGLE: true,
  SECONDS_TOGGLE: true
};

const TIME_ZONES = [
  { label: 'New York', value: 'America/New_York' },
  { label: 'London', value: 'Europe/London' },
  { label: 'Tokyo', value: 'Asia/Tokyo' },
  { label: 'Paris', value: 'Europe/Paris' },
  { label: 'Sydney', value: 'Australia/Sydney' },
  { label: 'Los Angeles', value: 'America/Los_Angeles' },
  { label: 'Dubai', value: 'Asia/Dubai' },
  { label: 'Mumbai', value: 'Asia/Kolkata' },
  { label: 'Singapore', value: 'Asia/Singapore' },
  { label: 'Berlin', value: 'Europe/Berlin' },
  { label: 'São Paulo', value: 'America/Sao_Paulo' },
  { label: 'Cairo', value: 'Africa/Cairo' },
  { label: 'Moscow', value: 'Europe/Moscow' },
  { label: 'Hong Kong', value: 'Asia/Hong_Kong' },
  { label: 'Toronto', value: 'America/Toronto' }
];

const WorldClockDashboard = () => {
  const [clocks, setClocks] = useState([
    { id: 1, label: 'New York', timezone: 'America/New_York' },
    { id: 2, label: 'London', timezone: 'Europe/London' },
    { id: 3, label: 'Tokyo', timezone: 'Asia/Tokyo' }
  ]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [showAddClock, setShowAddClock] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (tz) => new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: !is24Hour,
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds && { second: '2-digit' })
  }).format(currentTime);

  const formatDate = (tz) => new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(currentTime);

  const getTimeComponents = (tz) => {
    const date = new Date(currentTime.toLocaleString("en-US", { timeZone: tz }));
    const h = date.getHours() % 12;
    const m = date.getMinutes();
    const s = date.getSeconds();
    return {
      hourAngle: h * 30 + m * 0.5,
      minuteAngle: m * 6,
      secondAngle: s * 6
    };
  };

  const AnalogClock = ({ timezone }) => {
    const { hourAngle, minuteAngle, secondAngle } = getTimeComponents(timezone);
    return (
      <div className="relative w-20 h-20 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="rgba(147, 51, 234, 0.1)" stroke="rgba(196, 181, 253, 0.4)" strokeWidth="2" />
          {[...Array(12)].map((_, i) => {
            const angle = i * 30, x1 = 50 + Math.cos((angle - 90) * Math.PI / 180) * 40, y1 = 50 + Math.sin((angle - 90) * Math.PI / 180) * 40;
            const x2 = 50 + Math.cos((angle - 90) * Math.PI / 180) * 35, y2 = 50 + Math.sin((angle - 90) * Math.PI / 180) * 35;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(196, 181, 253, 0.6)" strokeWidth="2" />;
          })}
          <line x1="50" y1="50" x2={50 + Math.cos((hourAngle - 90) * Math.PI / 180) * 25} y2={50 + Math.sin((hourAngle - 90) * Math.PI / 180) * 25} stroke="#c084fc" strokeWidth="3" />
          <line x1="50" y1="50" x2={50 + Math.cos((minuteAngle - 90) * Math.PI / 180) * 35} y2={50 + Math.sin((minuteAngle - 90) * Math.PI / 180) * 35} stroke="#a855f7" strokeWidth="2" />
          {showSeconds && <line x1="50" y1="50" x2={50 + Math.cos((secondAngle - 90) * Math.PI / 180) * 38} y2={50 + Math.sin((secondAngle - 90) * Math.PI / 180) * 38} stroke="#ec4899" strokeWidth="1" />}
          <circle cx="50" cy="50" r="3" fill="#c084fc" />
        </svg>
      </div>
    );
  };

  const addClock = () => {
    const tz = TIME_ZONES.find(t => t.value === selectedTimezone);
    if (!tz || clocks.some(c => c.timezone === selectedTimezone)) return;
    setClocks([...clocks, { id: Date.now(), label: tz.label, timezone: tz.value }]);
    setSelectedTimezone('');
    setShowAddClock(false);
  };

  const removeClock = (id) => setClocks(clocks.filter(c => c.id !== id));
  const toggle24Hour = () => setIs24Hour(p => !p);
  const toggleSeconds = () => setShowSeconds(p => !p);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 font-inter">
      <div className="max-w-6xl mx-auto text-center mb-8">
        <div className="flex justify-center gap-3 mb-4"><Clock className="w-10 h-10 text-purple-400" /><h1 className="text-4xl font-bold text-white">World Clock Dashboard</h1></div>
        <p className="text-purple-200">Keep track of time across the globe</p>
      </div>
      {/* ...Controls + Clock List Rendering stays same... */}
      {/* For brevity, you can paste the remaining JSX of clock cards and toggles here from your version */}
    </div>
  );
};

function App() {
  const { client } = useClientAsyncInit(
    "client-1jKRKqgQNUDG6QY5wHhX2pFDELaEnSUFWw8vB879CBN",
    { userID: "a-user" },
    {
      plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()],
    }
  );

  return (
    <StatsigProvider client={client} loadingComponent={<div>Loading...</div>}>
      <WorldClockDashboard />
    </StatsigProvider>
  );
}

export default App;
