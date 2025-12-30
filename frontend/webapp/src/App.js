import React, { useEffect, useState, useRef } from "react";
import "./App.css";

const pages = ["Home", "Admissions", "Departments", "Placements"];

const App = () => {
  const [currentPage, setCurrentPage] = useState("Home");
  const [cursorPosState, setCursorPosState] = useState({ x: 0, y: 0 });
  const [scrollDir, setScrollDir] = useState("STOP");
  const [connStatus, setConnStatus] = useState("Disconnected");

  const cursorRef = useRef({ x: 0, y: 0 });
  const pageRef = useRef("Home");
  const scrollInterval = useRef(null);
  const wsRef = useRef(null);
  const holdTimer = useRef(null);
  const hoverTarget = useRef(null);

  // ---- AUTO CLICK WHEN HOLDING OVER BUTTON / ELEMENT ----
  const handleAutoClick = () => {
    const el = document.elementFromPoint(
      cursorRef.current.x,
      cursorRef.current.y
    );
    if (el && el === hoverTarget.current) el.click();
  };

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => setConnStatus("Connected");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "CURSOR") {
        const x = data.x * window.innerWidth;
        const y = data.y * window.innerHeight;

        cursorRef.current = { x, y };
        setCursorPosState({ x, y });

        const el = document.elementFromPoint(x, y);

        if (el !== hoverTarget.current) {
          hoverTarget.current = el;
          clearTimeout(holdTimer.current);
          holdTimer.current = setTimeout(handleAutoClick, 850);
        }
      }

      if (data.type === "SCROLL") setScrollDir(data.dir);

      if (data.type === "GESTURE") {
        const idx = pages.indexOf(pageRef.current);
        if (data.action === "NEXT" && idx < pages.length - 1) {
          const next = pages[idx + 1];
          pageRef.current = next;
          setCurrentPage(next);
        }
        if (data.action === "BACK" && idx > 0) {
          const prev = pages[idx - 1];
          pageRef.current = prev;
          setCurrentPage(prev);
        }
      }
    };

    ws.onclose = () => setConnStatus("Disconnected");

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (scrollDir === "STOP") clearInterval(scrollInterval.current);
    else {
      scrollInterval.current = setInterval(() => {
        window.scrollBy({ top: scrollDir === "DOWN" ? 12 : -12 });
      }, 20);
    }
    return () => clearInterval(scrollInterval.current);
  }, [scrollDir]);

  return (
    <div className="rvce-kiosk">
      <div
        className={`status-bar ${
          connStatus === "Connected" ? "on" : "off"
        }`}
      >
        Backend: {connStatus}
      </div>

      <div
        className="custom-cursor"
        style={{ left: cursorPosState.x, top: cursorPosState.y }}
      />

      <nav className="top-nav">
        <div className="brand">
          RVCE <span>CampusConnect</span>
        </div>

        <div className="nav-items">
          {pages.map((p) => (
            <button
              key={p}
              className={currentPage === p ? "active" : ""}
              onClick={() => {
                setCurrentPage(p);
                pageRef.current = p;
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </nav>

      <main className="content">
        {currentPage === "Home" && (
          <section className="page">
            <div className="section-box">
              <h1>Welcome to RVCE Campus Kiosk</h1>
              <p>Navigate, explore and interact using simple hand gestures.</p>
            </div>

            <div className="section-box">
              <h3>Features</h3>
              <ul>
                <li>Gesture-based navigation</li>
                <li>Contactless touch interactions</li>
                <li>Smooth scrolling and auto-click</li>
              </ul>
            </div>

            <div className="spacer" />
          </section>
        )}

        {currentPage === "Admissions" && (
          <section className="page">
            <h2>Admissions Dashboard</h2>
            {[...Array(20)].map((_, i) => (
              <div key={i} className="data-row">
                Application ID: RV2025_{i + 100} — Status: Verified
              </div>
            ))}
          </section>
        )}

        {currentPage === "Departments" && (
          <section className="page">
            <h2>Departments</h2>

            <div className="section-box">Computer Science & Engineering</div>
            <div className="section-box">Electronics & Communication</div>
            <div className="section-box">Mechanical Engineering</div>
            <div className="section-box">AI & Machine Learning</div>
          </section>
        )}

        {currentPage === "Placements" && (
          <section className="page">
            <h2>Placement Highlights</h2>

            <div className="section-box">
              <strong>2024 Highest Package:</strong> ₹54 LPA
            </div>

            <div className="section-box">
              <strong>Top Recruiters:</strong> Google, Amazon, Microsoft,
              Infosys, TCS
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
