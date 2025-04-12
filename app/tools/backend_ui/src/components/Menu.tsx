import { Link } from "react-router-dom";

interface MenuProps {
  token: string;
}

function Menu({ token }: MenuProps) {
  const menuItems = [
    { label: "Data Transfers", route: "/data-transfers" },
    {
      label: "Agent Design",
      route: "#",
      submenu: [{ label: "Character Builder", route: "/agent-design/character-builder" }],
    },
    { label: "Database", route: "/database" },
    { label: "Performance", route: "/performance" },
    {
      label: "Bitcoin Invest",
      route: "#",
      submenu: [
        { label: "Portfolio Tracker", route: "/bitcoin-invest/portfolio" },
        { label: "Market Analysis", route: "/bitcoin-invest/market" },
      ],
    },
    { label: "Kubernetes Dashboard", route: "/kubernetes/dashboard" },
    { label: "Create Kubernetes Resource", route: "/kubernetes/create" },
  ];

  return (
    <section className="menu">
      <ul className="main-menu">
        {menuItems.map((item) => (
          <li key={item.route} className={`menu-item ${item.submenu ? "has-submenu" : ""}`}>
            {item.submenu ? (
              <span>{item.label}</span>
            ) : (
              <Link to={token ? item.route : "#"} className={!token ? "disabled" : ""}>
                {item.label}
              </Link>
            )}
            {item.submenu && (
              <ul className="submenu">
                {item.submenu.map((subItem) => (
                  <li key={subItem.route} className="menu-item">
                    <Link to={token ? subItem.route : "#"} className={!token ? "disabled" : ""}>
                      {subItem.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Menu;