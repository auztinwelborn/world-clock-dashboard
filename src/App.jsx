import React, { useState, useEffect } from 'react';
import { Plus, X, Clock, Settings } from 'lucide-react';
import { StatsigProvider, useClientAsyncInit, useStatsigClient } from "@statsig/react-bindings";
import { StatsigAutoCapturePlugin } from "@statsig/web-analytics";
import { StatsigSessionReplayPlugin } from "@statsig/session-replay";

// Import Google Fonts
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Available time zones
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
  // Initial preset cities
  const [clocks, setClocks] = useState([
    { id: 1, label: 'New York', timezone: 'America/New_York' },
    { id: 2, label: 'London', timezone: 'Europe/London' },
    { id: 3, label: 'Tokyo', timezone: 'Asia/Tokyo' }
  ]);
  const { client } = useStatsigClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [showAddClock, setShowAddClock] = useState(false);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle clicking outside the search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAddClock && !event.target.closest('.relative')) {
        setShowAddClock(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAddClock]);

  // Track feature gate exposure
  useEffect(() => {
    if (client) {
      client.logEvent("search_bar_gate_exposed", {
        gate_value: client.checkGate("search_bar")
      });
    }
  }, [client]);

  // Format time for a specific timezone
  const formatTime = (timezone) => {
    const options = {
      timeZone: timezone,
      hour12: !is24Hour,
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' })
    };

    return new Intl.DateTimeFormat('en-US', options).format(currentTime);
  };

  // Get date for a specific timezone
  const formatDate = (timezone) => {
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return new Intl.DateTimeFormat('en-US', options).format(currentTime);
  };

  // Get time components for analog clock
  const getTimeComponents = (timezone) => {
    const date = new Date(currentTime.toLocaleString("en-US", {timeZone: timezone}));
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    return {
      hourAngle: (hours * 30) + (minutes * 0.5), // 30 degrees per hour + minute adjustment
      minuteAngle: minutes * 6, // 6 degrees per minute
      secondAngle: seconds * 6  // 6 degrees per second
    };
  };

  // Analog Clock Component
  const AnalogClock = ({ timezone }) => {
    const { hourAngle, minuteAngle, secondAngle } = getTimeComponents(timezone);
    
    return (
      <div className="relative w-20 h-20 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Clock face */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="rgba(147, 51, 234, 0.1)"
            stroke="rgba(196, 181, 253, 0.4)"
            strokeWidth="2"
          />
          
          {/* Hour markers */}
          {[...Array(12)].map((_, i) => {
            const angle = i * 30;
            const x1 = 50 + Math.cos((angle - 90) * Math.PI / 180) * 40;
            const y1 = 50 + Math.sin((angle - 90) * Math.PI / 180) * 40;
            const x2 = 50 + Math.cos((angle - 90) * Math.PI / 180) * 35;
            const y2 = 50 + Math.sin((angle - 90) * Math.PI / 180) * 35;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(196, 181, 253, 0.6)"
                strokeWidth="2"
              />
            );
          })}
          
          {/* Hour hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((hourAngle - 90) * Math.PI / 180) * 25}
            y2={50 + Math.sin((hourAngle - 90) * Math.PI / 180) * 25}
            stroke="#c084fc"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Minute hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + Math.cos((minuteAngle - 90) * Math.PI / 180) * 35}
            y2={50 + Math.sin((minuteAngle - 90) * Math.PI / 180) * 35}
            stroke="#a855f7"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Second hand */}
          {showSeconds && (
            <line
              x1="50"
              y1="50"
              x2={50 + Math.cos((secondAngle - 90) * Math.PI / 180) * 38}
              y2={50 + Math.sin((secondAngle - 90) * Math.PI / 180) * 38}
              stroke="#ec4899"
              strokeWidth="1"
              strokeLinecap="round"
            />
          )}
          
          {/* Center dot */}
          <circle
            cx="50"
            cy="50"
            r="3"
            fill="#c084fc"
          />
        </svg>
      </div>
    );
  };

  // Add a new clock
  const addClock = () => {
    if (!selectedTimezone) return;

    const selectedTz = TIME_ZONES.find(tz => tz.value === selectedTimezone);
    if (!selectedTz) return;

    // Check if clock already exists
    if (clocks.some(clock => clock.timezone === selectedTimezone)) {
      alert('This clock already exists!');
      return;
    }

    const newClock = {
      id: Date.now(),
      label: selectedTz.label,
      timezone: selectedTz.value
    };

    setClocks(prev => [...prev, newClock]);
    setSelectedTimezone('');
    setShowAddClock(false);

    if (client) {
      console.log("About to log clock_added event");
      client.logEvent("clock_added");
      console.log("clock_added event logged");
    }
  };

  // Remove a clock
  const removeClock = (id) => {
    const clockToRemove = clocks.find(clock => clock.id === id);
    setClocks(prev => prev.filter(clock => clock.id !== id));

    if (client) {
      console.log("About to log clock_removed event");
      client.logEvent("clock_removed");
      console.log("clock_removed event logged");
    }
  };

  // Toggle 24-hour format
  const toggle24Hour = () => {
    console.log("Toggle function called!");
    console.log("Client object:", client);
    setIs24Hour(prev => !prev);
    
    if (client && client.logEvent) {
      console.log("About to call client.logEvent");
      client.logEvent("time_format_toggled");
      console.log("logEvent completed");
    } else {
      console.error("Client or logEvent not available:", client);
    }
  };

  // Toggle seconds display
  const toggleSeconds = () => {
    console.log("Toggle seconds function called!");
    setShowSeconds(prev => !prev);
    
    if (client) {
      console.log("About to log seconds_display_toggled event");
      client.logEvent("seconds_display_toggled");
      console.log("seconds_display_toggled event logged");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 font-inter">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Clock className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white tracking-tight">World Clock Dashboard</h1>
          </div>
          <p className="text-purple-200 font-light">Keep track of time across the globe</p>
        </div>

        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-300" />
              <span className="text-white font-medium">Settings</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              {/* Format Controls */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={is24Hour}
                    onChange={toggle24Hour}
                    className="rounded"
                  />
                  24-hour format
                </label>
                
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={showSeconds}
                    onChange={toggleSeconds}
                    className="rounded"
                  />
                  Show seconds
                </label>
              </div>

              {/* Add Clock Button */}
              <button
                onClick={() => setShowAddClock(!showAddClock)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Clock
              </button>
            </div>
          </div>

          {/* Add Clock Section - with feature gate */}
          <div className="mt-4 pt-4 border-t border-white/20">
            {client && client.checkGate("search_bar") ? (
              // Show searchable timezone input when gate is enabled
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-white mb-2">
                    Search & Add Timezone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedTimezone}
                      onChange={(e) => setSelectedTimezone(e.target.value)}
                      onFocus={() => setShowAddClock(true)}
                      placeholder="Type to search timezones..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {showAddClock && selectedTimezone && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg max-h-48 overflow-y-auto z-10">
                        {TIME_ZONES
                          .filter(zone => 
                            zone.label.toLowerCase().includes(selectedTimezone.toLowerCase()) ||
                            zone.value.toLowerCase().includes(selectedTimezone.toLowerCase())
                          )
                          .slice(0, 8)
                          .map(zone => (
                            <button
                              key={zone.value}
                              onClick={() => {
                                setSelectedTimezone(zone.value);
                                setShowAddClock(false);
                                setTimeout(() => {
                                  addClock();
                                  setSelectedTimezone('');
                                }, 100);
                              }}
                              className="w-full text-left px-3 py-2 text-white hover:bg-white/20 transition-colors border-b border-white/10 last:border-b-0"
                            >
                              <div className="font-medium">{zone.label}</div>
                              <div className="text-sm text-gray-400">{zone.value}</div>
                            </button>
                          ))}
                        {TIME_ZONES.filter(zone => 
                          zone.label.toLowerCase().includes(selectedTimezone.toLowerCase()) ||
                          zone.value.toLowerCase().includes(selectedTimezone.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-gray-400">No timezones found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    addClock();
                    setSelectedTimezone('');
                    setShowAddClock(false);
                  }}
                  disabled={!selectedTimezone || !TIME_ZONES.find(tz => tz.value === selectedTimezone)}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Add
                </button>
              </div>
            ) : (
              // Show simple preset buttons when gate is disabled
              <div className="flex flex-wrap gap-2">
                <p className="text-white text-sm mb-2 w-full">Quick Add Popular Cities:</p>
                {['Paris', 'Sydney', 'Dubai', 'Mumbai'].map(city => {
                  const timezone = TIME_ZONES.find(tz => tz.label === city);
                  return (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedTimezone(timezone.value);
                        setTimeout(() => {
                          addClock();
                          setSelectedTimezone('');
                        }, 0);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Add {city}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Clock Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clocks.map((clock) => (
            <div
              key={clock.id}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white tracking-wide">{clock.label}</h3>
                {clocks.length > 1 && (
                  <button
                    onClick={() => removeClock(clock.id)}
                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-between gap-6">
                  {/* Digital Time */}
                  <div className="flex-1">
                    <div className="text-4xl font-jetbrains font-semibold text-purple-300 mb-2 tracking-wider">
                      {formatTime(clock.timezone)}
                    </div>
                    <div className="text-sm text-purple-200 font-light">
                      {formatDate(clock.timezone)}
                    </div>
                  </div>
                  
                  {/* Analog Clock */}
                  <div className="flex-shrink-0 flex items-center justify-center h-full">
                    <AnalogClock timezone={clock.timezone} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-purple-300 text-sm font-light">
          <p>Times update automatically every second</p>
        </div>
      </div>

      {/* Add custom font styles */}
      <style jsx>{`
        .font-inter {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .font-jetbrains {
          font-family: 'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
      `}</style>
    </div>
  );
};

function App() {
  const { client, isLoading } = useClientAsyncInit(
    "client-1jKRKqgQNUDG6QY5wHhX2pFDELaEnSUFWw8vB879CBN",
    { userID: "a-user" },
    {
      plugins: [new StatsigAutoCapturePlugin(), new StatsigSessionReplayPlugin()],
    }
  );

  if (isLoading || !client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <StatsigProvider client={client}>
      <WorldClockDashboard />
    </StatsigProvider>
  );
}

export default App;