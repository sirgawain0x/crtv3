import { useState, useEffect, useRef } from "react";
// import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import * as THREE from "three";
import "./App.css";

function App() {
  const [cid, setCid] = useState("");
  const [responseMsg, setResponseMsg] = useState("");
  const threeJsContainer = useRef(null);
  const [activeRoute, setActiveRoute] = useState(null);

  // Three.js Setup
  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    threeJsContainer.current.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      threeJsContainer.current.removeChild(renderer.domElement);
    };
  }, []);

  // Menu Data (from HTML)
  const menuItems = [
    {
      label: "Data Transfers",
      route: "data-transfers",
      src: "/src/telemetry",
    },
    {
      label: "Agent Design",
      route: "agent-design",
      src: "/src/telemetry",
      submenu: [
        {
          label: "Character Builder",
          route: "character-builder",
          src: "http://localhost:8083",
        },
      ],
    },
    {
      label: "Database",
      route: "database",
      src: "http://localhost:8084",
    },
    {
      label: "Performance",
      route: "performance",
      src: "http://localhost:8085",
    },
    {
      label: "Bitcoin Invest",
      route: "bitcoin-invest",
      src: "http://localhost:8086",
      submenu: [
        {
          label: "Portfolio Tracker",
          route: "portfolio-tracker",
          src: "http://localhost:8086/portfolio",
        },
        {
          label: "Market Analysis",
          route: "market-analysis",
          src: "http://localhost:8086/market",
        },
      ],
    },
  ];

  // Tauri Command to Interact with Backend
  async function requestService(route) {
    try {
      const result = await invoke("request_service", { cid, route });
      setResponseMsg(result);
      setActiveRoute(route);
    } catch (error) {
      setResponseMsg(`Error: ${error}`);
    }
  }

  return (
    <main className="container">
      <div ref={threeJsContainer} className="threejs-container"></div>
      <header className="game-title">
        <h1>Creative AI Master</h1>
      </header>

      <section className="menu">
        <ul className="main-menu">
          {menuItems.map((item) => (
            <li
              key={item.route}
              className={`menu-item ${item.submenu ? "has-submenu" : ""}`}
              onClick={() => !item.submenu && requestService(item.route)}
            >
              {item.label}
              {item.submenu && (
                <ul className="submenu">
                  {item.submenu.map((subItem) => (
                    <li
                      key={subItem.route}
                      className="menu-item"
                      onClick={() => requestService(subItem.route)}
                    >
                      {subItem.label}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (activeRoute) requestService(activeRoute);
        }}
      >
        <input
          id="cid-input"
          value={cid}
          onChange={(e) => setCid(e.target.value)}
          placeholder="Enter your CID or DID..."
        />
        <button type="submit">Access Service</button>
      </form>
      <p className="response">{responseMsg}</p>

      {/* <div className="row logos">
        <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank" rel="noopener noreferrer">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p> */}
    </main>
  );
}

export default App;