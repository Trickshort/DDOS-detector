import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./App.css";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

function RealTimeApp() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [totalAttacks, setTotalAttacks] = useState(0);
  const [totalNormal, setTotalNormal] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Fetching predictions from:", API_URL);
        const response = await fetch(`${API_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!response.ok) throw new Error("Failed to fetch data");
        const result = await response.json();
        if (isMounted) {
          setPredictions(result.predictions);
          updateChartData(result.predictions);
        }
      } catch (error) {
        if (isMounted) setError(error.message);
      }
      setLoading(false);
    };

    const interval = setInterval(fetchData, 2000); // Fetch every 2 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const updateChartData = (newPredictions) => {
    const timestamp = new Date().toLocaleTimeString();
    const ddosCount = newPredictions.filter((p) => p === 1).length;
    const benignCount = newPredictions.length - ddosCount;
    setTotalAttacks((prev) => prev + ddosCount);
    setTotalNormal((prev) => prev + benignCount);
    setChartData((prev) => [...prev.slice(-20), { time: timestamp, DDoS: ddosCount, Normal: benignCount }]);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Real-Time DDoS Detection</h1>
        {loading && <p className="loading">Fetching data...</p>}
        {error && <p className="error">Error: {error}</p>}
        
        <div className="stats-panel">
          <p>Total Attacks: <span className="ddos-count">{totalAttacks}</span></p>
          <p>Total Normal: <span className="normal-count">{totalNormal}</span></p>
        </div>
        
        <h2>Traffic Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="DDoS" stroke="#ff4c4c" strokeWidth={2} />
            <Line type="monotone" dataKey="Normal" stroke="#4caf50" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </header>
    </div>
  );
}

export default RealTimeApp;
